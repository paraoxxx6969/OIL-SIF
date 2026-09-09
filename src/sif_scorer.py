"""
SIF-Potential Scorer — Step 3

A dedicated scorer that produces the 4-factor rubric breakdown + SIF-potential
boolean for any report, independent of the IOGP tagging pipeline (Step 2).

Components:
  1. LLM rubric scorer   — reuses the multi-key rotation / retry / incremental-
                           write infrastructure from tagger.py. Uses a DIFFERENT
                           model variant (gemini-3.5-flash) from the weak-gold
                           labeler (gemini-3.5-flash-lite) to reduce LLM-vs-LLM
                           evaluation circularity.
  2. Classical baseline  — TF-IDF + Logistic Regression on the recalibrated gold
                           set. Comparison point, not the production system.
  3. Evaluation          — P/R/F1 on the binary SIF label (recall on the
                           SIF-positive class is the headline number) plus
                           per-factor accuracy vs gold.
  4. Cross-validation    — sanity check vs Step 2 output: reports tagged with
                           high-energy IOGP rules should skew toward higher
                           average SIF scores than low-energy rules.

Usage:
    python src/sif_scorer.py score       # run LLM scorer over seed reports
    python src/sif_scorer.py baseline    # TF-IDF + LogReg baseline (5-fold CV)
    python src/sif_scorer.py eval        # LLM scorer vs gold, incl. per-factor
    python src/sif_scorer.py crosscheck  # directional check vs Step 2 tags
    python src/sif_scorer.py all         # everything, in order
"""
import csv
import json
import re
import sys
import threading
import time
from collections import defaultdict
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent
load_dotenv(BASE / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tagger import _get_api_keys, _ClientPool

SEED = BASE / "data" / "raw" / "seed_reports.csv"
GOLD = BASE / "data" / "gold_labeled.csv"
RUBRIC = BASE / "taxonomy" / "sif_rubric.json"
LLM_TAGS = BASE / "data" / "llm_predictions.csv"
OUT = BASE / "data" / "sif_scores.csv"

SCORER_MODEL = "gemini-3.5-flash"  # different variant from gold labeler (flash-lite)
MAX_WORKERS = 5
FACTORS = ["energy_level", "barrier_failure", "human_proximity", "exposure_duration"]

with open(RUBRIC, encoding="utf-8") as f:
    _rubric = json.load(f)
SIF_THRESHOLD = _rubric.get("sif_threshold", 7)

# High- vs low-energy IOGP rules for the Step 2 cross-check (PRD 3.4)
HIGH_ENERGY_RULES = {"line_of_fire", "energy_isolation", "confined_space",
                     "working_at_height", "safe_mechanical_lifting", "hot_work"}
LOW_ENERGY_RULES = {"work_authorisation", "driving"}


SCORER_PROMPT = """You are an HSE risk assessor scoring an oil & gas field safety report \
against a 4-factor SIF-potential (Serious Injury or Fatality potential) rubric.

SIF-potential asks one question: "Could this event have realistically killed someone under \
slightly different circumstances?" It is NOT about rule-breaking or paperwork — a permit \
violation on a low-energy routine task is NOT high SIF-potential.

BASE-RATE ANCHOR: In published industry data (DEKRA 2015, EEI SIF Precursor model), only \
~20-25% of safety reports carry genuine SIF-potential. It is the exception, not the norm. \
If most reports feel SIF-positive to you, you are over-flagging.

ANTI-OVER-SCORING RULES:
- Absence of information is NOT evidence of barrier failure — score conservatively when unclear.
- Only score energy_level=2 for genuine high-magnitude energy: height >2m, high pressure, \
high voltage, heavy suspended load, moving vehicle at speed, toxic gas release.
- Only score barrier_failure=2 if a CRITICAL physical barrier was fully absent or \
deliberately defeated. Missing/late paperwork is 1, not 2.
- Only score human_proximity=2 if a person was DIRECTLY in the impact / line-of-fire path. \
Merely being on site or nearby is 1.
- exposure_duration=2 only for prolonged or repeated exposure; a momentary event is 1.

RUBRIC:
{rubric_block}

Return ONLY a JSON object (no prose, no markdown fences):
{{
  "energy_level": <0|1|2>,
  "barrier_failure": <0|1|2>,
  "human_proximity": <0|1|2>,
  "exposure_duration": <0|1|2>,
  "reasoning": "<one sentence naming the actual hazard energy and who was exposed>"
}}
"""


def build_prompt():
    lines = []
    for factor in _rubric["factors"]:
        lines.append(f"  {factor['name']}: {factor['description']}")
        for score, guide in factor["scoring_guide"].items():
            lines.append(f"    {score}: {guide}")
    return SCORER_PROMPT.format(rubric_block="\n".join(lines))


def score_report(text, prompt, pool, max_retries=5):
    """LLM rubric scores for one report: 4 factors + total + sif bool + reasoning."""
    for attempt in range(max_retries):
        c = pool.next()
        try:
            response = c.models.generate_content(
                model=SCORER_MODEL,
                contents=f"{prompt}\n\nReport:\n{text}",
                config={"temperature": 0.1, "max_output_tokens": 4096},
            )
            raw = (response.text or "").strip()
            raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())
            parsed = json.loads(raw)

            scores = {}
            for f in FACTORS:
                v = parsed.get(f, 0)
                scores[f] = int(v) if v in (0, 1, 2) else 0
            total = sum(scores.values())
            return {
                **scores,
                "total_score": total,
                "sif_potential": "true" if total >= SIF_THRESHOLD else "false",
                "reasoning": (parsed.get("reasoning") or "")[:300],
            }
        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in
                            ("429", "500", "503", "rate", "quota", "resource",
                             "unavailable", "overloaded", "deadline", "timeout"))
            if transient and attempt < max_retries - 1:
                wait = min(2 ** attempt, 8)
                print(f"  [scorer] transient ({type(e).__name__}), retry {attempt+1}/{max_retries} in {wait}s")
                time.sleep(wait)
            else:
                print(f"  [scorer] FAILED: {type(e).__name__}: {str(e)[:100]}")
                return None
    return None


