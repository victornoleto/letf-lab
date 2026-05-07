"""Tests for the Deploy Readiness Score scorer.

Each criterion is exercised in isolation through tiny synthetic price series
(via a patched price service). The full `compute_deploy_score` path is
covered by a single integration-style test that asserts the breakdown
contains the expected criteria and the total stays bounded.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import crisis as crisis_module
from ai_swing.backtest import engine as engine_module
from ai_swing.db.models import Indicator, IndicatorType, Strategy, StrategyIndicator
from ai_swing.scoring import deploy_score


def _make_strategy() -> Strategy:
    ind = Indicator(name="SMA50", type=IndicatorType.SMA_GATE, params={"period": 50})
    ind.id = 1
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
    si.indicator_id = 1
    s.indicators = [si]
    return s


class _FakePriceService:
    def __init__(self, mapping: dict[str, pd.Series]):
        self._m = mapping

    def get_close_series(self, ticker: str) -> pd.Series:
        return self._m.get(ticker, pd.Series(dtype=float))


@pytest.fixture
def patch_prices(monkeypatch):
    def _apply(mapping):
        fake = _FakePriceService(mapping)
        monkeypatch.setattr(engine_module, "get_price_service", lambda: fake)
        monkeypatch.setattr(crisis_module, "get_price_service", lambda: fake)
        return fake
    return _apply


def test_edge_points_tiers():
    assert deploy_score._edge_points(0.40)[0] == 30
    assert deploy_score._edge_points(0.20)[0] == 20
    assert deploy_score._edge_points(0.07)[0] == 10
    assert deploy_score._edge_points(0.02)[0] == 0
    assert deploy_score._edge_points(-0.05)[0] == 0


def test_underwater_points_full_dominance():
    pts, status, _ = deploy_score._underwater_points(1.0, 1.5)
    assert pts == 15
    assert status == "ok"


def test_underwater_points_partial():
    pts, status, _ = deploy_score._underwater_points(0.95, 0.7)
    assert pts == 9
    assert status == "warn"


def test_underwater_points_below_floor():
    pts, status, _ = deploy_score._underwater_points(0.55, 0.5)
    assert pts == 0
    assert status == "fail"


def test_underwater_points_nan_returns_zero():
    pts, status, _ = deploy_score._underwater_points(float("nan"), float("nan"))
    assert pts == 0
    assert status == "fail"


def test_split_oos_fwd_partitions_returns():
    idx = pd.date_range("2018-01-01", periods=1000, freq="B")
    rets = pd.Series(np.full(1000, 0.001), index=idx)
    is_, oos, fwd = deploy_score._split_oos_fwd(rets)
    # 70/30 split
    assert abs(len(is_) - 700) <= 1
    assert abs(len(oos) - 300) <= 1
    # FWD is everything from 2020-01 onwards
    assert (fwd.index >= pd.Timestamp("2020-01-01")).all()


def test_oos_fwd_points_full_credit_when_both_positive():
    # Mostly-positive returns with occasional dips, so Sortino has a
    # non-zero downside denominator. Strong positive bias (mean 5×std)
    # ensures both the OOS and FWD slices come out positive even with
    # sample-level noise.
    idx = pd.date_range("2018-01-01", periods=1000, freq="B")
    rng = np.random.default_rng(0)
    rets = pd.Series(rng.normal(0.005, 0.01, 1000), index=idx)
    pts, status, _ = deploy_score._oos_fwd_points(rets)
    assert pts == 10
    assert status == "ok"


def test_full_score_runs_end_to_end(patch_prices):
    # Synthesize 12 years of trending up prices for QQQ/TQQQ (so the gate is
    # ON nearly the whole time and the strategy holds the leveraged sleeve)
    # plus a flat ZROZ. SPY rises slowly so the strategy beats SPY in COVID
    # and 2022 windows but the older windows don't have data → "insufficient".
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    spy = pd.Series(np.linspace(100, 180, len(idx)), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off, "SPY": spy})

    score = deploy_score.compute_deploy_score(_make_strategy(), range_years=10, bonus_pts=2.0)

    # Sanity: score in [0, 100]; criteria all present; total matches sum
    assert 0 <= score.total <= 100
    keys = [c.key for c in score.criteria]
    assert keys == [
        "1_sortino_edge", "2_underwater", "3_gates", "4_dsr",
        "5_oos_fwd", "6_crisis", "7_bonus",
    ]
    summed = sum(c.points for c in score.criteria)
    assert abs(summed - score.total) < 1e-6

    # Crit 3 + 4 still pending in Fase 2
    pending = {c.key for c in score.criteria if c.status == "pending"}
    assert {"3_gates", "4_dsr"}.issubset(pending)

    # Bonus passed through
    bonus = next(c for c in score.criteria if c.key == "7_bonus")
    assert bonus.points == 2.0

    # Tier label is one of the known buckets
    assert score.tier_label in {
        "FAIL", "NEAR_FAIL", "MARGINAL", "PROMISING", "STRONG", "WINNER",
    }
    # WINNER never reachable in Fase 2 (gates pending)
    assert score.winner_conditions_met is False
