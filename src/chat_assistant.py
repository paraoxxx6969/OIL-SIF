"""
Conversational HSE Assistant — Step 6.1

Chat interface layered on top of the dashboard's already-structured output
(tagged reports, SIF scores, clusters). The assistant queries this structured
data — it does not re-read raw report text from scratch each time.

Every answer is grounded in specific underlying reports and the rubric factors
that drove a score.

Two layers:
  1. Rule-based query engine — handles common question patterns instantly,
     no API needed (works offline, works when quota is exhausted)
  2. LLM fallback — for free-form questions, sends structured context to the
     LLM and returns a grounded answer (requires API quota)

Usage from dashboard:
    from chat_assistant import answer_query
    response = answer_query(question, df, data)
"""
import re
import sys
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Rule-based query patterns
# ---------------------------------------------------------------------------

# Hindi + English keyword patterns for common questions
PATTERNS = {
    "top_risk_sites": {
        "keywords": ["sabse khatarnak", "sabse khatarnak site", "most dangerous",
                     "highest risk", "top risk", "sabse high risk",
                     "kaunsa site", "which site", "khatarnak site",
                     "riskiest", "sabse risk"],
        "hindi": ["sabse khatarnak", "kaunsa site khatarnak", "sabse high risk"],
    },
    "top_risk_activities": {
        "keywords": ["risky activity", "khatarnak activity", "khatarnak kaam",
                     "most dangerous activity", "top activities",
                     "sabse khatarnak kaam", "riskiest activity",
                     "kaunsa activity", "kaunsa kaam"],
    },
    "sif_positive_list": {
        "keywords": ["sif positive", "sif+ reports", "sif wale reports",
                     "fatal potential", "sif dikhao", "sif positive dikhao",
                     "sif wale", "sif reports", "high sif",
                     "sif potential wale", "fatal wale"],
    },
    "sif_count": {
        "keywords": ["how many sif", "kitne sif", "sif count",
                     "sif positive kitne", "kitne fatal",
                     "how many fatal", "sif kitne",
                     "total sif", "sif total"],
    },
    "permit_violations": {
        "keywords": ["permit violation", "permit wale", "ptw",
                     "work authorisation", "work authorization",
                     "permit reports", "permit related",
                     "permit kitne", "permit wale reports"],
    },
    "energy_isolation": {
        "keywords": ["energy isolation", "loto", "lockout", "isolation",
                     "energy isolation wale", "isolation reports",
                     "loto reports", "isolation wale"],
    },
    "working_at_height": {
        "keywords": ["working at height", "height", "scaffold",
                     "height wale", "upar kaam", "height reports",
                     "scaffold reports", "height related"],
    },
    "line_of_fire": {
        "keywords": ["line of fire", "line of fire wale",
                     "crush", "falling load", "suspended load",
                     "line of fire reports"],
    },
    "hot_work": {
        "keywords": ["hot work", "welding", "cutting", "grinding",
                     "hot work wale", "welding reports",
                     "hot work reports", "aag"],
    },
    "confined_space": {
        "keywords": ["confined space", "tank entry", "vessel entry",
                     "confined space wale", "tank entry reports",
                     "confined space reports", "andar entry"],
    },
    "driving": {
        "keywords": ["driving", "vehicle", "truck", "road",
                     "driving wale", "vehicle reports",
                     "driving reports", "gaadi"],
    },
    "lifting": {
        "keywords": ["lifting", "crane", "rigging", "suspended load",
                     "lifting wale", "crane reports",
                     "rigging reports", "lifting reports",
                     "crane wale", "rigging wale"],
    },
    "bypassing_safety": {
        "keywords": ["bypassing", "bypass", "defeated", "interlock",
                     "bypass wale", "safety bypass",
                     "bypassing safety", "interlock defeated"],
    },
    "top_clusters": {
        "keywords": ["cluster", "precursor", "pattern",
                     "kaunsa cluster", "top clusters",
                     "cluster dikhao", "precursor pattern",
                     "recurring pattern", "pattern dikhao"],
    },
    "barrier_failure": {
        "keywords": ["barrier failure", "barrier", "guardrail",
                     "barrier fail", "barrier kahan",
                     "barrier wale", "physical barrier",
                     "barrier failure wale"],
    },
    "help": {
        "keywords": ["help", "madad", "kya kar sakte", "what can you do",
                     "options", "commands", "kaise use",
                     "kya puch sakte", "help me"],
    },
}


