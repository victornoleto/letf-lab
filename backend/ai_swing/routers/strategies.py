from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ai_swing.db import get_db
from ai_swing.db.models import Strategy, StrategyIndicator
from ai_swing.schemas.strategy import StrategyCreate, StrategyDTO, StrategyUpdate
from ai_swing.services import ai_reports
from ai_swing.schemas.strategy import StrategyReportDTO
from ai_swing.services.indicator_series import build_indicator_series
from ai_swing.services.strategy_service import (
    attach_indicators,
    build_strategy_dto_with_signal,
    get_strategy,
    list_strategies,
)

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


def _validate_k_threshold(k: int, n: int) -> None:
    if k < 1:
        raise HTTPException(status_code=400, detail="k_threshold must be >= 1")
    if k > n:
        raise HTTPException(
            status_code=400, detail=f"k_threshold ({k}) exceeds indicator count ({n})"
        )


@router.get("", response_model=list[StrategyDTO])
def list_endpoint(
    enabled_only: bool = False, db: Session = Depends(get_db)
) -> list[StrategyDTO]:
    strategies = list_strategies(db, enabled_only=enabled_only)
    return [build_strategy_dto_with_signal(db, s, fresh=True) for s in strategies]


@router.get("/{strategy_id}", response_model=StrategyDTO)
def get_endpoint(strategy_id: int, db: Session = Depends(get_db)) -> StrategyDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.post("", response_model=StrategyDTO, status_code=status.HTTP_201_CREATED)
def create_endpoint(body: StrategyCreate, db: Session = Depends(get_db)) -> StrategyDTO:
    existing = db.scalars(select(Strategy).where(Strategy.name == body.name)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Strategy '{body.name}' already exists")

    _validate_k_threshold(body.k_threshold, len(body.indicator_ids))

    s = Strategy(
        name=body.name,
        benchmark_ticker=body.benchmark_ticker,
        risk_on_ticker=body.risk_on_ticker,
        risk_off_ticker=body.risk_off_ticker,
        k_threshold=body.k_threshold,
        enabled=body.enabled,
    )
    db.add(s)
    db.flush()
    try:
        attach_indicators(db, s, body.indicator_ids)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    s = get_strategy(db, s.id)
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.put("/{strategy_id}", response_model=StrategyDTO)
def update_endpoint(
    strategy_id: int, body: StrategyUpdate, db: Session = Depends(get_db)
) -> StrategyDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if body.name is not None:
        s.name = body.name
    if body.benchmark_ticker is not None:
        s.benchmark_ticker = body.benchmark_ticker
    if body.risk_on_ticker is not None:
        s.risk_on_ticker = body.risk_on_ticker
    if body.risk_off_ticker is not None:
        s.risk_off_ticker = body.risk_off_ticker
    if body.enabled is not None:
        s.enabled = body.enabled

    if body.indicator_ids is not None:
        new_k = body.k_threshold if body.k_threshold is not None else s.k_threshold
        _validate_k_threshold(new_k, len(body.indicator_ids))
        try:
            attach_indicators(db, s, body.indicator_ids)
        except ValueError as exc:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    if body.k_threshold is not None:
        n = len(body.indicator_ids) if body.indicator_ids is not None else len(s.indicators)
        _validate_k_threshold(body.k_threshold, n)
        s.k_threshold = body.k_threshold

    db.commit()
    s = get_strategy(db, strategy_id)
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(strategy_id: int, db: Session = Depends(get_db)) -> None:
    s = db.get(Strategy, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(s)
    db.commit()


@router.get("/{strategy_id}/indicator-series")
def indicator_series_endpoint(
    strategy_id: int,
    range: str = "1y",
    db: Session = Depends(get_db),
) -> list[dict]:
    """Per-indicator time series for the detail-page Indicators tab."""
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return build_indicator_series(s, range_label=range)


@router.get("/{strategy_id}/report", response_model=StrategyReportDTO | None)
def latest_report_endpoint(
    strategy_id: int, db: Session = Depends(get_db)
) -> StrategyReportDTO | None:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    row = ai_reports.latest_report(db, s.id)
    return StrategyReportDTO.model_validate(row) if row else None


@router.post("/{strategy_id}/report", response_model=StrategyReportDTO)
def regenerate_report_endpoint(
    strategy_id: int, db: Session = Depends(get_db)
) -> StrategyReportDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    report = ai_reports.generate_report(db, s, force=True)
    if report is None:
        raise HTTPException(
            status_code=503,
            detail="AI reports não disponíveis (configure ANTHROPIC_API_KEY)",
        )
    db.commit()
    return StrategyReportDTO.model_validate(report)
