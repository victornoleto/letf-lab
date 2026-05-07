from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

from ai_swing.db.models import IndicatorType


class IndicatorResultDTO(BaseModel):
    indicator_id: int
    indicator_name: str
    indicator_type: IndicatorType
    gate_passed: bool
    value: float
    raw_summary: str
    # Default None so old persisted snapshots (pre-headroom migration) keep
    # deserializing cleanly when the column isn't in the JSON payload.
    headroom_pct: float | None = None


class SignalSnapshotDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    score: int
    total: int
    risk_on: bool
    results: list[IndicatorResultDTO]


class SignalTransitionDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    strategy_id: int
    date: date
    from_state: bool
    to_state: bool
    score: int
    total: int
