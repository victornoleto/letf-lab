"""Cohort entry heatmap: how the strategy performs starting at 8 historic dates.

Each entry is a real-world worst- or control-case launch date the study used
to gauge cohort robustness. For each date we compute the strategy's CAGR,
Sharpe and MaxDD over the next N years (default 5).

This complements the rolling-window heatmap by zooming in on a curated set
of "would you have launched here?" moments — Black Monday, dotcom peak, GFC,
COVID, the 2021 ATH, etc.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.backtest.metrics import (
    cagr as cagr_metric,
    max_drawdown as mdd_metric,
    sortino as sortino_metric,
)
from ai_swing.db.models import Strategy

# Eight canonical entry dates lifted from the study's
# `cohort_robustness/COHORT_ROBUSTNESS_REPORT.md`. Mix of "worst-case" peaks
# right before crashes and control points (recoveries / ATH).
COHORT_DATES: list[tuple[str, str]] = [
    ("1987-10-19", "Black Monday (1987)"),
    ("2000-03-10", "Dotcom peak (2000)"),
    ("2003-03-12", "Dotcom recovery (2003)"),
    ("2007-10-09", "Pre-GFC peak (2007)"),
    ("2009-03-09", "GFC trough (2009)"),
    ("2020-02-19", "COVID peak (2020)"),
    ("2021-12-27", "ATH 2021"),
    ("2022-01-03", "Rate-hike start (2022)"),
]

_RANGE_YEARS_ALL = 100  # "all available history"
_MIN_DAYS = 60


@dataclass
class CohortEntry:
    entry_date: date
    label: str
    forward_years: int
    has_data: bool
    n_days: int
    cagr: float | None
    sortino: float | None
    max_drawdown: float | None
    final_equity_ratio: float | None
    under_benchmark_episodes: int
    under_benchmark_min_days: int | None
    under_benchmark_avg_days: float | None
    under_benchmark_max_days: int | None


@dataclass
class CohortReport:
    asof_date: date
    forward_years: int
    entries: list[CohortEntry] = field(default_factory=list)


def _entry_metrics(
    strat_eq: pd.Series,
    bench_eq: pd.Series,
    strat_returns: pd.Series,
    entry: pd.Timestamp,
    forward_years: int,
) -> tuple[
    bool,
    int,
    float | None,
    float | None,
    float | None,
    float | None,
    int,
    int | None,
    float | None,
    int | None,
]:
    end = entry + pd.Timedelta(days=int(forward_years * 365.25))
    aligned_eq = pd.concat({"s": strat_eq, "b": bench_eq}, axis=1).dropna()
    win_eq = aligned_eq[(aligned_eq.index >= entry) & (aligned_eq.index <= end)]
    win_ret = strat_returns[(strat_returns.index >= entry) & (strat_returns.index <= end)]
    if len(win_eq) < _MIN_DAYS:
        return False, len(win_eq), None, None, None, None, 0, None, None, None
    s_norm = win_eq["s"] / win_eq["s"].iloc[0]
    b_norm = win_eq["b"] / win_eq["b"].iloc[0]
    rel = s_norm / b_norm
    durations = _under_benchmark_durations(rel)
    return (
        True,
        len(win_eq),
        cagr_metric(win_eq["s"]),
        sortino_metric(win_ret),
        mdd_metric(win_eq["s"]),
        float(rel.iloc[-1]),
        len(durations),
        min(durations) if durations else None,
        float(sum(durations) / len(durations)) if durations else None,
        max(durations) if durations else None,
    )


def _under_benchmark_durations(relative_equity: pd.Series) -> list[int]:
    """Return consecutive business-day episode lengths where strategy trails benchmark."""
    durations: list[int] = []
    current = 0
    for is_under in (relative_equity < 1.0).to_list():
        if is_under:
            current += 1
        elif current:
            durations.append(current)
            current = 0
    if current:
        durations.append(current)
    return durations


def compute_cohort_entries(
    strategy: Strategy, forward_years: int = 5
) -> CohortReport:
    """Run all 8 cohort dates and return per-entry forward metrics."""
    curves = compute_strategy_curves(strategy, range_years=_RANGE_YEARS_ALL)
    entries: list[CohortEntry] = []
    for raw_date, label in COHORT_DATES:
        entry_ts = pd.Timestamp(raw_date)
        has_data, n_days, c, s, mdd, ratio, n_ep, min_days, avg_days, max_days = _entry_metrics(
            curves.equity_strategy, curves.equity_bench,
            curves.strategy_returns, entry_ts, forward_years
        )
        entries.append(CohortEntry(
            entry_date=entry_ts.date(),
            label=label,
            forward_years=forward_years,
            has_data=has_data,
            n_days=n_days,
            cagr=c,
            sortino=s,
            max_drawdown=mdd,
            final_equity_ratio=ratio,
            under_benchmark_episodes=n_ep,
            under_benchmark_min_days=min_days,
            under_benchmark_avg_days=avg_days,
            under_benchmark_max_days=max_days,
        ))
    return CohortReport(
        asof_date=curves.asof_date,
        forward_years=forward_years,
        entries=entries,
    )
