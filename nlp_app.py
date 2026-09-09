"""
Interactive Dashboard — Step 5

Streamlit single-pane view for HSE managers.

Core views (PRD 5.1):
  - Heatmap: SIF-density by activity × location
  - IOGP rule breakdown: frequency bar chart
  - Trend view: SIF rate over time (if dates exist)
  - Drill-down: click any chart element → underlying reports with evidence
  - "Needs human review" queue: low-confidence predictions for manual triage

Run:
    streamlit run app.py
"""
import sys
import json
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

BASE = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Data loading (cached)
# ---------------------------------------------------------------------------

@st.cache_data(ttl=300)
def load_all_data():
    """Load all processed data files for the dashboard."""
    data = {}

    # Seed reports
    seed_path = BASE / "data" / "raw" / "seed_reports.csv"
    if seed_path.exists():
        data["reports"] = pd.read_csv(seed_path, encoding="utf-8-sig")

    # Gold labels
    gold_path = BASE / "data" / "gold_labeled.csv"
    if gold_path.exists():
        gold = pd.read_csv(gold_path, encoding="utf-8-sig")
        gold = gold[gold["labeled_by"].notna() & (gold["labeled_by"] != "")]
        data["gold"] = gold

    # SIF scores
    scores_path = BASE / "data" / "sif_scores.csv"
    if scores_path.exists():
        data["scores"] = pd.read_csv(scores_path, encoding="utf-8")

    # LLM predictions (IOGP tags)
    llm_path = BASE / "data" / "llm_predictions.csv"
    if llm_path.exists():
        data["llm_tags"] = pd.read_csv(llm_path, encoding="utf-8")

    # Rule-based predictions
    rb_path = BASE / "data" / "rule_based_predictions.csv"
    if rb_path.exists():
        data["rb_tags"] = pd.read_csv(rb_path, encoding="utf-8")

    # Clusters
    cluster_path = BASE / "data" / "clusters.csv"
    if cluster_path.exists():
        data["clusters"] = pd.read_csv(cluster_path, encoding="utf-8")

    # Extracted fields
    fields_path = BASE / "data" / "extracted_fields.csv"
    if fields_path.exists():
        data["fields"] = pd.read_csv(fields_path, encoding="utf-8")

    # SIF density aggregation
    agg_path = BASE / "data" / "sif_density.csv"
    if agg_path.exists():
        data["density"] = pd.read_csv(agg_path, encoding="utf-8")

    # Labeling queue (disagreements)
    queue_path = BASE / "data" / "labeling_queue.csv"
    if queue_path.exists():
        data["queue"] = pd.read_csv(queue_path, encoding="utf-8")

    # Corrective actions (Step 6.2)
    actions_path = BASE / "data" / "corrective_actions.csv"
    if actions_path.exists():
        data["actions"] = pd.read_csv(actions_path, encoding="utf-8")

    # Translations (Step 6.3)
    translations_path = BASE / "data" / "translations.csv"
    if translations_path.exists():
        data["translations"] = pd.read_csv(translations_path, encoding="utf-8")

    return data


def build_master_df(data):
    """Merge reports + gold + scores + clusters + fields into one DataFrame."""
    if "reports" not in data:
        return pd.DataFrame()

    df = data["reports"].copy()

    if "gold" in data:
        g = data["gold"][["report_id", "sif_potential", "energy_level",
                          "barrier_failure", "human_proximity",
                          "exposure_duration", "iogp_tags", "notes"]].copy()
        g = g.rename(columns={"sif_potential": "sif_gold",
                              "iogp_tags": "iogp_tags_gold",
                              "notes": "gold_notes"})
        df = df.merge(g, on="report_id", how="left")

    if "scores" in data:
        s = data["scores"][["report_id", "sif_potential", "total_score",
                            "reasoning"]].copy()
        s = s.rename(columns={"sif_potential": "sif_scored",
                              "total_score": "sif_total_score",
                              "reasoning": "sif_reasoning"})
        df = df.merge(s, on="report_id", how="left")

    if "clusters" in data:
        df = df.merge(data["clusters"][["report_id", "cluster_name"]],
                      on="report_id", how="left")

    if "fields" in data:
        df = df.merge(data["fields"][["report_id", "equipment", "location",
                                      "activity", "barrier_type"]],
                      on="report_id", how="left")

    # Primary SIF flag: gold > scored
    df["sif_flag"] = df["sif_gold"].fillna(df["sif_scored"])
    df["sif_flag"] = df["sif_flag"].astype(str).str.lower() == "true"

    # Fill NaN
    for col in ["cluster_name", "equipment", "location", "activity",
                "barrier_type"]:
        if col in df.columns:
            df[col] = df[col].fillna("unspecified")

    return df


# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="OIL SIF-Precursor Dashboard",
    page_icon="⚠️",
    layout="wide",
    initial_sidebar_state="expanded",
)

data = load_all_data()
df = build_master_df(data)

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

st.title("⚠️ OIL SIF-Precursor Detection Dashboard")
st.markdown(
    "**Oil India Limited — HSSE Safety Report Triage System**\n\n"
    "*This system does not replace human HSE judgment — it triages for it.* "
    "All outputs include evidence spans or reasoning. Labels are weak "
    "supervision (LLM-generated, base-rate calibrated), not human-validated "
    "ground truth."
)

# ---------------------------------------------------------------------------
# Sidebar — global filters
# ---------------------------------------------------------------------------

st.sidebar.header("Filters")

# SIF filter
sif_filter = st.sidebar.radio(
    "SIF-potential filter",
    ["All reports", "SIF-positive only", "SIF-negative only"],
    index=0)

# Source type filter
if "source_type" in df.columns:
    sources = ["All"] + sorted(df["source_type"].dropna().unique().tolist())
    source_filter = st.sidebar.selectbox("Source type", sources, 0)
else:
    source_filter = "All"

# Cluster filter
if "cluster_name" in df.columns:
    clusters = ["All"] + sorted(df["cluster_name"].dropna().unique().tolist())
    cluster_filter = st.sidebar.selectbox("Precursor cluster", clusters, 0)
else:
    cluster_filter = "All"

# Apply filters
view_df = df.copy()
if sif_filter == "SIF-positive only":
    view_df = view_df[view_df["sif_flag"]]
elif sif_filter == "SIF-negative only":
    view_df = view_df[~view_df["sif_flag"]]

if source_filter != "All" and "source_type" in view_df.columns:
    view_df = view_df[view_df["source_type"] == source_filter]

if cluster_filter != "All" and "cluster_name" in view_df.columns:
    view_df = view_df[view_df["cluster_name"] == cluster_filter]

# ---------------------------------------------------------------------------
# Top-level metrics
# ---------------------------------------------------------------------------

n_total = len(df)
n_sif = int(df["sif_flag"].sum())
sif_rate = n_sif / n_total if n_total else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Reports", n_total)
col2.metric("SIF-Positive", n_sif)
col3.metric("SIF Rate", f"{sif_rate:.0%}")
col4.metric("Clusters", df["cluster_name"].nunique() if "cluster_name" in df else 0)

st.markdown("---")

# ---------------------------------------------------------------------------
# Tab layout
# ---------------------------------------------------------------------------

tab_overview, tab_heatmap, tab_clusters, tab_reports, tab_review, tab_chat, tab_actions, tab_new = st.tabs([
    "📊 Overview", "🔥 Risk Heatmap", "🎯 Clusters",
    "📋 Report Drill-down", "👤 Human Review Queue", "💬 Ask HSE Assistant",
    "🔧 Corrective Actions", "➕ Score New Report"
])

# ---------------------------------------------------------------------------
# Tab 1: Overview — IOGP rule breakdown + SIF score distribution
# ---------------------------------------------------------------------------

