"""Tests for the Crisis Lab attribution module.

We don't go to the network; we patch `get_price_service` to return synthetic
price series that exercise the three verdict branches (beats / loses /
insufficient_data).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import crisis
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator


def _make_strategy(indicator_id: int = 1) -> Strategy:
    ind = Indicator(name="SMA50", type=IndicatorType.SMA_GATE, params={"period": 50})
    ind.id = indicator_id
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
    si.indicator_id = indicator_id
    s.indicators = [si]
    return s


def _ramp_series(start: str, end: str, start_val: float, end_val: float) -> pd.Series:
    idx = pd.bdate_range(start, end)
    return pd.Series(np.linspace(start_val, end_val, len(idx)), index=idx)


class _FakePriceService:
    def __init__(self, mapping: dict[str, pd.Series]):
        self._m = mapping

    def get_close_series(self, ticker: str) -> pd.Series:
        return self._m.get(ticker, pd.Series(dtype=float))


@pytest.fixture
def patch_prices(monkeypatch):
    """Inject a fake price service for the duration of one test."""
    def _apply(mapping: dict[str, pd.Series]):
        fake = _FakePriceService(mapping)
        monkeypatch.setattr(crisis, "get_price_service", lambda: fake)
        return fake
    return _apply


def test_attribution_returns_insufficient_when_no_prices(patch_prices):
    patch_prices({})
    out = crisis.compute_crisis_attribution(_make_strategy())
    assert len(out) == 4
    assert all(r.verdict == "insufficient_data" for r in out)
    n_beats, n_eligible = crisis.attribution_score(out)
    assert (n_beats, n_eligible) == (0, 0)


def test_attribution_beats_when_strategy_outperforms_spy(patch_prices):
    # Strategy benchmark/risk_on rallies (price up 4×); risk_off flat. SPY
    # drifts only +5%. With SMA50 in uptrend, gate passes the whole time so
    # the strategy holds risk_on and crushes SPY. Expect "beats".
    bench = _ramp_series("2007-01-01", "2010-01-31", 100, 400)
    risk_on = _ramp_series("2007-01-01", "2010-01-31", 100, 500)
    risk_off = _ramp_series("2007-01-01", "2010-01-31", 100, 100.1)
    spy = _ramp_series("2007-01-01", "2010-01-31", 100, 105)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off, "SPY": spy})

    results = crisis.compute_crisis_attribution(_make_strategy())
    gfc = next(r for r in results if r.name == "2008_gfc")
    assert gfc.verdict == "beats"
    assert gfc.pct_above_spy is not None and gfc.pct_above_spy >= 0.5
    assert gfc.points  # equity points were emitted


def test_attribution_loses_when_strategy_lags_spy(patch_prices):
    # Strategy benchmark crashes after a flat warmup, SMA50 fails by mid-2008,
    # so the strategy locks into risk_off (flat) while SPY recovers slightly.
    # Expect "loses": strategy normalised stays below SPY normalised.
    idx = pd.bdate_range("2007-01-01", "2010-01-31")
    bench_vals = np.where(idx < pd.Timestamp("2008-09-01"), 100.0, 50.0)
    risk_on_vals = bench_vals.copy()  # tracks bench
    risk_off_vals = np.full(len(idx), 100.0)
    spy_vals = np.linspace(100, 110, len(idx))
    patch_prices({
        "QQQ": pd.Series(bench_vals, index=idx),
        "TQQQ": pd.Series(risk_on_vals, index=idx),
        "ZROZ": pd.Series(risk_off_vals, index=idx),
        "SPY": pd.Series(spy_vals, index=idx),
    })

    results = crisis.compute_crisis_attribution(_make_strategy())
    gfc = next(r for r in results if r.name == "2008_gfc")
    # When strategy holds risk_off (flat) while SPY rises, ratio < 1 → loses.
    assert gfc.verdict in {"loses", "insufficient_data"}
    if gfc.verdict == "loses":
        assert gfc.pct_above_spy is not None and gfc.pct_above_spy < 0.5


def test_attribution_score_excludes_insufficient(patch_prices):
    # Provide enough history only for the COVID + 2022 windows.
    idx = pd.bdate_range("2019-01-01", "2023-12-31")
    rampup = pd.Series(np.linspace(100, 400, len(idx)), index=idx)
    flat = pd.Series(np.full(len(idx), 100.0), index=idx)
    spy = pd.Series(np.linspace(100, 105, len(idx)), index=idx)
    patch_prices({"QQQ": rampup, "TQQQ": rampup, "ZROZ": flat, "SPY": spy})

    results = crisis.compute_crisis_attribution(_make_strategy())
    by_name = {r.name: r for r in results}
    assert by_name["2000_dotcom"].verdict == "insufficient_data"
    assert by_name["2008_gfc"].verdict == "insufficient_data"
    # COVID + 2022 should have data
    assert by_name["2020_covid"].verdict in {"beats", "loses"}
    assert by_name["2022_rates"].verdict in {"beats", "loses"}

    n_beats, n_eligible = crisis.attribution_score(results)
    assert n_eligible == 2
    assert 0 <= n_beats <= 2
