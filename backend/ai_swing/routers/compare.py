"""Compare two strategies side-by-side."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ai_swing.db import get_db
from ai_swing.schemas.backtest import (
    BacktestMetrics,
    BacktestPoint,
    BacktestResultDTO,
    BacktestTransition,
)
from ai_swing.schemas.compare import (
    CompareCrisisRowDTO,
    CompareReportDTO,
    StrategyHeaderDTO,
)
from ai_swing.schemas.deploy_score import CriterionScoreDTO, DeployScoreDTO
from ai_swing.services.compare import compare_strategies
from ai_swing.services.strategy_service import get_strategy

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compare", tags=["compare"])


def _bt_to_dto(result) -> BacktestResultDTO:
    return BacktestResultDTO(
        range_start=result.range_start,
        range_end=result.range_end,
        range_years=result.range_years,
        asof_date=result.asof_date,
        cached=False,
        equity_strategy=[BacktestPoint(date=p.date, value=p.value) for p in result.equity_strategy],
        equity_strategy_net=[
            BacktestPoint(date=p.date, value=p.value) for p in result.equity_strategy_net
        ],
        equity_benchmark_buyhold=[
            BacktestPoint(date=p.date, value=p.value) for p in result.equity_benchmark_buyhold
        ],
        equity_riskon_buyhold=[
            BacktestPoint(date=p.date, value=p.value) for p in result.equity_riskon_buyhold
        ],
        equity_ratio_vs_benchmark=[
            BacktestPoint(date=p.date, value=p.value) for p in result.equity_ratio_vs_benchmark
        ],
        metrics_strategy=BacktestMetrics(**result.metrics_strategy.__dict__),
        metrics_benchmark=BacktestMetrics(**result.metrics_benchmark.__dict__),
        metrics_riskon=BacktestMetrics(**result.metrics_riskon.__dict__),
        transitions=[
            BacktestTransition(date=t.date, from_state=t.from_state, to_state=t.to_state)
            for t in result.transitions
        ],
    )


def _deploy_to_dto(score) -> DeployScoreDTO:
    return DeployScoreDTO(
        asof_date=score.asof_date,
        range_start=score.range_start,
        range_end=score.range_end,
        total=score.total,
        tier_label=score.tier_label,
        winner_conditions_met=score.winner_conditions_met,
        criteria=[
            CriterionScoreDTO(
                key=c.key,
                label=c.label,
                points=c.points,
                max_points=c.max_points,
                status=c.status,
                note=c.note,
            )
            for c in score.criteria
        ],
    )


@router.get("", response_model=CompareReportDTO)
def compare_endpoint(
    strategy_a: int = Query(..., alias="strategy_a"),
    strategy_b: int = Query(..., alias="strategy_b"),
    range_years: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> CompareReportDTO:
    """Run backtest + crisis + deploy-score on both strategies and return the
    side-by-side bundle.
    """
    if strategy_a == strategy_b:
        raise HTTPException(status_code=400, detail="strategy_a and strategy_b must differ")

    a = get_strategy(db, strategy_a)
    b = get_strategy(db, strategy_b)
    if a is None or b is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    try:
        report = compare_strategies(a, b, range_years=range_years)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return CompareReportDTO(
        asof_date=report.asof_date,
        range_years=report.range_years,
        strategy_a=StrategyHeaderDTO(**report.strategy_a.__dict__),
        strategy_b=StrategyHeaderDTO(**report.strategy_b.__dict__),
        backtest_a=_bt_to_dto(report.backtest_a),
        backtest_b=_bt_to_dto(report.backtest_b),
        deploy_a=_deploy_to_dto(report.deploy_a),
        deploy_b=_deploy_to_dto(report.deploy_b),
        crisis_rows=[
            CompareCrisisRowDTO(
                name=r.name,
                label=r.label,
                a_verdict=r.a_verdict,
                a_pct_above_spy=r.a_pct_above_spy,
                b_verdict=r.b_verdict,
                b_pct_above_spy=r.b_pct_above_spy,
            )
            for r in report.crisis_rows
        ],
        n_beats_a=report.n_beats_a,
        n_beats_b=report.n_beats_b,
        n_eligible_a=report.n_eligible_a,
        n_eligible_b=report.n_eligible_b,
    )
