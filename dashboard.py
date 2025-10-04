import io
from typing import Dict, List, Optional, Tuple

import streamlit as st
import pandas as pd

from simulation import (
    run_simulation,
    BUFFER_CAPS,
    mark_buffer_available,
    mark_buffer_unavailable,
)


# Simple, distinct color palette for C1..C12
CSS_COLOR_MAP: Dict[str, str] = {
    "C1": "#e6194b",
    "C2": "#3cb44b",
    "C3": "#ffe119",
    "C4": "#0082c8",
    "C5": "#f58231",
    "C6": "#911eb4",
    "C7": "#46f0f0",
    "C8": "#f032e6",
    "C9": "#d2f53c",
    "C10": "#fabebe",
    "C11": "#008080",
    "C12": "#aa6e28",
}


def color_box_html(color_code: str, label: Optional[str] = None, size: int = 16) -> str:
    label_html = f"<span style='font-size:10px;color:#333;margin-left:4px;'>{label}</span>" if label else ""
    return (
        f"<span style='display:inline-block;width:{size}px;height:{size}px;background:{color_code};"
        f"border:1px solid #999;border-radius:3px;margin:2px;'></span>{label_html}"
    )


def render_buffer_columns(buffers: Dict[str, List[dict]]):
    st.subheader("Buffers")
    cols = st.columns(len(BUFFER_CAPS))
    for idx, lane in enumerate(BUFFER_CAPS.keys()):
        buf = buffers.get(lane, [])
        with cols[idx]:
            st.markdown(f"**{lane}** ({len(buf)}/{BUFFER_CAPS[lane]})")
            html = []
            for v in buf:
                c = str(v.get("color"))
                html.append(color_box_html(CSS_COLOR_MAP.get(c, "#ccc")))
            st.markdown("""
<div style='display:flex;flex-direction:column;gap:2px;'>
""" + "".join(html) + """
</div>
""", unsafe_allow_html=True)


def render_main_conveyor(sequence: List[dict], max_items: int = 100):
    st.subheader("Main Conveyor (first 100 picks)")
    html = []
    for v in sequence[:max_items]:
        c = str(v.get("color"))
        html.append(color_box_html(CSS_COLOR_MAP.get(c, "#ccc"), label=c, size=14))
    st.markdown("""
<div style='display:flex;flex-wrap:wrap;align-items:center;'>
""" + "".join(html) + """
</div>
""", unsafe_allow_html=True)


def kpi_dataframe(name: str, kpis: Dict[str, float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "metric": [
                "total_picked",
                "overflows_count",
                "changeovers",
                "o1_to_l5_l9_count",
                "rebalance_moves",
            ],
            name: [
                kpis.get("total_picked", 0),
                kpis.get("overflows_count", 0),
                kpis.get("changeovers", 0),
                kpis.get("o1_to_l5_l9_count", 0),
                kpis.get("rebalance_moves", 0),
            ],
        }
    )


def main():
    st.set_page_config(page_title="Smart Sequencing Demo", layout="wide")
    st.title("Smart Sequencing Demo")

    # Sidebar controls
    st.sidebar.header("Controls")
    strategy = st.sidebar.selectbox("Strategy", options=["fifo", "greedy", "hybrid"], index=2)
    total_vehicles = st.sidebar.slider("Total vehicles", min_value=50, max_value=900, value=200, step=10)

    simulate_breakdown = None
    do_breakdown = st.sidebar.checkbox("Simulate breakdown?")
    if do_breakdown:
        lane = st.sidebar.selectbox("Breakdown lane", options=list(BUFFER_CAPS.keys()))
        step = st.sidebar.number_input("Breakdown at assignment step", min_value=0, value=60, step=1)
        simulate_breakdown = (lane, int(step))

    seed = 42  # fixed for reproducibility

    run_button = st.sidebar.button("Run Simulation")

    if run_button:
        # Clear any manual unavailability marks
        for ln in list(BUFFER_CAPS.keys()):
            mark_buffer_available(ln)

        # Primary run
        result = run_simulation(
            strategy=strategy,
            total_vehicles=total_vehicles,
            seed=seed,
            simulate_breakdown=simulate_breakdown,
        )

        # Baseline FIFO for comparison
        baseline = run_simulation(
            strategy="fifo",
            total_vehicles=total_vehicles,
            seed=seed,
            simulate_breakdown=simulate_breakdown,
        )

        kpis = result["kpis"]
        base_kpis = baseline["kpis"]

        # KPIs display
        st.subheader("KPIs")
        kpi_cols = st.columns(6)
        kpi_cols[0].metric("Total Input", int(kpis.get("total_input", 0)))
        kpi_cols[1].metric("Total Picked", int(kpis.get("total_picked", 0)))
        kpi_cols[2].metric("Overflows", int(kpis.get("overflows_count", 0)))
        kpi_cols[3].metric("Changeovers", int(kpis.get("changeovers", 0)))
        kpi_cols[4].metric("O1 Penalties", int(kpis.get("o1_to_l5_l9_count", 0)))
        kpi_cols[5].metric("Rebalance Moves", int(kpis.get("rebalance_moves", 0)))

        # Buffers visualization
        render_buffer_columns(result["buffers"]) 

        # Main conveyor
        render_main_conveyor(result["painted_sequence"], max_items=100)

        # KPI comparison chart (strategy vs FIFO)
        left, right = st.columns(2)
        with left:
            st.subheader("KPI Comparison")
            df_a = kpi_dataframe(strategy, kpis)
            df_b = kpi_dataframe("fifo", base_kpis)
            df = df_a.merge(df_b, on="metric", how="outer").fillna(0)
            st.bar_chart(df.set_index("metric"))

        with right:
            st.subheader("Estimated JPH")
            jph_df = pd.DataFrame(
                {
                    "Strategy": [strategy, "fifo"],
                    "Estimated JPH": [kpis.get("estimated_JPH", 0), base_kpis.get("estimated_JPH", 0)],
                }
            )
            st.bar_chart(jph_df.set_index("Strategy"))

        # Export KPIs to CSV
        csv_df = pd.DataFrame([kpis])
        csv_buf = io.StringIO()
        csv_df.to_csv(csv_buf, index=False)
        st.download_button(
            label="Download KPIs CSV",
            data=csv_buf.getvalue(),
            file_name="kpis.csv",
            mime="text/csv",
        )


if __name__ == "__main__":
    main()


