"""Retry pending SIF scores using flash-lite as fallback."""
import sys, csv, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from tagger import _get_api_keys, _ClientPool
import sif_scorer

# Override model to flash-lite (separate quota from flash)
sif_scorer.SCORER_MODEL = "gemini-3.5-flash-lite"

BASE = Path(__file__).resolve().parent.parent
keys = _get_api_keys()
pool = _ClientPool(keys)

# Load existing scores
with open(BASE / "data" / "sif_scores.csv", encoding="utf-8") as f:
    done = {r["report_id"] for r in csv.DictReader(f)}

# Load seed reports
with open(BASE / "data" / "raw" / "seed_reports.csv", encoding="utf-8-sig") as f:
    reports = list(csv.DictReader(f))

pending = [r for r in reports if r["report_id"] not in done]
print(f"Pending: {len(pending)} reports (using flash-lite fallback)")

prompt = sif_scorer.build_prompt()
FACTORS = sif_scorer.FACTORS
fieldnames = ["report_id"] + FACTORS + ["total_score", "sif_potential", "reasoning"]

with open(BASE / "data" / "sif_scores.csv", "a", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    for r in pending:
        rid = r["report_id"]
        result = sif_scorer.score_report(r["report_text"], prompt, pool)
        if result:
            w.writerow({"report_id": rid, **result})
            f.flush()
            print(f"  {rid}: score={result['total_score']} sif={result['sif_potential']}")
        else:
            print(f"  {rid}: FAILED")
        time.sleep(1)

# Final count
with open(BASE / "data" / "sif_scores.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
n_sif = sum(1 for r in rows if r["sif_potential"] == "true")
print(f"\nFinal: {len(rows)} scored, {n_sif} SIF+ ({100*n_sif/len(rows):.0f}%)")