def run_scorer():
    """Score all seed reports; incremental, resumable writes to sif_scores.csv."""
    with open(SEED, encoding="utf-8-sig") as f:
        reports = list(csv.DictReader(f))

    fieldnames = ["report_id"] + FACTORS + ["total_score", "sif_potential", "reasoning"]
    done = set()
    if OUT.exists():
        with open(OUT, encoding="utf-8") as f:
            done = {r["report_id"] for r in csv.DictReader(f)}
    pending = [r for r in reports if r["report_id"] not in done]
    print(f"[scorer] {len(done)} done, {len(pending)} pending, model={SCORER_MODEL}, "
          f"threshold>={SIF_THRESHOLD}")
    if not pending:
        return

    keys = _get_api_keys()
    if not keys:
        raise RuntimeError("No GEMINI_API_KEYS set")
    pool = _ClientPool(keys)
    prompt = build_prompt()

    write_lock = threading.Lock()
    mode = "a" if done else "w"
    n_done, n_total = 0, len(pending)
    with open(OUT, mode, encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if mode == "w":
            w.writeheader()

        def _one(r):
            return r["report_id"], score_report(r["report_text"], prompt, pool)

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futures = [ex.submit(_one, r) for r in pending]
            for fut in as_completed(futures):
                rid, result = fut.result()
                n_done += 1
                if result:
                    with write_lock:
                        w.writerow({"report_id": rid, **result})
                        f.flush()
                else:
                    print(f"  [scorer] {rid} failed, skipped", flush=True)
                if n_done % 10 == 0 or n_done == n_total:
                    print(f"  [scorer] {n_done}/{n_total}", flush=True)

    with open(OUT, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    n_sif = sum(1 for r in rows if r["sif_potential"] == "true")
    print(f"\n[scorer] done: {len(rows)} scored, SIF-positive {n_sif} "
          f"({100*n_sif/max(len(rows),1):.0f}%)")


# ---------------------------------------------------------------------------
# Shared loaders
# ---------------------------------------------------------------------------

def load_gold_rows():
    with open(GOLD, encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("labeled_by") or "").strip()]
    return rows


def load_scores():
    if not OUT.exists():
        raise RuntimeError("data/sif_scores.csv not found — run `python src/sif_scorer.py score` first")
    with open(OUT, encoding="utf-8") as f:
        return {r["report_id"]: r for r in csv.DictReader(f)}


def binary_prf(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t and p)
    fp = sum(1 for t, p in zip(y_true, y_pred) if not t and p)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t and not p)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return precision, recall, f1, tp, fp, fn


# ---------------------------------------------------------------------------
# 3.2 Classical ML baseline
# ---------------------------------------------------------------------------

