"""
Precursor Pattern Clustering — Step 4

Surfaces recurring precursor themes (activity, location, barrier failure type)
across SIF-flagged reports using:
  1. Sentence embeddings (all-MiniLM-L6-v2)
  2. BERTopic topic modeling (KMeans + UMAP fallback)
  3. Structured field extraction (spaCy NER + custom OIL-domain dictionary)
  4. Aggregation by (location, activity, cluster) → SIF-density table

Usage:
    python src/clustering.py embeddings   # generate sentence embeddings
    python src/clustering.py cluster      # BERTopic / KMeans+UMAP clustering
    python src/clustering.py extract      # NER + custom field extraction
    python src/clustering.py aggregate    # SIF-density by group
    python src/clustering.py all          # everything, in order
"""
import csv
import json
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parent.parent

SEED = BASE / "data" / "raw" / "seed_reports.csv"
GOLD = BASE / "data" / "gold_labeled.csv"
SIF_SCORES = BASE / "data" / "sif_scores.csv"
LLM_TAGS = BASE / "data" / "llm_predictions.csv"
EMB_OUT = BASE / "data" / "embeddings.npy"
EMB_IDS_OUT = BASE / "data" / "embedding_ids.json"
CLUSTER_OUT = BASE / "data" / "clusters.csv"
FIELDS_OUT = BASE / "data" / "extracted_fields.csv"
AGG_OUT = BASE / "data" / "sif_density.csv"

# ---------------------------------------------------------------------------
# OIL-domain custom term dictionary (PRD 4.3: off-the-shelf NER won't recognize
# oilfield vocabulary — supplementary dictionary required)
# ---------------------------------------------------------------------------

OIL_EQUIPMENT = [
    "rig", "drilling rig", "workover rig", "wellhead", "flowline", "separator",
    "pipeline", "compressor", "pump", "valve", "manifold", "tank", "vessel",
    "boiler", "furnace", "heat exchanger", "column", "tower", "drum",
    "shale shaker", "mud pit", "blowout preventer", "BOP", "christmas tree",
    "choke", "kill line", "standpipe", "rotary table", "drawworks", "top drive",
    "traveling block", "crown block", "derrick", "substructure", "pipe rack",
    "catwalk", "monkey board", "doghouse", "accumulator", "scrubber",
    "flare", "flare boom", "gas plant", "dehydration unit", "tank farm",
    "loading arm", "hose", "swivel", "kelly", "drill pipe", "casing",
    "tubing", "packer", "sucker rod", "pump jack", "electric submersible pump",
    "ESP", "crane", "forklift", "manlift", "scaffold", "ladder",
    "breaker", "transformer", "generator", "switchgear", "motor control center",
    "MCC", "cable", "conduit", "junction box", "panel", "busbar",
    "grinder", "welder", "cutting torch", "air compressor", "pressure washer",
    "conveyor", "pump truck", "vacuum truck", "tanker", "bobcat",
]

OIL_LOCATIONS = [
    "well site", "wellhead", "drilling site", "rig floor", "doghouse",
    "cellar", "tank battery", "separator skid", "compressor station",
    "gas plant", "refinery", "processing unit", "manifold area",
    "pump station", "pipeline right-of-way", "loading dock", "tank farm",
    "warehouse", "workshop", "yard", "field", "offshore platform",
    "process area", "control room", "motor control center", "MCC room",
    "substation", "flare area", "pit", "cellar", "rig floor",
    "derrick", "monkey board", "pipe rack", "catwalk",
    "above ground", "below grade", "confined space", "vault", "tank",
    "vessel", "tower", "column", "drum", "pit",
]

OIL_ACTIVITIES = [
    "drilling", "workover", "completion", "wireline", "logging",
    "cementing", "perforating", "stimulation", "fracking", "acidizing",
    "well testing", "production", "separation", "compression", "dehydration",
    "metering", "sampling", "gauging", "loading", "unloading",
    "pigging", "hydrostatic testing", "pressure testing", "blowdown",
    "purging", "venting", "flaring", "isolation", "depressurization",
    "lockout", "tagout", "LOTO", "electrical isolation", "mechanical isolation",
    "welding", "cutting", "grinding", "hot work", "cold work",
    "scaffold erection", "scaffold dismantling", "painting", "sandblasting",
    "inspection", "maintenance", "turnaround", "shutdown", "commissioning",
    "lifting", "hoisting", "rigging", "moving equipment", "driving",
    "confined space entry", "tank entry", "vessel entry",
    "excavation", "trenching", "earthworks",
    "electrical work", "mechanical work", "instrumentation work",
    "pipe fitting", "welding repair", "valve maintenance",
    "breaker isolation", "switching", "racking out",
]

