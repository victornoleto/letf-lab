"""DTOs for the Deploy Readiness Score endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict


class CriterionScoreDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    label: str
    points: float
    max_points: float
    status: str  # "ok" | "warn" | "fail" | "pending"
    note: str


class DeployScoreDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    asof_date: DateT
    range_start: DateT
    range_end: DateT
    total: float
    tier_label: str
    winner_conditions_met: bool
    criteria: list[CriterionScoreDTO]


class ValidationGateDTO(BaseModel):
    key: str
    label: str
    value: str
    passed: bool | None
    description: str


class ValidationSnapshotDTO(BaseModel):
    asof_date: DateT | None
    range_years: int
    gates_available: bool
    gates: list[ValidationGateDTO]
    oos_fwd: ValidationGateDTO
    dsr_note: str
