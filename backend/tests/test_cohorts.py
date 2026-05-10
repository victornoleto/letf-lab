"""Tests for the Cohort Entry Heatmap module."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import cohorts
from ai_swing.backtest import engine as engine_module
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


def test_cohort_entries_marks_pre_history_dates_as_no_data(patch_prices):
    # Only data from 2018+: pre-2018 cohort dates should report has_data=False
    idx = pd.bdate_range("2018-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 250, len(idx)), index=idx)
    risk_on = bench * 1.5
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    report = cohorts.compute_cohort_entries(_make_strategy(), forward_years=5)
    assert len(report.entries) == 8
    by_label = {e.label: e for e in report.entries}
    assert by_label["Black Monday (1987)"].has_data is False
    assert by_label["Dotcom peak (2000)"].has_data is False
    # 2020 COVID should have data, 2021 ATH might (5y forward partially in
    # range), 2022 might not have full 5y.
    assert by_label["COVID peak (2020)"].has_data is True


def test_cohort_entries_computes_metrics_when_data_available(patch_prices):
    # Wide history covering all cohort dates.
    idx = pd.bdate_range("1986-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 1500, len(idx)), index=idx)
    risk_on = bench * 1.5
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off})

    report = cohorts.compute_cohort_entries(_make_strategy(), forward_years=5)
    full = [e for e in report.entries if e.has_data]
    assert len(full) >= 6, "expected at least 6 cohorts with full history"
    for e in full:
        assert e.cagr is not None
        assert e.sortino is not None
        assert e.max_drawdown is not None
        assert e.final_equity_ratio is not None
        assert e.under_benchmark_episodes >= 0
        # MaxDD is negative or zero
        assert e.max_drawdown <= 0
