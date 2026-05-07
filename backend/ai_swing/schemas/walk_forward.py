"""DTOs for the walk-forward validation endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict


class WalkForwardWindowDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    index: int
    start: DateT
    end: DateT
    n_days: int
    sortino: float | None
    cagr: float | None
    max_drawdown: float | None
    pct_above_benchmark: float | None
    passed: bool


class WalkForwardReportDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    asof_date: DateT
    n_windows: int
    windows: list[WalkForwardWindowDTO]
    n_passed: int