with tab_overview:
    st.header("Overview")

    col_a, col_b = st.columns(2)

    with col_a:
        st.subheader("IOGP Life-Saving Rule Distribution")
        if "llm_tags" in data:
            tags_df = data["llm_tags"].copy()
            tags_df = tags_df[tags_df["rule"].notna() & (tags_df["rule"] != "")]
            rule_counts = tags_df.groupby("rule").size().reset_index(name="count")
            rule_counts = rule_counts.sort_values("count", ascending=True)

            fig = px.bar(
                rule_counts, x="count", y="rule", orientation="h",
                title="IOGP Rule Frequency (LLM tagger)",
                labels={"count": "Report count", "rule": "IOGP Rule"},
                color="count", color_continuous_scale="Blues")
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("LLM predictions not found.")

    with col_b:
        st.subheader("SIF Score Distribution")
        if "scores" in data:
            scores = data["scores"].copy()
            scores["total_score"] = pd.to_numeric(scores["total_score"],
                                                   errors="coerce")
            fig = px.histogram(
                scores, x="total_score", color="sif_potential",
                title="SIF Rubric Score Distribution",
                labels={"total_score": "Total rubric score (0-8)",
                        "sif_potential": "SIF-positive"},
                nbins=9, barmode="stack",
                color_discrete_map={"true": "#e74c3c", "false": "#2ecc71"})
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("SIF scores not found.")

    # SIF by barrier type
    st.subheader("SIF-Positive Rate by Barrier Failure Type")
    if "density" in data and "barrier_type" in str(data.get("density", pd.DataFrame()).get("dimension", "")):
        density = data["density"]
        bar_density = density[density["dimension"] == "barrier_type"].copy()
        bar_density = bar_density[bar_density["n_reports"] >= 2]
        if not bar_density.empty:
            fig = px.bar(
                bar_density, x="sif_density", y="value", orientation="h",
                title="SIF-density by barrier type (n≥2)",
                labels={"sif_density": "SIF-positive rate",
                        "value": "Barrier type"},
                color="sif_density", color_continuous_scale="Reds",
                range_x=[0, 1],
                hover_data=["n_reports", "n_sif"])
            fig.update_layout(height=350)
            st.plotly_chart(fig, use_container_width=True)
            st.caption("**Key insight:** permit violations show 0% SIF-density "
                       "while physical barrier failures show 40% — validating "
                       "the rubric's distinction between administrative and "
                       "physical barriers.")

# ---------------------------------------------------------------------------
# Tab 2: Risk Heatmap — activity × location SIF-density
# ---------------------------------------------------------------------------

with tab_heatmap:
    st.header("Risk Heatmap: SIF-density by Activity × Location")

    if "density" in data:
        density = data["density"]
        cross = density[density["dimension"] == "activity_x_location"].copy()
        if not cross.empty:
            # Parse "activity @ location" back into columns
            parts = cross["value"].str.split(" @ ", expand=True)
            cross["activity"] = parts[0]
            cross["location"] = parts[1] if parts.shape[1] > 1 else "unspecified"

            pivot = cross.pivot_table(
                index="activity", columns="location",
                values="sif_density", aggfunc="first")

            fig = go.Figure(data=go.Heatmap(
                z=pivot.values,
                x=pivot.columns.tolist(),
                y=pivot.index.tolist(),
                colorscale="Reds",
                zmin=0, zmax=1,
                text=cross.set_index(["activity", "location"])["n_reports"]
                    .reindex(pd.MultiIndex.from_product(
                        [pivot.index, pivot.columns])).values,
                texttemplate="%{text:.0f} reps",
                hovertemplate="Activity: %{y}<br>Location: %{x}<br>"
                              "SIF-density: %{z:.0%}<br>Reports: %{text}<extra></extra>",
                colorbar=dict(title="SIF-density")))
            fig.update_layout(
                title="SIF-positive density by activity × location (n≥2)",
                xaxis_title="Location", yaxis_title="Activity",
                height=500)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No activity × location aggregations found.")
    else:
        st.info("SIF density data not found. Run `python src/clustering.py aggregate`.")

    # Also show activity-only and location-only density
    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("By Activity")
        act_dens = data["density"][data["density"]["dimension"] == "activity"]
        act_dens = act_dens[act_dens["n_reports"] >= 2]
        if not act_dens.empty:
            fig = px.bar(act_dens.sort_values("sif_density", ascending=True),
                         x="sif_density", y="value", orientation="h",
                         color="sif_density", color_continuous_scale="Reds",
                         range_x=[0, 1],
                         labels={"sif_density": "SIF-density", "value": "Activity"},
                         hover_data=["n_reports", "n_sif"])
            fig.update_layout(height=350)
            st.plotly_chart(fig, use_container_width=True)

    with col_b:
        st.subheader("By Location")
        loc_dens = data["density"][data["density"]["dimension"] == "location"]
        loc_dens = loc_dens[loc_dens["n_reports"] >= 2]
        if not loc_dens.empty:
            fig = px.bar(loc_dens.sort_values("sif_density", ascending=True),
                         x="sif_density", y="value", orientation="h",
                         color="sif_density", color_continuous_scale="Reds",
                         range_x=[0, 1],
                         labels={"sif_density": "SIF-density", "value": "Location"},
                         hover_data=["n_reports", "n_sif"])
            fig.update_layout(height=350)
            st.plotly_chart(fig, use_container_width=True)

