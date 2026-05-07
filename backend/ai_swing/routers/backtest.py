from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ai_swing.backtest import cache as bt_cache
from ai_swing.backtest.engine import run_backtest
from ai_swing.backtest.rolling_stress import compute_rolling_stress
from ai_swing.backtest.walk_forward import compute_walk_forward
from ai_swing.data import get_price_service
from ai_swing.db import get_db
from ai_swing.schemas.backtest import (
    BacktestMetrics,
    BacktestPoint,
    BacktestResultDTO,
    BacktestTransition,
)
from ai_swing.schemas.rolling_stress import (
    RollingCellDTO,
    RollingRowDTO,
    RollingStressDTO,
)
from ai_swing.schemas.walk_forward import WalkForwardReportDTO, WalkForwardWindowDTO
from ai_swing.services.strategy_service import get_strategy

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/backtest", tags=["backtest"])


def _result_to_dto(result, cached: bool) -> BacktestResultDTO:
    return BacktestResultDTO(
        range_start=result.range_start,
        range_end=result.range_end,
        range_years=result.range_years,
        asof_date=result.asof_date,
        cached=cached,
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


@router.post("/{strategy_id}", response_model=BacktestResultDTO)
def run_endpoint(
    strategy_id: int,
    range_years: int = Query(default=10, ge=1, le=50),
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> BacktestResultDTO:
    strategy = get_strategy(db, strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    # asof = latest available bar across all 3 tickers (use benchmark cache as proxy)
    ps = get_price_service()
    bench = ps.get_close_series(strategy.benchmark_ticker)
    if bench.empty:
        raise HTTPException(status_code=400, detail=f"No price data for {strategy.benchmark_ticker}")
    asof = bench.dropna().index[-1].date()

    if not force:
        cached_result, config_hash = bt_cache.get_cached(db, strategy, range_years, asof)
        if cached_result is not None:
            return _result_to_dto(cached_result, cached=True)
    else:
        config_hash = bt_cache.compute_config_hash(strategy, range_years, asof)

    try:
        result = run_backtest(strategy, range_years=range_years)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Backtest failed for strategy %s", strategy_id)
        raise HTTPException(status_code=500, detail=f"Backtest failed: {exc}")

    bt_cache.store(db, strategy, range_years, asof, result, config_hash)
    return _result_to_dto(result, cached=False)


@router.post("/{strategy_id}/walk-forward", response_model=WalkForwardReportDTO)
def walk_forward_endpoint(
    strategy_id: int,
    n_windows: int = Query(default=8, ge=2, le=20),
    db: Session = Depends(get_db),
) -> WalkForwardReportDTO:
    """Run walk-forward validation across N chronological splits.

    Mirrors the study's G3 gate: a window passes when the strategy spent
    ≥50% of its days above the benchmark equity (renormalised within the
    window). Returns per-window Sharpe/CAGR/MaxDD plus the pass count.
    """
    strategy = get_strategy(db, strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    try:
        report = compute_walk_forward(strategy, n_windows=n_windows)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return WalkForwardReportDTO(
        asof_date=report.asof_date,
        n_windows=report.n_windows,
        n_passed=report.n_passed,
        windows=[
            WalkForwardWindowDTO(
                index=w.index,
                start=w.start,
                end=w.end,
                n_days=w.n_days,
                sharpe=w.sharpe,
                cagr=w.cagr,
                max_drawdown=w.max_drawdown,
                pct_above_benchmark=w.pct_above_benchmark,
                passed=w.passed,
            )
            for w in report.windows
        ],
    )


@router.post("/{strategy_id}/rolling-stress", response_model=RollingStressDTO)
def rolling_stress_endpoint(
    strategy_id: int,
    step_months: int = Query(default=3, ge=1, le=12),
    db: Session = Depends(get_db),
) -> RollingStressDTO:
    """Compute rolling-window Sharpe heatmap (3y/5y/10y/20y × entry dates)."""
    strategy = get_strategy(db, strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    try:
        result = compute_rolling_stress(strategy, step_months=step_months)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return RollingStressDTO(
        asof_date=result.asof_date,
        history_start=result.history_start,
        window_years=result.window_years,
        entry_dates=result.entry_dates,
        rows=[
            RollingRowDTO(
                window_years=row.window_years,
                cells=[
                    RollingCellDTO(
                        entry_date=c.entry_date,
                        sharpe=c.sharpe,
                        pct_above_spy=c.pct_above_spy,
                    )
                    for c in row.cells
                ],
            )
            for row in result.rows
        ],
    )
