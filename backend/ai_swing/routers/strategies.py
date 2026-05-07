from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ai_swing.backtest.cohorts import compute_cohort_entries
from ai_swing.backtest.crisis import attribution_score, compute_crisis_attribution
from ai_swing.db import get_db
from ai_swing.db.models import Strategy, StrategyIndicator
from ai_swing.schemas.cohorts import CohortEntryDTO, CohortReportDTO
from ai_swing.schemas.crisis import (
    CrisisAttributionDTO,
    CrisisPointDTO,
    CrisisResultDTO,
)
from ai_swing.schemas.deploy_score import CriterionScoreDTO, DeployScoreDTO
from ai_swing.schemas.strategy import StrategyCreate, StrategyDTO, StrategyUpdate
from ai_swing.scoring.deploy_score import compute_deploy_score
from ai_swing.services import ai_reports
from ai_swing.schemas.strategy import StrategyReportDTO
from ai_swing.services.indicator_series import build_indicator_series
from ai_swing.services.strategy_service import (
    attach_indicators,
    build_strategy_dto_with_signal,
    build_strategy_dtos_bulk,
    clone_strategy,
    get_strategy,
    list_strategies,
)

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


def _validate_k_threshold(k: int, n: int) -> None:
    if k < 1:
        raise HTTPException(status_code=400, detail="k_threshold must be >= 1")
    if k > n:
        raise HTTPException(
            status_code=400, detail=f"k_threshold ({k}) exceeds indicator count ({n})"
        )


@router.get("", response_model=list[StrategyDTO])
def list_endpoint(
    enabled_only: bool = False,
    fresh: bool = False,
    db: Session = Depends(get_db),
) -> list[StrategyDTO]:
    """List strategies with their current signals.

    `fresh=false` (default) serves the persisted snapshot the cron writes —
    near-instant since it's a couple of bulk SELECTs plus the in-memory
    parquet cache for sparklines. `fresh=true` recomputes the gates live
    from prices on every call (much slower; useful when you've just
    edited an indicator and want the result without waiting for the cron).
    """
    strategies = list_strategies(db, enabled_only=enabled_only)
    return build_strategy_dtos_bulk(db, strategies, fresh=fresh)


