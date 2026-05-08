"""Smoke tests for the ported DSR/PSR module."""
from __future__ import annotations

import numpy as np
import pytest

from ai_swing.backtest.validation.dsr import (
    DSRResult,
    dsr,
    expected_max_sharpe,
    psr,
    sharpe_annualized,
    sharpe_periodic,
)


def test_sharpe_periodic_matches_definition():
    rng = np.random.default_rng(0)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    expected = r.mean() / r.std(ddof=0)
    assert sharpe_periodic(r) == pytest.approx(expected)


def test_sharpe_periodic_zero_vol_returns_zero():
    assert sharpe_periodic(np.zeros(10)) == 0.0


def test_sharpe_annualized_scales_by_sqrt_252():
    rng = np.random.default_rng(1)
    r = rng.normal(loc=0.001, scale=0.01, size=500)
    assert sharpe_annualized(r) == pytest.approx(sharpe_periodic(r) * np.sqrt(252))


def test_psr_returns_probability_in_unit_interval():
    rng = np.random.default_rng(2)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    p = psr(r, benchmark=0.0)
    assert 0.0 <= p <= 1.0


def test_psr_strong_alpha_yields_high_probability():
    rng = np.random.default_rng(3)
    r = rng.normal(loc=0.002, scale=0.005, size=2000)
    assert psr(r, benchmark=0.0) > 0.99


def test_psr_zero_alpha_yields_around_half():
    rng = np.random.default_rng(4)
    r = rng.normal(loc=0.0, scale=0.01, size=2000)
    assert 0.3 < psr(r, benchmark=0.0) < 0.7


def test_psr_requires_at_least_3_observations():
    with pytest.raises(ValueError):
        psr(np.array([0.01, 0.02]))


def test_expected_max_sharpe_grows_with_n_trials():
    sr_2 = expected_max_sharpe(2, var_sharpe=1.0)
    sr_100 = expected_max_sharpe(100, var_sharpe=1.0)
    assert sr_100 > sr_2 > 0.0


def test_expected_max_sharpe_rejects_n_trials_below_2():
    with pytest.raises(ValueError):
        expected_max_sharpe(1)


def test_dsr_result_shape():
    rng = np.random.default_rng(5)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    result = dsr(r, n_trials=10)
    assert isinstance(result, DSRResult)
    assert 0.0 <= result.dsr <= 1.0
    assert result.p_value == pytest.approx(1.0 - result.dsr)
    assert result.n_trials == 10


def test_dsr_rejects_n_trials_below_2():
    rng = np.random.default_rng(6)
    r = rng.normal(loc=0.001, scale=0.01, size=1000)
    with pytest.raises(ValueError):
        dsr(r, n_trials=1)
