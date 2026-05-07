"""DTOs for the Cohort Entry Heatmap endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict


class CohortEntryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entry_date: DateT
    label: str
    forward_years: int
    has_data: bool
    n_days: int
    cagr: float | None
    sharpe: float | None
    max_drawdown: float | None


class CohortReportDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    asof_date: DateT
    forward_years: int
    entries: list[CohortEntryDTO]
