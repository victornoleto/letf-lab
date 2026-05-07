from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.db import get_db
from ai_swing.db.models import SignalSnapshot, SignalTransition, Strategy
from ai_swing.schemas.signal import (
    IndicatorResultDTO,
    SignalSnapshotDTO,
    SignalTransitionDTO,
)

router = APIRouter(prefix="/api/signals", tags=["signals"])


def _parse_range_to_days(range_label: str) -> int:
    table = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 1095, "5y": 1825, "max": 36500}
    return table.get(range_label, 365)


@router.get("/{strategy_id}/history", response_model=list[SignalSnapshotDTO])
def history(
    strategy_id: int,
    range: str = Query(default="1y"),
    db: Session = Depends(get_db),
) -> list[SignalSnapshotDTO]:
    s = db.get(Strategy, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    cutoff = date.today() - timedelta(days=_parse_range_to_days(range))
    rows = db.scalars(
        select(SignalSnapshot)
        .where(SignalSnapshot.strategy_id == strategy_id, SignalSnapshot.date >= cutoff)
        .order_by(SignalSnapshot.date)
    ).all()
    return [
        SignalSnapshotDTO(
            date=r.date,
            score=r.score,
            total=r.total,
            risk_on=r.risk_on,
            results=[IndicatorResultDTO(**ir) for ir in r.indicator_results],
        )
        for r in rows
    ]


@router.get("/{strategy_id}/transitions", response_model=list[SignalTransitionDTO])
def transitions(
    strategy_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[SignalTransitionDTO]:
    s = db.get(Strategy, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    rows = db.scalars(
        select(SignalTransition)
        .where(SignalTransition.strategy_id == strategy_id)
        .order_by(SignalTransition.date.desc())
        .limit(limit)
    ).all()
    return [SignalTransitionDTO.model_validate(r) for r in rows]


@router.get("/transitions/recent", response_model=list[SignalTransitionDTO])
def recent_transitions(
    days: int = Query(default=7, ge=1, le=90), db: Session = Depends(get_db)
) -> list[SignalTransitionDTO]:
    cutoff = date.today() - timedelta(days=days)
    rows = db.scalars(
        select(SignalTransition)
        .where(SignalTransition.date >= cutoff)
        .order_by(SignalTransition.date.desc())
    ).all()
    return [SignalTransitionDTO.model_validate(r) for r in rows]
