"""DTOs for the Robustness Heatmap (rolling-window stress) endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict


class RollingCellDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entry_date: DateT
    sharpe: float | None
    pct_above_spy: float | None


class RollingRowDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    window_years: int
    cells: list[RollingCellDTO]


class RollingStressDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    asof_date: DateT
    history_start: DateT
    window_years: list[int]
    entry_dates: list[DateT]
    rows: list[RollingRowDTO]
