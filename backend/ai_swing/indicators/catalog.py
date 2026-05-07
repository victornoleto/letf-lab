"""Indicator catalog: type → param schema → function dispatch."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, ValidationError

from ai_swing.db.models import IndicatorType


class SmaGateParams(BaseModel):
    period: int = Field(default=200, ge=2, le=2000, description="SMA lookback period")
    threshold: float = Field(
        default=0.0,
        ge=0,
        le=0.5,
        description="Hysteresis band as a fraction of SMA (0.05 = 5%). 0 disables the band.",
    )


class EmaGateParams(BaseModel):
    period: int = Field(default=200, ge=2, le=2000, description="EMA span")
    threshold: float = Field(
        default=0.0,
        ge=0,
        le=0.5,
        description="Hysteresis band as a fraction of EMA (0.05 = 5%). 0 disables the band.",
    )


class VolGateParams(BaseModel):
    window: int = Field(default=21, ge=2, le=500, description="Rolling vol window (days)")
    threshold: float = Field(default=0.40, gt=0, lt=5, description="Annualized vol threshold")


class Ar1GateParams(BaseModel):
    window: int = Field(default=30, ge=5, le=500, description="AR(1) regression window")
    threshold: float = Field(default=0.0, ge=-1, le=1, description="AR(1) coefficient threshold")


INDICATOR_PARAM_SCHEMAS: dict[IndicatorType, type[BaseModel]] = {
    IndicatorType.SMA_GATE: SmaGateParams,
    IndicatorType.EMA_GATE: EmaGateParams,
    IndicatorType.VOL_GATE: VolGateParams,
    IndicatorType.AR1_GATE: Ar1GateParams,
}


INDICATOR_TYPES = [
    {
        "type": IndicatorType.SMA_GATE.value,
        "label": "SMA Gate",
        "description": "Binary gate: 1 if price > SMA(period). Long-trend filter.",
        "params_schema": SmaGateParams.model_json_schema(),
        "default_params": SmaGateParams().model_dump(),
    },
    {
        "type": IndicatorType.EMA_GATE.value,
        "label": "EMA Gate",
        "description": "Binary gate: 1 if price > EMA(period). Smoother variant of SMA.",
        "params_schema": EmaGateParams.model_json_schema(),
        "default_params": EmaGateParams().model_dump(),
    },
    {
        "type": IndicatorType.VOL_GATE.value,
        "label": "Realized Vol Gate",
        "description": "Binary gate: 1 if rolling realized vol < threshold (annualized). Calm-regime filter.",
        "params_schema": VolGateParams.model_json_schema(),
        "default_params": VolGateParams().model_dump(),
    },
    {
        "type": IndicatorType.AR1_GATE.value,
        "label": "AR(1) Momentum Gate",
        "description": "Binary gate: 1 if AR(1)_window > threshold. Momentum/mean-reversion regime.",
        "params_schema": Ar1GateParams.model_json_schema(),
        "default_params": Ar1GateParams().model_dump(),
    },
]


def get_param_schema(indicator_type: IndicatorType) -> type[BaseModel]:
    if indicator_type not in INDICATOR_PARAM_SCHEMAS:
        raise ValueError(f"Unknown indicator type: {indicator_type}")
    return INDICATOR_PARAM_SCHEMAS[indicator_type]


def validate_params(indicator_type: IndicatorType, params: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize params for a given indicator type. Raises ValidationError."""
    schema = get_param_schema(indicator_type)
    try:
        validated = schema(**params)
    except ValidationError:
        raise
    return validated.model_dump()
