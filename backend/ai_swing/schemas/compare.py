"""DTOs for the strategy comparator endpoint."""
from __future__ import annotations

from datetime import date as DateT

from pydantic import BaseModel, ConfigDict

from ai_swing.schemas.backtest import BacktestResultDTO
from ai_swing.schemas.deploy_score import DeployScoreDTO


class StrategyHeaderDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    benchmark_ticker: str
    risk_on_ticker: str
    risk_off_ticker: str
    k_threshold: int
    n_indicators: int


class CompareCrisisRowDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    label: str
    a_verdict: str
    a_pct_above_spy: float | None
    b_verdict: str
    b_pct_above_spy: float | None


class CompareReportDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    asof_date: DateT
    range_years: int
    strategy_a: StrategyHeaderDTO
    strategy_b: StrategyHeaderDTO
    backtest_a: BacktestResultDTO
    backtest_b: BacktestResultDTO
    deploy_a: DeployScoreDTO
    deploy_b: DeployScoreDTO
    crisis_rows: list[CompareCrisisRowDTO]
    n_beats_a: int
    n_beats_b: int
    n_eligible_a: int
    n_eligible_b: int
