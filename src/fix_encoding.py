"""
One-off cleanup: normalize smart quotes / em-dashes / replacement chars in the
seed and gold CSVs so evidence spans and dashboard text render cleanly.

Run once:  python src/fix_encoding.py
"""
import csv
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SEED = BASE / "data" / "raw" / "seed_reports.csv"
GOLD = BASE / "data" / "gold_labeled.csv"

# Map of bad -> good. U+FFFD is the replacement char from a botched decode;
# the originals were almost certainly em-dashes (—) in the OSHA narrative.
REPLACEMENTS = {
    "\ufffd": "-",      # replacement char -> hyphen (was an em-dash)
    "\u2014": "-",      # em dash
    "\u2013": "-",      # en dash
    "\u2019": "'",      # right single quote
    "\u2018": "'",      # left single quote
    "\u201c": '"',      # left double quote
    "\u201d": '"',      # right double quote
    "\u00a0": " ",      # non-breaking space
}


def clean(s):
    if not s:
        return s
    for bad, good in REPLACEMENTS.items():
        s = s.replace(bad, good)
    # collapse double-hyphens that em-dash replacement can create
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip()


def fix_file(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    changed = 0
    for r in rows:
        for k, v in r.items():
            new = clean(v)
            if new != v:
                r[k] = new
                changed += 1

    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"{path.name}: {len(rows)} rows, {changed} cell(s) cleaned")


if __name__ == "__main__":
    fix_file(SEED)
    fix_file(GOLD)
