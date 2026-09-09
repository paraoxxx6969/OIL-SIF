"""
Step 6.2 — Auto-Recommended Corrective Actions
Step 6.3 — Multilingual Ingestion (Hindi/Assamese)

6.2: For every high-SIF-potential report, generate a suggested intervention
     grounded in the specific IOGP rule's sub-requirements (not generic
     boilerplate). One LLM prompt grounded in iogp_rules.json taxonomy.

6.3: Language detection + LLM-based translation to English as a pre-processing
     step. OIL's Assam-based field operations make regional-language or
     code-switched reports a near-certainty in real deployment.

Usage:
    python src/actions_and_i18n.py actions    # generate corrective actions for SIF+ reports
    python src/actions_and_i18n.py translate  # detect + translate non-English reports
    python src/actions_and_i18n.py demo       # run a translation demo with sample Hindi/Assamese text
    python src/actions_and_i18n.py all        # everything
"""
import csv
import json
import re
import sys
import threading
import time
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
IOGP_RULES = BASE / "taxonomy" / "iogp_rules.json"
ACTIONS_OUT = BASE / "data" / "corrective_actions.csv"
TRANSLATIONS_OUT = BASE / "data" / "translations.csv"

MODEL = "gemini-3.5-flash-lite"  # use flash-lite for these lighter tasks
MAX_WORKERS = 5

with open(IOGP_RULES, encoding="utf-8") as f:
    _RULES = json.load(f)


# ---------------------------------------------------------------------------
# Step 6.2 — Corrective Actions
# ---------------------------------------------------------------------------

ACTIONS_PROMPT = """You are an HSE corrective action advisor for Oil India Limited.
Given a safety report that has been flagged as high SIF-potential (fatal potential)
and its associated IOGP Life-Saving Rule tags, generate a SPECIFIC, ACTIONABLE
corrective action — not generic boilerplate.

The corrective action must be grounded in the specific IOGP rule's requirements
and the specific hazard described in the report. It should be something a site
HSE manager could implement within 1-2 weeks.

IOGP RULE CONTEXT (use the relevant rules' descriptions to ground your recommendation):
{rules_context}

Report: {report_text}
IOGP Tags: {iogp_tags}
SIF Rubric Scores: energy={energy}, barrier={barrier}, proximity={proximity}, exposure={exposure}

Return ONLY a JSON object (no prose, no markdown fences):
{{
  "immediate_action": "<one sentence — what to do RIGHT NOW to prevent recurrence>",
  "systemic_action": "<one sentence — what systemic fix to prevent similar events across site>",
  "verification": "<one sentence — how to verify the fix is working>",
  "priority": "<high/medium/low based on SIF severity>"
}}

Rules:
- Be specific to THIS report's hazard, not generic ("conduct training" is too vague).
- Reference the actual equipment, activity, or barrier that failed.
- The immediate_action should be implementable within 24-48 hours.
- The systemic_action should address the root cause, not just the symptom.
- Ground recommendations in the IOGP rule's actual requirements.
"""


def generate_action(report_text, iogp_tags, scores, pool, max_retries=5):
    """Generate corrective actions for one SIF+ report."""
    # Build rules context from the tags
    rules_context = []
    for tag in (iogp_tags or "").split(";"):
        tag = tag.strip()
        if tag in _RULES:
            rules_context.append(
                f"  {tag}: {_RULES[tag]['description']}")
    rules_block = "\n".join(rules_context) if rules_context else "  (no specific rules tagged)"

    prompt = ACTIONS_PROMPT.format(
        rules_context=rules_block,
        report_text=report_text[:2000],
        iogp_tags=iogp_tags or "none",
        energy=scores.get("energy_level", 0),
        barrier=scores.get("barrier_failure", 0),
        proximity=scores.get("human_proximity", 0),
        exposure=scores.get("exposure_duration", 0),
    )

    for attempt in range(max_retries):
        c = pool.next()
        try:
            response = c.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={"temperature": 0.3, "max_output_tokens": 1024},
            )
            raw = (response.text or "").strip()
            raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())
            parsed = json.loads(raw)

            return {
                "immediate_action": parsed.get("immediate_action", "")[:300],
                "systemic_action": parsed.get("systemic_action", "")[:300],
                "verification": parsed.get("verification", "")[:300],
                "priority": parsed.get("priority", "medium"),
            }
        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in
                            ("429", "500", "503", "rate", "quota", "resource",
                             "unavailable", "overloaded", "deadline", "timeout"))
            if transient and attempt < max_retries - 1:
                wait = min(2 ** attempt, 8)
                time.sleep(wait)
            else:
                print(f"  [actions] FAILED: {str(e)[:80]}")
                return None
    return None