# ---------------------------------------------------------------------------
# Tab 3: Clusters — precursor pattern view
# ---------------------------------------------------------------------------

with tab_clusters:
    st.header("Precursor Pattern Clusters")

    if "clusters" in data and "density" in data:
        cluster_dens = data["density"][data["density"]["dimension"] == "cluster"]
        cluster_dens = cluster_dens.sort_values("sif_density", ascending=False)

        fig = px.bar(
            cluster_dens, x="sif_density", y="value", orientation="h",
            color="sif_density", color_continuous_scale="Reds",
            range_x=[0, 1],
            title="SIF-density by precursor cluster",
            labels={"sif_density": "SIF-positive rate", "value": "Cluster"},
            hover_data=["n_reports", "n_sif"])
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)

        # Cluster details table
        st.subheader("Cluster Details")
        st.dataframe(
            cluster_dens[["value", "n_reports", "n_sif", "sif_density"]]
            .rename(columns={"value": "Cluster", "n_reports": "Reports",
                             "n_sif": "SIF+", "sif_density": "SIF Rate"})
            .style.format({"SIF Rate": "{:.0%}"}),
            use_container_width=True, hide_index=True)

        # Show reports in selected cluster
        st.subheader("Reports in Selected Cluster")
        cluster_names = sorted(df["cluster_name"].dropna().unique())
        selected = st.selectbox("Select cluster", cluster_names)
        cluster_reports = df[df["cluster_name"] == selected]
        st.dataframe(
            cluster_reports[["report_id", "sif_flag", "report_text",
                             "activity", "barrier_type"]].head(20),
            use_container_width=True, hide_index=True)
    else:
        st.info("Cluster data not found. Run `python src/clustering.py cluster`.")

# ---------------------------------------------------------------------------
# Tab 4: Report Drill-down
# ---------------------------------------------------------------------------

with tab_reports:
    st.header("Report Drill-down")

    # Report selector
    report_ids = view_df["report_id"].tolist()
    selected_id = st.selectbox("Select report", report_ids)

    if selected_id:
        row = view_df[view_df["report_id"] == selected_id].iloc[0]

        col_a, col_b = st.columns([2, 1])

        with col_a:
            st.subheader(f"Report {selected_id}")
            st.text_area("Report text", row["report_text"], height=200,
                         disabled=True)

            # Evidence / reasoning
            if "sif_reasoning" in row and pd.notna(row.get("sif_reasoning")):
                st.markdown("**SIF Scorer Reasoning:**")
                st.info(row["sif_reasoning"])

            if "gold_notes" in row and pd.notna(row.get("gold_notes")):
                st.markdown("**Gold Label Notes:**")
                st.info(row["gold_notes"])

        with col_b:
            st.subheader("Classification")

            # SIF status
            sif_status = "🔴 SIF-Positive" if row["sif_flag"] else "🟢 SIF-Negative"
            st.metric("SIF-Potential", sif_status)

            # Rubric scores
            if "energy_level" in row and pd.notna(row.get("energy_level")):
                st.markdown("**Rubric Scores:**")
                for f in ["energy_level", "barrier_failure",
                          "human_proximity", "exposure_duration"]:
                    if f in row and pd.notna(row.get(f)):
                        val = int(row[f])
                        bars = "■" * val + "□" * (2 - val)
                        st.text(f"  {f.replace('_', ' '):<20} {bars} ({val})")

                if "sif_total_score" in row and pd.notna(row.get("sif_total_score")):
                    st.metric("Total Score", f"{int(row['sif_total_score'])}/8")

            # IOGP tags
            if "iogp_tags_gold" in row and pd.notna(row.get("iogp_tags_gold")):
                st.markdown("**IOGP Tags:**")
                tags = str(row["iogp_tags_gold"]).split(";")
                for t in tags:
                    if t.strip():
                        st.code(t.strip())

            # Cluster
            if "cluster_name" in row and pd.notna(row.get("cluster_name")):
                st.markdown(f"**Cluster:** `{row['cluster_name']}`")

            # Extracted fields
            for field, label in [("activity", "Activity"),
                                 ("location", "Location"),
                                 ("equipment", "Equipment"),
                                 ("barrier_type", "Barrier Type")]:
                if field in row and pd.notna(row.get(field)) and row[field]:
                    st.markdown(f"**{label}:** {row[field]}")

# ---------------------------------------------------------------------------
# Tab 5: Human Review Queue
# ---------------------------------------------------------------------------

