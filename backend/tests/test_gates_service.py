"""Tests for gates_service: refresh and latest readers."""
from __future__ import annotations

from datetime import date

import pytest

from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyGatesSnapshot,
    StrategyIndicator,
)
from ai_swing.services import gates_service


@pytest.fixture
def strategy(db_session):
    ind = Indicator(
        name="SMA200", type=IndicatorType.SMA_GATE, params={"period": 200},
        description="trend",
    )
    db_session.add(ind)
    db_session.flush()
    s = Strategy(
        name="Test", benchmark_ticker="SPY", risk_on_ticker="QQQ",
        risk_off_ticker="ZROZ", k_threshold=1, enabled=True,
    )
    db_session.add(s)
    db_session.flush()
    db_session.add(StrategyIndicator(strategy_id=s.id, indicator_id=ind.id, order=0))
    db_session.commit()
    return s


def _stub_payload(asof: date) -> dict:
    return {
        "g2_dsr": {"p_value": 0.01, "pass_gate": True, "n_trials": 1, "observed_sharpe": 1.0},
        "g3_wf": {"n_windows": 8, "n_pass": 6, "pct_above_per_window": [0.6] * 8, "pass_gate": True},
        "g6_bootstrap": {"ci_low_sortino": 0.5, "n_resamples": 500, "ci_pct": 99.0, "pass_gate": True},
        "g7_xlib": {"delta_pp": 0.1, "cagr_numpy": 0.1, "cagr_pandas": 0.1, "pass_gate": True},
        "asof_date": asof.isoformat(),
        "range_years": 10,
    }


def test_refresh_gates_creates_snapshot(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    snap = gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert snap.id is not None
    assert snap.asof_date == date(2026, 5, 1)
    assert snap.range_years == 10
    assert snap.payload["g2_dsr"]["pass_gate"] is True


def test_refresh_gates_idempotent(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    a = gates_service.refresh_gates(db_session, strategy, range_years=10)
    b = gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert a.id == b.id
    rows = db_session.query(StrategyGatesSnapshot).filter_by(strategy_id=strategy.id).count()
    assert rows == 1


def test_latest_gates_returns_most_recent(db_session, strategy, monkeypatch):
    payloads = iter([_stub_payload(date(2026, 4, 1)), _stub_payload(date(2026, 5, 1))])
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: next(payloads),
    )
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    latest = gates_service.latest_gates(db_session, strategy.id, range_years=10)
    assert latest is not None
    assert latest.asof_date == date(2026, 5, 1)


def test_latest_gates_returns_none_when_no_snapshot(db_session, strategy):
    assert gates_service.latest_gates(db_session, strategy.id) is None


def test_latest_gates_filters_by_range_years(db_session, strategy, monkeypatch):
    monkeypatch.setattr(
        gates_service, "compute_all_gates",
        lambda s, range_years=10: _stub_payload(date(2026, 5, 1)),
    )
    gates_service.refresh_gates(db_session, strategy, range_years=10)
    assert gates_service.latest_gates(db_session, strategy.id, range_years=5) is None
    assert gates_service.latest_gates(db_session, strategy.id, range_years=10) is not None
