"""Tests for the rolling-window Sharpe heatmap.

Synthetic prices keep the test deterministic: a steadily rising QQQ keeps
the SMA gate ON, so the strategy compounds the leveraged sleeve.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import engine as engine_module
from ai_swing.backtest import rolling_stress as rs
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator


def _make_strategy() -> Strategy:
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
    return s


class _FakePriceService:
    def __init__(self, mapping):
        self._m = mapping

    def get_close_series(self, ticker):
        return self._m.get(ticker, pd.Series(dtype=float))


@pytest.fixture
def patch_prices(monkeypatch):
    def _apply(mapping):
        fake = _FakePriceService(mapping)
        monkeypatch.setattr(engine_module, "get_price_service", lambda: fake)
        return fake
    return _apply


def test_rolling_stress_returns_grid(patch_prices):
    idx = pd.bdate_range("2010-01-01", "2026-04-30")
    # Sortino zeroes out on perfectly monotone series (no downside), so
    # we add small Gaussian noise around the trend to give the metric a
    # non-zero downside denominator.
    rng = np.random.default_rng(0)
    n = len(idx)
    trend = np.linspace(100, 350, n)
    bench = pd.Series(trend + rng.normal(0, 1.5, n), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, n) + rng.normal(0, 2.5, n), index=idx)
    risk_off = pd.Series(np.full(n, 100.0) + rng.normal(0, 0.5, n), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    result = rs.compute_rolling_stress(_make_strategy(), window_years=[3, 5, 10], step_months=6)

    # Grid shape: 3 rows (window sizes) × N cols (entry dates)
    assert [r.window_years for r in result.rows] == [3, 5, 10]
    assert all(len(r.cells) == len(result.entry_dates) for r in result.rows)

    # Some cells should have a numeric Sharpe
    sortinos = [
        c.sortino for r in result.rows for c in r.cells if c.sortino is not None
    ]
    assert sortinos, "expected at least one cell with a Sortino value"
    # In an uptrend the Sortino should be strongly positive
    assert max(sortinos) > 0.5

    # The 10y row should have *some* None cells near the end of history
    # (windows past `history_end` don't fit) and *some* numeric cells early on.
    last_row = result.rows[-1]
    nones = sum(1 for c in last_row.cells if c.sortino is None)
    nums = sum(1 for c in last_row.cells if c.sortino is not None)
    assert nones > 0 and nums > 0, "10y row should mix viable and overflow cells"


def test_rolling_stress_handles_missing_prices(patch_prices):
    patch_prices({})  # nothing → engine should raise → endpoint surfaces ValueError
    with pytest.raises(ValueError):
        rs.compute_rolling_stress(_make_strategy())


def test_rolling_stress_short_history_returns_few_cells(patch_prices):
    # Only 2 years of data → can't fill 3y or 5y windows
    idx = pd.bdate_range("2024-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 130, len(idx)), index=idx)
    patch_prices({
        "QQQ": bench,
        "TQQQ": bench * 1.1,
        "ZROZ": pd.Series(np.full(len(idx), 100.0), index=idx),
    })

    result = rs.compute_rolling_stress(_make_strategy(), window_years=[3, 5], step_months=3)
    # All rows present, but no cell should have a Sharpe (windows don't fit)
    for row in result.rows:
        assert all(c.sortino is None for c in row.cells)