def run_actions():
    """Generate corrective actions for all SIF+ reports."""
    with open(GOLD, encoding="utf-8-sig") as f:
        gold_rows = [r for r in csv.DictReader(f)
                     if (r.get("labeled_by") or "").strip()]

    sif_rows = [r for r in gold_rows if r.get("sif_potential") == "true"]
    print(f"[actions] {len(sif_rows)} SIF+ reports to generate actions for")

    # Check existing
    done = set()
    if ACTIONS_OUT.exists():
        with open(ACTIONS_OUT, encoding="utf-8") as f:
            done = {r["report_id"] for r in csv.DictReader(f)}
    pending = [r for r in sif_rows if r["report_id"] not in done]
    print(f"[actions] {len(done)} done, {len(pending)} pending")

    if not pending:
        print("[actions] All done.")
        return

    keys = _get_api_keys()
    if not keys:
        raise RuntimeError("No GEMINI_API_KEYS set")
    pool = _ClientPool(keys)

    fieldnames = ["report_id", "immediate_action", "systemic_action",
                  "verification", "priority"]
    write_lock = threading.Lock()
    mode = "a" if done else "w"

    n_done, n_total = 0, len(pending)
    with open(ACTIONS_OUT, mode, encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if mode == "w":
            w.writeheader()

        def _one(r):
            scores = {
                "energy_level": r.get("energy_level", 0),
                "barrier_failure": r.get("barrier_failure", 0),
                "human_proximity": r.get("human_proximity", 0),
                "exposure_duration": r.get("exposure_duration", 0),
            }
            return r["report_id"], generate_action(
                r["report_text"], r.get("iogp_tags", ""), scores, pool)

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
                    print(f"  [actions] {rid} failed, skipped", flush=True)
                if n_done % 5 == 0 or n_done == n_total:
                    print(f"  [actions] {n_done}/{n_total}", flush=True)

    print(f"\n[actions] Done. {n_done} actions generated → {ACTIONS_OUT.name}")

    # Print a few examples
    with open(ACTIONS_OUT, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"\n=== Sample corrective actions ===")
    for r in rows[:3]:
        print(f"\n  {r['report_id']} [priority: {r['priority']}]:")
        print(f"    Immediate: {r['immediate_action']}")
        print(f"    Systemic:  {r['systemic_action']}")
        print(f"    Verify:    {r['verification']}")


# ---------------------------------------------------------------------------
# Step 6.3 — Multilingual Ingestion
# ---------------------------------------------------------------------------

LANG_DETECT_PROMPT = """Detect the language of the following text. Return ONLY a JSON object:
{{
  "language": "<one of: english, hindi, assamese, bilingual, other>",
  "confidence": <0.0 to 1.0>,
  "detected_scripts": ["<list of scripts found: latin, devanagari, bengali, etc>"]
}}

Text: {text}"""

TRANSLATE_PROMPT = """You are a professional translator for Oil India Limited's HSSE safety reports.
Translate the following text to English. Preserve:
- All technical/safety terminology (LOTO, PTW, H2S, JSA, etc. — keep as-is)
- Equipment names (rig, wellhead, separator, etc. — keep as-is)
- The exact meaning and urgency of the report
- Site/location names (keep as-is)

If the text is already in English, return it unchanged.

Return ONLY the translated text, no explanations.

Text: {text}"""


def detect_language(text, pool, max_retries=3):
    """Detect the language of a report."""
    prompt = LANG_DETECT_PROMPT.format(text=text[:1000])
    for attempt in range(max_retries):
        c = pool.next()
        try:
            response = c.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={"temperature": 0.0, "max_output_tokens": 256},
            )
            raw = (response.text or "").strip()
            raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())
            return json.loads(raw)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(min(2 ** attempt, 4))
            else:
                return None
    return None


def translate_text(text, pool, max_retries=3):
    """Translate text to English."""
    prompt = TRANSLATE_PROMPT.format(text=text[:3000])
    for attempt in range(max_retries):
        c = pool.next()
        try:
            response = c.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={"temperature": 0.1, "max_output_tokens": 2048},
            )
            return (response.text or "").strip()
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(min(2 ** attempt, 4))
            else:
                return None
    return None


