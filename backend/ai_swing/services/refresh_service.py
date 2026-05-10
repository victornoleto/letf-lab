"""Refresh service: fetch new prices, compute snapshots, detect transitions."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ai_swing.data import get_price_service
from ai_swing.db.models import (
    RefreshLog,
    SignalSnapshot,
    SignalTransition,
    Strategy,
    StrategyIndicator,
)
from ai_swing.services import ai_reports, gates_service
from ai_swing.services.signal_service import (
    compute_snapshot,
    serialize_results_for_storage,
)
from ai_swing.services.strategy_service import latest_snapshot, list_strategies

logger = logging.getLogger(__name__)

_DEBOUNCE_SECONDS = 300  # 5 min


class RefreshService:
    def __init__(self) -> None:
        self._last_run_started: datetime | None = None

    def can_run_now(self) -> tuple[bool, int]:
        """Returns (allowed, seconds_until_next_allowed)."""
        if self._last_run_started is None:
            return True, 0
        elapsed = (datetime.now(timezone.utc) - self._last_run_started).total_seconds()
        if elapsed >= _DEBOUNCE_SECONDS:
            return True, 0
        return False, int(_DEBOUNCE_SECONDS - elapsed)

    def refresh_all(self, db: Session, force: bool = False) -> RefreshLog:
        ok, wait = self.can_run_now()
        if not ok and not force:
            raise RuntimeError(f"Refresh debounced; try again in {wait}s")

        log = RefreshLog(started_at=datetime.now(timezone.utc), status="running")
        db.add(log)
        db.commit()
        db.refresh(log)
        self._last_run_started = log.started_at

        n_strategies = 0
        n_transitions = 0
        try:
            strategies = list_strategies(db, enabled_only=True)
            tickers = self._collect_tickers(strategies)
            ps = get_price_service()
            for ticker in sorted(tickers):
                try:
                    ps.refresh(ticker, days=30)
                except Exception as exc:
                    logger.warning("Failed to refresh prices for %s: %s", ticker, exc)

            for strategy in strategies:
                try:
                    transitioned = self._refresh_strategy_snapshot(db, strategy)
                    n_strategies += 1
                    if transitioned:
                        n_transitions += 1
                except Exception as exc:
                    logger.exception("Failed snapshot for strategy %s: %s", strategy.name, exc)

                # Gates run after the signal snapshot so they see today's curves.
                # Failures are non-fatal so one bad bootstrap does not abort refresh.
                try:
                    gates_service.refresh_gates(db, strategy)
                except Exception as exc:
                    logger.exception("Gates refresh failed for %s: %s", strategy.name, exc)

            # AI reports run after the snapshots so they see today's state.
            # Failures are non-fatal — refresh stays "ok" even if the API
            # is offline or the key is missing.
            try:
                db.commit()
                for strategy in strategies:
                    try:
                        ai_reports.generate_report(db, strategy)
                    except Exception as exc:
                        logger.warning("AI report failed for %s: %s", strategy.name, exc)
                db.commit()
            except Exception as exc:
                logger.warning("AI report batch failed: %s", exc)

            log.finished_at = datetime.now(timezone.utc)
            log.status = "ok"
            log.n_strategies = n_strategies
            log.n_transitions = n_transitions
        except Exception as exc:
            log.finished_at = datetime.now(timezone.utc)
            log.status = "error"
            log.error = str(exc)[:1900]
            logger.exception("Refresh failed: %s", exc)

        db.commit()
        db.refresh(log)
        return log

    def latest_log(self, db: Session) -> RefreshLog | None:
        stmt = select(RefreshLog).order_by(RefreshLog.started_at.desc()).limit(1)
        return db.scalars(stmt).first()

    def _collect_tickers(self, strategies: list[Strategy]) -> set[str]:
        out: set[str] = set()
        for s in strategies:
            out.update([s.benchmark_ticker, s.risk_off_ticker])
            out.update(s.risk_on_tickers)
        return out

    def _refresh_strategy_snapshot(self, db: Session, strategy: Strategy) -> bool:
        """Compute today's snapshot, upsert, detect transition. Returns True if flipped."""
        snap = compute_snapshot(strategy)
        if snap is None:
            return False

        prev = latest_snapshot(db, strategy.id)
        # Upsert by (strategy_id, date)
        existing = db.scalars(
            select(SignalSnapshot).where(
                SignalSnapshot.strategy_id == strategy.id,
                SignalSnapshot.date == snap.date,
            )
        ).first()
        if existing is None:
            db.add(
                SignalSnapshot(
                    strategy_id=strategy.id,
                    date=snap.date,
                    indicator_results=serialize_results_for_storage(snap.results),
                    score=snap.score,
                    total=snap.total,
                    risk_on=snap.risk_on,
                )
            )
        else:
            existing.indicator_results = serialize_results_for_storage(snap.results)
            existing.score = snap.score
            existing.total = snap.total
            existing.risk_on = snap.risk_on

        flipped = False
        if prev is not None and prev.date != snap.date and prev.risk_on != snap.risk_on:
            db.add(
                SignalTransition(
                    strategy_id=strategy.id,
                    date=snap.date,
                    from_state=prev.risk_on,
                    to_state=snap.risk_on,
                    score=snap.score,
                    total=snap.total,
                )
            )
            flipped = True

        db.flush()
        return flipped


_singleton: RefreshService | None = None


def get_refresh_service() -> RefreshService:
    global _singleton
    if _singleton is None:
        _singleton = RefreshService()
    return _singleton
