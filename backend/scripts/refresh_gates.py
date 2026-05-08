"""One-shot backfill: compute gates snapshots for one or all strategies.

Run via:
    python -m scripts.refresh_gates --all
    python -m scripts.refresh_gates --strategy-id 5

Idempotent; safe to re-run.
"""
from __future__ import annotations

import argparse
import logging

from sqlalchemy import select

from ai_swing.db import SessionLocal
from ai_swing.db.models import Strategy
from ai_swing.services import gates_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("refresh_gates")


def _refresh_one(db, strategy: Strategy) -> bool:
    try:
        snap = gates_service.refresh_gates(db, strategy)
        log.info(
            "Gates refreshed for %s (id=%s): asof=%s, total_pass=%s/4",
            strategy.name, strategy.id, snap.asof_date,
            sum(int(snap.payload[k]["pass_gate"])
                for k in ("g2_dsr", "g3_wf", "g6_bootstrap", "g7_xlib")),
        )
        return True
    except Exception as exc:
        log.exception("Failed for %s (id=%s): %s", strategy.name, strategy.id, exc)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Refresh every enabled strategy")
    group.add_argument("--strategy-id", type=int, help="Refresh a single strategy by id")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.all:
            strategies = db.scalars(select(Strategy).where(Strategy.enabled.is_(True))).all()
        else:
            strategy = db.get(Strategy, args.strategy_id)
            if strategy is None:
                log.error("Strategy id=%s not found", args.strategy_id)
                return
            strategies = [strategy]

        ok = 0
        for strategy in strategies:
            if _refresh_one(db, strategy):
                ok += 1
        log.info("Done: %s/%s strategies refreshed", ok, len(strategies))
    finally:
        db.close()


if __name__ == "__main__":
    main()
