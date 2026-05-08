"""Rolling-window stress: benchmark-relative heatmap by entry date × window size.

For every (entry_date, window_size) combination we slice strategy and
benchmark equity to a fixed window and compute the final relative equity:
strategy_equity / benchmark_equity, both renormalised at the entry date.
The result is a 2D grid the UI renders as a heatmap, exposing whether each
historical launch window ended ahead of (>1) or behind (<1) the benchmark.

The strategy itself is computed *once* over the full available history (so
indicator warmups use as much data as we have); the rolling step is just
slicing series + running the Sortino formula. This keeps the call to
under a second even with hundreds of windows.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.db.models import Strategy

# Range_years=100 acts as "all available history": the engine's trim cutoff
# (now()-100y) is older than any cached price series.
_RANGE_YEARS_ALL = 100


@dataclass
class RollingCell:
    entry_date: date
    sortino: float | None  # Kept for backwards-compatible clients; no longer populated.
    pct_above_spy: float | None  # ratio of days strategy > benchmark in window
    final_equity_ratio: float | None  # final strategy equity / benchmark equity
    passed: bool


@dataclass
class RollingRow:
    window_years: int
    cells: list[RollingCell] = field(default_factory=list)


@dataclass
class RollingStress:
    asof_date: date
    history_start: date
    window_years: list[int]
    entry_dates: list[date]
    rows: list[RollingRow] = field(default_factory=list)


def _entry_grid(start: pd.Timestamp, end: pd.Timestamp, step_months: int) -> list[pd.Timestamp]:
    """Generate evenly-spaced entry dates between [start, end] inclusive."""
    if start >= end:
        return []
    rule = f"{step_months}MS"  # month-start anchored offset
    rng = pd.date_range(start.normalize(), end.normalize(), freq=rule)
    return [pd.Timestamp(ts) for ts in rng]


def _window_relative_metrics(
    strat_eq: pd.Series, bench_eq: pd.Series,
    entry: pd.Timestamp, window_years: int,
) -> tuple[float | None, float | None]:
    end = entry + pd.Timedelta(days=int(window_years * 365.25))
    aligned = pd.concat({"s": strat_eq, "b": bench_eq}, axis=1).dropna()
    aligned = aligned.loc[(aligned.index >= entry) & (aligned.index <= end)]
    expected = int(window_years * 252)
    if len(aligned) < int(expected * 0.8):
        return None, None
    s_norm = aligned["s"] / aligned["s"].iloc[0]
    b_norm = aligned["b"] / aligned["b"].iloc[0]
    pct_above = float((s_norm > b_norm).mean())
    final_ratio = float(s_norm.iloc[-1] / b_norm.iloc[-1])
    return pct_above, final_ratio


def compute_rolling_stress(
    strategy: Strategy,
    window_years: list[int] | None = None,
    step_months: int = 3,
) -> RollingStress:
    """Build a heatmap of Sortino by (entry_date, window_size).

    Parameters
    ----------
    window_years : list[int]
        Window sizes to evaluate. Defaults to [3, 5, 10, 15, 20].
    step_months : int
        Spacing between consecutive entry dates (in months).
    """
    if window_years is None:
        window_years = [3, 5, 10, 15, 20]

    curves = compute_strategy_curves(strategy, range_years=_RANGE_YEARS_ALL)
    rets = curves.strategy_returns.dropna()
    if rets.empty:
        return RollingStress(
            asof_date=curves.asof_date,
            history_start=curves.range_start,
            window_years=window_years,
            entry_dates=[],
            rows=[],
        )

    history_start = pd.Timestamp(rets.index[0])
    history_end = pd.Timestamp(rets.index[-1])
    # The grid uses the largest window's latest viable entry as the limit so
    # all rows share the same column timeline (cells past their window end
    # come back as None, which the UI dims).
    entry_dates = _entry_grid(history_start, history_end, step_months)
    if not entry_dates:
        return RollingStress(
            asof_date=curves.asof_date,
            history_start=curves.range_start,
            window_years=window_years,
            entry_dates=[],
            rows=[],
        )

    rows: list[RollingRow] = []
    for wy in window_years:
        cells: list[RollingCell] = []
        for entry in entry_dates:
            p, final_ratio = _window_relative_metrics(
                curves.equity_strategy, curves.equity_bench, entry, wy
            )
            cells.append(RollingCell(
                entry_date=entry.date(),
                sortino=None,
                pct_above_spy=p,
                final_equity_ratio=final_ratio,
                passed=bool(final_ratio is not None and final_ratio > 1.0),
            ))
        rows.append(RollingRow(window_years=wy, cells=cells))

    return RollingStress(
        asof_date=curves.asof_date,
        history_start=history_start.date(),
        window_years=window_years,
        entry_dates=[d.date() for d in entry_dates],
        rows=rows,
    )
