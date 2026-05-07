"""Tests for the strategy comparator service + endpoint."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import crisis as crisis_module
from ai_swing.backtest import engine as engine_module
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator
from ai_swing.services.compare import compare_strategies


_NEXT_ID = [100]


def _build(name: str, k: int) -> Strategy:
    sid = _NEXT_ID[0]
    _NEXT_ID[0] += 1
    ind = Indicator(name=f"SMA50-{name}", type=IndicatorType.SMA_GATE, params={"period": 50})
    ind.id = sid
    s = Strategy(
        name=name,
        benchmark_ticker="QQQ",
        risk_on_ticker="TQQQ",
        risk_off_ticker="ZROZ",
        k_threshold=k,
        enabled=True,
    )
    s.id = sid
    si = StrategyIndicator(indicator=ind, order=0)
    si.indicator_id = ind.id
    s.indicators = [si]
    return s


class _FakePriceService:
    def __init__(self, m):
        self._m = m

    def get_close_series(self, t):
        return self._m.get(t, pd.Series(dtype=float))


@pytest.fixture
def patch_prices(monkeypatch):
    def _apply(mapping):
        fake = _FakePriceService(mapping)
        monkeypatch.setattr(engine_module, "get_price_service", lambda: fake)
        monkeypatch.setattr(crisis_module, "get_price_service", lambda: fake)
        return fake
    return _apply


def test_compare_runs_both_strategies(patch_prices):
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    spy = pd.Series(np.linspace(100, 180, len(idx)), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off, "SPY": spy})

    a = _build("A", k=1)
    b = _build("B", k=1)
    report = compare_strategies(a, b, range_years=10)

    # Both backtests ran
    assert report.backtest_a.metrics_strategy.sortino is not None
    assert report.backtest_b.metrics_strategy.sortino is not None
    # Both deploy scores computed
    assert 0 <= report.deploy_a.total <= 100
    assert 0 <= report.deploy_b.total <= 100
    # Crisis rows: 4 windows for both
    assert len(report.crisis_rows) == 4
    # Both eligible counts make sense
    assert report.n_eligible_a == report.n_eligible_b  # same data window


def test_compare_returns_distinct_headers(patch_prices):
    """Both strategy headers should appear in the report — basic identity check."""
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    spy = pd.Series(np.linspace(100, 180, len(idx)), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off, "SPY": spy})

    a = _build("A", k=1)
    b = _build("B", k=1)
    report = compare_strategies(a, b, range_years=10)
    assert report.strategy_a.name == "A"
    assert report.strategy_b.name == "B"
    assert report.strategy_a.id != report.strategy_b.id
