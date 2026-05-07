"""Strategy CRUD helpers + DTO assembly."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from ai_swing.data import get_price_service
from ai_swing.db.models import (
    Indicator,
    SignalSnapshot,
    Strategy,
    StrategyIndicator,
)
from ai_swing.schemas.indicator import IndicatorDTO
from ai_swing.schemas.signal import IndicatorResultDTO, SignalSnapshotDTO
from ai_swing.schemas.strategy import StrategyDTO, StrategyReportDTO
from ai_swing.services.signal_service import compute_snapshot, snapshot_to_dto
from ai_swing.services import ai_reports

logger = logging.getLogger(__name__)


def get_strategy(db: Session, strategy_id: int) -> Strategy | None:
    stmt = (
        select(Strategy)
        .options(selectinload(Strategy.indicators).selectinload(StrategyIndicator.indicator))
        .where(Strategy.id == strategy_id)
    )
    return db.scalars(stmt).first()


def list_strategies(db: Session, enabled_only: bool = False) -> list[Strategy]:
    stmt = select(Strategy).options(
        selectinload(Strategy.indicators).selectinload(StrategyIndicator.indicator)
    )
    if enabled_only:
        stmt = stmt.where(Strategy.enabled.is_(True))
    return list(db.scalars(stmt).all())


def latest_snapshot(db: Session, strategy_id: int) -> SignalSnapshot | None:
    stmt = (
        select(SignalSnapshot)
        .where(SignalSnapshot.strategy_id == strategy_id)
        .order_by(SignalSnapshot.date.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def latest_snapshots_by_strategy_ids(
    db: Session, strategy_ids: list[int]
) -> dict[int, SignalSnapshot]:
    """One query that returns the most recent snapshot per strategy.

    Used by the dashboard / list endpoints to avoid an N+1 walk where each
    strategy triggered its own SELECT for the latest snapshot.
    """
    if not strategy_ids:
        return {}
    max_date_sub = (
        select(
            SignalSnapshot.strategy_id.label("sid"),
            func.max(SignalSnapshot.date).label("max_date"),
        )
        .where(SignalSnapshot.strategy_id.in_(strategy_ids))
        .group_by(SignalSnapshot.strategy_id)
        .subquery()
    )
    rows = db.scalars(
        select(SignalSnapshot).join(
            max_date_sub,
            and_(
                SignalSnapshot.strategy_id == max_date_sub.c.sid,
                SignalSnapshot.date == max_date_sub.c.max_date,
            ),
        )
    ).all()
    return {r.strategy_id: r for r in rows}


def attach_indicators(db: Session, strategy: Strategy, indicator_ids: list[int]) -> None:
    """Replace strategy.indicators with the given list."""
    strategy.indicators.clear()
    db.flush()
    for order, ind_id in enumerate(indicator_ids):
        ind = db.get(Indicator, ind_id)
        if ind is None:
            raise ValueError(f"Indicator {ind_id} not found")
        strategy.indicators.append(StrategyIndicator(indicator=ind, order=order))


def strategy_to_dto(strategy: Strategy, current_signal: SignalSnapshotDTO | None = None,
                    sparkline_90d: list[float] | None = None,
                    report: StrategyReportDTO | None = None) -> StrategyDTO:
    indicator_dtos = [
        IndicatorDTO.model_validate(si.indicator) for si in strategy.indicators
    ]
    return StrategyDTO(
        id=strategy.id,
        name=strategy.name,
        benchmark_ticker=strategy.benchmark_ticker,
        risk_on_ticker=strategy.risk_on_ticker,
        risk_off_ticker=strategy.risk_off_ticker,
        k_threshold=strategy.k_threshold,
        enabled=strategy.enabled,
        created_at=strategy.created_at,
        indicators=indicator_dtos,
        current_signal=current_signal,
        sparkline_90d=sparkline_90d or [],
        report=report,
    )


def build_strategy_dto_with_signal(
    db: Session, strategy: Strategy, fresh: bool = True
) -> StrategyDTO:
    """Assemble a StrategyDTO with current_signal computed live + sparkline.

    If `fresh=True`, computes the signal now from cached prices. If `fresh=False`,
    pulls the latest persisted SignalSnapshot from DB.
    """
    snapshot_dto: SignalSnapshotDTO | None = None
    sparkline: list[float] = []

    if fresh:
        try:
            snap = compute_snapshot(strategy)
            if snap is not None:
                snapshot_dto = snapshot_to_dto(snap)
        except Exception as exc:
            logger.warning("Failed live snapshot for strategy %s: %s", strategy.id, exc)

    if snapshot_dto is None:
        persisted = latest_snapshot(db, strategy.id)
        if persisted is not None:
            snapshot_dto = SignalSnapshotDTO(
                date=persisted.date,
                score=persisted.score,
                total=persisted.total,
                risk_on=persisted.risk_on,
                results=[IndicatorResultDTO(**r) for r in persisted.indicator_results],
            )

    try:
        ps = get_price_service()
        series = ps.get_recent_window(strategy.benchmark_ticker, days=130)
        sparkline = [float(x) for x in series.dropna().tolist()[-90:]]
    except Exception as exc:
        logger.warning("Failed sparkline for %s: %s", strategy.benchmark_ticker, exc)

    report_dto: StrategyReportDTO | None = None
    try:
        report_row = ai_reports.latest_report(db, strategy.id)
        if report_row is not None:
            report_dto = StrategyReportDTO.model_validate(report_row)
    except Exception as exc:
        logger.debug("Failed to load AI report for strategy %s: %s", strategy.id, exc)

    return strategy_to_dto(
        strategy,
        current_signal=snapshot_dto,
        sparkline_90d=sparkline,
        report=report_dto,
    )


def _snapshot_to_dto(snap: SignalSnapshot | None) -> SignalSnapshotDTO | None:
    if snap is None:
        return None
    return SignalSnapshotDTO(
        date=snap.date,
        score=snap.score,
        total=snap.total,
        risk_on=snap.risk_on,
        results=[IndicatorResultDTO(**r) for r in snap.indicator_results],
    )


def build_strategy_dtos_bulk(
    db: Session, strategies: list[Strategy], fresh: bool = False
) -> list[StrategyDTO]:
    """Assemble many StrategyDTOs in one shot.

    Pre-fetches snapshots and AI reports for every strategy in two queries
    (instead of 2·N) and reads each parquet at most once via the in-memory
    cache. With fresh=False (the default) we serve the persisted snapshot
    from the daily refresh, which keeps the dashboard near-instant.
    Pass fresh=True to recompute live (slower; matches the old behaviour
    used on the strategy detail page).
    """
    if not strategies:
        return []

    ids = [s.id for s in strategies]
    snapshots = latest_snapshots_by_strategy_ids(db, ids)
    reports = ai_reports.reports_by_strategy_id(db, ids)
    ps = get_price_service()

    out: list[StrategyDTO] = []
    for s in strategies:
        snapshot_dto: SignalSnapshotDTO | None = None
        if fresh:
            try:
                snap = compute_snapshot(s)
                if snap is not None:
                    snapshot_dto = snapshot_to_dto(snap)
            except Exception as exc:
                logger.warning("Failed live snapshot for strategy %s: %s", s.id, exc)
        if snapshot_dto is None:
            snapshot_dto = _snapshot_to_dto(snapshots.get(s.id))

        sparkline: list[float] = []
        try:
            series = ps.get_recent_window(s.benchmark_ticker, days=130)
            sparkline = [float(x) for x in series.dropna().tolist()[-90:]]
        except Exception as exc:
            logger.warning("Failed sparkline for %s: %s", s.benchmark_ticker, exc)

        report_dto: StrategyReportDTO | None = None
        report_row = reports.get(s.id)
        if report_row is not None:
            try:
                report_dto = StrategyReportDTO.model_validate(report_row)
            except Exception as exc:
                logger.debug("Failed to load AI report for strategy %s: %s", s.id, exc)

        out.append(strategy_to_dto(
            s,
            current_signal=snapshot_dto,
            sparkline_90d=sparkline,
            report=report_dto,
        ))
    return out
