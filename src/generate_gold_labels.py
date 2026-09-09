"""
Weak gold label generator — uses a structured, step-by-step rubric prompt
(separate from the fast tagging prompt in tagger.py) to produce weak labels
for IOGP tags + SIF rubric scores.

This is WEAK SUPERVISION, not human-validated ground truth. The eval numbers
produced from these labels are indicative, not final. A human HSE reviewer
should validate a sample before presenting externally.

Methodology to reduce circularity (LLM-vs-LLM eval inflation):
  - Gold labeling uses a DIFFERENT prompt: chain-of-thought rubric scoring,
    step-by-step per factor, with explicit reasoning before the final answer.
  - The tagging prompt (tagger.py) is zero-shot, fast, no reasoning.
  - Gold labels are generated with gemini-3.5-flash-lite (different model
    variant from the tagging pass which used gemini-3.5-flash) to further
    reduce prompt/model overlap.

Output: updates data/gold_labeled.csv with iogp_tags, sif_potential,
energy_level, barrier_failure, human_proximity, exposure_duration.
"""
import csv
import json
import os
import re
import sys
import time
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tagger import load_taxonomy, _get_api_keys, _ClientPool

BASE = Path(__file__).resolve().parent.parent
SEED = BASE / "data" / "raw" / "seed_reports.csv"
GOLD = BASE / "data" / "gold_labeled.csv"
RUBRIC = BASE / "taxonomy" / "sif_rubric.json"
TAXONOMY = BASE / "taxonomy" / "iogp_rules.json"

GOLD_MODEL = "gemini-3.5-flash-lite"  # different from tagging model
MAX_WORKERS = 5

