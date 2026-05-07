from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest.metrics import (
    cagr,
    compute_metrics,
    hit_rate_vs,
    max_drawdown,
    n_trades,
    sharpe,
    sortino,
)


def _equity(values: list[float], start: str = "2020-01-01") -> pd.Series:
    idx = pd.date_range(start, periods=len(values), freq="B")
    return pd.Series(values, index=idx)


def test_cagr_doubling_in_one_year():
    # Roughly 252 business days from 2020-01-01 ≈ 2020-12-21
    eq = _equity([1.0, 2.0])
    eq.index = pd.to_datetime(["2020-01-01", "2021-01-01"])
    assert cagr(eq) == pytest.approx(1.0, abs=0.01)


def test_cagr_flat_returns_zero():
    eq = _equity([1.0, 1.0, 1.0, 1.0])
    assert cagr(eq) == pytest.approx(0.0, abs=1e-6)


def test_max_drawdown_simple():
    eq = _equity([1.0, 1.5, 0.75, 1.2])
    # peak = 1.5, trough = 0.75, dd = -0.5
    assert max_drawdown(eq) == pytest.approx(-0.5, abs=1e-6)


def test_max_drawdown_no_drawdown():
    eq = _equity([1.0, 1.1, 1.2, 1.3])
    assert max_drawdown(eq) == pytest.approx(0.0, abs=1e-6)


def test_sharpe_zero_when_constant():
    rets = pd.Series([0.0] * 100, index=pd.date_range("2020-01-01", periods=100, freq="B"))
    assert sharpe(rets) == 0.0


def test_sharpe_positive_when_uptrend():
    rng = np.random.default_rng(0)
    rets = pd.Series(
        rng.normal(0.001, 0.01, 252), index=pd.date_range("2020-01-01", periods=252, freq="B")
    )
    s = sharpe(rets)
    assert s > 0.5  # ~0.001/0.01 * sqrt(252) ≈ 1.6


def test_sortino_zero_when_constant():
    rets = pd.Series([0.0] * 100, index=pd.date_range("2020-01-01", periods=100, freq="B"))
    assert sortino(rets) == 0.0


def test_sortino_positive_when_no_downside():
    rets = pd.Series(
        [0.001] * 252, index=pd.date_range("2020-01-01", periods=252, freq="B")
    )
    # All returns >= 0 → downside_dev = 0 → guard returns 0.0
    assert sortino(rets) == 0.0


def test_sortino_higher_than_sharpe_for_right_skewed():
    """The asymmetric-upside hypothesis: a right-skewed series (occasional
    small losses, frequent moderate gains) gets a Sortino ratio higher
    than its Sharpe ratio because Sortino ignores upside volatility."""
    # 200 small positive days + 20 small negative days + 32 large positive days
    rng = np.random.default_rng(42)
    pos_small = rng.normal(0.002, 0.003, 200)
    neg_small = rng.normal(-0.002, 0.001, 20)
    pos_large = rng.normal(0.020, 0.005, 32)
    vals = np.concatenate([pos_small, neg_small, pos_large])
    rng.shuffle(vals)
    rets = pd.Series(vals, index=pd.date_range("2020-01-01", periods=len(vals), freq="B"))
    sh = sharpe(rets)
    so = sortino(rets)
    assert so > sh, f"expected Sortino > Sharpe for right-skewed series; got {so:.3f} vs {sh:.3f}"


def test_sortino_matches_manual_formula():
    """Sortino = mean(r) / sqrt(mean(min(r,0)^2)) * sqrt(252)."""
    rets = pd.Series(
        [0.01, -0.02, 0.005, -0.01, 0.015, 0.0],
        index=pd.date_range("2020-01-01", periods=6, freq="B"),
    )
    expected = (
        rets.mean()
        / np.sqrt(np.mean(np.minimum(rets.values, 0.0) ** 2))
        * np.sqrt(252)
    )
    assert sortino(rets) == pytest.approx(float(expected), rel=1e-9)


def test_n_trades_counts_flips():
    pos = pd.Series([0, 0, 1, 1, 0, 1, 1])
    # flips: 0→1, 1→0, 0→1 = 3
    assert n_trades(pos) == 3


def test_hit_rate_vs_strategy_above():
    s = _equity([1.0, 1.1, 1.2])
    b = _equity([1.0, 1.05, 1.1])
    # day 0: 1==1 (not >), day 1: 1.1>1.05, day 2: 1.2>1.1 → 2/3
    assert hit_rate_vs(s, b) == pytest.approx(2 / 3, abs=1e-6)


def test_compute_metrics_aggregates():
    eq = _equity([1.0, 1.1, 1.21, 1.0, 1.5])
    rets = eq.pct_change().fillna(0)
    pos = pd.Series([0, 1, 1, 0, 1], index=eq.index)
    m = compute_metrics(eq, rets, benchmark_equity=eq * 0.9, positions=pos)
    assert m.cagr != 0.0
    assert m.max_dd < 0
    assert m.n_trades == 3
    assert 0.0 <= m.hit_rate_vs_benchmark <= 1.0
    # Sortino is the primary risk-adjusted field on Metrics now.
    assert isinstance(m.sortino, float)
