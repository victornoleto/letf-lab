from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.db.models import Indicator, IndicatorType
from ai_swing.indicators.catalog import validate_params
from ai_swing.indicators.evaluator import evaluate_indicator


def _trend_up_prices(n: int = 300) -> pd.Series:
    idx = pd.date_range("2020-01-01", periods=n, freq="B")
    return pd.Series(np.linspace(100, 200, n), index=idx, name="close")


def _trend_down_prices(n: int = 300) -> pd.Series:
    idx = pd.date_range("2020-01-01", periods=n, freq="B")
    return pd.Series(np.linspace(200, 100, n), index=idx, name="close")


def _make_indicator(type_: IndicatorType, params: dict) -> Indicator:
    ind = Indicator(name=f"test_{type_.value}", type=type_, params=params)
    ind.id = 1
    return ind


def test_sma_gate_passes_in_uptrend():
    prices = _trend_up_prices()
    ind = _make_indicator(IndicatorType.SMA_GATE, {"period": 50})
    res = evaluate_indicator(ind, prices)
    assert res.gate_passed is True
    assert "price" in res.raw_summary


def test_sma_gate_fails_in_downtrend():
    prices = _trend_down_prices()
    ind = _make_indicator(IndicatorType.SMA_GATE, {"period": 50})
    res = evaluate_indicator(ind, prices)
    assert res.gate_passed is False


def test_vol_gate_calm():
    rng = np.random.default_rng(0)
    n = 200
    idx = pd.date_range("2020-01-01", periods=n, freq="B")
    # very low vol
    rets = rng.normal(0.0001, 0.001, n)
    prices = pd.Series(100 * np.exp(np.cumsum(rets)), index=idx)
    ind = _make_indicator(IndicatorType.VOL_GATE, {"window": 21, "threshold": 0.40})
    res = evaluate_indicator(ind, prices)
    assert res.gate_passed is True


def test_validate_params_accepts_defaults():
    p = validate_params(IndicatorType.SMA_GATE, {})
    assert p["period"] == 200


def test_validate_params_rejects_bad_input():
    with pytest.raises(Exception):
        validate_params(IndicatorType.SMA_GATE, {"period": -5})
    with pytest.raises(Exception):
        validate_params(IndicatorType.VOL_GATE, {"threshold": -0.1})