GOLD_PROMPT = """You are a senior HSE (Health, Safety, Environment) auditor reviewing a field \
safety report from an oil & gas operation. Your job is to produce a structured assessment.

CRITICAL CONCEPT — SIF-Potential:
SIF-potential means: "Could this incident/near-miss have realistically resulted in a FATALITY \
under slightly different circumstances?" It is NOT about whether a rule was broken or whether \
an injury occurred. A permit violation on a routine low-energy task is NOT automatically \
high SIF-potential. A near-miss where a worker was nearly crushed by a falling load IS \
high SIF-potential even if no one was hurt.

BASE-RATE ANCHOR (critical — read this before scoring):
In published industry studies (DEKRA/Martin & Black 2015, EEI SIF Precursor model), only \
about 20-25% of safety reports carry genuine SIF-potential. SIF-potential is the EXCEPTION, \
not the norm. If you find yourself scoring most reports as SIF-positive, you are \
over-flagging. The default assumption for a typical UA/UC observation is LOW SIF-potential \
unless the text contains genuine high-magnitude energy with a person exposed to it. \
Absence of information is NOT evidence of hazard — score conservatively when unclear.

CALIBRATION EXAMPLES:

Example A — HIGH SIF-potential (score: 2,2,2,1 = 7):
  Report: "Worker was standing under a suspended load when the sling failed and the load \
  dropped 3 meters, missing the worker by 1 meter."
  Reasoning: High gravitational energy (heavy load at height), critical barrier failed \
  (sling/rigging), worker directly in line of fire, brief exposure.
  Tags: safe_mechanical_lifting, line_of_fire

Example B — HIGH SIF-potential (score: 2,2,2,2 = 8):
  Report: "Operator bypassed the high-pressure trip on the compressor to keep production \
  running. The compressor over-pressured and the relief valve had been gagged."
  Reasoning: High-pressure energy, critical safety system deliberately defeated, operators \
  in vicinity, prolonged exposure through the shift.
  Tags: bypassing_safety_controls, energy_isolation

Example C — LOW SIF-potential (score: 1,1,1,1 = 4):
  Report: "Crew started pipe fitting work without a signed permit. Supervisor said it would \
  be filled in after the job to save time."
  Reasoning: Routine low-energy pipe fitting, permit was missing (administrative barrier \
  degraded but the physical work was low-risk), workers present but not in line of fire \
  of any high-energy hazard, brief duration.
  Tags: work_authorisation

Example D — LOW SIF-potential (score: 1,1,0,1 = 3):
  Report: "Employee found a frozen injection line and isolated it to pour in methanol to \
  thaw it. No permit was obtained for the isolation."
  Reasoning: Low-moderate energy (frozen line, not high pressure), isolation was done \
  (barrier partially present), worker was the only one exposed and was performing the \
  work themselves, brief task.
  Tags: energy_isolation, work_authorisation

Example E — MODERATE, explicitly NON-SIF (score: 2,1,1,1 = 5, SIF-negative):
  Report: "Scaffold was used for working at height before the scaffold tag inspection had \
  been completed and signed."
  Reasoning: Height hazard present (>2m gives energy=2), but the scaffold was erected and \
  structurally sound (barrier partially in place — only the inspection paperwork was \
  missing, so barrier_failure=1 not 2), worker on scaffold but not in a fall situation \
  at the time of the observation (proximity=1), brief task. This is a serious procedural \
  violation worth flagging, but at the moment of the observation no one was falling and \
  the scaffold was physically present. SIF-negative — the worst realistic outcome of \
  "using an uninspected scaffold" is not automatically a fatality.
  Tags: working_at_height, work_authorisation

Example F — BOUNDARY CASE, explicitly NON-SIF (score: 1,1,1,1 = 4, SIF-negative):
  Report: "Night shift electrician isolated the breaker for panel work without a signed \
  electrical permit, relying only on verbal sign-off."
  Reasoning: The electrician DID isolate the breaker (energy was controlled — energy_level=1 \
  for low-magnitude electrical work on a panel, not high-voltage), the permit was missing \
  (administrative barrier degraded, barrier_failure=1 — paperwork, not a missing physical \
  barrier), worker was the one doing the work (proximity=1, not bystander in line of fire), \
  brief task. This is a clear work_authorisation violation but the worst realistic outcome \
  is NOT a fatality given that isolation was actually performed. SIF-negative.
  Tags: energy_isolation, work_authorisation

Example G — BOUNDARY CASE, explicitly NON-SIF (score: 1,2,1,1 = 5, SIF-negative):
  Report: "Crew entered a below-grade vault to check a valve without testing the atmosphere \
  for H2S first. The vault had been opened 10 minutes earlier and no gas was detected on \
  entry."
  Reasoning: Confined space entry without gas testing is a serious violation, but in this \
  specific report no hazardous atmosphere was actually present (energy_level=1 — the vault \
  was benign on this occasion, not a known H2S-rich environment), the gas-test barrier was \
  fully absent (barrier_failure=2 — gas testing is a critical confined-space barrier), \
  worker was inside the space (proximity=1 — present but no actual exposure to a hazard), \
  brief. SIF-negative: a fatality was not a realistic outcome HERE because no hazardous \
  atmosphere existed. Had H2S been present and detected post-entry, this would be \
  SIF-positive. Score the report as written, not the hypothetical worse version of it.
  Tags: confined_space, work_authorisation

STEP 1 — IOGP Life-Saving Rules violated:
Review the report against these 9 rules:
{rules_block}

Identify ALL rules that apply. Be thorough but accurate — only tag rules where the report \
clearly describes a situation within that rule's scope.

STEP 2 — SIF-Potential Rubric Scoring:
Score each factor 0-2. Think carefully about the ACTUAL hazard energy, not just whether a \
rule was broken. A permit violation on a low-energy task does NOT automatically score 2 \
on energy_level.

{rubric_block}

STEP 3 — Output:
Return ONLY a JSON object (no prose, no markdown fences):
{{
  "reasoning": "<2-3 sentences explaining your assessment, referencing the actual hazard energy>",
  "iogp_tags": ["<rule_key1>", "<rule_key2>", ...],
  "energy_level": <0 or 1 or 2>,
  "barrier_failure": <0 or 1 or 2>,
  "human_proximity": <0 or 1 or 2>,
  "exposure_duration": <0 or 1 or 2>,
  "sif_potential": <true if total score >= 7, else false>
}}

Rules:
- iogp_tags must use the exact rule keys from the list above.
- If no rules apply, return empty array [].
- sif_potential is derived: true if (energy_level + barrier_failure + human_proximity + exposure_duration) >= 7.
- Expect roughly 20-25% of reports to be sif_potential=true. It should feel rare. If you have scored 3+ reports in a row as SIF-positive, you are almost certainly over-scoring — pause and re-read the base-rate anchor.
- Score based on ACTUAL hazard energy present in the report AS WRITTEN, not on whether a rule was broken, and not on a hypothetical worse version of the task. Score what happened, not what could have happened.
- Most permit/procedure violations WITHOUT high-energy context should score LOW on energy_level (0 or 1, not 2).
- Only score energy_level=2 if there is genuine high-magnitude energy (height >2m, high pressure, high voltage, heavy suspended load, moving vehicle at speed). Routine electrical panel work, low-pressure lines, and ground-level tasks are energy_level=1 at most. A task being "at height" does not automatically mean energy=2 — only score 2 if the height is >2m AND a fall/arrest actually occurred or was imminent.
- Only score barrier_failure=2 if a CRITICAL physical safety barrier was fully absent or deliberately defeated (no LOTO on live HV, no gas test in a known H2S area, gagged relief valve, removed guardrail at height, defeated interlock). Missing paperwork, missing permit, missing JSA, or missing inspection are barrier_failure=1, NOT 2 — these are administrative controls, not physical barriers. This is the single most common over-scoring error.
- Only score human_proximity=2 if a person was DIRECTLY in the impact/line-of-fire path of a high-energy hazard at the moment described in the report. Just being on site, being the one doing the work, or being nearby is proximity=1. A worker doing routine low-energy work is proximity=1 even if they are the one exposed. Only score 2 if the report describes a person in the path of released or imminent high-magnitude energy.
- Only score exposure_duration=2 if exposure was prolonged (full shift, repeated over days) or the hazard was persistent. A single brief task is exposure_duration=1.
- When uncertain about whether a factor is 1 or 2, score 1. The base rate of SIF-positive is ~20-25%, so most reports should score in the 3-5 range (SIF-negative), not 7-8.
"""


