"""
IOGP Multi-Label Tagger — Step 2

Two taggers, meant to be compared against each other and against the gold set:

  1. rule_based_tag()  — keyword-matching baseline against taxonomy/iogp_rules.json.
                          No API needed, runs instantly, gives you a floor to beat.
  2. llm_tag()         — few-shot LLM tagger. Outputs tags + confidence + the exact
                          phrase that triggered each tag ("evidence"), which is what
                          makes this defensible to judges instead of a black box.

evaluate() scores either tagger's output against data/gold_labeled.csv and reports
precision/recall/F1 per IOGP rule — the number that actually matters is recall per
rule, since a missed tag is the failure mode this whole project exists to avoid.

Requires (for llm_tag only):
    pip install anthropic
    export ANTHROPIC_API_KEY=...
"""

import json
import os
import re
import csv
import time
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent.parent
TAXONOMY_PATH = BASE_DIR / "taxonomy" / "iogp_rules.json"
GOLD_PATH = BASE_DIR / "data" / "gold_labeled.csv"

# Load .env if present so ANTHROPIC_API_KEY works without manual export.
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass


def load_taxonomy():
    with open(TAXONOMY_PATH, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 1. Rule-based baseline
# ---------------------------------------------------------------------------

def rule_based_tag(text, taxonomy=None):
    """
    Keyword-match `text` against every IOGP rule's keyword list.
    Returns a list of {rule, matched_keywords, score} for every rule with
    at least one hit, sorted by score descending.

    score = number of distinct keywords matched (simple, transparent, easy
    to defend under questioning — this is the baseline, not the final word).
    """
    taxonomy = taxonomy or load_taxonomy()
    text_lower = text.lower()
    results = []

    for rule_name, rule_data in taxonomy.items():
        matched = []
        for kw in rule_data["keywords"]:
            # word-boundary-ish match so short acronyms like "PTW" don't match as
            # substrings of longer words, and multi-word phrases match cleanly.
            pattern = r"(?<!\w)" + re.escape(kw.lower()) + r"(?!\w)"
            if re.search(pattern, text_lower):
                matched.append(kw)
        if matched:
            results.append({
                "rule": rule_name,
                "matched_keywords": matched,
                "score": len(matched),
            })

    results.sort(key=lambda r: -r["score"])
    return results


# ---------------------------------------------------------------------------
# 2. LLM tagger
# ---------------------------------------------------------------------------

LLM_SYSTEM_PROMPT = """You are an HSE (Health, Safety, Environment) analyst tagging field \
safety observation reports (UA/UC reports) from an oil & gas operator against IOGP's \
9 Life-Saving Rules.

The 9 rules, with their intent, are:
{rules_block}

For the report given, return ONLY a JSON array (no prose, no markdown fences). Each \
element:
{{
  "rule": "<one of the 9 rule keys above, exactly as written>",
  "confidence": <float 0.0-1.0>,
  "evidence": "<the exact short phrase from the report text that justifies this tag>"
}}

Rules:
- A report can and often does trigger more than one rule — tag all that genuinely apply.
- If nothing in the report clearly matches any rule, return an empty array [].
- "evidence" must be a real substring of the report text, not a paraphrase.
- Be conservative with confidence: 0.9+ only when the rule violation is explicit and \
unambiguous in the text; 0.5-0.7 for plausible-but-inferred; below 0.5 only if you're \
including it mainly to flag it for human review.
- Tag work_authorisation whenever a permit/JSA/toolbox talk was missing, expired, \
bypassed, or not signed — even if the report doesn't use the word "permit" explicitly. \
Phrases like "without authorization", "no sign-off", "not reviewed with the crew" all count.
- Tag energy_isolation whenever isolation/LOTO/de-energization is relevant — including \
cases where isolation was NOT done (working on live equipment, re-energized while someone \
was exposed, no verify-isolation step). The absence of isolation is itself an energy_isolation \
violation.
- Tag bypassing_safety_controls when someone deliberately overrides, defeats, or silences \
a safety device (interlock, trip, alarm, guard). Do NOT tag it for mere procedural lapses.

Here are 3 examples:

Report: "Crew started wireline job without a signed permit to work; supervisor said it \
would be filled in after the job to save time."
Tags: [
  {{"rule": "work_authorisation", "confidence": 0.95, "evidence": "without a signed permit to work"}}
]

Report: "Operator noticed the high-pressure trip kept nuisance-tripping the compressor and \
bypassed the interlock to keep production running through the shift."
Tags: [
  {{"rule": "bypassing_safety_controls", "confidence": 0.95, "evidence": "bypassed the interlock"}},
  {{"rule": "energy_isolation", "confidence": 0.7, "evidence": "high-pressure trip"}}
]

Report: "An employee was injured by an arc flash after equipment was re-energized. The \
employee was hospitalized."
Tags: [
  {{"rule": "energy_isolation", "confidence": 0.9, "evidence": "re-energized"}},
  {{"rule": "work_authorisation", "confidence": 0.7, "evidence": "re-energized"}}
]
"""


def _build_rules_block(taxonomy):
    lines = []
    for rule_name, rule_data in taxonomy.items():
        lines.append(f"- {rule_name}: {rule_data['description']}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 2. LLM tagger (Gemini, with multi-key rotation + thread pooling)
# ---------------------------------------------------------------------------

def _get_api_keys():
    """Return list of Gemini API keys from GEMINI_API_KEYS (comma-sep) or GEMINI_API_KEY."""
    keys = [k.strip() for k in os.environ.get("GEMINI_API_KEYS", "").split(",") if k.strip()]
    if not keys:
        single = os.environ.get("GEMINI_API_KEY", "").strip()
        if single:
            keys = [single]
    return keys


def _make_clients(keys):
    """Create one Gemini client per API key for round-robin rotation."""
    from google import genai
    return [genai.Client(api_key=k) for k in keys]


class _ClientPool:
    """Thread-safe round-robin pool of Gemini clients (one per API key)."""
    def __init__(self, keys):
        import threading
        self._clients = _make_clients(keys)
        self._lock = threading.Lock()
        self._idx = 0

    def next(self):
        with self._lock:
            c = self._clients[self._idx % len(self._clients)]
            self._idx += 1
            return c

    def __len__(self):
        return len(self._clients)


_POOL = None  # lazily initialised on first batch call


def llm_tag(text, taxonomy=None, model="gemini-3.5-flash-lite", max_retries=5,
            client=None, _pool=None):
    """
    Tag `text` using a Gemini model prompted with the IOGP taxonomy.
    Returns a list of {rule, confidence, evidence} dicts.

    Requires `pip install google-genai` and GEMINI_API_KEYS (or GEMINI_API_KEY)
    set in the environment. Import is deferred so rule_based_tag() and
    evaluate() work without the SDK installed.

    If `client` is given, uses it directly. Otherwise uses the global pool
    (round-robin across all keys) or falls back to a single client.

    Retries on rate-limit / server errors with exponential backoff + key
    rotation so a 113-row batch survives transient failures.
    """
    from google import genai

    taxonomy = taxonomy or load_taxonomy()
    system_prompt = LLM_SYSTEM_PROMPT.format(rules_block=_build_rules_block(taxonomy))

    # Resolve which client to use
    if client is not None:
        clients_to_try = [client]
    elif _pool is not None and len(_pool) > 0:
        clients_to_try = None  # use pool for rotation on each retry
    else:
        keys = _get_api_keys()
        if not keys:
            raise RuntimeError("No GEMINI_API_KEYS or GEMINI_API_KEY set")
        clients_to_try = [genai.Client(api_key=keys[0])]

    last_err = None
    for attempt in range(max_retries):
        # Pick a client: rotate through pool on retries, or use the single client
        if clients_to_try is not None:
            c = clients_to_try[attempt % len(clients_to_try)]
        else:
            c = _pool.next()

        try:
            response = c.models.generate_content(
                model=model,
                contents=f"{system_prompt}\n\nReport:\n{text}",
                config={"temperature": 0.2, "max_output_tokens": 8192},
            )
            raw = (response.text or "").strip()
            raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())

            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                print(f"[llm_tag] WARNING: unparseable output for {text[:60]!r}, treating as no tags")
                return []

            valid_rules = set(taxonomy.keys())
            return [t for t in parsed if t.get("rule") in valid_rules]

        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in
                            ("429", "500", "503", "rate", "quota", "resource",
                             "unavailable", "overloaded", "deadline", "timeout"))
            if transient and attempt < max_retries - 1:
                wait = min(2 ** attempt, 8)
                print(f"[llm_tag] transient ({type(e).__name__}), retry {attempt+1}/{max_retries} in {wait}s")
                last_err = e
                time.sleep(wait)
            else:
                raise

    raise RuntimeError(f"llm_tag exhausted retries for text: {text[:80]!r}") from last_err


