"""Tests for the Lei 14.754 annual-DARF tax layer.

We exercise the public `apply_annual_darf` against synthetic equity curves
covering: a single profitable year, multi-year compounding, a losing year
followed by a profitable one (carry-forward), and the "no-change" case
where a series with all-zero returns receives no tax deduction.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest.tax_layer import DARF_RATE, apply_annual_darf


def _curve_from_returns(rets: list[float], start: str = "2020-01-02"):
    idx = pd.bdate_range(start, periods=len(rets))
    rets_s = pd.Series(rets, index=idx)
    eq = (1 + rets_s).cumprod()
    return eq, rets_s


def test_single_year_gain_taxes_only_on_year_end():
    # Smooth +50% in one year → 15% DARF on the realized gain.
    n = 252
    daily = (1.5) ** (1 / n) - 1
    eq, rets = _curve_from_returns([daily] * n)
    net = apply_annual_darf(eq, rets)

    # All but the last bar of the year stay equal to gross
    assert (net.iloc[:-1] == eq.iloc[:-1]).all()

    # On the last bar, we owe 15% of the gain (gross_final - 1.0)
    gross_final = float(eq.iloc[-1])
    expected_tax = DARF_RATE * (gross_final - 1.0)
    assert net.iloc[-1] == pytest.approx(gross_final - expected_tax, rel=1e-6)


def test_loss_carries_forward_to_next_year():
    # Year 1: -20% → no tax, carry-forward = 0.20.
    # Year 2: +50% → taxable gain = 0.50 - 0.20 = 0.30 → tax = 0.045.
    rets_y1 = [-0.001] * 252  # ~ -22%
    rets_y2 = [+0.0017] * 252  # ~ +52%
    idx = pd.bdate_range("2020-01-02", periods=len(rets_y1) + len(rets_y2))
    rets = pd.Series(rets_y1 + rets_y2, index=idx)
    eq = (1 + rets).cumprod()
    net = apply_annual_darf(eq, rets)

    # Year 1 should have NO tax deduction (loss → carry-forward)
    end_of_y1 = idx[len(rets_y1) - 1]
    assert net.loc[end_of_y1] == pytest.approx(eq.loc[end_of_y1], rel=1e-9)

    # Year 2 should have a smaller-than-naive tax because of the carry
    end_of_y2 = idx[-1]
    naive_tax = DARF_RATE * (float(eq.iloc[-1]) - 1.0)
    actual_tax = float(eq.iloc[-1]) - float(net.iloc[-1])
    assert actual_tax < naive_tax  # carry-forward kicked in


def test_no_returns_means_no_tax():
    # Flat series: gross == 1.0 forever → no gain → no tax.
    n = 252
    eq, rets = _curve_from_returns([0.0] * n)
    net = apply_annual_darf(eq, rets)
    assert (net == eq).all()


def test_full_year_loss_carries_forward_indefinitely():
    # Losing year + flat year → still no tax owed at end of year 2.
    rets_y1 = [-0.001] * 252
    rets_y2 = [0.0] * 252
    idx = pd.bdate_range("2020-01-02", periods=len(rets_y1) + len(rets_y2))
    rets = pd.Series(rets_y1 + rets_y2, index=idx)
    eq = (1 + rets).cumprod()
    net = apply_annual_darf(eq, rets)

    # Year 2 ends with the same equity as year 1 (no growth) → no taxable gain
    assert net.iloc[-1] == pytest.approx(eq.iloc[-1], rel=1e-9)


def test_engine_populates_net_metrics():
    """Smoke: run_backtest should attach sortino_net + cagr_net + tax_drag_pp."""
    from ai_swing.backtest import engine as engine_module
    from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator

    class _FakePriceService:
        def __init__(self, m):
            self._m = m

        def get_close_series(self, t):
            return self._m.get(t, pd.Series(dtype=float))

    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    # Sortino on a perfectly monotone trend is 0 (no downside). Add Gaussian
    # noise so both gross and net curves yield finite, comparable Sortino.
    rng = np.random.default_rng(7)
    n = len(idx)
    bench = pd.Series(np.linspace(100, 350, n) + rng.normal(0, 1.5, n), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, n) + rng.normal(0, 2.5, n), index=idx)
    risk_off = pd.Series(np.full(n, 100.0) + rng.normal(0, 0.5, n), index=idx)
    fake = _FakePriceService({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    ind = Indicator(name="SMA50", type=IndicatorType.SMA_GATE, params={"period": 50})
    ind.id = 1
    s = Strategy(
        name="t",
        benchmark_ticker="QQQ",
        risk_on_ticker="TQQQ",
        risk_off_ticker="ZROZ",
        k_threshold=1,
        enabled=True,
    )
    s.id = 1
    si = StrategyIndicator(indicator=ind, order=0)
    si.indicator_id = 1
    s.indicators = [si]

    import unittest.mock as mock
    with mock.patch.object(engine_module, "get_price_service", return_value=fake):
        result = engine_module.run_backtest(s, range_years=10)

    assert result.metrics_strategy.sortino_net is not None
    assert result.metrics_strategy.cagr_net is not None
    assert result.metrics_strategy.tax_drag_pp is not None
    # Tax drag must be non-negative for a net-profitable strategy.
    assert result.metrics_strategy.tax_drag_pp >= 0
    # Net Sortino is bounded by gross Sortino.
    assert result.metrics_strategy.sortino_net <= result.metrics_strategy.sortino + 1e-9
    assert len(result.equity_strategy_net) > 0
