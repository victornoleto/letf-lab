"""Deploy Readiness Score (0-100): the app-facing port of the study's scoring.

Mirrors the 7-criterion rubric from
`studies/letf_rotation_hunt/scoring.py::score_strategy` (v2, underwater-vs-
benchmark). Criteria 3 (gates) and 4 (DSR) consume a `StrategyGatesSnapshot`
pre-computed by the daily refresh job; without a snapshot they fall back to
status="pending" so the card stays useful for freshly-created strategies.

Criterion -> source:
  - Criterion 1 (Sortino edge):    inline (curves vs benchmark)
  - Criterion 2 (underwater):      inline (pct_time_above_benchmark + min ratio)
  - Criterion 3 (gates G2/G3/G6/G7): from gates_snapshot, 5 pts x N passing
  - Criterion 4 (DSR):             from gates_snapshot.g2_dsr.p_value (piecewise)
  - Criterion 5 (OOS + FWD):       inline (Sharpe on 70/30 split + post-2020)
  - Criterion 6 (crisis vs SPY):   delegates to backtest.crisis
  - Criterion 7 (manual bonus):    user-supplied 0-5

G1 (PBO) is intentionally out of scope: PBO requires a multi-config CSCV
which the app's per-strategy Deploy Score doesn't provide.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

import numpy as np
import pandas as pd

from ai_swing.backtest import crisis
from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.backtest.metrics import sortino as sortino_metric
from ai_swing.db.models import Strategy, StrategyGatesSnapshot

logger = logging.getLogger(__name__)

# Criterion 1 thresholds: edge >= 0.30 → 30 pts, 0.15 → 20, 0.05 → 10, else 0.
# Lifted from the study's "edge tiers" but condensed to a single dataset.
_EDGE_TIERS: list[tuple[float, int]] = [(0.30, 30), (0.15, 20), (0.05, 10)]

# Criterion 5 split definitions.
_OOS_TRAIN_FRAC = 0.70
_FWD_CUTOFF = pd.Timestamp("2020-01-01")

# Underwater-vs-benchmark: warmup days before the comparison is meaningful.
# Mirrors the study (`_UNDERWATER_WARMUP_DAYS = 252`).
_UNDERWATER_WARMUP_DAYS = 252


@dataclass
class CriterionScore:
    key: str
    label: str
    points: float
    max_points: float
    status: str  # "ok" | "warn" | "fail" | "pending"
    note: str


@dataclass
class DeployScore:
    asof_date: date
    range_start: date
    range_end: date
    total: float
    tier_label: str  # "FAIL" | "NEAR_FAIL" | "MARGINAL" | "PROMISING" | "STRONG" | "WINNER"
    winner_conditions_met: bool
    criteria: list[CriterionScore]


def _edge_points(edge: float) -> tuple[int, str, str]:
    for threshold, pts in _EDGE_TIERS:
        if edge >= threshold:
            note = (
                f"Sortino edge {edge:+.2f} vs benchmark "
                f"(≥+0.05/+0.15/+0.30 → 10/20/30 pts)"
            )
            return pts, "ok" if edge >= 0.15 else "warn", note
    return 0, "fail", (
        f"Sortino edge {edge:+.2f} insuficiente — precisa ≥+0.05 vs benchmark"
    )


def _underwater_metrics(
    strat_eq: pd.Series, bench_eq: pd.Series, warmup_days: int = _UNDERWATER_WARMUP_DAYS
) -> tuple[float, float]:
    """Return (pct_time_above_benchmark, min_relative_equity) post-warmup.

    Both series are renormalised to the same starting value before computing
    the ratio. NaN-safe: returns (nan, nan) if there isn't enough post-warmup
    history.
    """
    aligned = pd.concat({"s": strat_eq, "b": bench_eq}, axis=1, sort=True).dropna()
    if len(aligned) < warmup_days + 2:
        return float("nan"), float("nan")
    s_norm = aligned["s"] / aligned["s"].iloc[0]
    b_norm = aligned["b"] / aligned["b"].iloc[0]
    ratio = (s_norm / b_norm).iloc[warmup_days:]
    if len(ratio) < 2:
        return float("nan"), float("nan")
    return float((ratio > 1.0).mean()), float(ratio.min())


def _underwater_points(pct_above: float, min_ratio: float) -> tuple[int, str, str]:
    """Two-axis tiering: replicates `_underwater_points` from the study."""
    if pct_above != pct_above:  # NaN
        return 0, "fail", "Sem histórico pós-warmup suficiente"
    if pct_above >= 1.0 - 1e-9 and (min_ratio != min_ratio or min_ratio >= 1.0):
        return 15, "ok", f"100% do tempo acima do benchmark (mín ratio {min_ratio:.2f}×)"
    if pct_above >= 0.99 and (min_ratio != min_ratio or min_ratio >= 0.8):
        return 12, "ok", f"≥99% do tempo (mín ratio {min_ratio:.2f}×)"
    if pct_above >= 0.95 and (min_ratio != min_ratio or min_ratio >= 0.7):
        return 9, "warn", f"≥95% do tempo (mín ratio {min_ratio:.2f}×)"
    if pct_above >= 0.90:
        return 6, "warn", f"≥90% do tempo (mín ratio {min_ratio:.2f}×)"
    return 0, "fail", (
        f"Apenas {pct_above * 100:.0f}% do tempo acima do benchmark"
    )


def _split_oos_fwd(
    strat_returns: pd.Series,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Return (in_sample, out_of_sample, forward_post_2020) return series.

    OOS is the last (1 - _OOS_TRAIN_FRAC) of the chronological data.
    Forward is everything after _FWD_CUTOFF.
    """
    r = strat_returns.dropna()
    if r.empty:
        empty = pd.Series(dtype=float)
        return empty, empty, empty
    n = len(r)
    cut = int(n * _OOS_TRAIN_FRAC)
    in_sample = r.iloc[:cut]
    oos = r.iloc[cut:]
    fwd = r[r.index >= _FWD_CUTOFF]
    return in_sample, oos, fwd


