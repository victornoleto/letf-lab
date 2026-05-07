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
    sharpe as sharpe_metric,
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
    sharpe: float | None
    max_drawdown: float | None


@dataclass
class CohortReport:
    asof_date: date
    forward_years: int
    entries: list[CohortEntry] = field(default_factory=list)


def _entry_metrics(
    strat_eq: pd.Series,
    strat_returns: pd.Series,
    entry: pd.Timestamp,
    forward_years: int,
) -> tuple[bool, int, float | None, float | None, float | None]:
    end = entry + pd.Timedelta(days=int(forward_years * 365.25))
    win_eq = strat_eq[(strat_eq.index >= entry) & (strat_eq.index <= end)]
    win_ret = strat_returns[(strat_returns.index >= entry) & (strat_returns.index <= end)]
    if len(win_eq) < _MIN_DAYS:
        return False, len(win_eq), None, None, None
    return (
        True,
        len(win_eq),
        cagr_metric(win_eq),
        sharpe_metric(win_ret),
        mdd_metric(win_eq),
    )


def compute_cohort_entries(
    strategy: Strategy, forward_years: int = 5
) -> CohortReport:
    """Run all 8 cohort dates and return per-entry forward metrics."""
    curves = compute_strategy_curves(strategy, range_years=_RANGE_YEARS_ALL)
    entries: list[CohortEntry] = []
    for raw_date, label in COHORT_DATES:
        entry_ts = pd.Timestamp(raw_date)
        has_data, n_days, c, s, mdd = _entry_metrics(
            curves.equity_strategy, curves.strategy_returns, entry_ts, forward_years
        )
        entries.append(CohortEntry(
            entry_date=entry_ts.date(),
            label=label,
            forward_years=forward_years,
            has_data=has_data,
            n_days=n_days,
            cagr=c,
            sharpe=s,
            max_drawdown=mdd,
        ))
    return CohortReport(
        asof_date=curves.asof_date,
        forward_years=forward_years,
        entries=entries,
    )
