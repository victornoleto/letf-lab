"""Transaction DTOs.

Note: we deliberately don't `from __future__ import annotations` here AND
we use typing.Optional instead of `date | None` because the field name
`date` shadows the class `date` once Pydantic walks the namespace, which
makes `date | None` evaluate to `None | None` and explode at class-build
time. Optional[date] sidesteps the lookup.
"""
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ai_swing.db.models import TransactionSide


class TransactionBase(BaseModel):
    date: date_type
    asset_ticker: str = Field(..., min_length=1, max_length=16)
    side: TransactionSide
    n_shares: Decimal = Field(..., gt=0)
    price_per_share: Decimal = Field(..., ge=0)
    currency: str = Field(default="USD", min_length=2, max_length=8)
    fx_rate_to_usd: Decimal = Field(default=Decimal("1"), gt=0)
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = Field(default=None, max_length=500)
    strategy_id: Optional[int] = None

    @field_validator("asset_ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: str) -> str:
        return v.strip().upper()


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: Optional[date_type] = None
    asset_ticker: Optional[str] = Field(default=None, min_length=1, max_length=16)
    side: Optional[TransactionSide] = None
    n_shares: Optional[Decimal] = Field(default=None, gt=0)
    price_per_share: Optional[Decimal] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, min_length=2, max_length=8)
    fx_rate_to_usd: Optional[Decimal] = Field(default=None, gt=0)
    fees: Optional[Decimal] = Field(default=None, ge=0)
    notes: Optional[str] = Field(default=None, max_length=500)
    strategy_id: Optional[int] = None

    @field_validator("asset_ticker")
    @classmethod
    def upper_ticker(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else v

    @field_validator("currency")
    @classmethod
    def upper_currency(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v else v


class TransactionDTO(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PortfolioPosition(BaseModel):
    """Aggregated position for a single ticker."""
    asset_ticker: str
    n_shares: Decimal
    avg_cost_usd: Decimal
    invested_usd: Decimal
    current_price_usd: Optional[Decimal]
    market_value_usd: Optional[Decimal]
    pl_usd: Optional[Decimal]
    pl_pct: Optional[float]


class PortfolioSummary(BaseModel):
    positions: list[PortfolioPosition]
    invested_usd: Decimal
    market_value_usd: Decimal
    pl_usd: Decimal
    pl_pct: Optional[float]
    # Display-currency metadata. The values above are denominated in
    # `display_currency` (default "USD"). When the caller asks for the
    # configured local currency, we multiply through `fx_rate_used`.
    display_currency: str = "USD"
    fx_rate_used: Optional[Decimal] = None


class PortfolioConfig(BaseModel):
    base_currency: str
    local_currency: str
    local_fx_ticker: str
    local_fx_invert: bool
    locale: str


class PortfolioHistoryPoint(BaseModel):
    date: date_type
    portfolio_value_usd: float
    benchmark_value_usd: float


class PortfolioHistory(BaseModel):
    benchmark_ticker: str
    points: list[PortfolioHistoryPoint]