def run_translate():
    """Detect and translate non-English reports in the seed dataset."""
    with open(SEED, encoding="utf-8-sig") as f:
        reports = list(csv.DictReader(f))

    # Check existing
    done = set()
    if TRANSLATIONS_OUT.exists():
        with open(TRANSLATIONS_OUT, encoding="utf-8") as f:
            done = {r["report_id"] for r in csv.DictReader(f)}
    pending = [r for r in reports if r["report_id"] not in done]
    print(f"[translate] {len(done)} done, {len(pending)} pending")

    if not pending:
        print("[translate] All done.")
        return

    keys = _get_api_keys()
    if not keys:
        raise RuntimeError("No GEMINI_API_KEYS set")
    pool = _ClientPool(keys)

    fieldnames = ["report_id", "detected_language", "confidence",
                  "detected_scripts", "original_text", "translated_text",
                  "was_translated"]
    write_lock = threading.Lock()
    mode = "a" if done else "w"

    n_done, n_total = 0, len(pending)
    n_translated = 0
    with open(TRANSLATIONS_OUT, mode, encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if mode == "w":
            w.writeheader()

        def _one(r):
            rid = r["report_id"]
            text = r["report_text"]
            lang_info = detect_language(text, pool)
            if not lang_info:
                return rid, {"detected_language": "unknown",
                             "confidence": 0, "detected_scripts": "",
                             "original_text": text, "translated_text": text,
                             "was_translated": "false"}
            lang = lang_info.get("language", "english")
            if lang == "english":
                return rid, {"detected_language": lang,
                             "confidence": lang_info.get("confidence", 1.0),
                             "detected_scripts": ";".join(lang_info.get("detected_scripts", [])),
                             "original_text": text,
                             "translated_text": text,
                             "was_translated": "false"}
            # Translate
            translated = translate_text(text, pool)
            return rid, {"detected_language": lang,
                         "confidence": lang_info.get("confidence", 1.0),
                         "detected_scripts": ";".join(lang_info.get("detected_scripts", [])),
                         "original_text": text,
                         "translated_text": translated or text,
                         "was_translated": "true" if translated else "false"}

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futures = [ex.submit(_one, r) for r in pending]
            for fut in as_completed(futures):
                rid, result = fut.result()
                n_done += 1
                if result.get("was_translated") == "true":
                    n_translated += 1
                with write_lock:
                    w.writerow({"report_id": rid, **result})
                    f.flush()
                if n_done % 10 == 0 or n_done == n_total:
                    print(f"  [translate] {n_done}/{n_total} "
                          f"({n_translated} translated)", flush=True)

    print(f"\n[translate] Done. {n_done} processed, {n_translated} translated "
          f"→ {TRANSLATIONS_OUT.name}")


def run_demo():
    """Run a translation demo with sample Hindi and Assamese safety reports."""
    samples = [
        ("Hindi-1", "Rig floor pe kaam karte waqt worker ki ungli crush ho gayi. "
                    "Pipe fitting ke beech safety guard remove kar diya gaya tha. "
                    "LOTO properly follow nahi hua."),
        ("Hindi-2", "Tank entry ke pehle gas test nahi kiya gaya. Worker andar "
                    "gaya aur H2S gas ki wajah se behosh ho gaya. Confined space "
                    "permit bhi nahi tha."),
        ("Assamese-1", "Wellhead er kaam korar somoy pressure release hoi gol. "
                       "Worker er haat te injury hoi. Isolation verify nahi korai "
                       "kaam start kora hoi gol."),
        ("Bilingual-1", "Hot work chal raha tha pipeline ke paas. Fire watch "
                        "nahi tha. Welding ke sparks se nearby rags mein aag "
                        "lag gayi. Permit to work bhi expired tha."),
        ("English-1", "Worker was standing under a suspended load when the sling "
                      "failed and the load dropped 3 meters, missing the worker "
                      "by 1 meter."),
    ]

    keys = _get_api_keys()
    if not keys:
        print("[demo] No API keys — cannot run translation demo")
        return
    pool = _ClientPool(keys)

    print("[demo] === Multilingual Ingestion Demo ===\n")
    for label, text in samples:
        print(f"--- {label} ---")
        print(f"Original: {text[:120]}...")
        lang_info = detect_language(text, pool)
        if lang_info:
            print(f"Language: {lang_info.get('language')} "
                  f"(confidence: {lang_info.get('confidence')})")
            print(f"Scripts: {lang_info.get('detected_scripts')}")
        if lang_info and lang_info.get("language") != "english":
            translated = translate_text(text, pool)
            print(f"Translated: {translated[:120]}..." if translated else "Translation failed")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("actions", "all"):
        run_actions()
    if cmd in ("translate", "all"):
        run_translate()
    if cmd in ("demo", "all"):
        run_demo()