def _oos_fwd_points(strat_returns: pd.Series) -> tuple[int, str, str]:
    _, oos, fwd = _split_oos_fwd(strat_returns)
    pts = 0
    notes: list[str] = []
    if len(oos) >= 30:
        oos_sortino = sortino_metric(oos)
        if oos_sortino > 0:
            pts += 5
            notes.append(f"OOS 30%: Sortino {oos_sortino:+.2f} ✓")
        else:
            notes.append(f"OOS 30%: Sortino {oos_sortino:+.2f}")
    else:
        notes.append("OOS 30%: dados insuficientes")
    if len(fwd) >= 60:
        fwd_sortino = sortino_metric(fwd)
        if fwd_sortino > 0:
            pts += 5
            notes.append(f"FWD pós-2020: Sortino {fwd_sortino:+.2f} ✓")
        else:
            notes.append(f"FWD pós-2020: Sortino {fwd_sortino:+.2f}")
    else:
        notes.append("FWD pós-2020: dados insuficientes")
    status = "ok" if pts == 10 else ("warn" if pts >= 5 else "fail")
    return pts, status, " · ".join(notes)


def _crisis_points(strategy: Strategy) -> tuple[float, str, str, int, int]:
    results = crisis.compute_crisis_attribution(strategy)
    n_beats, n_eligible = crisis.attribution_score(results)
    pts = 2.5 * n_beats
    status = "ok" if (n_eligible > 0 and n_beats >= max(2, n_eligible - 1)) else (
        "warn" if n_beats >= 1 else "fail"
    )
    note = (
        f"Bate o SPY em {n_beats} de {n_eligible} crises elegíveis "
        f"(2.5 pts cada)"
    )
    return pts, status, note, n_beats, n_eligible


def _tier_label(total: float, winner_conditions_met: bool) -> str:
    if total >= 90 and winner_conditions_met:
        return "WINNER"
    if total >= 90:
        return "STRONG"
    if total >= 75:
        return "STRONG"
    if total >= 60:
        return "PROMISING"
    if total >= 40:
        return "MARGINAL"
    if total >= 20:
        return "NEAR_FAIL"
    return "FAIL"


def _gates_points(gates: dict | None) -> tuple[int, str, str]:
    """Crit 3: 5 pts per passing gate, 4 gates total -> max 20."""
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    flags = [
        bool(gates["g2_dsr"]["pass_gate"]),
        bool(gates["g3_wf"]["pass_gate"]),
        bool(gates["g6_bootstrap"]["pass_gate"]),
        bool(gates["g7_xlib"]["pass_gate"]),
    ]
    n_pass = sum(flags)
    pts = 5 * n_pass
    if n_pass == 4:
        status = "ok"
    elif n_pass >= 2:
        status = "warn"
    else:
        status = "fail"
    marks = "".join("✓" if f else "✗" for f in flags)
    note = (
        f"{n_pass}/4 gates · G2(DSR){marks[0]} G3(WF){marks[1]} "
        f"G6(boot){marks[2]} G7(xlib){marks[3]}"
    )
    return pts, status, note


