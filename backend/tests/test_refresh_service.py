"""Tests covering the refresh_service.refresh_all hook for gates."""
from __future__ import annotations

from unittest.mock import patch

import pytest

from ai_swing.db.models import (
    Indicator,
    IndicatorType,
    Strategy,
    StrategyGatesSnapshot,
    StrategyIndicator,
)
from ai_swing.services.refresh_service import RefreshService


@pytest.fixture
def two_strategies(db_session):
    ind = Indicator(
        name="SMA200", type=IndicatorType.SMA_GATE, params={"period": 200},
        description="trend",
    )
    db_session.add(ind)
    db_session.flush()
    out = []
    for name in ("Strat A", "Strat B"):
        s = Strategy(
            name=name, benchmark_ticker="SPY", risk_on_tickers=["QQQ"],
            risk_off_ticker="ZROZ", k_threshold=1, enabled=True,
        )
        db_session.add(s)
        db_session.flush()
        db_session.add(StrategyIndicator(strategy_id=s.id, indicator_id=ind.id, order=0))
        out.append(s)
    db_session.commit()
    return out


def test_refresh_all_continues_when_gates_fail_for_one_strategy(db_session, two_strategies):
    """If gates fail for strategy A, strategy B is still attempted."""
    a, _b = two_strategies

    def maybe_raise(db, strategy, range_years=10):
        if strategy.id == a.id:
            raise RuntimeError("simulated bootstrap failure")
        return StrategyGatesSnapshot(
            strategy_id=strategy.id, asof_date=__import__("datetime").date(2026, 5, 1),
            range_years=10, payload={"stub": True},
        )

    svc = RefreshService()
    svc._last_run_started = None
    with patch("ai_swing.services.refresh_service.list_strategies", return_value=two_strategies), \
         patch.object(svc, "_refresh_strategy_snapshot", return_value=False), \
         patch("ai_swing.services.refresh_service.gates_service.refresh_gates",
               side_effect=maybe_raise) as gate_call, \
         patch("ai_swing.services.refresh_service.ai_reports.generate_report"), \
         patch("ai_swing.services.refresh_service.get_price_service"):
        log = svc.refresh_all(db_session, force=True)

    assert gate_call.call_count == 2
    assert log.status == "ok"