def _normalize(text):
    return text.lower().strip()


def _match_pattern(question):
    """Return the matched pattern key or None."""
    q = _normalize(question)

    # Check help first
    if any(kw in q for kw in PATTERNS["help"]["keywords"]):
        return "help"

    # Check IOGP rule patterns (more specific) before generic risk patterns
    iogp_keys = ["permit_violations", "energy_isolation", "working_at_height",
                 "line_of_fire", "hot_work", "confined_space", "driving",
                 "lifting", "bypassing_safety"]
    for key in iogp_keys:
        for kw in PATTERNS[key]["keywords"]:
            if kw in q:
                return key

    # Check SIF-specific patterns
    for key in ["sif_count", "sif_positive_list"]:
        for kw in PATTERNS[key]["keywords"]:
            if kw in q:
                return key

    # Check cluster/barrier patterns
    for key in ["top_clusters", "barrier_failure"]:
        for kw in PATTERNS[key]["keywords"]:
            if kw in q:
                return key

    # Now check generic risk patterns — disambiguate sites vs activities
    if any(kw in q for kw in PATTERNS["top_risk_activities"]["keywords"]):
        # But if "site" or "location" is also in the question, it's about sites
        if "site" in q or "location" in q:
            return "top_risk_sites"
        return "top_risk_activities"
    if any(kw in q for kw in PATTERNS["top_risk_sites"]["keywords"]):
        # But if "activity" or "kaam" is also in the question, it's about activities
        if "activity" in q or "kaam" in q:
            return "top_risk_activities"
        return "top_risk_sites"

    return None


# ---------------------------------------------------------------------------
# Answer generators — each returns a grounded answer string
# ---------------------------------------------------------------------------

def _format_report_list(reports, max_n=5):
    """Format a list of report dicts into a readable list."""
    lines = []
    for _, r in reports.head(max_n).iterrows():
        sif_marker = "🔴" if r.get("sif_flag", False) else "🟢"
        rid = r["report_id"]
        text = str(r["report_text"])[:100] + "..."
        tags = r.get("iogp_tags_gold", "") or r.get("iogp_tags", "") or ""
        score = r.get("sif_total_score", "")
        score_str = f" (score: {int(score)}/8)" if pd.notna(score) and score != "" else ""
        lines.append(f"{sif_marker} **{rid}**{score_str} `{tags}`\n   > {text}")
    if len(reports) > max_n:
        lines.append(f"\n_...aur {len(reports) - max_n} reports_")
    return "\n\n".join(lines) if lines else "_Koi reports nahi mile_"


def answer_top_risk_sites(df, data):
    if "density" not in data:
        return "Location data available nahi hai."
    density = data["density"]
    loc = density[(density["dimension"] == "location") &
                  (density["n_reports"] >= 2)]
    if loc.empty:
        return "Location-wise data mein koi site nahi mila (n≥2 filter)."
    loc = loc.sort_values("sif_density", ascending=False).head(5)
    lines = ["**📍 Top risky locations (SIF-density se):**\n"]
    for _, r in loc.iterrows():
        lines.append(
            f"  • **{r['value']}**: {r['n_sif']}/{r['n_reports']} SIF+ "
            f"({r['sif_density']:.0%})")
    lines.append("\n_Ye data extracted location fields se aaya hai. "
                 "Bahut saare reports mein location unspecified hai._")
    return "\n".join(lines)


def answer_top_risk_activities(df, data):
    if "density" not in data:
        return "Activity data available nahi hai."
    density = data["density"]
    act = density[(density["dimension"] == "activity") &
                  (density["n_reports"] >= 2)]
    if act.empty:
        return "Activity-wise data mein koi activity nahi mila (n≥2 filter)."
    act = act.sort_values("sif_density", ascending=False).head(5)
    lines = ["**🔨 Top risky activities (SIF-density se):**\n"]
    for _, r in act.iterrows():
        lines.append(
            f"  • **{r['value']}**: {r['n_sif']}/{r['n_reports']} SIF+ "
            f"({r['sif_density']:.0%})")
    return "\n".join(lines)


def answer_sif_positive_list(df, data):
    sif_df = df[df["sif_flag"]].sort_values(
        "sif_total_score", ascending=False) if "sif_total_score" in df.columns \
        else df[df["sif_flag"]]
    lines = [f"**🔴 SIF-Positive Reports ({len(sif_df)} total):**\n"]
    lines.append(_format_report_list(sif_df, max_n=8))
    return "\n".join(lines)


