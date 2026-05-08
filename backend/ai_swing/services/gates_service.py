"""Persist and read 4-gate snapshots for the Deploy Score."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.db.models import Strategy, StrategyGatesSnapshot
from ai_swing.scoring.gates import compute_all_gates


def refresh_gates(
    db: Session, strategy: Strategy, range_years: int = 10
) -> StrategyGatesSnapshot:
    """Compute the 4-gate payload and upsert into strategy_gates_snapshots."""
    payload = compute_all_gates(strategy, range_years=range_years)
    asof = date.fromisoformat(payload["asof_date"])

    existing = db.scalars(
        select(StrategyGatesSnapshot).where(
            StrategyGatesSnapshot.strategy_id == strategy.id,
            StrategyGatesSnapshot.asof_date == asof,
            StrategyGatesSnapshot.range_years == range_years,
        )
    ).first()

    if existing is None:
        snap = StrategyGatesSnapshot(
            strategy_id=strategy.id,
            asof_date=asof,
            range_years=range_years,
            payload=payload,
            computed_at=datetime.now(timezone.utc),
        )
        db.add(snap)
    else:
        existing.payload = payload
        existing.computed_at = datetime.now(timezone.utc)
        snap = existing

    db.commit()
    db.refresh(snap)
    return snap


def latest_gates(
    db: Session, strategy_id: int, range_years: int = 10
) -> Optional[StrategyGatesSnapshot]:
    """Return the most-recent snapshot for (strategy_id, range_years), or None."""
    return db.scalars(
        select(StrategyGatesSnapshot)
        .where(
            StrategyGatesSnapshot.strategy_id == strategy_id,
            StrategyGatesSnapshot.range_years == range_years,
        )
        .order_by(StrategyGatesSnapshot.asof_date.desc())
        .limit(1)
    ).first()