def build_prompt(taxonomy, rubric):
    rules_lines = []
    for name, data in taxonomy.items():
        rules_lines.append(f"- {name}: {data['description']}")
    rules_block = "\n".join(rules_lines)

    rubric_lines = []
    for factor in rubric["factors"]:
        rubric_lines.append(f"  {factor['name']}: {factor['description']}")
        for score, guide in factor["scoring_guide"].items():
            rubric_lines.append(f"    {score}: {guide}")
    rubric_block = "\n".join(rubric_lines)

    return GOLD_PROMPT.format(rules_block=rules_block, rubric_block=rubric_block)


def score_report(text, prompt, pool, max_retries=5):
    """Get structured rubric scores for a single report."""
    from google import genai

    last_err = None
    for attempt in range(max_retries):
        c = pool.next()
        try:
            response = c.models.generate_content(
                model=GOLD_MODEL,
                contents=f"{prompt}\n\nReport:\n{text}",
                config={"temperature": 0.1, "max_output_tokens": 8192},
            )
            raw = (response.text or "").strip()
            raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())

            parsed = json.loads(raw)

            # Validate and coerce
            valid_rules = set(taxonomy_keys)
            tags = [t for t in parsed.get("iogp_tags", []) if t in valid_rules]

            scores = {}
            for f in ["energy_level", "barrier_failure", "human_proximity", "exposure_duration"]:
                v = parsed.get(f, 0)
                scores[f] = int(v) if v in (0, 1, 2) else 0

            total = sum(scores.values())
            sif = total >= SIF_THRESHOLD

            return {
                "iogp_tags": ";".join(tags),
                "sif_potential": "true" if sif else "false",
                "energy_level": scores["energy_level"],
                "barrier_failure": scores["barrier_failure"],
                "human_proximity": scores["human_proximity"],
                "exposure_duration": scores["exposure_duration"],
                "notes": parsed.get("reasoning", "")[:200],
                "labeled_by": "llm_weak_gold",
            }
        except Exception as e:
            msg = str(e).lower()
            transient = any(k in msg for k in
                            ("429", "500", "503", "rate", "quota", "resource",
                             "unavailable", "overloaded", "deadline", "timeout"))
            if transient and attempt < max_retries - 1:
                wait = min(2 ** attempt, 8)
                print(f"  [gold] transient ({type(e).__name__}), retry {attempt+1}/{max_retries} in {wait}s")
                last_err = e
                time.sleep(wait)
            else:
                print(f"  [gold] FAILED: {type(e).__name__}: {str(e)[:100]}")
                return None
    return None