BARRIER_TYPES = {
    "permit": ["permit", "ptw", "permit to work", "work authorisation",
               "work authorization", "jsa", "job safety analysis", "risk assessment",
               "method statement", "procedure", "isolation certificate",
               "confined space permit", "hot work permit", "height permit",
               "electrical permit", "excavation permit", "lifting permit"],
    "physical_barrier": ["guardrail", "handrail", "barrier", "fence", "cover",
                         "shield", "door", "hatch", "manway", "grating",
                         "scaffold rail", "toe board", "safety net",
                         "machine guard", "interlock", "light curtain"],
    "isolation": ["loto", "lockout", "tagout", "isolation", "de-energize",
                  "de-energized", "energized", "breaker", "valve isolation",
                  "double block and bleed", "DBB", "blinding", "spade",
                  "spectacle blind", "vent", "drain", "bleed"],
    "detection": ["gas test", "gas detection", "h2s monitor", "h2s detector",
                  "atmosphere test", "atmospheric test", "gas monitor",
                  "oxygen test", "LEL", "combustible gas indicator",
                  "personal monitor", "fixed detector"],
    "ppe": ["ppe", "harness", "lanyard", "fall protection", "fall arrest",
            "respirator", "SCBA", "breathing apparatus", "gloves",
            "safety glasses", "face shield", "hearing protection",
            "fire retardant", "FR clothing", "life jacket", "personal flotation"],
    "supervision": ["supervisor", "standby", "spotter", "watchkeeper",
                    "hole watch", "attendant", "safety officer",
                    "permit issuer", "permit holder", "sign-off", "sign off",
                    "authorization", "authorised", "authorized"],
}


def _compile_terms(terms):
    """Compile a list of terms into a single case-insensitive regex."""
    sorted_terms = sorted(terms, key=len, reverse=True)
    escaped = [re.escape(t) for t in sorted_terms]
    return re.compile(r"\b(" + "|".join(escaped) + r")\b", re.IGNORECASE)


_EQUIP_RE = _compile_terms(OIL_EQUIPMENT)
_LOC_RE = _compile_terms(OIL_LOCATIONS)
_ACT_RE = _compile_terms(OIL_ACTIVITIES)
_BARRIER_RES = {k: _compile_terms(v) for k, v in BARRIER_TYPES.items()}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_reports():
    """Load seed reports joined with gold SIF labels and SIF scores."""
    reports = pd.read_csv(SEED, encoding="utf-8-sig")
    gold = pd.read_csv(GOLD, encoding="utf-8-sig")
    gold = gold[gold["labeled_by"].notna() & (gold["labeled_by"] != "")]

    # Merge gold SIF labels
    df = reports.merge(
        gold[["report_id", "sif_potential", "energy_level", "barrier_failure",
              "human_proximity", "exposure_duration", "iogp_tags"]],
        on="report_id", how="left", suffixes=("", "_gold"))

    # Also merge SIF scorer output if available
    if SIF_SCORES.exists():
        scores = pd.read_csv(SIF_SCORES, encoding="utf-8")
        scores = scores.rename(columns={
            "sif_potential": "sif_potential_scored",
            "total_score": "sif_total_score",
            "reasoning": "sif_reasoning"})
        df = df.merge(scores[["report_id", "sif_potential_scored",
                              "sif_total_score", "sif_reasoning"]],
                      on="report_id", how="left")

    # Use gold SIF as primary; fall back to scorer
    df["sif_flag"] = df["sif_potential"].fillna(
        df.get("sif_potential_scored", pd.Series(dtype=str)))
    df["sif_flag"] = df["sif_flag"].astype(str).str.lower() == "true"

    print(f"[clustering] Loaded {len(df)} reports, "
          f"{df['sif_flag'].sum()} SIF-positive")
    return df


# ---------------------------------------------------------------------------
# 4.1 Embeddings
# ---------------------------------------------------------------------------

