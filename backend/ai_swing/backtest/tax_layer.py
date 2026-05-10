"""Brazilian Law 14.754/2023 - annual DARF on realized gains.

Port of `studies/letf_rotation_hunt/tax_layer.py`. Keeps the
``annual_realize`` logic (the mode used by swing/T1+ strategies):

- 15% DARF on realized gains in the year
- Losses carry forward indefinitely
- Tax is paid only on the last trading day of each calendar year

The input is the gross equity curve (already produced by the engine as
``(1 + returns).cumprod()`` starting from 1.0). The output is the net equity
curve with the same time index.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

DARF_RATE = 0.15


def apply_annual_darf(
    gross_equity: pd.Series,
    returns: pd.Series,
    initial: float | None = None,
) -> pd.Series:
    """Apply annual DARF (Law 14.754) to a gross equity curve.

    ``gross_equity.iloc[0]`` is the value AFTER the first trading day's return,
    not the initial capital. ``initial`` is inferred from ``returns`` when not
    passed: ``initial = gross_equity[0] / (1 + returns[0])``.
    """
    if initial is None:
        if returns is None or len(returns) == 0:
            raise ValueError("Cannot infer initial without returns")
        initial = float(gross_equity.iloc[0]) / (1.0 + float(returns.iloc[0]))
    return _apply_annual_darf(gross_equity, initial)


def _apply_annual_darf(gross_equity: pd.Series, initial: float) -> pd.Series:
    """15% DARF on annual gains; losses accumulate as carry-forward.

    During the year, net equity is gross equity rebased to the net anchor from
    the end of the previous year (preserving daily compounding). On the last
    bar of the calendar year, tax is deducted.
    """
    net_equity = gross_equity.copy().astype(float)
    carry_forward_loss = 0.0

    gross_arr = gross_equity.values.astype(float)
    years = np.array(gross_equity.index.year)
    unique_years = sorted(set(years))

    for year in unique_years:
        year_idx = np.where(years == year)[0]
        if len(year_idx) == 0:
            continue
        start_idx = year_idx[0]
        end_idx = year_idx[-1]

        if start_idx == 0:
            start_net = initial
            gross_base = initial
        else:
            start_net = float(net_equity.iloc[start_idx - 1])
            gross_base = gross_arr[start_idx - 1]

        if gross_base > 0:
            ratios = gross_arr[start_idx:end_idx + 1] / gross_base
            net_equity.iloc[start_idx:end_idx + 1] = start_net * ratios

        end_net_pretax = float(net_equity.iloc[end_idx])
        gain = end_net_pretax - start_net
        taxable_gain = gain - carry_forward_loss
        if taxable_gain > 0:
            tax = DARF_RATE * taxable_gain
            carry_forward_loss = 0.0
        else:
            tax = 0.0
            carry_forward_loss = -taxable_gain

        net_equity.iloc[end_idx] = end_net_pretax - tax

    return net_equity


def net_returns_from_curve(net_equity: pd.Series) -> pd.Series:
    """Daily returns derived from net equity, including the DARF dip on the
    year's last day."""
    return net_equity.pct_change().fillna(0.0)
