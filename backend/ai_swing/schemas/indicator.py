from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ai_swing.db.models import IndicatorType


class IndicatorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    type: IndicatorType
    params: dict[str, Any] = Field(default_factory=dict)
    description: str | None = Field(default=None, max_length=500)


class IndicatorCreate(IndicatorBase):
    pass


class IndicatorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    params: dict[str, Any] | None = None
    description: str | None = Field(default=None, max_length=500)


class IndicatorDTO(IndicatorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class IndicatorTypeInfo(BaseModel):
    type: str
    label: str
    description: str
    params_schema: dict[str, Any]
    default_params: dict[str, Any]
