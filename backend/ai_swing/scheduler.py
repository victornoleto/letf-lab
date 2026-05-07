"""APScheduler bootstrap. Daily refresh at REFRESH_HOUR_ET America/New_York."""
from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from ai_swing.config import settings
from ai_swing.db import SessionLocal
from ai_swing.services import weekly_digest
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


def _weekly_digest_job() -> None:
    logger.info("Weekly digest job starting")
    db = SessionLocal()
    try:
        digest = weekly_digest.generate_digest(db)
        if digest is None:
            logger.info("Weekly digest skipped (AI CLI not configured)")
        else:
            logger.info("Weekly digest persisted for week_start=%s", digest.week_start)
    except Exception as exc:
        logger.exception("Weekly digest raised: %s", exc)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="America/New_York")
    daily_trigger = CronTrigger(
        hour=settings.refresh_hour_et, minute=0, timezone="America/New_York"
    )
    _scheduler.add_job(
        _daily_refresh_job, daily_trigger, id="daily_refresh", replace_existing=True
    )
    # Weekly digest: every Monday at 09:00 ET, after the Sunday-night refresh
    # has already populated the latest snapshots.
    weekly_trigger = CronTrigger(
        day_of_week="mon", hour=9, minute=0, timezone="America/New_York"
    )
    _scheduler.add_job(
        _weekly_digest_job, weekly_trigger, id="weekly_digest", replace_existing=True
    )
    _scheduler.start()
    logger.info("Scheduler started; daily_refresh next run at %s; weekly_digest next run at %s",
                _scheduler.get_job("daily_refresh").next_run_time,
                _scheduler.get_job("weekly_digest").next_run_time)
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