# Load taxonomy and rubric globally for the scoring function
taxonomy = load_taxonomy()
taxonomy_keys = set(taxonomy.keys())
with open(RUBRIC, encoding="utf-8") as f:
    rubric = json.load(f)
SIF_THRESHOLD = rubric.get("sif_threshold", 7)
PROMPT = build_prompt(taxonomy, rubric)


def apply_percentile_cap(gold_rows, target_rate=0.22, hard_cap_rate=0.30):
    """
    Percentile-based hard cap fallback (PRD Step 2 calibration note, line 149).

    If the SIF-positive rate exceeds hard_cap_rate (30%), rank all labeled reports
    by total rubric score descending and mark only the top target_rate (22%) as
    SIF-positive. Reports below the cutoff that were originally SIF-positive get
    their sif_potential flipped to false and a note appended.

    This is a legitimate calibration method given the explicit published baseline
    (~20-25%), disclosed as a limitation — not a hack. Returns (n_sif_before,
    n_sif_after, cap_applied: bool).
    """
    labeled = [r for r in gold_rows if (r.get("labeled_by") or "").strip()]
    n = len(labeled)
    if n == 0:
        return 0, 0, False

    n_sif_before = sum(1 for r in labeled if r.get("sif_potential") == "true")
    rate_before = n_sif_before / n

    if rate_before <= hard_cap_rate:
        return n_sif_before, n_sif_before, False

    def total_score(r):
        return (int(r.get("energy_level", 0)) + int(r.get("barrier_failure", 0)) +
                int(r.get("human_proximity", 0)) + int(r.get("exposure_duration", 0)))

    ranked = sorted(labeled, key=lambda r: (total_score(r),
                                             int(r.get("barrier_failure", 0)),
                                             int(r.get("energy_level", 0))),
                    reverse=True)
    n_target = max(1, round(n * target_rate))

    for i, r in enumerate(ranked):
        was_sif = r.get("sif_potential") == "true"
        if i < n_target:
            r["sif_potential"] = "true"
            if not was_sif:
                r["notes"] = (r.get("notes", "") + " [percentile-cap: promoted to SIF+]").strip()
        else:
            r["sif_potential"] = "false"
            if was_sif:
                r["notes"] = (r.get("notes", "") + " [percentile-cap: demoted from SIF+]").strip()

    n_sif_after = sum(1 for r in labeled if r.get("sif_potential") == "true")
    return n_sif_before, n_sif_after, True


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate weak gold labels via LLM rubric scoring.")
    parser.add_argument("--force", action="store_true",
                        help="Re-label ALL reports, even those already labeled (use after prompt changes).")
    parser.add_argument("--no-cap", action="store_true",
                        help="Disable the percentile-based hard cap fallback.")
    args = parser.parse_args()

    # Load all reports
    with open(SEED, encoding="utf-8-sig") as f:
        reports = list(csv.DictReader(f))
    print(f"Loaded {len(reports)} reports from seed_reports.csv")

    # Load existing gold file to preserve structure
    with open(GOLD, encoding="utf-8-sig") as f:
        gold_rows = list(csv.DictReader(f))
        fieldnames = list(csv.DictReader(open(GOLD, encoding="utf-8-sig")).fieldnames)

    # Check which are already labeled (skip if labeled_by is set, unless --force)
    if args.force:
        already = set()
        print("--force: re-labeling ALL reports with current prompt")
    else:
        already = {r["report_id"] for r in gold_rows if (r.get("labeled_by") or "").strip()}
    print(f"Already labeled: {len(already)}, pending: {len(reports) - len(already)}")

    # Build lookup
    gold_by_id = {r["report_id"]: r for r in gold_rows}
    report_by_id = {r["report_id"]: r for r in reports}

    pending = [r for r in reports if r["report_id"] not in already]
    if not pending:
        print("All reports already labeled. Nothing to do.")
        return

    keys = _get_api_keys()
    pool = _ClientPool(keys)
    print(f"Using {len(keys)} API keys, {MAX_WORKERS} workers, model={GOLD_MODEL}")

    results = {}
    write_lock = threading.Lock()
    n_done = 0
    n_total = len(pending)

    def _score_one(r):
        rid = r["report_id"]
        return rid, score_report(r["report_text"], PROMPT, pool)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_score_one, r): r for r in pending}
        for fut in as_completed(futures):
            rid, result = fut.result()
            n_done += 1
            if result:
                results[rid] = result
                if n_done % 10 == 0 or n_done == n_total:
                    print(f"  [gold] {n_done}/{n_total} ({len(results)} scored)", flush=True)
            else:
                print(f"  [gold] {rid} failed, will leave blank", flush=True)

    # Update gold_labeled.csv
    for rid, result in results.items():
        if rid in gold_by_id:
            row = gold_by_id[rid]
            row["iogp_tags"] = result["iogp_tags"]
            row["sif_potential"] = result["sif_potential"]
            row["energy_level"] = str(result["energy_level"])
            row["barrier_failure"] = str(result["barrier_failure"])
            row["human_proximity"] = str(result["human_proximity"])
            row["exposure_duration"] = str(result["exposure_duration"])
            row["notes"] = result["notes"]
            row["labeled_by"] = result["labeled_by"]

    # Percentile-based hard cap fallback (PRD calibration note)
    if not args.no_cap:
        n_before, n_after, cap_applied = apply_percentile_cap(gold_rows)
        if cap_applied:
            n_labeled_total = len([r for r in gold_rows if (r.get("labeled_by") or "").strip()])
            print(f"\nPercentile cap APPLIED (rate was >30%): "
                  f"SIF+ {n_before} -> {n_after} out of {n_labeled_total}")
            print("  (Disclosed as a limitation — see PRD Step 2 calibration note)")

    with open(GOLD, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in gold_rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})

    n_labeled = len(results)
    n_sif = sum(1 for r in results.values() if r["sif_potential"] == "true")
    print(f"\nDone. Labeled {n_labeled}/{n_total} reports (this run).")
    print(f"SIF-positive (this run, pre-cap): {n_sif} ({100*n_sif/max(n_labeled,1):.0f}%)")
    # Report final state of full file
    all_labeled = [r for r in gold_rows if (r.get("labeled_by") or "").strip()]
    all_sif = sum(1 for r in all_labeled if r.get("sif_potential") == "true")
    print(f"SIF-positive (full file, post-cap): {all_sif}/{len(all_labeled)} "
          f"({100*all_sif/max(len(all_labeled),1):.1f}%)")
    print(f"Updated {GOLD.name}")


if __name__ == "__main__":
    main()
