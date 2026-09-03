"""
merge_kaggle_dataset.py
------------------------
Purpose: Merge the Kaggle "Industrial Safety and Health Analytics Database"
with your synthetic OIL-SIF dataset into one training-ready CSV.

HOW TO USE:
1. Download the Kaggle dataset from:
   https://www.kaggle.com/datasets/ihmstefanini/industrial-safety-and-health-analytics-database
   (file is usually named "IHMStefanini_industrial_safety_and_health_database_with_accidents_description.csv")

2. Place it in the SAME folder as this script, or update KAGGLE_CSV_PATH below.

3. Run:  python3 merge_kaggle_dataset.py

4. Output: oil_sif_merged_dataset.csv  (Kaggle rows + your synthetic rows, same schema)

NOTE ON LABELING RULE:
The Kaggle dataset does NOT provide a ready SIF label. This script applies a
STARTING/DRAFT mapping rule from "Potential Accident Level" (I, II, III, IV, V, VI)
to sif_label. THIS RULE IS NOT VALIDATED — you (or your HSE team) MUST review and
adjust it before using this data to train a production model. Do not treat this
as ground truth; treat it as a first-pass label to be corrected by expert review.

Draft rule used here (EDIT AS NEEDED):
    Potential Accident Level IV, V, VI  -> sif_label = 1  (high/fatal potential)
    Potential Accident Level I, II, III -> sif_label = 0  (lower potential)
"""

import csv
import os

KAGGLE_CSV_PATH = "IHMStefanini_industrial_safety_and_health_database_with_accidents_description.csv"
SYNTHETIC_CSV_PATH = "oil_sif_synthetic_dataset_v2.csv"
OUTPUT_PATH = "oil_sif_merged_dataset.csv"

FIELDS = ["report_id", "report_text", "sif_label", "risk_level", "life_saving_rule",
          "activity", "location", "hazard", "barrier_failure", "potential_consequence",
          "source", "expert_verified"]

# ---- Draft Potential Accident Level -> SIF mapping. VALIDATE WITH HSE BEFORE USE. ----
HIGH_POTENTIAL_LEVELS = {"IV", "V", "VI"}


def map_kaggle_row(row, idx):
    """Map one Kaggle dataset row into the OIL-SIF schema."""
    description = (row.get("Description") or "").strip()
    potential_level = (row.get("Potential Accident Level") or "").strip().upper()
    critical_risk = (row.get("Critical Risk") or "").strip()
    industry_sector = (row.get("Industry Sector") or "").strip()
    local = (row.get("Local") or "").strip()
    accident_level = (row.get("Accident Level") or "").strip()

    sif_label = 1 if potential_level in HIGH_POTENTIAL_LEVELS else 0
    risk_level = "Critical" if sif_label == 1 else "Low"

    return {
        "report_id": f"KAG{idx:05d}",
        "report_text": description,
        "sif_label": sif_label,
        "risk_level": risk_level,
        "life_saving_rule": "",           # not available in Kaggle data — fill via HSE annotation
        "activity": industry_sector,
        "location": local,
        "hazard": critical_risk,
        "barrier_failure": "",            # not available — fill via HSE annotation
        "potential_consequence": f"Potential Level {potential_level} / Actual {accident_level}",
        "source": "Kaggle",
        "expert_verified": "No",
    }


def main():
    merged_rows = []

    # --- Load Kaggle data if present ---
    if os.path.exists(KAGGLE_CSV_PATH):
        with open(KAGGLE_CSV_PATH, newline="", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=1):
                mapped = map_kaggle_row(row, idx)
                if mapped["report_text"]:  # skip empty descriptions
                    merged_rows.append(mapped)
        print(f"Loaded {len(merged_rows)} rows from Kaggle dataset.")
    else:
        print(f"WARNING: '{KAGGLE_CSV_PATH}' not found in this folder. "
              f"Download it from Kaggle and place it here, then re-run this script. "
              f"Continuing with synthetic data only.")

    # --- Load your synthetic dataset ---
    if os.path.exists(SYNTHETIC_CSV_PATH):
        with open(SYNTHETIC_CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            synth_rows = list(reader)
            merged_rows.extend(synth_rows)
        print(f"Loaded {len(synth_rows)} rows from synthetic dataset.")
    else:
        print(f"WARNING: '{SYNTHETIC_CSV_PATH}' not found in this folder.")

    # --- Write merged output ---
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for row in merged_rows:
            writer.writerow({k: row.get(k, "") for k in FIELDS})

    sif1 = sum(1 for r in merged_rows if str(r.get("sif_label")) == "1")
    sif0 = sum(1 for r in merged_rows if str(r.get("sif_label")) == "0")
    print(f"\nMerged dataset written to: {OUTPUT_PATH}")
    print(f"Total rows: {len(merged_rows)}")
    print(f"SIF=1: {sif1}  |  SIF=0: {sif0}")
    print("\nREMINDER: 'life_saving_rule' and 'barrier_failure' are blank for Kaggle rows.")
    print("These need HSE expert annotation before production training.")
    print("Also VALIDATE the Potential-Level -> SIF mapping rule with your HSE team.")


if __name__ == "__main__":
    main()
