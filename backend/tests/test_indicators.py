"""Unit tests for indicator functions + parity vs letf_rotation_hunt/signals.py."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ai_swing.indicators import functions as F


@pytest.fixture
def sample_prices() -> pd.Series:
    rng = np.random.default_rng(42)
    n = 500
    idx = pd.date_range("2020-01-01", periods=n, freq="B")
    rets = rng.normal(0.0005, 0.012, n)
    prices = pd.Series(100 * np.exp(np.cumsum(rets)), index=idx, name="close")
    return prices


@pytest.fixture
def sample_returns(sample_prices) -> pd.Series:
    return sample_prices.pct_change().dropna()


def test_sma_gate_basic(sample_prices):
    g = F.sma_gate(sample_prices, period=50)
    assert g.iloc[:49].isna().all()
    assert g.iloc[49:].dropna().isin([0.0, 1.0]).all()


def test_ema_gate_basic(sample_prices):
    g = F.ema_gate(sample_prices, period=50)
    valid = g.dropna()
    assert valid.isin([0.0, 1.0]).all()


def test_realized_vol_gate(sample_returns):
    g = F.realized_vol_gate(sample_returns, window=21, threshold=0.40)
    valid = g.dropna()
    assert valid.isin([0.0, 1.0]).all()


def test_ar1_coefficient_in_range(sample_returns):
    coef = F.ar1_coefficient(sample_returns, window=30)
    valid = coef.dropna()
    assert valid.min() >= -1.001
    assert valid.max() <= 1.001


def test_ar1_gate(sample_returns):
    g = F.ar1_gate(sample_returns, window=30, threshold=0.0)
    valid = g.dropna()
    assert valid.isin([0.0, 1.0]).all()


def test_vote_of_k_simple():
    s1 = pd.Series([1, 1, 0, 0])
    s2 = pd.Series([1, 0, 1, 0])
    s3 = pd.Series([1, 1, 1, 0])
    g = F.vote_of_k([s1, s2, s3], k=2)
    pd.testing.assert_series_equal(g, pd.Series([1.0, 1.0, 1.0, 0.0]))


def test_vote_of_k_propagates_nan():
    s1 = pd.Series([np.nan, 1, 0])
    s2 = pd.Series([1, 1, 1])
    g = F.vote_of_k([s1, s2], k=1)
    assert pd.isna(g.iloc[0])
    assert g.iloc[1] == 1.0


def test_vote_of_k_validates_inputs():
    with pytest.raises(ValueError):
        F.vote_of_k([], k=1)
    with pytest.raises(ValueError):
        F.vote_of_k([pd.Series([1])], k=2)
    with pytest.raises(ValueError):
        F.vote_of_k([pd.Series([1])], k=0)


# ---------- Parity tests vs letf_rotation_hunt ----------

STUDY_PATH = Path("/var/www/pessoal/ai-trade/studies")


def _study_available() -> bool:
    return (STUDY_PATH / "letf_rotation_hunt" / "signals.py").exists()


@pytest.mark.skipif(not _study_available(), reason="letf_rotation_hunt not on disk")
def test_parity_sma_gate(sample_prices):
    sys.path.insert(0, str(STUDY_PATH))
    try:
        from letf_rotation_hunt import signals as study_signals  # type: ignore
    finally:
        sys.path.pop(0)
    ours = F.sma_gate(sample_prices, period=200)
    theirs = study_signals.sma_gate(sample_prices, period=200)
    pd.testing.assert_series_equal(ours, theirs)


@pytest.mark.skipif(not _study_available(), reason="letf_rotation_hunt not on disk")
def test_parity_ema_gate(sample_prices):
    sys.path.insert(0, str(STUDY_PATH))
    try:
        from letf_rotation_hunt import signals as study_signals  # type: ignore
    finally:
        sys.path.pop(0)
    ours = F.ema_gate(sample_prices, period=200)
    theirs = study_signals.ema_gate(sample_prices, period=200)
    pd.testing.assert_series_equal(ours, theirs)


@pytest.mark.skipif(not _study_available(), reason="letf_rotation_hunt not on disk")
def test_parity_realized_vol_gate(sample_returns):
    sys.path.insert(0, str(STUDY_PATH))
    try:
        from letf_rotation_hunt import signals as study_signals  # type: ignore
    finally:
        sys.path.pop(0)
    ours = F.realized_vol_gate(sample_returns, window=21, threshold=0.40)
    theirs = study_signals.realized_vol_gate(sample_returns, window=21, threshold=0.40)
    pd.testing.assert_series_equal(ours, theirs)


@pytest.mark.skipif(not _study_available(), reason="letf_rotation_hunt not on disk")
def test_parity_ar1_coefficient(sample_returns):
    sys.path.insert(0, str(STUDY_PATH))
    try:
        from letf_rotation_hunt import signals as study_signals  # type: ignore
    finally:
        sys.path.pop(0)
    ours = F.ar1_coefficient(sample_returns, window=30)
    theirs = study_signals.ar1_coefficient(sample_returns, window=30)
    pd.testing.assert_series_equal(ours, theirs)


@pytest.mark.skipif(not _study_available(), reason="letf_rotation_hunt not on disk")
def test_parity_vote_of_k(sample_prices, sample_returns):
    sys.path.insert(0, str(STUDY_PATH))
    try:
        from letf_rotation_hunt import signals as study_signals  # type: ignore
    finally:
        sys.path.pop(0)
    s1 = F.sma_gate(sample_prices, period=200)
    s2 = F.sma_gate(sample_prices, period=50)
    s3 = F.realized_vol_gate(sample_returns, window=21, threshold=0.40).reindex(sample_prices.index)
    ours = F.vote_of_k([s1, s2, s3], k=2)
    theirs = study_signals.vote_of_k([s1, s2, s3], k=2)
    pd.testing.assert_series_equal(ours, theirs)