def answer_sif_count(df, data):
    n_total = len(df)
    n_sif = int(df["sif_flag"].sum())
    rate = n_sif / n_total if n_total else 0
    return (
        f"**📊 SIF-Potential Count:**\n\n"
        f"  • Total reports: **{n_total}**\n"
        f"  • SIF-positive: **{n_sif}** ({rate:.0%})\n"
        f"  • SIF-negative: **{n_total - n_sif}**\n\n"
        f"_Industry baseline ~20-25% hai. Hamara system calibrated hai "
        f"is range pe._"
    )


def answer_by_iogp_rule(df, data, rule_key, rule_display):
    """Generic answer for questions about a specific IOGP rule."""
    # Check gold tags
    if "iogp_tags_gold" in df.columns:
        mask = df["iogp_tags_gold"].astype(str).str.contains(rule_key, na=False)
    else:
        mask = pd.Series([False] * len(df))

    rule_df = df[mask]
    n = len(rule_df)
    n_sif = int(rule_df["sif_flag"].sum()) if n else 0

    lines = [f"**📋 {rule_display} Reports ({n} total, {n_sif} SIF+):**\n"]
    if n == 0:
        lines.append("_Koi reports nahi mile is rule ke liye._")
        return "\n".join(lines)

    sif_rate = n_sif / n if n else 0
    lines.append(f"SIF-density: **{sif_rate:.0%}**\n")
    lines.append(_format_report_list(rule_df, max_n=8))
    return "\n".join(lines)


def answer_top_clusters(df, data):
    if "density" not in data:
        return "Cluster data available nahi hai."
    density = data["density"]
    clusters = density[density["dimension"] == "cluster"].sort_values(
        "sif_density", ascending=False)
    if clusters.empty:
        return "Koi clusters nahi mile."
    lines = ["**🎯 Precursor Clusters (SIF-density se ranked):**\n"]
    for _, r in clusters.iterrows():
        lines.append(
            f"  • **{r['value']}**: {r['n_sif']}/{r['n_reports']} SIF+ "
            f"({r['sif_density']:.0%})")
    lines.append("\n_Ye clusters BERTopic se bane hain — similar reports "
                 "ko group karta hai._")
    return "\n".join(lines)


def answer_barrier_failure(df, data):
    if "density" not in data:
        return "Barrier data available nahi hai."
    density = data["density"]
    bar = density[density["dimension"] == "barrier_type"].sort_values(
        "sif_density", ascending=False)
    if bar.empty:
        return "Koi barrier type data nahi mila."
    lines = ["**🚧 SIF-density by Barrier Failure Type:**\n"]
    for _, r in bar.iterrows():
        lines.append(
            f"  • **{r['value']}**: {r['n_sif']}/{r['n_reports']} SIF+ "
            f"({r['sif_density']:.0%})")
    lines.append(
        "\n_Key insight: Permit violations (administrative) = low SIF-density, "
        "physical barrier failures = high SIF-density. Ye rubric calibration "
        "validate karta hai._")
    return "\n".join(lines)


def answer_help():
    return (
        "**🤖 Main kya kar saktha hu:**\n\n"
        "Tu ye sawal puch sakta hai (Hindi ya English mein):\n\n"
        "**Risk dekhna:**\n"
        "  • \"Kaunsa site sabse khatarnak hai?\"\n"
        "  • \"Top risky activities kya hain?\"\n"
        "  • \"Kaunsa cluster sabse zyada SIF-positive hai?\"\n"
        "  • \"Barrier failure types kya hain?\"\n\n"
        "**Reports dekhna:**\n"
        "  • \"SIF positive reports dikhao\"\n"
        "  • \"Kitne SIF positive hain?\"\n"
        "  • \"Energy isolation wale reports\"\n"
        "  • \"Working at height reports\"\n"
        "  • \"Permit violations kitne hain?\"\n"
        "  • \"Hot work / welding reports\"\n"
        "  • \"Confined space reports\"\n"
        "  • \"Lifting / crane reports\"\n"
        "  • \"Driving reports\"\n"
        "  • \"Bypassing safety reports\"\n"
        "  • \"Line of fire reports\"\n\n"
        "**Patterns:**\n"
        "  • \"Precursor patterns dikhao\"\n"
        "  • \"Top clusters kya hain?\"\n\n"
        "_Har answer specific reports ke saath aayega jisse tu verify kar sake._"
    )


