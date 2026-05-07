"""Walk-forward validation: 8 non-overlapping windows on the strategy history.

Per-window metrics replicate the study's G3 redesign (mandate §2.3 +
2026-05-06 user observation): a window "passes" when the strategy spent
≥50% of its days above the buy-hold benchmark inside that window. MaxDD
remains warning-only — it doesn't determine pass/fail anymore.

The full strategy curve is computed once over all available history; each
window is a slice of the existing series. Cheap enough to run live without
a cache.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import numpy as np
import pandas as pd

from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.backtest.metrics import (
    cagr as cagr_metric,
    max_drawdown as mdd_metric,
    sortino as sortino_metric,
)
from ai_swing.db.models import Strategy

_RANGE_YEARS_ALL = 100
_PCT_ABOVE_BAR = 0.50  # mirrors the study's G3 threshold
_MIN_DAYS_PER_WINDOW = 30


@dataclass
class WalkForwardWindow:
    index: int
    start: date
    end: date
    n_days: int
    sortino: float | None
    cagr: float | None
    max_drawdown: float | None
    pct_above_benchmark: float | None
    passed: bool  # benchmark-relative criterion


@dataclass
class WalkForwardReport:
    asof_date: date
    n_windows: int
    windows: list[WalkForwardWindow] = field(default_factory=list)
    n_passed: int = 0


def _split_into_windows(idx: pd.DatetimeIndex, n_windows: int) -> list[pd.DatetimeIndex]:
    """Cut a DatetimeIndex into N contiguous, non-overlapping chunks."""
    if len(idx) == 0 or n_windows <= 0:
        return []
    step = len(idx) // n_windows
    if step < _MIN_DAYS_PER_WINDOW:
        return []
    chunks: list[pd.DatetimeIndex] = []
    for i in range(n_windows):
        start = i * step
        end = (i + 1) * step if i < n_windows - 1 else len(idx)
        chunks.append(idx[start:end])
    return chunks


def compute_walk_forward(
    strategy: Strategy, n_windows: int = 8
) -> WalkForwardReport:
    """Run walk-forward validation over `n_windows` chronological splits."""
    curves = compute_strategy_curves(strategy, range_years=_RANGE_YEARS_ALL)
    rets = curves.strategy_returns.dropna()
    if rets.empty:
        return WalkForwardReport(
            asof_date=curves.asof_date,
            n_windows=n_windows,
            windows=[],
            n_passed=0,
        )

    chunks = _split_into_windows(rets.index, n_windows)
    if not chunks:
        return WalkForwardReport(
            asof_date=curves.asof_date,
            n_windows=n_windows,
            windows=[],
            n_passed=0,
        )

    windows: list[WalkForwardWindow] = []
    for i, chunk in enumerate(chunks):
        win_rets = rets.loc[chunk]
        win_strat = curves.equity_strategy.loc[chunk]
        win_bench = curves.equity_bench.loc[chunk]

        # Renormalise both to a common starting point for the relative comparison
        if len(win_strat) >= _MIN_DAYS_PER_WINDOW and len(win_bench) >= _MIN_DAYS_PER_WINDOW:
            s_norm = win_strat / float(win_strat.iloc[0])
            b_norm = win_bench / float(win_bench.iloc[0])
            pct_above = float((s_norm > b_norm).mean())
            so = float(sortino_metric(win_rets))
            cg = float(cagr_metric(win_strat))
            mdd = float(mdd_metric(win_strat))
            passed = pct_above >= _PCT_ABOVE_BAR
        else:
            pct_above = None
            so = None
            cg = None
            mdd = None
            passed = False

        windows.append(WalkForwardWindow(
            index=i,
            start=chunk[0].date(),
            end=chunk[-1].date(),
            n_days=len(chunk),
            sortino=so,
            cagr=cg,
            max_drawdown=mdd,
            pct_above_benchmark=pct_above,
            passed=passed,
        ))

    return WalkForwardReport(
        asof_date=curves.asof_date,
        n_windows=n_windows,
        windows=windows,
        n_passed=sum(1 for w in windows if w.passed),
    )
