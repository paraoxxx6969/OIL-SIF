"""
Disagreement report — the prioritized labeling queue.

Compares rule_based_predictions.csv vs llm_predictions.csv and surfaces the
reports where the two taggers disagree, sorted by LLM confidence (highest first).
These are the rows where human labeling actually teaches you something —
labeling rows where both models agree is just confirmation.

Also includes all reports where EITHER tagger produced zero tags (both are
uncertain — these need human eyes too).

Output: data/labeling_queue.csv with columns:
  report_id, report_text, rule_tags, llm_tags, llm_top_confidence,
  disagreement_type, priority

Run after both prediction files exist:
  python src/disagreement_report.py
"""
import csv
import sys
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent.parent
SEED = BASE / "data" / "raw" / "seed_reports.csv"
RB_PRED = BASE / "data" / "rule_based_predictions.csv"
LLM_PRED = BASE / "data" / "llm_predictions.csv"
OUT = BASE / "data" / "labeling_queue.csv"


def load_predictions_flat(path):
    """Returns {report_id: [{rule, confidence, evidence, matched_keywords}, ...]}."""
    out = defaultdict(list)
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if not row["rule"]:
                continue
            out[row["report_id"]].append({
                "rule": row["rule"],
                "confidence": float(row["confidence"]) if row["confidence"] else None,
                "evidence": row["evidence"],
                "matched_keywords": row["matched_keywords"],
            })
    return dict(out)


def load_reports():
    out = {}
    with open(SEED, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            out[row["report_id"]] = row["report_text"]
    return out


def main():
    if not RB_PRED.exists():
        print("Missing data/rule_based_predictions.csv — run: python src/tagger.py rule")
        sys.exit(1)
    if not LLM_PRED.exists():
        print("Missing data/llm_predictions.csv — run: python src/tagger.py llm")
        sys.exit(1)

    rb = load_predictions_flat(RB_PRED)
    llm = load_predictions_flat(LLM_PRED)
    reports = load_reports()

    all_ids = sorted(set(rb) | set(llm) | set(reports), key=lambda x: int(x[1:]))

    queue = []
    for rid in all_ids:
        rb_rules = {t["rule"] for t in rb.get(rid, [])}
        llm_tags = llm.get(rid, [])
        llm_rules = {t["rule"] for t in llm_tags}
        llm_top_conf = max((t["confidence"] for t in llm_tags if t["confidence"]), default=0)

        only_llm = llm_rules - rb_rules
        only_rb = rb_rules - llm_rules
        both = rb_rules & llm_rules

        if not rb_rules and not llm_rules:
            dtype, priority = "both_empty", 3
        elif only_llm and not only_rb:
            dtype, priority = "llm_only", 1
        elif only_rb and not only_llm:
            dtype, priority = "rb_only", 2
        elif only_llm and only_rb:
            dtype, priority = "partial_disagree", 1
        else:
            # full agreement — skip, not worth labeling
            continue

        queue.append({
            "report_id": rid,
            "report_text": reports.get(rid, "")[:200],
            "rule_tags": ";".join(sorted(rb_rules)),
            "llm_tags": ";".join(sorted(llm_rules)),
            "llm_top_confidence": round(llm_top_conf, 2),
            "disagreement_type": dtype,
            "priority": priority,
        })

    # Sort: priority asc, then LLM confidence desc (most confident disagreements first)
    queue.sort(key=lambda r: (r["priority"], -r["llm_top_confidence"]))

    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["report_id", "report_text", "rule_tags",
                                          "llm_tags", "llm_top_confidence",
                                          "disagreement_type", "priority"])
        w.writeheader()
        w.writerows(queue)

    # Summary
    from collections import Counter
    types = Counter(r["disagreement_type"] for r in queue)
    print(f"\nLabeling queue: {len(queue)} reports (out of {len(all_ids)} total)")
    print(f"  llm_only (LLM found tags rule-based missed):  {types['llm_only']}")
    print(f"  rb_only  (rule-based found tags LLM missed):  {types['rb_only']}")
    print(f"  partial_disagree (overlap + each has unique): {types['partial_disagree']}")
    print(f"  both_empty (neither tagged — needs human):    {types['both_empty']}")
    print(f"\nWrote {OUT.name}")
    print(f"\nTop 10 to label first (highest-confidence disagreements):")
    for r in queue[:10]:
        print(f"  {r['report_id']} [{r['disagreement_type']}] "
              f"rule={r['rule_tags'] or '-'} llm={r['llm_tags'] or '-'} "
              f"conf={r['llm_top_confidence']}")


if __name__ == "__main__":
    main()