def llm_tag_batch(reports, taxonomy=None, model="gemini-3.5-flash-lite",
                  out_path=None, resume=True, max_workers=None):
    """
    Tag a batch of reports in parallel using a thread pool, rotating across
    all available API keys to maximise throughput and avoid per-key rate limits.

    reports: list of {report_id, report_text}
    Returns {report_id: tags}

    If out_path is given, predictions are written incrementally (thread-safe
    via a lock) so progress is visible on disk and a crash doesn't lose
    everything. Resume=True skips already-tagged report_ids.
    """
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    global _POOL
    taxonomy = taxonomy or load_taxonomy()
    out_path = Path(out_path) if out_path else None

    keys = _get_api_keys()
    if not keys:
        raise RuntimeError("No GEMINI_API_KEYS or GEMINI_API_KEY set")
    _POOL = _ClientPool(keys)
    n_workers = max_workers or min(len(keys), 5)
    print(f"[llm_tag_batch] {len(keys)} API keys, {n_workers} workers, model={model}")

    # Resume from existing file
    done = {}
    if out_path and resume and out_path.exists():
        with open(out_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if not row["rule"]:
                    done.setdefault(row["report_id"], [])
                    continue
                done.setdefault(row["report_id"], []).append({
                    "rule": row["rule"],
                    "confidence": float(row["confidence"]) if row["confidence"] else None,
                    "evidence": row["evidence"],
                    "matched_keywords": row["matched_keywords"],
                })
        print(f"[llm_tag_batch] resuming — {len(done)} already done")

    out = dict(done)
    pending = [r for r in reports if r["report_id"] not in done]
    n_total = len(reports)
    n_done = len(done)
    print(f"[llm_tag_batch] {n_done}/{n_total} done, {len(pending)} pending")

    if not pending:
        return out

    # Open output file (thread-safe writes via lock)
    write_lock = threading.Lock()
    if out_path:
        mode = "a" if (resume and done) else "w"
        f = open(out_path, mode, encoding="utf-8", newline="")
        w = csv.DictWriter(f, fieldnames=["report_id", "method", "rule", "confidence",
                                          "evidence", "matched_keywords"])
        if mode == "w":
            w.writeheader()

    def _tag_one(r):
        try:
            tags = llm_tag(r["report_text"], taxonomy, model=model, _pool=_POOL)
            return r["report_id"], tags, None
        except Exception as e:
            return r["report_id"], [], e

    try:
        with ThreadPoolExecutor(max_workers=n_workers) as executor:
            futures = {executor.submit(_tag_one, r): r for r in pending}
            for fut in as_completed(futures):
                rid, tags, err = fut.result()
                out[rid] = tags
                if err:
                    print(f"[llm_tag_batch] ERROR on {rid}: {err}", flush=True)
                if out_path:
                    with write_lock:
                        if not tags:
                            w.writerow({"report_id": rid, "method": "llm", "rule": "",
                                        "confidence": "", "evidence": "", "matched_keywords": ""})
                        else:
                            for t in tags:
                                w.writerow({
                                    "report_id": rid, "method": "llm",
                                    "rule": t.get("rule", ""),
                                    "confidence": t.get("confidence", ""),
                                    "evidence": t.get("evidence", ""),
                                    "matched_keywords": "",
                                })
                        f.flush()
                n_done += 1
                if n_done % 10 == 0 or n_done == n_total:
                    print(f"[llm_tag_batch] {n_done}/{n_total}", flush=True)
    finally:
        if out_path:
            f.close()

    return out


# ---------------------------------------------------------------------------
# Evaluation against gold_labeled.csv
# ---------------------------------------------------------------------------

def load_gold(path=GOLD_PATH):
    """
    Reads data/gold_labeled.csv. Expects an `iogp_tags` column with rule names
    separated by ; or , (blank = not yet labeled, skipped from eval).
    Returns {report_id: {rule_name, ...}}.
    """
    gold = {}
    with open(path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            tags_raw = (row.get("iogp_tags") or "").strip()
            if not tags_raw:
                continue  # not labeled yet — excluded from eval, not counted as "no tags"
            tags = {t.strip() for t in re.split(r"[;,]", tags_raw) if t.strip()}
            gold[row["report_id"]] = tags
    return gold


def evaluate(predictions, gold=None):
    """
    predictions: {report_id: [{"rule": ..., ...}, ...]}  (output of rule_based_tag
                 or llm_tag, keyed by report_id)
    gold:        {report_id: {rule_name, ...}} — defaults to load_gold()

    Returns per-rule precision/recall/F1 plus a micro-averaged overall row.
    Only report_ids present in BOTH predictions and gold are scored.
    """
    gold = gold if gold is not None else load_gold()
    common_ids = set(predictions) & set(gold)
    if not common_ids:
        raise ValueError("No overlapping labeled report_ids between predictions and gold. "
                          "Label some rows in data/gold_labeled.csv first.")

    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)

    for rid in common_ids:
        pred_rules = {t["rule"] for t in predictions[rid]}
        gold_rules = gold[rid]
        for rule in pred_rules | gold_rules:
            if rule in pred_rules and rule in gold_rules:
                tp[rule] += 1
            elif rule in pred_rules and rule not in gold_rules:
                fp[rule] += 1
            elif rule not in pred_rules and rule in gold_rules:
                fn[rule] += 1

    all_rules = set(tp) | set(fp) | set(fn)
    per_rule = {}
    total_tp = total_fp = total_fn = 0
    for rule in sorted(all_rules):
        rtp, rfp, rfn = tp[rule], fp[rule], fn[rule]
        precision = rtp / (rtp + rfp) if (rtp + rfp) else 0.0
        recall = rtp / (rtp + rfn) if (rtp + rfn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        per_rule[rule] = {"precision": round(precision, 3), "recall": round(recall, 3),
                           "f1": round(f1, 3), "support": rtp + rfn}
        total_tp += rtp
        total_fp += rfp
        total_fn += rfn

    micro_p = total_tp / (total_tp + total_fp) if (total_tp + total_fp) else 0.0
    micro_r = total_tp / (total_tp + total_fn) if (total_tp + total_fn) else 0.0
    micro_f1 = 2 * micro_p * micro_r / (micro_p + micro_r) if (micro_p + micro_r) else 0.0

    return {
        "n_reports_scored": len(common_ids),
        "per_rule": per_rule,
        "overall_micro": {"precision": round(micro_p, 3), "recall": round(micro_r, 3),
                           "f1": round(micro_f1, 3)},
    }


def print_eval_report(eval_result, title="Evaluation"):
    print(f"\n=== {title} ({eval_result['n_reports_scored']} reports scored) ===")
    print(f"{'Rule':<28} {'Precision':>9} {'Recall':>8} {'F1':>6} {'Support':>8}")
    for rule, m in eval_result["per_rule"].items():
        print(f"{rule:<28} {m['precision']:>9} {m['recall']:>8} {m['f1']:>6} {m['support']:>8}")
    o = eval_result["overall_micro"]
    print(f"{'OVERALL (micro)':<28} {o['precision']:>9} {o['recall']:>8} {o['f1']:>6}")


def dump_predictions_csv(predictions, out_path, method):
    """Write {report_id: [{rule, ...}]} to a flat CSV: report_id, method, rule, confidence, evidence."""
    rows = []
    for rid, tags in predictions.items():
        if not tags:
            rows.append({"report_id": rid, "method": method, "rule": "",
                         "confidence": "", "evidence": "", "matched_keywords": ""})
            continue
        for t in tags:
            rows.append({
                "report_id": rid,
                "method": method,
                "rule": t.get("rule", ""),
                "confidence": t.get("confidence", ""),
                "evidence": t.get("evidence", ""),
                "matched_keywords": ";".join(t.get("matched_keywords", [])) if "matched_keywords" in t else "",
            })
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["report_id", "method", "rule", "confidence",
                                          "evidence", "matched_keywords"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {out_path.name}: {len(rows)} rows ({len(predictions)} reports)")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    taxonomy = load_taxonomy()
    reports = list(csv.DictReader(open(BASE_DIR / "data" / "raw" / "seed_reports.csv",
                                        encoding="utf-8-sig")))
    reports = [{"report_id": r["report_id"], "report_text": r["report_text"]} for r in reports]

    cmd = sys.argv[1] if len(sys.argv) > 1 else "rule"

    if cmd in ("rule", "both"):
        rb_predictions = {r["report_id"]: rule_based_tag(r["report_text"], taxonomy) for r in reports}
        dump_predictions_csv(rb_predictions, BASE_DIR / "data" / "rule_based_predictions.csv", "rule")

        gold = load_gold()
        if gold:
            eval_rb = evaluate(rb_predictions, gold)
            print_eval_report(eval_rb, "Rule-based tagger")
        else:
            n_tagged = sum(1 for v in rb_predictions.values() if v)
            print(f"\nNo labeled gold rows yet. Rule-based tagged {n_tagged}/{len(reports)} reports.")
            print("Sample on first 3:")
            for r in reports[:3]:
                print(f"\n{r['report_id']}: {r['report_text'][:90]}...")
                for tag in rb_predictions[r["report_id"]]:
                    print(f"   -> {tag['rule']} (score={tag['score']}, matched={tag['matched_keywords']})")

    if cmd in ("llm", "both"):
        if not (_get_api_keys()):
            print("GEMINI_API_KEYS not set — skipping LLM pass. Copy .env.example to .env.")
        else:
            llm_out = BASE_DIR / "data" / "llm_predictions.csv"
            llm_predictions = llm_tag_batch(reports, taxonomy,
                                            out_path=llm_out, resume=True)
            n_tagged = sum(1 for v in llm_predictions.values() if v)
            print(f"LLM predictions: {len(llm_predictions)} reports ({n_tagged} tagged)")

            gold = load_gold()
            if gold:
                eval_llm = evaluate(llm_predictions, gold)
                print_eval_report(eval_llm, "LLM tagger")
