"""Tests for the walk-forward validation module."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import engine as engine_module
from ai_swing.backtest import walk_forward
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator


def _make_strategy() -> Strategy:
    ind = Indicator(name="SMA50", type=IndicatorType.SMA_GATE, params={"period": 50})
    ind.id = 1
    s = Strategy(
        name="t",
        benchmark_ticker="QQQ",
        risk_on_tickers=["TQQQ"],
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
    def __init__(self, m):
        self._m = m

    def get_close_series(self, t):
        return self._m.get(t, pd.Series(dtype=float))


@pytest.fixture
def patch_prices(monkeypatch):
    def _apply(mapping):
        fake = _FakePriceService(mapping)
        monkeypatch.setattr(engine_module, "get_price_service", lambda: fake)
        return fake
    return _apply


def test_walk_forward_emits_n_windows(patch_prices):
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    report = walk_forward.compute_walk_forward(_make_strategy(), n_windows=8)
    assert report.n_windows == 8
    assert len(report.windows) == 8
    # Each window should have non-empty start/end + n_days > 0
    for w in report.windows:
        assert w.n_days > 0
        assert w.start <= w.end


def test_walk_forward_pass_count_in_uptrend(patch_prices):
    # Strategy holding leveraged sleeve in uptrend should beat buy-hold
    # benchmark in most windows → high pass count.
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    report = walk_forward.compute_walk_forward(_make_strategy(), n_windows=8)
    assert report.n_passed >= 4, (
        f"expected ≥4/8 windows to pass in uptrend, got {report.n_passed}"
    )


def test_walk_forward_short_history_emits_empty(patch_prices):
    # Tiny history → not enough days per window
    idx = pd.bdate_range("2025-10-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 110, len(idx)), index=idx)
    patch_prices({
        "QQQ": bench,
        "TQQQ": bench * 1.05,
        "ZROZ": pd.Series(np.full(len(idx), 100.0), index=idx),
    })

    report = walk_forward.compute_walk_forward(_make_strategy(), n_windows=8)
    assert report.windows == []
    assert report.n_passed == 0
