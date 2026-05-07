"""APScheduler bootstrap. Daily refresh at REFRESH_HOUR_ET America/New_York."""
from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from ai_swing.config import settings
from ai_swing.db import SessionLocal
from ai_swing.services.refresh_service import get_refresh_service

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _daily_refresh_job() -> None:
    logger.info("Daily refresh job starting")
    db = SessionLocal()
    try:
        log = get_refresh_service().refresh_all(db, force=True)
        logger.info(
            "Daily refresh done: status=%s strategies=%s transitions=%s",
            log.status,
            log.n_strategies,
            log.n_transitions,
        )
    except Exception as exc:
        logger.exception("Daily refresh raised: %s", exc)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="America/New_York")
    trigger = CronTrigger(hour=settings.refresh_hour_et, minute=0, timezone="America/New_York")
    _scheduler.add_job(_daily_refresh_job, trigger, id="daily_refresh", replace_existing=True)
    _scheduler.start()
    logger.info("Scheduler started; daily_refresh next run at %s",
                _scheduler.get_job("daily_refresh").next_run_time)
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
