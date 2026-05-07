"""DTOs for the Crisis Lab endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict


class CrisisPointDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    date: DateT
    strategy: float
    spy: float


class CrisisResultDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    label: str
    start: DateT
    end: DateT
    verdict: str  # "beats" | "loses" | "insufficient_data"
    pct_above_spy: float | None
    end_ratio: float | None
    points: list[CrisisPointDTO]


class CrisisAttributionDTO(BaseModel):
    results: list[CrisisResultDTO]
    n_beats: int
    n_eligible: int
