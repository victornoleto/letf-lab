"""Pure indicator functions copied from letf_rotation_hunt/signals.py.

Kept standalone (no cross-project imports) for stability. Parity tested in
tests/test_indicators.py vs the original module.

All gates return pd.Series of {0, 1, NaN} (NaN = warmup); continuous forecasts
return pd.Series of floats. Index matches input.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS_PER_YEAR = 252


def sma_gate(prices: pd.Series, period: int = 200) -> pd.Series:
    """Binary gate: 1 if price > SMA(period), else 0. NaN during warmup."""
    sma = prices.rolling(window=period, min_periods=period).mean()
    gate = (prices > sma).astype(float)
    gate[sma.isna()] = np.nan
    return gate


def ema_gate(prices: pd.Series, period: int = 200) -> pd.Series:
    """Binary gate: 1 if price > EMA(period), else 0. NaN during warmup."""
    ema = prices.ewm(span=period, min_periods=period, adjust=False).mean()
    gate = (prices > ema).astype(float)
    gate[ema.isna()] = np.nan
    return gate


def realized_vol_gate(
    returns: pd.Series,
    window: int = 21,
    threshold: float = 0.40,
) -> pd.Series:
    """Binary gate: 1 if rolling realized vol < threshold (annualized), else 0."""
    realized_vol = returns.rolling(window=window, min_periods=window).std() * np.sqrt(
        TRADING_DAYS_PER_YEAR
    )
    gate = (realized_vol < threshold).astype(float)
    gate[realized_vol.isna()] = np.nan
    return gate


def realized_vol(returns: pd.Series, window: int = 21) -> pd.Series:
    """Helper: rolling annualized realized vol (used for raw display)."""
    return returns.rolling(window=window, min_periods=window).std() * np.sqrt(
        TRADING_DAYS_PER_YEAR
    )


def ar1_coefficient(returns: pd.Series, window: int = 30) -> pd.Series:
    """Rolling AR(1) coefficient of returns, ∈ [-1, 1] approx."""

    def _ar1(x: np.ndarray) -> float:
        if len(x) < 2 or np.any(np.isnan(x)):
            return np.nan
        x_lag = x[:-1]
        x_curr = x[1:]
        if np.std(x_lag) == 0 or np.std(x_curr) == 0:
            return 0.0
        return float(np.corrcoef(x_lag, x_curr)[0, 1])

    return returns.rolling(window=window, min_periods=window).apply(_ar1, raw=True)


def ar1_gate(returns: pd.Series, window: int = 30, threshold: float = 0.0) -> pd.Series:
    """Binary gate: 1 if AR(1)_window > threshold, else 0."""
    coef = ar1_coefficient(returns, window=window)
    gate = (coef > threshold).astype(float)
    gate[coef.isna()] = np.nan
    return gate


def vote_of_k(signals: list[pd.Series], k: int) -> pd.Series:
    """Composite gate: 1 if ≥ k of len(signals) signals are ON, else 0."""
    if not signals:
        raise ValueError("vote_of_k requires at least one signal")
    if k > len(signals):
        raise ValueError(f"k={k} exceeds number of signals ({len(signals)})")
    if k < 1:
        raise ValueError(f"k must be >= 1, got {k}")
    df = pd.concat(signals, axis=1)
    total_on = df.sum(axis=1)
    any_nan = df.isna().any(axis=1)
    gate = (total_on >= k).astype(float)
    gate[any_nan] = np.nan
    return gate
