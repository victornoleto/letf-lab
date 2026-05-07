"""DTOs for the weekly-digest endpoint."""
from __future__ import annotations

from datetime import date as DateT
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WeeklyDigestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    week_start: DateT
    body: str
    model: str
    generated_at: datetime


class WeeklyDigestListDTO(BaseModel):
    digests: list[WeeklyDigestDTO]