def run_embeddings():
    """Generate sentence embeddings using all-MiniLM-L6-v2."""
    from sentence_transformers import SentenceTransformer

    df = load_reports()
    print("[embeddings] Loading all-MiniLM-L6-v2...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    texts = df["report_text"].tolist()
    ids = df["report_id"].tolist()
    print(f"[embeddings] Encoding {len(texts)} reports...")
    emb = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    np.save(EMB_OUT, emb)
    with open(EMB_IDS_OUT, "w") as f:
        json.dump(ids, f)
    print(f"[embeddings] Saved {emb.shape} to {EMB_OUT.name}")
    return emb, ids


def load_embeddings():
    if not EMB_OUT.exists():
        raise RuntimeError("Embeddings not found — run `python src/clustering.py embeddings` first")
    emb = np.load(EMB_OUT)
    with open(EMB_IDS_OUT) as f:
        ids = json.load(f)
    return emb, ids


# ---------------------------------------------------------------------------
# 4.2 Clustering
# ---------------------------------------------------------------------------

def run_cluster():
    """BERTopic clustering with KMeans+UMAP fallback."""
    emb, ids = load_embeddings()
    df = load_reports()
    id_to_sif = dict(zip(df["report_id"], df["sif_flag"]))
    id_to_text = dict(zip(df["report_id"], df["report_text"]))

    cluster_labels = None
    method = None

    # Try BERTopic first
    try:
        from bertopic import BERTopic
        from bertopic.vectorizers import ClassTfidfTransformer
        from sklearn.cluster import KMeans
        from sklearn.feature_extraction.text import CountVectorizer
        from umap import UMAP

        print("[cluster] Attempting BERTopic...")
        # Use KMeans instead of HDBSCAN to force non-noise clusters
        n_clusters = min(8, max(3, len(ids) // 15))
        umap_model = UMAP(n_neighbors=8, n_components=5,
                          metric="cosine", random_state=42)
        cluster_model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        vectorizer = CountVectorizer(stop_words="english",
                                     ngram_range=(1, 2),
                                     min_df=2)
        ctfidf = ClassTfidfTransformer(reduce_frequent_words=True)

        topic_model = BERTopic(
            umap_model=umap_model,
            hdbscan_model=cluster_model,
            vectorizer_model=vectorizer,
            ctfidf_model=ctfidf,
            nr_topics="auto",
            calculate_probabilities=False,
            verbose=True,
        )
        texts = [id_to_text[i] for i in ids]
        topics, _ = topic_model.fit_transform(texts, embeddings=emb)
        cluster_labels = topics
        method = "bertopic"

        # Print topic info
        topic_info = topic_model.get_topic_info()
        print(f"\n[cluster] BERTopic found {len(topic_info)} topics:")
        print(topic_info[["Topic", "Count", "Name"]].to_string(index=False))

        # Save topic representations for naming
        topic_names = {}
        for topic_id in sorted(set(topics)):
            if topic_id == -1:
                topic_names[topic_id] = "outlier"
                continue
            words = topic_model.get_topic(topic_id)
            if words:
                top_words = [w[0] for w in words[:5]]
                topic_names[topic_id] = "_".join(top_words)
            else:
                topic_names[topic_id] = f"topic_{topic_id}"

        # Save topic model info for the dashboard
        topic_info.to_csv(BASE / "data" / "topic_info.csv", index=False)

    except Exception as e:
        print(f"[cluster] BERTopic failed ({type(e).__name__}: {e}), "
              f"falling back to KMeans + UMAP")
        method = "kmeans_umap"

        from sklearn.cluster import KMeans
        from umap import UMAP

        n_clusters = min(8, max(3, len(ids) // 15))
        reducer = UMAP(n_neighbors=8, n_components=5,
                       metric="cosine", random_state=42)
        emb_reduced = reducer.fit_transform(emb)
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = km.fit_predict(emb_reduced).tolist()

        # Name clusters by top TF-IDF terms
        from sklearn.feature_extraction.text import TfidfVectorizer
        texts = [id_to_text[i] for i in ids]
        tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2),
                                min_df=2, max_features=500)
        tfidf_mat = tfidf.fit_transform(texts)
        feature_names = tfidf.get_feature_names_out()

        topic_names = {}
        for cid in sorted(set(cluster_labels)):
            mask = [i for i, c in enumerate(cluster_labels) if c == cid]
            centroid = tfidf_mat[mask].mean(axis=0).A1
            top_idx = centroid.argsort()[-5:][::-1]
            top_words = [feature_names[i] for i in top_idx]
            topic_names[cid] = "_".join(top_words)
            print(f"  cluster {cid}: {top_words} ({len(mask)} reports)")

    # Write cluster assignments
    rows = []
    for rid, label in zip(ids, cluster_labels):
        name = topic_names.get(label, f"cluster_{label}")
        rows.append({
            "report_id": rid,
            "cluster_id": label,
            "cluster_name": name,
            "sif_potential": id_to_sif.get(rid, False),
            "method": method,
        })

    out_df = pd.DataFrame(rows)
    out_df.to_csv(CLUSTER_OUT, index=False)
    print(f"\n[cluster] Saved {len(out_df)} cluster assignments to {CLUSTER_OUT.name}")

    # SIF-density per cluster
    for name, group in out_df.groupby("cluster_name"):
        n = len(group)
        n_sif = group["sif_potential"].sum()
        print(f"  {name}: {n} reports, {n_sif} SIF+ ({100*n_sif/n:.0f}%)")

    return out_df


# ---------------------------------------------------------------------------
# 4.3 Structured Field Extraction
# ---------------------------------------------------------------------------

def run_extract():
    """Extract activity, location, equipment, barrier type via regex dictionary
    + spaCy NER for person/org names (supplementary, not primary)."""
    df = load_reports()

    # Try to load spaCy for supplementary NER
    nlp = None
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm", disable=["parser", "lemmatizer"])
        print("[extract] spaCy en_core_web_sm loaded for supplementary NER")
    except Exception as e:
        print(f"[extract] spaCy unavailable ({e}), using dictionary-only extraction")

    rows = []
    for _, r in df.iterrows():
        text = r["report_text"]
        rid = r["report_id"]

        # Dictionary-based extraction (primary)
        equipment = sorted(set(m.group(0).lower() for m in _EQUIP_RE.finditer(text)))
        locations = sorted(set(m.group(0).lower() for m in _LOC_RE.finditer(text)))
        activities = sorted(set(m.group(0).lower() for m in _ACT_RE.finditer(text)))
        barriers = sorted(set(
            bt for bt_name, pat in _BARRIER_RES.items()
            for m in pat.finditer(text)
            for bt in [bt_name] if m
        ))

        # spaCy NER (supplementary — captures site names, org names not in dict)
        entities = {"person": [], "org": [], "gpe": []}
        if nlp:
            doc = nlp(text[:5000])  # truncate very long texts
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    entities["person"].append(ent.text.lower())
                elif ent.label_ == "ORG":
                    entities["org"].append(ent.text.lower())
                elif ent.label_ == "GPE":  # geopolitical entity (city, state, country)
                    entities["gpe"].append(ent.text.lower())

        rows.append({
            "report_id": rid,
            "equipment": ";".join(equipment[:5]),
            "location": ";".join(locations[:3]),
            "activity": ";".join(activities[:3]),
            "barrier_type": ";".join(barriers),
            "ner_person": ";".join(sorted(set(entities["person"]))[:3]),
            "ner_org": ";".join(sorted(set(entities["org"]))[:3]),
            "ner_gpe": ";".join(sorted(set(entities["gpe"]))[:3]),
            "sif_potential": r["sif_flag"],
        })

    out_df = pd.DataFrame(rows)
    out_df.to_csv(FIELDS_OUT, index=False)
    print(f"[extract] Saved {len(out_df)} extracted-field rows to {FIELDS_OUT.name}")

    # Summary
    print(f"\n  Equipment mentions: {sum(1 for r in rows if r['equipment'])}/{len(rows)}")
    print(f"  Location mentions:  {sum(1 for r in rows if r['location'])}/{len(rows)}")
    print(f"  Activity mentions:  {sum(1 for r in rows if r['activity'])}/{len(rows)}")
    print(f"  Barrier mentions:   {sum(1 for r in rows if r['barrier_type'])}/{len(rows)}")

    # Top terms
    all_equip = Counter()
    all_loc = Counter()
    all_act = Counter()
    all_bar = Counter()
    for r in rows:
        for e in r["equipment"].split(";"):
            if e: all_equip[e] += 1
        for l in r["location"].split(";"):
            if l: all_loc[l] += 1
        for a in r["activity"].split(";"):
            if a: all_act[a] += 1
        for b in r["barrier_type"].split(";"):
            if b: all_bar[b] += 1

    print(f"\n  Top equipment: {all_equip.most_common(10)}")
    print(f"  Top locations: {all_loc.most_common(10)}")
    print(f"  Top activities: {all_act.most_common(10)}")
    print(f"  Top barriers:  {all_bar.most_common(10)}")

    return out_df


# ---------------------------------------------------------------------------
# 4.4 Aggregation — SIF-density by (location, activity, cluster)
# ---------------------------------------------------------------------------

def run_aggregate():
    """Group by (location, activity, cluster) → SIF-density table for dashboard."""
    df = load_reports()

    # Load clusters and extracted fields
    cluster_df = pd.read_csv(CLUSTER_OUT)
    fields_df = pd.read_csv(FIELDS_OUT)

    # Merge everything
    df = df.merge(cluster_df[["report_id", "cluster_name"]], on="report_id", how="left")
    df = df.merge(fields_df[["report_id", "equipment", "location", "activity",
                             "barrier_type"]], on="report_id", how="left",
                  suffixes=("", "_ext"))

    # Fill NaN
    for col in ["equipment", "location", "activity", "barrier_type", "cluster_name"]:
        df[col] = df[col].fillna("unspecified")

    # Explode multi-value fields (semicolon-separated) into rows
    def explode_field(df, field):
        rows = []
        for _, r in df.iterrows():
            vals = [v.strip() for v in str(r[field]).split(";") if v.strip()]
            if not vals:
                vals = ["unspecified"]
            for v in vals:
                rows.append({**r.to_dict(), field: v})
        return pd.DataFrame(rows)

    # Build aggregation tables
    aggregations = []

    # By activity
    act_df = explode_field(df, "activity")
    for (act), group in act_df.groupby("activity"):
        n = len(group)
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "activity", "value": act,
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    # By location
    loc_df = explode_field(df, "location")
    for (loc), group in loc_df.groupby("location"):
        n = len(group)
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "location", "value": loc,
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    # By cluster
    for (cl), group in df.groupby("cluster_name"):
        n = len(group)
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "cluster", "value": cl,
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    # By barrier type
    bar_df = explode_field(df, "barrier_type")
    for (bar), group in bar_df.groupby("barrier_type"):
        n = len(group)
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "barrier_type", "value": bar,
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    # By equipment
    eq_df = explode_field(df, "equipment")
    for (eq), group in eq_df.groupby("equipment"):
        n = len(group)
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "equipment", "value": eq,
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    # By (activity, location) — the heatmap feed
    for (act, loc), group in act_df.groupby(["activity", "location"]):
        n = len(group)
        if n < 2:  # skip single-report combos
            continue
        n_sif = group["sif_flag"].sum()
        aggregations.append({
            "dimension": "activity_x_location",
            "value": f"{act} @ {loc}",
            "n_reports": n, "n_sif": int(n_sif),
            "sif_density": n_sif / n if n else 0,
        })

    agg_df = pd.DataFrame(aggregations)
    agg_df = agg_df.sort_values(["dimension", "sif_density"],
                                ascending=[True, False])
    agg_df.to_csv(AGG_OUT, index=False)
    print(f"[aggregate] Saved {len(agg_df)} aggregation rows to {AGG_OUT.name}")

    # Print top SIF-density groups (the dashboard's headline view)
    print("\n=== Top SIF-density groups (n>=2) ===")
    for dim in ["activity", "location", "cluster", "barrier_type",
                "activity_x_location"]:
        sub = agg_df[(agg_df["dimension"] == dim) & (agg_df["n_reports"] >= 2)]
        if sub.empty:
            continue
        print(f"\n  [{dim}]")
        for _, r in sub.head(8).iterrows():
            print(f"    {r['value']:<40} n={r['n_reports']:>3}  "
                  f"SIF+={r['n_sif']:>2}  density={r['sif_density']:.0%}")

    return agg_df


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("embeddings", "all"):
        run_embeddings()
    if cmd in ("cluster", "all"):
        run_cluster()
    if cmd in ("extract", "all"):
        run_extract()
    if cmd in ("aggregate", "all"):
        run_aggregate()