# ---------------------------------------------------------------------------
# LLM fallback for free-form questions
# ---------------------------------------------------------------------------

def answer_with_llm(question, df, data):
    """Send structured context to LLM for free-form questions."""
    try:
        sys.path.insert(0, str(BASE / "src"))
        from tagger import _get_api_keys, _ClientPool
        import json
        from dotenv import load_dotenv
        load_dotenv(BASE / ".env")

        keys = _get_api_keys()
        if not keys:
            return None  # Fall back to default message
        pool = _ClientPool(keys)

        # Build context summary from structured data
        context_parts = []
        context_parts.append(f"Total reports: {len(df)}")
        context_parts.append(f"SIF-positive: {int(df['sif_flag'].sum())}")

        if "density" in data:
            density = data["density"]
            for dim in ["activity", "location", "cluster", "barrier_type"]:
                sub = density[density["dimension"] == dim].head(5)
                if not sub.empty:
                    items = [f"{r['value']} ({r['n_sif']}/{r['n_reports']})"
                             for _, r in sub.iterrows()]
                    context_parts.append(f"Top {dim}: {', '.join(items)}")

        # Sample SIF+ reports
        sif_df = df[df["sif_flag"]].head(10)
        if not sif_df.empty:
            sample = [f"{r['report_id']}: {str(r['report_text'])[:80]}"
                      for _, r in sif_df.iterrows()]
            context_parts.append(f"Sample SIF+ reports: {' | '.join(sample)}")

        context = "\n".join(context_parts)

        prompt = f"""You are an HSE assistant for Oil India Limited. Answer the user's
question based on the structured safety report data below. Ground your answer in
specific report IDs and rubric factors. Answer in the same language the user used
(Hindi if they asked in Hindi, English if English). Be concise.

STRUCTURED DATA:
{context}

USER QUESTION: {question}

Answer:"""

        import re
        c = pool.next()
        response = c.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={"temperature": 0.2, "max_output_tokens": 1024},
        )
        raw = (response.text or "").strip()
        return raw

    except Exception as e:
        return None  # Fall back to default message


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

IOGP_RULE_MAP = {
    "energy_isolation": ("energy_isolation", "Energy Isolation"),
    "working_at_height": ("working_at_height", "Working at Height"),
    "hot_work": ("hot_work", "Hot Work"),
    "confined_space": ("confined_space", "Confined Space"),
    "driving": ("driving", "Driving"),
    "lifting": ("safe_mechanical_lifting", "Safe Mechanical Lifting"),
    "bypassing_safety": ("bypassing_safety_controls", "Bypassing Safety Controls"),
    "line_of_fire": ("line_of_fire", "Line of Fire"),
    "permit_violations": ("work_authorisation", "Work Authorisation / Permit"),
}


def answer_query(question, df, data, use_llm=True):
    """
    Answer a user question about the safety data.

    Args:
        question: User's question (Hindi or English)
        df: Master DataFrame with all merged data
        data: Dict of all loaded data files
        use_llm: Whether to try LLM fallback for unmatched questions

    Returns:
        Answer string (markdown formatted)
    """
    if not question or not question.strip():
        return answer_help()

    pattern = _match_pattern(question)

    if pattern == "help":
        return answer_help()
    elif pattern == "top_risk_sites":
        return answer_top_risk_sites(df, data)
    elif pattern == "top_risk_activities":
        return answer_top_risk_activities(df, data)
    elif pattern == "sif_positive_list":
        return answer_sif_positive_list(df, data)
    elif pattern == "sif_count":
        return answer_sif_count(df, data)
    elif pattern == "top_clusters":
        return answer_top_clusters(df, data)
    elif pattern == "barrier_failure":
        return answer_barrier_failure(df, data)
    elif pattern in IOGP_RULE_MAP:
        rule_key, rule_display = IOGP_RULE_MAP[pattern]
        return answer_by_iogp_rule(df, data, rule_key, rule_display)

    # Unmatched — try LLM fallback
    if use_llm:
        llm_answer = answer_with_llm(question, df, data)
        if llm_answer:
            return llm_answer + "\n\n_(LLM se answer — structured data pe based)_"

    # Final fallback
    return (
        "Main is sawal ka answer nahi de paya. Ye try kar:\n\n"
        + answer_help()
    )