@router.get("/{strategy_id}", response_model=StrategyDTO)
def get_endpoint(strategy_id: int, db: Session = Depends(get_db)) -> StrategyDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    # Detail page always recomputes — it's a single strategy and the user
    # navigated there explicitly, so the latency is acceptable for live data.
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.post("", response_model=StrategyDTO, status_code=status.HTTP_201_CREATED)
def create_endpoint(body: StrategyCreate, db: Session = Depends(get_db)) -> StrategyDTO:
    existing = db.scalars(select(Strategy).where(Strategy.name == body.name)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Strategy '{body.name}' already exists")

    _validate_k_threshold(body.k_threshold, len(body.indicator_ids))

    s = Strategy(
        name=body.name,
        benchmark_ticker=body.benchmark_ticker,
        risk_on_ticker=body.risk_on_ticker,
        risk_off_ticker=body.risk_off_ticker,
        k_threshold=body.k_threshold,
        enabled=body.enabled,
    )
    db.add(s)
    db.flush()
    try:
        attach_indicators(db, s, body.indicator_ids)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    s = get_strategy(db, s.id)
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.put("/{strategy_id}", response_model=StrategyDTO)
def update_endpoint(
    strategy_id: int, body: StrategyUpdate, db: Session = Depends(get_db)
) -> StrategyDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if body.name is not None:
        s.name = body.name
    if body.benchmark_ticker is not None:
        s.benchmark_ticker = body.benchmark_ticker
    if body.risk_on_ticker is not None:
        s.risk_on_ticker = body.risk_on_ticker
    if body.risk_off_ticker is not None:
        s.risk_off_ticker = body.risk_off_ticker
    if body.enabled is not None:
        s.enabled = body.enabled

    if body.indicator_ids is not None:
        new_k = body.k_threshold if body.k_threshold is not None else s.k_threshold
        _validate_k_threshold(new_k, len(body.indicator_ids))
        try:
            attach_indicators(db, s, body.indicator_ids)
        except ValueError as exc:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    if body.k_threshold is not None:
        n = len(body.indicator_ids) if body.indicator_ids is not None else len(s.indicators)
        _validate_k_threshold(body.k_threshold, n)
        s.k_threshold = body.k_threshold

    db.commit()
    s = get_strategy(db, strategy_id)
    return build_strategy_dto_with_signal(db, s, fresh=True)


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(strategy_id: int, db: Session = Depends(get_db)) -> None:
    s = db.get(Strategy, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(s)
    db.commit()


@router.post("/{strategy_id}/clone", response_model=StrategyDTO,
             status_code=status.HTTP_201_CREATED)
def clone_endpoint(strategy_id: int, db: Session = Depends(get_db)) -> StrategyDTO:
    """Duplicate a strategy with a derived unique name.

    Returns the fresh DTO with `current_signal` recomputed live so the UI
    can navigate to /strategies/{new_id}/edit and the user has immediate
    feedback on what the clone looks like.
    """
    try:
        clone = clone_strategy(db, strategy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.commit()
    clone = get_strategy(db, clone.id)
    return build_strategy_dto_with_signal(db, clone, fresh=True)


@router.get("/{strategy_id}/indicator-series")
def indicator_series_endpoint(
    strategy_id: int,
    range: str = "1y",
    db: Session = Depends(get_db),
) -> list[dict]:
    """Per-indicator time series for the detail-page Indicators tab."""
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return build_indicator_series(s, range_label=range)


@router.get("/{strategy_id}/report", response_model=StrategyReportDTO | None)
def latest_report_endpoint(
    strategy_id: int, db: Session = Depends(get_db)
) -> StrategyReportDTO | None:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    row = ai_reports.latest_report(db, s.id)
    return StrategyReportDTO.model_validate(row) if row else None


@router.get("/{strategy_id}/deploy-score", response_model=DeployScoreDTO)
def deploy_score_endpoint(
    strategy_id: int,
    range_years: int = 10,
    bonus_pts: float = 0.0,
    db: Session = Depends(get_db),
) -> DeployScoreDTO:
    """Replicate the study's 7-criterion scoring (v2) on the strategy.

    Phase 2 implements criteria 1, 2, 5, 6, 7. Criteria 3 (gates) and 4 (DSR)
    are returned as `status="pending"` with 0 pts until Fase 3 ships the
    walk-forward + bootstrap pipelines.
    """
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    try:
        score = compute_deploy_score(s, range_years=range_years, bonus_pts=bonus_pts)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
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


@router.get("/{strategy_id}/cohort-entry", response_model=CohortReportDTO)
def cohort_entry_endpoint(
    strategy_id: int,
    forward_years: int = 5,
    db: Session = Depends(get_db),
) -> CohortReportDTO:
    """Run the strategy starting at 8 canonical entry dates and return forward metrics."""
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    try:
        report = compute_cohort_entries(s, forward_years=forward_years)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return CohortReportDTO(
        asof_date=report.asof_date,
        forward_years=report.forward_years,
        entries=[
            CohortEntryDTO(
                entry_date=e.entry_date,
                label=e.label,
                forward_years=e.forward_years,
                has_data=e.has_data,
                n_days=e.n_days,
                cagr=e.cagr,
                sortino=e.sortino,
                max_drawdown=e.max_drawdown,
            )
            for e in report.entries
        ],
    )


@router.get("/{strategy_id}/crisis-attribution", response_model=CrisisAttributionDTO)
def crisis_attribution_endpoint(
    strategy_id: int, db: Session = Depends(get_db)
) -> CrisisAttributionDTO:
    """Replay the strategy across the 4 canonical crisis windows.

    Returns per-window equity points (strategy + SPY, both renormalised to
    100 at the window start) plus a verdict (beats / loses / insufficient_data)
    and an aggregate "N of M" score for the criterion-6 read on the deploy
    score card.
    """
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    results = compute_crisis_attribution(s)
    n_beats, n_eligible = attribution_score(results)
    return CrisisAttributionDTO(
        results=[
            CrisisResultDTO(
                name=r.name,
                label=r.label,
                start=r.start,
                end=r.end,
                verdict=r.verdict,
                pct_above_spy=r.pct_above_spy,
                end_ratio=r.end_ratio,
                points=[CrisisPointDTO(date=p.date, strategy=p.strategy, spy=p.spy)
                        for p in r.points],
            )
            for r in results
        ],
        n_beats=n_beats,
        n_eligible=n_eligible,
    )


@router.post("/{strategy_id}/report", response_model=StrategyReportDTO)
def regenerate_report_endpoint(
    strategy_id: int, db: Session = Depends(get_db)
) -> StrategyReportDTO:
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    report = ai_reports.generate_report(db, s, force=True)
    if report is None:
        raise HTTPException(
            status_code=503,
            detail="AI reports não disponíveis (configure AI_CLI_COMMAND)",
        )
    db.commit()
    return StrategyReportDTO.model_validate(report)
