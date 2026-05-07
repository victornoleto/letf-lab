"""Engine smoke tests using synthetic price data injected via PriceService stub."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest.engine import run_backtest
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator


@pytest.fixture
def synthetic_prices(monkeypatch):
    """Stub the PriceService to return deterministic synthetic series."""
    rng = np.random.default_rng(42)
    n = 1500
    idx = pd.date_range("2018-01-01", periods=n, freq="B")

    bench_ret = rng.normal(0.0005, 0.012, n)
    bench = pd.Series(100 * np.exp(np.cumsum(bench_ret)), index=idx)
    risk_on = pd.Series(100 * np.exp(np.cumsum(2 * bench_ret - 0.0001)), index=idx)
    risk_off = pd.Series(100 * np.exp(np.cumsum(rng.normal(0.0002, 0.005, n))), index=idx)

    series_map = {"BENCH": bench, "RISKON": risk_on, "RISKOFF": risk_off}

    class StubPriceService:
        def get_close_series(self, ticker: str) -> pd.Series:
            return series_map.get(ticker.upper(), pd.Series(dtype=float)).rename(ticker)

        def get_history(self, ticker):
            s = series_map.get(ticker.upper())
            return pd.DataFrame({"close": s}) if s is not None else pd.DataFrame()

    from ai_swing.data import price_service as ps_mod

    monkeypatch.setattr(ps_mod, "_singleton", StubPriceService(), raising=False)
    monkeypatch.setattr(ps_mod, "get_price_service", lambda: ps_mod._singleton)

    yield


def _make_strategy() -> Strategy:
    s = Strategy(
        name="test",
        benchmark_ticker="BENCH",
        risk_on_ticker="RISKON",
        risk_off_ticker="RISKOFF",
        k_threshold=2,
        enabled=True,
    )
    s.id = 1

    inds: list[Indicator] = [
        Indicator(name="SMA200", type=IndicatorType.SMA_GATE, params={"period": 200}),
        Indicator(name="SMA50", type=IndicatorType.SMA_GATE, params={"period": 50}),
        Indicator(name="VOL21", type=IndicatorType.VOL_GATE, params={"window": 21, "threshold": 0.40}),
        Indicator(name="AR1", type=IndicatorType.AR1_GATE, params={"window": 30, "threshold": 0.0}),
    ]
    for i, ind in enumerate(inds):
        ind.id = i + 1

    s.indicators = [StrategyIndicator(strategy_id=1, indicator_id=ind.id, order=i, indicator=ind) for i, ind in enumerate(inds)]
    return s


def test_run_backtest_smoke(synthetic_prices):
    s = _make_strategy()
    result = run_backtest(s, range_years=5)
    assert result.range_years == 5
    assert result.range_end >= result.range_start
    assert len(result.equity_strategy) > 100
    assert len(result.equity_benchmark_buyhold) > 100
    assert len(result.equity_riskon_buyhold) > 100
    assert result.metrics_strategy is not None
    assert isinstance(result.metrics_strategy.cagr, float)
    assert -1 < result.metrics_strategy.max_dd <= 0
    # Position must have some flips
    assert result.metrics_strategy.n_trades is not None


def test_backtest_no_indicators_raises(synthetic_prices):
    s = _make_strategy()
    s.indicators = []
    with pytest.raises(ValueError, match="no indicators"):
        run_backtest(s)


def test_backtest_missing_prices(monkeypatch):
    from ai_swing.data import price_service as ps_mod

    class EmptyPS:
        def get_close_series(self, ticker):
            return pd.Series(dtype=float)

    monkeypatch.setattr(ps_mod, "_singleton", EmptyPS(), raising=False)
    monkeypatch.setattr(ps_mod, "get_price_service", lambda: ps_mod._singleton)

    s = _make_strategy()
    with pytest.raises(ValueError, match="Missing prices"):
        run_backtest(s)