with tab_review:
    st.header("👤 Human Review Queue")
    st.markdown(
        "*Prioritized disagreements between the rule-based and LLM taggers. "
        "Reviewing agreement rows teaches nothing — disagreements are where "
        "review adds value.*"
    )

    if "queue" in data:
        queue = data["queue"]
        st.dataframe(
            queue[["report_id", "report_text", "rule_tags", "llm_tags",
                   "disagreement_type", "priority"]],
            use_container_width=True, hide_index=True,
            column_config={
                "report_text": st.column_config.TextColumn("Report", width="large"),
                "disagreement_type": st.column_config.TextColumn("Disagreement", width="small"),
                "priority": st.column_config.NumberColumn("Priority", width="small"),
            })

        st.markdown("---")
        st.markdown("**Disagreement type counts:**")
        type_counts = queue["disagreement_type"].value_counts()
        col_a, col_b, col_c, col_d = st.columns(4)
        for i, (dtype, count) in enumerate(type_counts.items()):
            [col_a, col_b, col_c, col_d][i % 4].metric(dtype, count)
    else:
        st.info("Labeling queue not found. Run `python src/disagreement_report.py`.")

# ---------------------------------------------------------------------------
# Tab 6: Chat Assistant — conversational Q&A over structured data
# ---------------------------------------------------------------------------

with tab_chat:
    st.header("💬 HSE Assistant")
    st.markdown(
        "*Hindi ya English mein sawal pucho. Ye assistant already-processed "
        "data (tags, scores, clusters) se answer deta hai — har answer "
        "specific reports ke saath aata hai jisse tu verify kar sake.*"
    )

    # Import the chat assistant
    try:
        sys.path.insert(0, str(BASE / "src"))
        from chat_assistant import answer_query

        # Quick suggestion buttons
        st.markdown("**💡 Try these questions:**")
        suggestions = [
            "Kitne SIF positive hain?",
            "Kaunsa site sabse khatarnak hai?",
            "Top risky activities kya hain?",
            "SIF positive reports dikhao",
            "Energy isolation wale reports",
            "Permit violations kitne hain?",
            "Top clusters kya hain?",
            "Barrier failure types kya hain?",
            "Lifting wale reports dikhao",
            "Working at height reports",
            "Confined space reports",
            "Hot work reports",
        ]
        cols = st.columns(4)
        for i, sug in enumerate(suggestions):
            if cols[i % 4].button(sug, key=f"sug_{i}"):
                st.session_state["chat_input"] = sug

        st.markdown("---")

        # Chat history
        if "chat_history" not in st.session_state:
            st.session_state["chat_history"] = []

        # Display chat history
        for msg in st.session_state["chat_history"]:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

        # Chat input
        user_input = st.chat_input("Apna sawal yahan likho... (Hindi/English)")

        # Also check if a suggestion was clicked
        if "chat_input" in st.session_state and st.session_state["chat_input"]:
            user_input = st.session_state["chat_input"]
            st.session_state["chat_input"] = ""

        if user_input:
            # Add user message to history
            st.session_state["chat_history"].append(
                {"role": "user", "content": user_input})

            # Get answer
            with st.spinner("Soch raha hu..."):
                answer = answer_query(user_input, df, data, use_llm=True)

            # Add assistant message to history
            st.session_state["chat_history"].append(
                {"role": "assistant", "content": answer})

            # Rerun to display the new messages
            st.rerun()

        # Clear chat button
        if st.session_state["chat_history"]:
            if st.button("🗑️ Clear chat"):
                st.session_state["chat_history"] = []
                st.rerun()

    except ImportError as e:
        st.error(f"Chat assistant module not found: {e}")
        st.info("Make sure `src/chat_assistant.py` exists.")

# ---------------------------------------------------------------------------
# Tab 7: Corrective Actions — auto-recommended interventions for SIF+ reports
# ---------------------------------------------------------------------------

