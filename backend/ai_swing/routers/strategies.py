from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ai_swing.backtest.cohorts import compute_cohort_entries
from ai_swing.backtest.crisis import attribution_score, compute_crisis_attribution
from ai_swing.backtest.engine import compute_strategy_curves
from ai_swing.backtest.metrics import sortino as sortino_metric
from ai_swing.db import get_db
from ai_swing.db.models import Strategy, StrategyIndicator
from ai_swing.schemas.cohorts import CohortEntryDTO, CohortReportDTO
from ai_swing.schemas.crisis import (
    CrisisAttributionDTO,
    CrisisPointDTO,
    CrisisResultDTO,
)
from ai_swing.schemas.deploy_score import (
    CriterionScoreDTO,
    DeployScoreDTO,
    ValidationGateDTO,
    ValidationSnapshotDTO,
)
from ai_swing.schemas.strategy import StrategyCreate, StrategyDTO, StrategyUpdate
from ai_swing.scoring.deploy_score import compute_deploy_score
from ai_swing.services import ai_reports, gates_service
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

    Criteria 3 (gates G2/G3/G6/G7) and 4 (DSR) are read from the most-recent
    StrategyGatesSnapshot persisted by the daily refresh job. Strategies
    without a snapshot yet keep those criteria as `status="pending"`.
    """
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    gates_snap = gates_service.latest_gates(db, s.id, range_years=range_years)
    try:
        score = compute_deploy_score(
            s, range_years=range_years, bonus_pts=bonus_pts,
            gates_snapshot=gates_snap,
        )
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


@router.get("/{strategy_id}/validation-snapshot", response_model=ValidationSnapshotDTO)
def validation_snapshot_endpoint(
    strategy_id: int,
    range_years: int = 10,
    db: Session = Depends(get_db),
) -> ValidationSnapshotDTO:
    """Return an informational view of validation gates and OOS/FWD checks."""
    s = get_strategy(db, strategy_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Strategy not found")

    gates_snap = gates_service.latest_gates(db, s.id, range_years=range_years)
    gates_payload = gates_snap.payload if gates_snap is not None else None
    gates = _validation_gate_dtos(gates_payload)

    try:
        curves = compute_strategy_curves(s, range_years=range_years)
        rets = curves.strategy_returns.dropna()
        cut = int(len(rets) * 0.70)
        oos = rets.iloc[cut:]
        fwd = rets[rets.index >= pd.Timestamp("2020-01-01")]
        oos_value = _fmt_sortino(sortino_metric(oos)) if len(oos) >= 30 else "insufficient data"
        fwd_value = _fmt_sortino(sortino_metric(fwd)) if len(fwd) >= 60 else "insufficient data"
        oos_pass = bool(len(oos) >= 30 and sortino_metric(oos) > 0 and len(fwd) >= 60 and sortino_metric(fwd) > 0)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ValidationSnapshotDTO(
        asof_date=gates_snap.asof_date if gates_snap is not None else None,
        range_years=range_years,
        gates_available=gates_snap is not None,
        gates=gates,
        oos_fwd=ValidationGateDTO(
            key="oos_fwd",
            label="OOS + post-2020 forward",
            value=f"OOS {oos_value} · post-2020 {fwd_value}",
            passed=oos_pass,
            description=(
                "Checks whether the strategy kept positive Sortino in the last "
                "30% of history and in the post-2020 period."
            ),
        ),
        dsr_note=(
            "DSR is not displayed as a separate metric: with a single evaluated "
            "configuration, the current calculation falls back to PSR. Full DSR would require "
            "the real number of candidate configurations/tests."
        ),
    )


def _fmt_sortino(value: float) -> str:
    return f"Sortino {value:+.2f}"


def _validation_gate_dtos(payload: dict | None) -> list[ValidationGateDTO]:
    if payload is None:
        return [
            ValidationGateDTO(
                key="g2",
                label="G2 - Statistical confidence",
                value="waiting for refresh",
                passed=None,
                description="PSR/DSR: estimates whether the observed Sharpe is statistically defensible.",
            ),
            ValidationGateDTO(
                key="g3",
                label="G3 - Window validation",
                value="waiting for refresh",
                passed=None,
                description="Checks whether the strategy beats the benchmark across chronological windows outside a single historical average.",
            ),
            ValidationGateDTO(
                key="g6",
                label="G6 - Robustness bootstrap",
                value="waiting for refresh",
                passed=None,
                description="Resamples returns in blocks and requires a positive lower bound for Sortino.",
            ),
            ValidationGateDTO(
                key="g7",
                label="G7 - Calculation consistency",
                value="waiting for refresh",
                passed=None,
                description="Compares independent CAGR implementations to detect material arithmetic divergence.",
            ),
        ]

    g2 = payload.get("g2_dsr", {})
    g3 = payload.get("g3_wf", {})
    g6 = payload.get("g6_bootstrap", {})
    g7 = payload.get("g7_xlib", {})
    return [
        ValidationGateDTO(
            key="g2",
            label="G2 - Statistical confidence",
            value=f"p={float(g2.get('p_value', 1.0)):.3f} · Sharpe {float(g2.get('observed_sharpe', 0.0)):+.2f}",
            passed=bool(g2.get("pass_gate")),
            description="PSR/DSR: estimates whether the observed Sharpe is statistically defensible.",
        ),
        ValidationGateDTO(
            key="g3",
            label="G3 - Window validation",
            value=f"{int(g3.get('n_pass', 0))}/{int(g3.get('n_windows', 0))} windows pass",
            passed=bool(g3.get("pass_gate")),
            description="Checks whether the strategy beats the benchmark across chronological windows outside a single historical average.",
        ),
        ValidationGateDTO(
            key="g6",
            label="G6 - Robustness bootstrap",
            value=f"IC 99% Sortino low {float(g6.get('ci_low_sortino', 0.0)):+.2f}",
            passed=bool(g6.get("pass_gate")),
            description="Resamples returns in blocks and requires a positive lower bound for Sortino.",
        ),
        ValidationGateDTO(
            key="g7",
            label="G7 - Calculation consistency",
            value=f"delta {float(g7.get('delta_pp', 0.0)):.2f}pp",
            passed=bool(g7.get("pass_gate")),
            description="Compares independent CAGR implementations to detect material arithmetic divergence.",
        ),
    ]


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
                final_equity_ratio=e.final_equity_ratio,
                under_benchmark_episodes=e.under_benchmark_episodes,
                under_benchmark_min_days=e.under_benchmark_min_days,
                under_benchmark_avg_days=e.under_benchmark_avg_days,
                under_benchmark_max_days=e.under_benchmark_max_days,
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
            detail="AI reports unavailable (configure AI_CLI_COMMAND)",
        )
    db.commit()
    return StrategyReportDTO.model_validate(report)
