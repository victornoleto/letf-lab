"""Performance metrics for equity curves: CAGR, MaxDD, Sharpe, hit rate."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


@dataclass
class Metrics:
    cagr: float
    max_dd: float
    sharpe: float
    n_trades: int | None = None
    hit_rate_vs_benchmark: float | None = None
    # Net-of-tax fields (Lei 14.754, annual_realize). Only populated on the
    # strategy curve — buy-hold curves are gross.
    cagr_net: float | None = None
    sharpe_net: float | None = None
    tax_drag_pp: float | None = None


def cagr(equity: pd.Series) -> float:
    """Compound annual growth rate from an equity curve indexed by date."""
    if len(equity) < 2:
        return 0.0
    eq = equity.dropna()
    if eq.empty or eq.iloc[0] <= 0:
        return 0.0
    days = (eq.index[-1] - eq.index[0]).days
    if days <= 0:
        return 0.0
    years = days / 365.25
    return float((eq.iloc[-1] / eq.iloc[0]) ** (1 / years) - 1)


def max_drawdown(equity: pd.Series) -> float:
    """Max peak-to-trough drawdown (negative number, e.g. -0.35 = -35%)."""
    eq = equity.dropna()
    if eq.empty:
        return 0.0
    running_max = eq.cummax()
    dd = (eq - running_max) / running_max
    return float(dd.min())


def sharpe(returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """Annualized Sharpe ratio from a daily return series."""
    r = returns.dropna()
    if r.empty:
        return 0.0
    excess = r - risk_free_rate / TRADING_DAYS_PER_YEAR
    std = excess.std()
    if std == 0 or np.isnan(std):
        return 0.0
    return float(excess.mean() / std * np.sqrt(TRADING_DAYS_PER_YEAR))


def hit_rate_vs(strategy_equity: pd.Series, benchmark_equity: pd.Series) -> float:
    """Fraction of days where strategy equity > benchmark equity (after alignment)."""
    aligned = pd.concat([strategy_equity, benchmark_equity], axis=1, join="inner").dropna()
    if aligned.empty:
        return 0.0
    return float((aligned.iloc[:, 0] > aligned.iloc[:, 1]).mean())


def n_trades(positions: pd.Series) -> int:
    """Count of position flips (0→1 or 1→0)."""
    p = positions.dropna()
    if p.empty:
        return 0
    return int((p.diff().fillna(0) != 0).sum())


def compute_metrics(
    equity: pd.Series,
    returns: pd.Series,
    benchmark_equity: pd.Series | None = None,
    positions: pd.Series | None = None,
) -> Metrics:
    return Metrics(
        cagr=cagr(equity),
        max_dd=max_drawdown(equity),
        sharpe=sharpe(returns),
        n_trades=n_trades(positions) if positions is not None else None,
        hit_rate_vs_benchmark=hit_rate_vs(equity, benchmark_equity)
        if benchmark_equity is not None
        else None,
    )