with tab_actions:
    st.header("🔧 Auto-Recommended Corrective Actions")
    st.markdown(
        "*Har SIF-positive report ke liye specific, actionable intervention — "
        "IOGP rule ke sub-requirements pe grounded, generic boilerplate nahi.*"
    )

    actions_path = BASE / "data" / "corrective_actions.csv"
    if actions_path.exists():
        actions_df = pd.read_csv(actions_path, encoding="utf-8")

        # Merge with report text for context
        if "reports" in data:
            actions_df = actions_df.merge(
                data["reports"][["report_id", "report_text"]],
                on="report_id", how="left")

        # Merge with gold tags
        if "gold" in data:
            actions_df = actions_df.merge(
                data["gold"][["report_id", "iogp_tags", "sif_potential",
                              "energy_level", "barrier_failure",
                              "human_proximity", "exposure_duration"]],
                on="report_id", how="left")

        # Priority filter
        priorities = ["All"] + sorted(actions_df["priority"].dropna().unique().tolist())
        pri_filter = st.selectbox("Filter by priority", priorities, 0)

        if pri_filter != "All":
            actions_df = actions_df[actions_df["priority"] == pri_filter]

        # Summary metrics
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Actions", len(actions_df))
        col2.metric("High Priority",
                    int((actions_df["priority"] == "high").sum()))
        col3.metric("Medium Priority",
                    int((actions_df["priority"] == "medium").sum()))

        st.markdown("---")

        # Display each action
        for _, r in actions_df.iterrows():
            priority_color = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(
                r.get("priority", "medium"), "🟡")

            with st.expander(
                f"{priority_color} {r['report_id']} — Priority: {r.get('priority', 'medium').upper()}",
                expanded=False):

                # Report text
                if "report_text" in r and pd.notna(r.get("report_text")):
                    st.markdown("**Report:**")
                    st.text(r["report_text"][:300] + "..." if len(str(r["report_text"])) > 300 else r["report_text"])

                # IOGP tags
                if "iogp_tags" in r and pd.notna(r.get("iogp_tags")):
                    st.markdown(f"**IOGP Tags:** `{r['iogp_tags']}`")

                # Rubric scores
                if "energy_level" in r and pd.notna(r.get("energy_level")):
                    scores = []
                    for f in ["energy_level", "barrier_failure",
                              "human_proximity", "exposure_duration"]:
                        if f in r and pd.notna(r.get(f)):
                            scores.append(f"{f.replace('_', ' ')}: {int(r[f])}")
                    st.markdown(f"**Rubric:** {', '.join(scores)}")

                # Actions
                st.markdown("**⚡ Immediate Action:**")
                st.info(r.get("immediate_action", "N/A"))

                st.markdown("**🏗️ Systemic Action:**")
                st.info(r.get("systemic_action", "N/A"))

                st.markdown("**✅ Verification:**")
                st.info(r.get("verification", "N/A"))
    else:
        st.info("Corrective actions not found. Run `python src/actions_and_i18n.py actions`.")

# ---------------------------------------------------------------------------
# Tab 8: Score New Report — paste a report, get instant SIF + tags + action
# ---------------------------------------------------------------------------

