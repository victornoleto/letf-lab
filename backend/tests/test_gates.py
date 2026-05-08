"""Tests for the 4-gate battery (G2 DSR, G3 walk-forward, G6 bootstrap, G7 x-lib)."""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
import pytest

from ai_swing.scoring.gates import (
    compute_all_gates,
    g2_dsr_p_value,
    g6_bootstrap_ci,
    g7_xlib_cagr_delta,
)


def _make_returns(n: int, mu: float, sigma: float, seed: int) -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2015-01-02", periods=n, freq="B")
    return pd.Series(rng.normal(loc=mu, scale=sigma, size=n), index=idx)


def test_g2_dsr_psr_fallback_strong_strategy():
    returns = _make_returns(2000, mu=0.002, sigma=0.005, seed=10)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is True
    assert 0.0 <= result["p_value"] < 0.05
    assert result["n_trials"] == 1


def test_g2_dsr_psr_fallback_weak_strategy():
    returns = _make_returns(2000, mu=0.0, sigma=0.01, seed=11)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is False
    assert result["p_value"] >= 0.05


def test_g2_dsr_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=12)
    result = g2_dsr_p_value(returns, n_trials=1)
    assert result["pass_gate"] is False
    assert result["p_value"] == 1.0
    assert result["reason"] == "insufficient_history"


def test_g6_bootstrap_seed_stable():
    returns = _make_returns(1000, mu=0.001, sigma=0.01, seed=20)
    a = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    b = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    assert a["ci_low_sortino"] == pytest.approx(b["ci_low_sortino"])


def test_g6_bootstrap_passes_strong_alpha():
    returns = _make_returns(2000, mu=0.003, sigma=0.005, seed=21)
    result = g6_bootstrap_ci(returns, n_resamples=500, seed=42)
    assert result["pass_gate"] is True
    assert result["ci_low_sortino"] > 0


def test_g6_bootstrap_fails_zero_alpha():
    returns = _make_returns(2000, mu=0.0, sigma=0.01, seed=22)
    result = g6_bootstrap_ci(returns, n_resamples=500, seed=42)
    assert result["pass_gate"] is False
    assert result["ci_low_sortino"] <= 0


def test_g6_bootstrap_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=23)
    result = g6_bootstrap_ci(returns, n_resamples=200, seed=42)
    assert result["pass_gate"] is False
    assert result["n_resamples"] == 0


def test_g7_xlib_cagr_passes_for_normal_returns():
    returns = _make_returns(1500, mu=0.001, sigma=0.01, seed=30)
    result = g7_xlib_cagr_delta(returns)
    assert result["pass_gate"] is True
    assert result["delta_pp"] < 3.0


def test_g7_xlib_insufficient_history():
    returns = _make_returns(100, mu=0.001, sigma=0.01, seed=31)
    result = g7_xlib_cagr_delta(returns)
    assert result["pass_gate"] is False


def test_compute_all_gates_smoke(db_session, monkeypatch):
    from ai_swing.scoring import gates as gates_mod

    fake_returns = _make_returns(2000, mu=0.001, sigma=0.01, seed=40)
    fake_curves = type("C", (), {
        "asof_date": date(2026, 5, 1),
        "strategy_returns": fake_returns,
    })()
    monkeypatch.setattr(gates_mod, "compute_strategy_curves", lambda *a, **k: fake_curves)
    monkeypatch.setattr(gates_mod, "_run_g3", lambda strategy: {
        "n_windows": 8, "n_pass": 6, "pct_above_per_window": [0.6] * 8, "pass_gate": True,
    })

    payload = compute_all_gates(strategy=None, range_years=10, n_resamples=200)
    assert set(payload.keys()) == {"g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib",
                                   "asof_date", "range_years"}
    assert payload["asof_date"] == "2026-05-01"
    assert payload["range_years"] == 10
    for key in ("g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib"):
        assert "pass_gate" in payload[key]
