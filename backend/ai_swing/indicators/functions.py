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


def _band_gate(prices: pd.Series, ref: pd.Series, threshold: float) -> pd.Series:
    """Hysteresis gate driven by a reference line (SMA/EMA/etc).

    threshold == 0 → strict price > ref. Otherwise risk-on triggers only above
    ref·(1+threshold) and risk-off only below ref·(1-threshold); inside the band
    the previous state holds. NaN during warmup (when ref is NaN).
    """
    if threshold <= 0:
        gate = (prices > ref).astype(float)
        gate[ref.isna()] = np.nan
        return gate

    upper = ref * (1.0 + threshold)
    lower = ref * (1.0 - threshold)
    out = np.full(len(prices), np.nan)
    state = np.nan
    p_arr = prices.to_numpy()
    u_arr = upper.to_numpy()
    l_arr = lower.to_numpy()
    r_arr = ref.to_numpy()
    for i in range(len(prices)):
        if np.isnan(r_arr[i]) or np.isnan(p_arr[i]):
            out[i] = np.nan
            state = np.nan
            continue
        if np.isnan(state):
            state = 1.0 if p_arr[i] > r_arr[i] else 0.0
        if p_arr[i] > u_arr[i]:
            state = 1.0
        elif p_arr[i] < l_arr[i]:
            state = 0.0
        out[i] = state
    return pd.Series(out, index=prices.index)


def sma_gate(prices: pd.Series, period: int = 200, threshold: float = 0.0) -> pd.Series:
    """Binary gate: 1 if price > SMA(period), else 0. NaN during warmup.

    With threshold > 0 a hysteresis band of ±threshold·SMA prevents whipsaws
    near the line: triggers risk-on only above SMA·(1+t), risk-off only below
    SMA·(1-t).
    """
    sma = prices.rolling(window=period, min_periods=period).mean()
    return _band_gate(prices, sma, threshold)


def ema_gate(prices: pd.Series, period: int = 200, threshold: float = 0.0) -> pd.Series:
    """Binary gate: 1 if price > EMA(period), else 0. NaN during warmup.

    Same hysteresis-band semantics as `sma_gate`.
    """
    ema = prices.ewm(span=period, min_periods=period, adjust=False).mean()
    return _band_gate(prices, ema, threshold)


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
    """Rolling AR(1) coefficient of returns, ∈ [-1, 1] approx.

    Vectorized via the closed-form Pearson correlation between the in-window
    pairs (returns[t-1], returns[t]). Equivalent to a `rolling().apply()` over
    `np.corrcoef(x[:-1], x[1:])` but ~500× faster on long series — the apply
    path was a Python loop firing once per window.
    """
    x = returns
    y = returns.shift(1)
    # window=30 of price-returns yields 29 consecutive (lag, curr) pairs;
    # rolling on the per-row product captures exactly those pairs.
    n = window - 1
    xy = (x * y).rolling(window=n, min_periods=n).mean()
    mx = x.rolling(window=n, min_periods=n).mean()
    my = y.rolling(window=n, min_periods=n).mean()
    cov = xy - mx * my
    sx = x.rolling(window=n, min_periods=n).std(ddof=0)
    sy = y.rolling(window=n, min_periods=n).std(ddof=0)
    denom = sx * sy
    coef = cov / denom
    coef = coef.where(denom != 0, 0.0)
    # Match the original NaN pattern: first `window` rows must be NaN
    # (need 30 returns to compute the first coef). Our rolling of n=29
    # already produces NaN for indices 0..n-1; that lines up since
    # pair[0] = (NaN, returns[0]) propagates a NaN into the first window.
    coef[returns.isna()] = np.nan
    return coef


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
