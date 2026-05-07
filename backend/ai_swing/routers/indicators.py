from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.db import get_db
from ai_swing.db.models import Indicator, StrategyIndicator
from ai_swing.indicators.catalog import INDICATOR_TYPES, validate_params
from ai_swing.schemas.indicator import (
    IndicatorCreate,
    IndicatorDTO,
    IndicatorTypeInfo,
    IndicatorUpdate,
)

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


@router.get("/types", response_model=list[IndicatorTypeInfo])
def list_types() -> list[IndicatorTypeInfo]:
    return [IndicatorTypeInfo(**t) for t in INDICATOR_TYPES]


@router.get("", response_model=list[IndicatorDTO])
def list_indicators(db: Session = Depends(get_db)) -> list[IndicatorDTO]:
    rows = db.scalars(select(Indicator).order_by(Indicator.name)).all()
    return [IndicatorDTO.model_validate(r) for r in rows]


@router.get("/{indicator_id}", response_model=IndicatorDTO)
def get_indicator(indicator_id: int, db: Session = Depends(get_db)) -> IndicatorDTO:
    ind = db.get(Indicator, indicator_id)
    if ind is None:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return IndicatorDTO.model_validate(ind)


@router.post("", response_model=IndicatorDTO, status_code=status.HTTP_201_CREATED)
def create_indicator(body: IndicatorCreate, db: Session = Depends(get_db)) -> IndicatorDTO:
    try:
        params = validate_params(body.type, body.params)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=exc.errors())

    existing = db.scalars(select(Indicator).where(Indicator.name == body.name)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Indicator name '{body.name}' already exists")

    ind = Indicator(name=body.name, type=body.type, params=params, description=body.description)
    db.add(ind)
    db.commit()
    db.refresh(ind)
    return IndicatorDTO.model_validate(ind)


@router.put("/{indicator_id}", response_model=IndicatorDTO)
def update_indicator(
    indicator_id: int, body: IndicatorUpdate, db: Session = Depends(get_db)
) -> IndicatorDTO:
    ind = db.get(Indicator, indicator_id)
    if ind is None:
        raise HTTPException(status_code=404, detail="Indicator not found")

    if body.name is not None:
        ind.name = body.name
    if body.description is not None:
        ind.description = body.description
    if body.params is not None:
        try:
            ind.params = validate_params(ind.type, body.params)
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.errors())

    db.commit()
    db.refresh(ind)
    return IndicatorDTO.model_validate(ind)


@router.delete("/{indicator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_indicator(indicator_id: int, db: Session = Depends(get_db)) -> None:
    ind = db.get(Indicator, indicator_id)
    if ind is None:
        raise HTTPException(status_code=404, detail="Indicator not found")

    in_use = db.scalars(
        select(StrategyIndicator).where(StrategyIndicator.indicator_id == indicator_id)
    ).first()
    if in_use is not None:
        raise HTTPException(status_code=409, detail="Indicator is in use by one or more strategies")

    db.delete(ind)
    db.commit()
