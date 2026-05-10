from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ai_swing.schemas.indicator import IndicatorDTO
from ai_swing.schemas.signal import SignalSnapshotDTO


class StrategyReportDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    headline: str
    body: str
    proximity_state: str | None
    model: str
    generated_at: datetime


class StrategyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    benchmark_ticker: str = Field(..., min_length=1, max_length=16)
    risk_on_tickers: list[str] = Field(..., min_length=1)
    risk_off_ticker: str = Field(..., min_length=1, max_length=16)
    k_threshold: int = Field(..., ge=1)
    enabled: bool = True

    @field_validator("benchmark_ticker", "risk_off_ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("risk_on_tickers")
    @classmethod
    def upper_risk_on_tickers(cls, v: list[str]) -> list[str]:
        out = []
        seen = set()
        for ticker in v:
            t = ticker.strip().upper()
            if not t or len(t) > 16 or t in seen:
                continue
            out.append(t)
            seen.add(t)
        if not out:
            raise ValueError("At least one risk_on ticker is required")
        return out


class StrategyCreate(StrategyBase):
    indicator_ids: list[int] = Field(default_factory=list)


class StrategyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    benchmark_ticker: str | None = Field(default=None, min_length=1, max_length=16)
    risk_on_tickers: list[str] | None = Field(default=None, min_length=1)
    risk_off_ticker: str | None = Field(default=None, min_length=1, max_length=16)
    k_threshold: int | None = Field(default=None, ge=1)
    enabled: bool | None = None
    indicator_ids: list[int] | None = None

    @field_validator("benchmark_ticker", "risk_off_ticker")
    @classmethod
    def upper_ticker(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else v

    @field_validator("risk_on_tickers")
    @classmethod
    def upper_risk_on_tickers(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        out = []
        seen = set()
        for ticker in v:
            t = ticker.strip().upper()
            if not t or len(t) > 16 or t in seen:
                continue
            out.append(t)
            seen.add(t)
        if not out:
            raise ValueError("At least one risk_on ticker is required")
        return out


class StrategyDTO(StrategyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    indicators: list[IndicatorDTO]
    current_signal: SignalSnapshotDTO | None = None
    sparkline_90d: list[float] = Field(default_factory=list)
    report: StrategyReportDTO | None = None
