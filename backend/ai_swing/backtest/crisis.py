"""Crisis attribution: replay the strategy + SPY across canonical crisis windows.

For each historical crisis (dotcom 2000-02, GFC 2008, COVID 2020, rate-hike
2022) we compute whether the strategy spent >=50% of the days *above* SPY's
equity curve, both renormalised at the start of the window. This mirrors the
study's Criterion 6 attribution logic
(`studies/letf_rotation_hunt/scoring.py::crisis_beats_benchmark`).

Verdicts:
  - "beats"             — strategy spent >=50% of window above SPY
  - "loses"             — strategy spent <50% of window above SPY
  - "insufficient_data" — strategy or SPY price history doesn't cover enough
                          of the window to compare (typical for fresh LETFs
                          that didn't exist in 2000 or 2008)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from ai_swing.data import get_price_service
from ai_swing.db.models import Strategy
from ai_swing.indicators.evaluator import evaluate_indicator
from ai_swing.indicators.functions import vote_of_k

# Canonical windows lifted verbatim from
# `studies/letf_rotation_hunt/scoring.py::CRISIS_WINDOWS` so the app's verdict
# is comparable with the study's published numbers.
CRISIS_WINDOWS: dict[str, tuple[str, str]] = {
    "2000_dotcom": ("2000-03-01", "2002-10-31"),
    "2008_gfc":    ("2008-09-01", "2009-06-30"),
    "2020_covid":  ("2020-02-19", "2020-06-30"),
    "2022_rates":  ("2022-01-01", "2022-12-31"),
}

CRISIS_LABELS: dict[str, str] = {
    "2000_dotcom": "Dotcom (2000–2002)",
    "2008_gfc":    "Global Financial Crisis (2008-2009)",
    "2020_covid":  "COVID (2020)",
    "2022_rates":  "Rate hikes (2022)",
}

_PCT_ABOVE_BAR = 0.50  # study's threshold for "beats"
_MIN_DAYS = 5
_MAX_POINTS_PER_WINDOW = 250  # downsample for transport
SPY_TICKER = "SPY"


@dataclass
class CrisisPoint:
    date: date
    strategy: float  # equity normalized to 100 at window start
    spy: float


@dataclass
class CrisisResult:
    name: str
    label: str
    start: date
    end: date
    verdict: str
    pct_above_spy: float | None
    end_ratio: float | None  # strategy/spy at the last day (renormalised)
    points: list[CrisisPoint] = field(default_factory=list)


def _strategy_equity_in_window(
    strategy: Strategy, start: pd.Timestamp, end: pd.Timestamp
) -> pd.Series:
    """Compute strategy equity confined to [start, end].

    Reuses the same vote-of-K + T+1 logic as `engine.run_backtest`. Indicator
    gates are evaluated on the full benchmark history so warmups remain valid
    even when the window starts after enough bars have accumulated.
    """
    ps = get_price_service()
    bench = ps.get_close_series(strategy.benchmark_ticker)
    risk_on = ps.get_close_series(strategy.risk_on_ticker)
    risk_off = ps.get_close_series(strategy.risk_off_ticker)

    if bench.empty or risk_on.empty or risk_off.empty:
        return pd.Series(dtype=float)

    df = pd.concat(
        [bench.rename("bench"), risk_on.rename("risk_on"), risk_off.rename("risk_off")],
        axis=1, join="inner",
    ).dropna()
    df = df[(df.index >= start) & (df.index <= end)]
    if len(df) < _MIN_DAYS:
        return pd.Series(dtype=float)

    indicators = [si.indicator for si in strategy.indicators]
    if not indicators:
        return pd.Series(dtype=float)

    gates: list[pd.Series] = []
    for ind in indicators:
        try:
            res = evaluate_indicator(ind, bench, returns=bench.pct_change())
            gates.append(res.gate_series.reindex(df.index))
        except Exception:
            continue
    if not gates:
        return pd.Series(dtype=float)

    composite = vote_of_k(gates, k=strategy.k_threshold).reindex(df.index)
    positions = composite.shift(1).ffill().fillna(0.0)
    risk_on_ret = df["risk_on"].pct_change()
    risk_off_ret = df["risk_off"].pct_change()
    strat_ret = positions * risk_on_ret + (1 - positions) * risk_off_ret
    valid = strat_ret.dropna().index
    if valid.empty:
        return pd.Series(dtype=float)
    return (1 + strat_ret.loc[valid]).cumprod()


def _spy_equity_in_window(start: pd.Timestamp, end: pd.Timestamp) -> pd.Series:
    ps = get_price_service()
    spy = ps.get_close_series(SPY_TICKER)
    if spy.empty or not isinstance(spy.index, pd.DatetimeIndex):
        return pd.Series(dtype=float)
    spy = spy[(spy.index >= start) & (spy.index <= end)]
    if len(spy) < _MIN_DAYS:
        return pd.Series(dtype=float)
    rets = spy.pct_change().dropna()
    return (1 + rets).cumprod()


def _attribute_one(
    strategy: Strategy, name: str, start_str: str, end_str: str
) -> CrisisResult:
    start = pd.Timestamp(start_str)
    end = pd.Timestamp(end_str)
    label = CRISIS_LABELS.get(name, name)

    s_equity = _strategy_equity_in_window(strategy, start, end)
    b_equity = _spy_equity_in_window(start, end)

    if s_equity.empty or b_equity.empty:
        return CrisisResult(
            name=name, label=label, start=start.date(), end=end.date(),
            verdict="insufficient_data",
            pct_above_spy=None, end_ratio=None, points=[],
        )

    aligned = pd.concat({"s": s_equity, "b": b_equity}, axis=1).dropna()
    if len(aligned) < _MIN_DAYS:
        return CrisisResult(
            name=name, label=label, start=start.date(), end=end.date(),
            verdict="insufficient_data",
            pct_above_spy=None, end_ratio=None, points=[],
        )

    s_norm = aligned["s"] / float(aligned["s"].iloc[0])
    b_norm = aligned["b"] / float(aligned["b"].iloc[0])
    ratio = s_norm / b_norm
    pct_above = float((ratio > 1.0).mean())
    end_ratio = float(ratio.iloc[-1])
    verdict = "beats" if pct_above >= _PCT_ABOVE_BAR else "loses"

    step = max(1, len(aligned) // _MAX_POINTS_PER_WINDOW)
    samp = aligned.iloc[::step]
    if samp.index[-1] != aligned.index[-1]:
        samp = pd.concat([samp, aligned.iloc[[-1]]])
    s_samp = samp["s"] / float(aligned["s"].iloc[0]) * 100
    b_samp = samp["b"] / float(aligned["b"].iloc[0]) * 100
    points = [
        CrisisPoint(
            date=ts.date() if hasattr(ts, "date") else ts,
            strategy=float(s_samp.loc[ts]),
            spy=float(b_samp.loc[ts]),
        )
        for ts in samp.index
    ]

    return CrisisResult(
        name=name, label=label, start=start.date(), end=end.date(),
        verdict=verdict,
        pct_above_spy=pct_above, end_ratio=end_ratio, points=points,
    )


def compute_crisis_attribution(strategy: Strategy) -> list[CrisisResult]:
    """Run all canonical crisis windows for a strategy."""
    return [
        _attribute_one(strategy, name, start, end)
        for name, (start, end) in CRISIS_WINDOWS.items()
    ]


def attribution_score(results: list[CrisisResult]) -> tuple[int, int]:
    """Return (n_beats, n_eligible). Eligible == windows with enough data."""
    eligible = [r for r in results if r.verdict != "insufficient_data"]
    beats = sum(1 for r in eligible if r.verdict == "beats")
    return beats, len(eligible)