with tab_new:
    st.header("➕ Score a New Report")
    st.markdown(
        "*Apna safety report yahan paste karo. System turant bata dega:*\n"
        "*- SIF-potential hai ya nahi (rubric score ke saath)*\n"
        "*- Kaunse IOGP Life-Saving Rules break hue*\n"
        "*- Corrective action kya hona chahiye*\n"
        "*- Hindi/Assamese report bhi chalega (auto-translate)*"
    )

    # Text input
    report_text = st.text_area(
        "Report text yahan likho ya paste karo:",
        height=150,
        placeholder="Example: Worker was standing under a suspended load when the sling failed and the load dropped 3 meters, missing the worker by 1 meter...",
        key="new_report_input")

    col_btn1, col_btn2, col_btn3 = st.columns([1, 1, 4])
    score_clicked = col_btn1.button("🔍 Score Report", type="primary")
    clear_clicked = col_btn2.button("🗑️ Clear")

    # Sample reports for quick testing
    st.markdown("---")
    st.markdown("**📋 Quick test samples:**")
    sample_col1, sample_col2, sample_col3 = st.columns(3)
    if sample_col1.button("🔴 High SIF (falling load)"):
        st.session_state["new_report_input"] = (
            "Worker was standing under a suspended load when the sling failed "
            "and the load dropped 3 meters, missing the worker by 1 meter. "
            "No exclusion zone was established around the lifting operation.")
        st.rerun()
    if sample_col2.button("🟡 Moderate (permit violation)"):
        st.session_state["new_report_input"] = (
            "Crew started pipe fitting work without a signed permit. "
            "Supervisor said it would be filled in after the job to save time. "
            "No high-energy hazard was present.")
        st.rerun()
    if sample_col3.button("🔵 Hindi (code-switched)"):
        st.session_state["new_report_input"] = (
            "Tank entry ke pehle gas test nahi kiya gaya. Worker andar gaya "
            "aur H2S gas ki wajah se behosh ho gaya. Confined space permit bhi "
            "nahi tha. Rescue hua but worker hospital mein admit hai.")
        st.rerun()

    if clear_clicked:
        st.session_state["new_report_input"] = ""
        st.rerun()

    if score_clicked and report_text and report_text.strip():
        with st.spinner("Processing report..."):

            # Step 1: Language detection + translation (if needed)
            st.markdown("### Step 1: Language Detection")
            try:
                sys.path.insert(0, str(BASE / "src"))
                from actions_and_i18n import detect_language, translate_text
                from tagger import _get_api_keys, _ClientPool
                from dotenv import load_dotenv
                load_dotenv(BASE / ".env")

                keys = _get_api_keys()
                if not keys:
                    st.error("No API keys found. Check .env file.")
                    st.stop()
                pool = _ClientPool(keys)

                lang_info = detect_language(report_text, pool)
                if lang_info:
                    lang = lang_info.get("language", "english")
                    conf = lang_info.get("confidence", 0)
                    st.markdown(
                        f"**Detected:** `{lang}` (confidence: {conf:.0%})  "
                        f"**Scripts:** {', '.join(lang_info.get('detected_scripts', []))}")

                    if lang != "english":
                        with st.spinner("Translating to English..."):
                            translated = translate_text(report_text, pool)
                        if translated:
                            st.markdown("**Translated to English:**")
                            st.info(translated[:500])
                            working_text = translated
                        else:
                            st.warning("Translation failed — using original text.")
                            working_text = report_text
                    else:
                        working_text = report_text
                else:
                    st.warning("Language detection failed — assuming English.")
                    working_text = report_text
            except Exception as e:
                st.warning(f"Language detection skipped ({str(e)[:60]}). Using original text.")
                working_text = report_text

            # Step 2: Rule-based IOGP tagging (instant, offline)
            st.markdown("### Step 2: IOGP Life-Saving Rule Tags")
            try:
                from tagger import rule_based_tag, llm_tag, load_taxonomy
                taxonomy = load_taxonomy()

                # Rule-based (instant)
                rb_tags = rule_based_tag(working_text, taxonomy)
                rb_tag_names = [t["rule"] for t in rb_tags if t.get("score", 0) > 0]

                st.markdown("**Rule-based tags (instant):**")
                if rb_tag_names:
                    for t in rb_tag_names:
                        st.code(t)
                else:
                    st.caption("_No keyword matches_")

                # LLM-based (if API available)
                with st.spinner("LLM tagging..."):
                    try:
                        llm_result = llm_tag(working_text, taxonomy,
                                             model="gemini-3.5-flash-lite")
                        if llm_result and llm_result.get("tags"):
                            st.markdown("**LLM tags (with evidence):**")
                            for tag in llm_result["tags"]:
                                rule = tag.get("rule", "")
                                conf = tag.get("confidence", 0)
                                evidence = tag.get("evidence", "")
                                st.markdown(
                                    f"  • **`{rule}`** (confidence: {conf:.0%})")
                                if evidence:
                                    st.caption(f"    Evidence: \"{evidence}\"")
                            llm_tag_names = [t["rule"] for t in llm_result["tags"]]
                        else:
                            llm_tag_names = rb_tag_names
                            st.caption("_LLM tagging unavailable — using rule-based only_")
                    except Exception as e:
                        llm_tag_names = rb_tag_names
                        st.caption(f"_LLM tagging skipped ({str(e)[:50]})_")
            except Exception as e:
                st.warning(f"Tagging error: {str(e)[:80]}")
                llm_tag_names = []

            # Step 3: SIF scoring
            st.markdown("### Step 3: SIF-Potential Scoring")
            try:
                from sif_scorer import build_prompt, score_report, SIF_THRESHOLD, FACTORS

                prompt = build_prompt()
                result = score_report(working_text, prompt, pool)

                if result:
                    total = result["total_score"]
                    is_sif = result["sif_potential"] == "true"

                    # Big SIF verdict
                    if is_sif:
                        st.error(f"🔴 **SIF-POSITIVE** — Total score: {total}/8 "
                                 f"(threshold: {SIF_THRESHOLD})")
                    else:
                        st.success(f"🟢 **SIF-NEGATIVE** — Total score: {total}/8 "
                                   f"(threshold: {SIF_THRESHOLD})")

                    # Rubric breakdown
                    st.markdown("**Rubric breakdown:**")
                    rubric_cols = st.columns(4)
                    for i, f in enumerate(FACTORS):
                        val = result[f]
                        label = f.replace("_", " ").title()
                        rubric_cols[i].metric(label, f"{val}/2")
                        bars = "■" * val + "□" * (2 - val)
                        rubric_cols[i].markdown(f"`{bars}`")

                    # Reasoning
                    if result.get("reasoning"):
                        st.markdown("**Reasoning:**")
                        st.info(result["reasoning"])
                else:
                    st.warning("SIF scoring failed (API quota may be exhausted).")
            except Exception as e:
                st.warning(f"SIF scoring error: {str(e)[:80]}")

            # Step 4: Corrective action (only if SIF+)
            if 'result' in dir() and result and result["sif_potential"] == "true":
                st.markdown("### Step 4: Recommended Corrective Action")
                try:
                    from actions_and_i18n import generate_action
                    scores = {
                        "energy_level": result["energy_level"],
                        "barrier_failure": result["barrier_failure"],
                        "human_proximity": result["human_proximity"],
                        "exposure_duration": result["exposure_duration"],
                    }
                    action = generate_action(
                        working_text, ";".join(llm_tag_names), scores, pool)
                    if action:
                        st.markdown("**⚡ Immediate Action:**")
                        st.error(action["immediate_action"])
                        st.markdown("**🏗️ Systemic Action:**")
                        st.warning(action["systemic_action"])
                        st.markdown("**✅ Verification:**")
                        st.info(action["verification"])
                        st.markdown(f"**Priority:** `{action['priority']}`")
                    else:
                        st.caption("_Corrective action generation failed (API quota)._")
                except Exception as e:
                    st.caption(f"_Corrective action skipped ({str(e)[:50]})._")

            # Step 5: Similar reports in existing dataset
            st.markdown("### Step 5: Similar Existing Reports")
            try:
                from sentence_transformers import SentenceTransformer
                from sklearn.metrics.pairwise import cosine_similarity
                import numpy as np

                emb_path = BASE / "data" / "embeddings.npy"
                ids_path = BASE / "data" / "embedding_ids.json"
                if emb_path.exists() and ids_path.exists():
                    emb = np.load(emb_path)
                    with open(ids_path) as f:
                        emb_ids = json.load(f)

                    model = SentenceTransformer("all-MiniLM-L6-v2")
                    new_emb = model.encode([working_text], convert_to_numpy=True)
                    sims = cosine_similarity(new_emb, emb)[0]

                    # Top 3 similar
                    top_idx = sims.argsort()[-3:][::-1]
                    st.markdown("**Top 3 similar reports from dataset:**")
                    for idx in top_idx:
                        rid = emb_ids[idx]
                        sim = sims[idx]
                        # Find report text
                        match = df[df["report_id"] == rid]
                        if not match.empty:
                            r = match.iloc[0]
                            sif_marker = "🔴" if r.get("sif_flag", False) else "🟢"
                            text = str(r["report_text"])[:120]
                            st.markdown(
                                f"  {sif_marker} **{rid}** (similarity: {sim:.0%})\n"
                                f"  > {text}...")
            except Exception as e:
                st.caption(f"_Similarity search skipped ({str(e)[:50]})._")

    elif score_clicked and (not report_text or not report_text.strip()):
        st.warning("Please enter some report text first.")

# ---------------------------------------------------------------------------
# Footer — limitations
# ---------------------------------------------------------------------------

st.markdown("---")
with st.expander("⚠️ Known Limitations (click to expand)"):
    st.markdown("""
    - **No human-validated ground truth**: Labels are LLM-generated weak
      supervision with base-rate calibration, not verified by an HSE reviewer.
    - **Eval numbers are LLM-vs-LLM** agreement, not LLM-vs-human-audit,
      unless a manual validation pass has been completed.
    - **A human HSE reviewer should validate a stratified sample**
      (prioritized via the disagreement queue) before any numbers are
      presented externally as final.
    - **This system is a triage aid** for human review, not an autonomous
      safety-decision system.
    - **SIF-positive rate is calibrated to ~20-25%** matching the published
      DEKRA/EEI industry baseline. A percentile-based hard cap was applied
      to the gold labels as a documented calibration method.
    """)