def run_baseline():
    """TF-IDF + Logistic Regression on the recalibrated gold set, 5-fold CV."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict
    from sklearn.pipeline import make_pipeline

    gold = load_gold_rows()
    texts = [r["report_text"] for r in gold]
    y = [r["sif_potential"] == "true" for r in gold]
    n_pos = sum(y)
    print(f"[baseline] {len(y)} gold rows, {n_pos} SIF-positive ({100*n_pos/len(y):.0f}%)")

    pipe = make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True),
        LogisticRegression(class_weight="balanced", max_iter=1000),
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_pred = cross_val_predict(pipe, texts, y, cv=cv)

    p, r, f1, tp, fp, fn = binary_prf(y, y_pred)
    print(f"\n=== TF-IDF + LogReg baseline (5-fold CV, SIF-positive class) ===")
    print(f"precision={p:.3f}  recall={r:.3f}  f1={f1:.3f}  (tp={tp} fp={fp} fn={fn})")
    return {"precision": p, "recall": r, "f1": f1}


# ---------------------------------------------------------------------------
# 3.3 Evaluation of the LLM scorer vs gold
# ---------------------------------------------------------------------------

def run_eval():
    gold = {r["report_id"]: r for r in load_gold_rows()}
    scores = load_scores()
    common = sorted(set(gold) & set(scores))
    if not common:
        raise RuntimeError("No overlap between sif_scores.csv and labeled gold rows")

    y_true = [gold[rid]["sif_potential"] == "true" for rid in common]
    y_pred = [scores[rid]["sif_potential"] == "true" for rid in common]
    p, r, f1, tp, fp, fn = binary_prf(y_true, y_pred)

    print(f"\n=== LLM SIF scorer vs weak gold ({len(common)} reports) ===")
    print(f"Gold SIF-positive rate:   {100*sum(y_true)/len(y_true):.0f}%")
    print(f"Scorer SIF-positive rate: {100*sum(y_pred)/len(y_pred):.0f}%")
    print(f"\nBinary SIF-potential (positive class):")
    print(f"  precision={p:.3f}  RECALL={r:.3f} (headline)  f1={f1:.3f}  (tp={tp} fp={fp} fn={fn})")

    # Per-factor accuracy: validates the rubric reasoning, not just the threshold
    print(f"\nPer-factor agreement (scorer vs gold):")
    print(f"{'factor':<20} {'exact':>7} {'within-1':>9}")
    for f in FACTORS:
        exact = within1 = 0
        for rid in common:
            g, s = int(gold[rid][f] or 0), int(scores[rid][f] or 0)
            exact += (g == s)
            within1 += (abs(g - s) <= 1)
        print(f"{f:<20} {exact/len(common):>7.3f} {within1/len(common):>9.3f}")

    return {"precision": p, "recall": r, "f1": f1, "n": len(common)}


# ---------------------------------------------------------------------------
# 3.4 Cross-validation against Step 2 IOGP tags
# ---------------------------------------------------------------------------

def run_crosscheck():
    """High-energy IOGP rules should skew toward higher average SIF scores."""
    scores = load_scores()
    rules_by_report = defaultdict(set)
    with open(LLM_TAGS, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["rule"]:
                rules_by_report[row["report_id"]].add(row["rule"])

    per_rule_scores = defaultdict(list)
    for rid, rules in rules_by_report.items():
        if rid in scores:
            total = int(scores[rid]["total_score"])
            for rule in rules:
                per_rule_scores[rule].append(total)

    print(f"\n=== Cross-check: mean SIF score by Step 2 IOGP tag ===")
    print(f"{'rule':<28} {'n':>4} {'mean score':>11}")
    means = {}
    for rule, vals in sorted(per_rule_scores.items(), key=lambda kv: -sum(kv[1])/len(kv[1])):
        means[rule] = sum(vals) / len(vals)
        marker = "HIGH" if rule in HIGH_ENERGY_RULES else ("low" if rule in LOW_ENERGY_RULES else "?")
        print(f"{rule:<28} {len(vals):>4} {means[rule]:>11.2f}  [{marker}-energy]")

    hi = [means[r] for r in HIGH_ENERGY_RULES if r in means]
    lo = [means[r] for r in LOW_ENERGY_RULES if r in means]
    if hi and lo:
        hi_avg, lo_avg = sum(hi)/len(hi), sum(lo)/len(lo)
        print(f"\nhigh-energy rules avg: {hi_avg:.2f}   low-energy rules avg: {lo_avg:.2f}")
        if hi_avg > lo_avg:
            print("PASS: directional correlation holds — the two independently-built "
                  "pipelines agree.")
        else:
            print("FAIL: no directional correlation — investigate both pipelines "
                  "before proceeding to Step 4.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("score", "all"):
        run_scorer()
    if cmd in ("baseline", "all"):
        run_baseline()
    if cmd in ("eval", "all"):
        run_eval()
    if cmd in ("crosscheck", "all"):
        run_crosscheck()