def _dsr_points(gates: dict | None) -> tuple[int, str, str]:
    """Crit 4: piecewise on g2_dsr.p_value (max 10 pts)."""
    if gates is None:
        return 0, "pending", "Aguardando próximo daily refresh"
    p = float(gates["g2_dsr"]["p_value"])
    if p < 0.05:
        return 10, "ok", f"DSR p={p:.3f} (PSR fallback, n_trials=1)"
    if p < 0.10:
        return 7, "warn", f"DSR p={p:.3f} marginal"
    if p < 0.20:
        return 3, "warn", f"DSR p={p:.3f} fraco"
    return 0, "fail", f"DSR p={p:.3f} insuficiente"


def compute_deploy_score(
    strategy: Strategy,
    range_years: int = 10,
    bonus_pts: float = 0.0,
    gates_snapshot: StrategyGatesSnapshot | None = None,
) -> DeployScore:
    """Compute the full breakdown for the Deploy Readiness card."""
    curves = compute_strategy_curves(strategy, range_years=range_years)

    valid_idx = curves.equity_strategy.index
    strat_returns = curves.strategy_returns.loc[valid_idx]
    bench_returns = curves.df["bench"].pct_change().loc[valid_idx]

    strat_sortino = sortino_metric(strat_returns)
    bench_sortino = sortino_metric(bench_returns)
    edge = strat_sortino - bench_sortino

    pts1, status1, note1 = _edge_points(edge)

    pct_above, min_ratio = _underwater_metrics(curves.equity_strategy, curves.equity_bench)
    pts2, status2, note2 = _underwater_points(pct_above, min_ratio)

    pts5, status5, note5 = _oos_fwd_points(strat_returns)

    pts6, status6, note6, n_beats, n_eligible = _crisis_points(strategy)

    pts7 = max(0.0, min(5.0, bonus_pts))
    status7 = "ok" if pts7 > 0 else "pending"
    note7 = "Bônus manual (0-5)"

    gates_payload = gates_snapshot.payload if gates_snapshot is not None else None
    pts3, status3, note3 = _gates_points(gates_payload)
    pts4, status4, note4 = _dsr_points(gates_payload)

    total = pts1 + pts2 + pts3 + pts4 + pts5 + pts6 + pts7

    edge_passed = edge >= 0.05
    underwater_bar_passed = (
        pct_above >= 0.95 if pct_above == pct_above else False
    )
    winner_conditions_met = bool(
        gates_payload is not None
        and gates_payload["g2_dsr"]["pass_gate"]
        and gates_payload["g6_bootstrap"]["pass_gate"]
        and gates_payload["g7_xlib"]["pass_gate"]
        and edge_passed
        and underwater_bar_passed
    )

    tier = _tier_label(total, winner_conditions_met)

    criteria = [
        CriterionScore(
            key="1_sortino_edge", label="Sortino edge",
            points=pts1, max_points=30, status=status1, note=note1,
        ),
        CriterionScore(
            key="2_underwater", label="Underwater vs benchmark",
            points=pts2, max_points=15, status=status2, note=note2,
        ),
        CriterionScore(
            key="3_gates", label="Bateria de gates (G2/G3/G6/G7)",
            points=pts3, max_points=20, status=status3, note=note3,
        ),
        CriterionScore(
            key="4_dsr", label="DSR (Deflated Sharpe)",
            points=pts4, max_points=10, status=status4, note=note4,
        ),
        CriterionScore(
            key="5_oos_fwd", label="OOS + FWD pós-2020",
            points=pts5, max_points=10, status=status5, note=note5,
        ),
        CriterionScore(
            key="6_crisis", label=f"Crises ({n_beats}/{n_eligible})",
            points=pts6, max_points=10, status=status6, note=note6,
        ),
        CriterionScore(
            key="7_bonus", label="Bônus discricionário",
            points=pts7, max_points=5, status=status7, note=note7,
        ),
    ]

    return DeployScore(
        asof_date=curves.asof_date,
        range_start=curves.range_start,
        range_end=curves.range_end,
        total=float(total),
        tier_label=tier,
        winner_conditions_met=winner_conditions_met,
        criteria=criteria,
    )
