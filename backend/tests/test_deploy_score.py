"""Tests for the Deploy Readiness Score scorer.

Each criterion is exercised in isolation through tiny synthetic price series
(via a patched price service). The full `compute_deploy_score` path is
covered by a single integration-style test that asserts the breakdown
contains the expected criteria and the total stays bounded.
"""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
import pytest

from ai_swing.backtest import crisis as crisis_module
from ai_swing.backtest import engine as engine_module
from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyGatesSnapshot,
    StrategyIndicator,
)
from ai_swing.scoring import deploy_score


def _make_snapshot(*, all_pass: bool, p_value: float = 0.01) -> StrategyGatesSnapshot:
    payload = {
        "g2_dsr": {
            "p_value": p_value,
            "observed_sharpe": 1.5,
            "n_trials": 1,
            "pass_gate": p_value < 0.05,
        },
        "g3_wf": {
            "n_windows": 8,
            "n_pass": 7 if all_pass else 3,
            "pct_above_per_window": [0.7] * 8,
            "pass_gate": all_pass,
        },
        "g6_bootstrap": {
            "ci_low_sortino": 0.4 if all_pass else -0.1,
            "n_resamples": 500,
            "ci_pct": 99.0,
            "pass_gate": all_pass,
        },
        "g7_xlib": {
            "delta_pp": 0.05 if all_pass else 5.0,
            "cagr_numpy": 0.1,
            "cagr_pandas": 0.1 if all_pass else 0.05,
            "pass_gate": all_pass,
        },
        "asof_date": date(2026, 5, 1).isoformat(),
        "range_years": 10,
    }
    return StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )


def _install_score_prices(patch_prices) -> None:
    idx = pd.bdate_range("2014-01-01", "2026-04-30")
    bench = pd.Series(np.linspace(100, 350, len(idx)), index=idx)
    risk_on = pd.Series(np.linspace(100, 600, len(idx)), index=idx)
    risk_off = pd.Series(np.full(len(idx), 100.0), index=idx)
    spy = pd.Series(np.linspace(100, 180, len(idx)), index=idx)
    patch_prices({"QQQ": bench, "TQQQ": risk_on, "ZROZ": risk_off, "SPY": spy})


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
    _install_score_prices(patch_prices)

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

    # Crit 3 + 4 stay pending until the daily refresh writes a gates snapshot.
    pending = {c.key for c in score.criteria if c.status == "pending"}
    assert {"3_gates", "4_dsr"}.issubset(pending)

    # Bonus passed through
    bonus = next(c for c in score.criteria if c.key == "7_bonus")
    assert bonus.points == 2.0

    # Tier label is one of the known buckets
    assert score.tier_label in {
        "FAIL", "NEAR_FAIL", "MARGINAL", "PROMISING", "STRONG", "WINNER",
    }
    assert score.winner_conditions_met is False


def test_deploy_score_pending_when_no_snapshot(patch_prices):
    from ai_swing.scoring.deploy_score import compute_deploy_score

    _install_score_prices(patch_prices)
    score = compute_deploy_score(_make_strategy(), gates_snapshot=None)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit3.status == "pending"
    assert crit3.points == 0
    assert crit4.status == "pending"
    assert crit4.points == 0
    assert score.winner_conditions_met is False


def test_deploy_score_full_gates_pass_unlocks_max_pts(patch_prices):
    from ai_swing.scoring.deploy_score import compute_deploy_score

    _install_score_prices(patch_prices)
    snap = _make_snapshot(all_pass=True, p_value=0.01)
    score = compute_deploy_score(_make_strategy(), gates_snapshot=snap)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit3.points == 20
    assert crit3.status == "ok"
    assert crit4.points == 10
    assert crit4.status == "ok"


def test_deploy_score_partial_gates_pass(patch_prices):
    from ai_swing.scoring.deploy_score import compute_deploy_score

    _install_score_prices(patch_prices)
    payload = _make_snapshot(all_pass=True).payload
    payload["g3_wf"]["pass_gate"] = False
    payload["g7_xlib"]["pass_gate"] = False
    snap = StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )
    score = compute_deploy_score(_make_strategy(), gates_snapshot=snap)
    crit3 = next(c for c in score.criteria if c.key == "3_gates")
    assert crit3.points == 10
    assert crit3.status == "warn"


def test_deploy_score_dsr_piecewise_marginal(patch_prices):
    from ai_swing.scoring.deploy_score import compute_deploy_score

    _install_score_prices(patch_prices)
    payload = _make_snapshot(all_pass=True).payload
    payload["g2_dsr"]["p_value"] = 0.07
    payload["g2_dsr"]["pass_gate"] = False
    snap = StrategyGatesSnapshot(
        strategy_id=1, asof_date=date(2026, 5, 1), range_years=10, payload=payload,
    )
    score = compute_deploy_score(_make_strategy(), gates_snapshot=snap)
    crit4 = next(c for c in score.criteria if c.key == "4_dsr")
    assert crit4.points == 7
    assert crit4.status == "warn"


def test_deploy_score_winner_tier_unlocks_when_score_reaches_90(patch_prices):
    from ai_swing.scoring.deploy_score import compute_deploy_score

    _install_score_prices(patch_prices)
    snap = _make_snapshot(all_pass=True, p_value=0.001)
    score = compute_deploy_score(_make_strategy(), gates_snapshot=snap)
    if score.total < 90:
        pytest.skip(f"synthetic score didn't reach 90 pts ({score.total})")
    assert score.tier_label == "WINNER"
    assert score.winner_conditions_met is True
