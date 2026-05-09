"""FastAPI application factory."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_swing.auth.security import get_current_user
from ai_swing.config import settings
from ai_swing.routers import (
    auth,
    backtest,
    chat,
    indicators,
    refresh,
    signals,
    strategies,
    transactions,
    weekly_digest,
)
from ai_swing.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(title="LETF Lab", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Public — auth endpoints handle their own session lifecycle.
    app.include_router(auth.router)

    # Everything else requires a valid session cookie.
    protected = [Depends(get_current_user)]
    app.include_router(indicators.router, dependencies=protected)
    app.include_router(strategies.router, dependencies=protected)
    app.include_router(signals.router, dependencies=protected)
    app.include_router(refresh.router, dependencies=protected)
    app.include_router(backtest.router, dependencies=protected)
    app.include_router(weekly_digest.router, dependencies=protected)
    # chat router consumes get_current_user directly (it needs the user id)
    app.include_router(chat.router)
    # transactions router consumes get_current_user directly (it needs the
    # user object, not just the auth check), so no global dep here.
    app.include_router(transactions.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
