from __future__ import annotations

import pytest
import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def client(monkeypatch, tmp_path):
    db_url = f"sqlite:///{tmp_path}/test.db"
    monkeypatch.setenv("DATABASE_URL", db_url)
    monkeypatch.setenv("PRICE_CACHE_DIR", str(tmp_path / "prices"))
    monkeypatch.setenv("ALLOW_ORIGINS", "http://localhost:4200")

    # Refresh settings + rebind engine
    from ai_swing import config as cfg

    cfg.settings = cfg.Settings()
    from ai_swing.db import base as db_base

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    db_base.engine = engine
    db_base.SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    db_base.Base.metadata.create_all(engine)

    # Disable scheduler in tests by stubbing start/stop
    from ai_swing import scheduler as sched

    monkeypatch.setattr(sched, "start_scheduler", lambda: None)
    monkeypatch.setattr(sched, "stop_scheduler", lambda: None)

    from ai_swing.main import create_app
    from ai_swing.auth.security import get_current_user
    from ai_swing.db.models import User

    app = create_app()
    # Tests don't exercise auth itself — override the dependency so protected
    # routers behave as if a valid session were present.
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, email="test@example.com", password_hash="x", is_active=True
    )
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_indicator_types(client):
    r = client.get("/api/indicators/types")
    assert r.status_code == 200
    types = r.json()
    assert {t["type"] for t in types} == {"SMA_GATE", "EMA_GATE", "VOL_GATE", "AR1_GATE"}


def test_indicator_crud(client):
    # Create
    r = client.post(
        "/api/indicators",
        json={"name": "SMA200", "type": "SMA_GATE", "params": {"period": 200}},
    )
    assert r.status_code == 201, r.text
    ind = r.json()
    assert ind["name"] == "SMA200"
    assert ind["params"]["period"] == 200

    # List
    r = client.get("/api/indicators")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Update
    r = client.put(f"/api/indicators/{ind['id']}", json={"params": {"period": 100}})
    assert r.status_code == 200
    assert r.json()["params"]["period"] == 100

    # Duplicate name
    r = client.post(
        "/api/indicators",
        json={"name": "SMA200", "type": "SMA_GATE", "params": {"period": 50}},
    )
    assert r.status_code == 409

    # Delete
    r = client.delete(f"/api/indicators/{ind['id']}")
    assert r.status_code == 204


def test_strategy_creation_with_indicators(client):
    r = client.post(
        "/api/indicators",
        json={"name": "SMA50", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    r = client.post(
        "/api/strategies",
        json={
            "name": "test",
            "benchmark_ticker": "qqq",
            "risk_on_tickers": ["tqqq"],
            "risk_off_ticker": "zroz",
            "k_threshold": 1,
            "indicator_ids": [ind_id],
        },
    )
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["benchmark_ticker"] == "QQQ"
    assert len(s["indicators"]) == 1


def test_strategy_k_threshold_validation(client):
    r = client.post(
        "/api/indicators",
        json={"name": "x", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    r = client.post(
        "/api/strategies",
        json={
            "name": "bad",
            "benchmark_ticker": "qqq",
            "risk_on_tickers": ["tqqq"],
            "risk_off_ticker": "zroz",
            "k_threshold": 5,
            "indicator_ids": [ind_id],
        },
    )
    assert r.status_code == 400


def test_strategy_clone_copies_indicators_and_picks_unique_name(client):
    r = client.post(
        "/api/indicators",
        json={"name": "SMA50", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    r = client.post(
        "/api/strategies",
        json={
            "name": "qqq vote-2",
            "benchmark_ticker": "qqq",
            "risk_on_tickers": ["tqqq"],
            "risk_off_ticker": "zroz",
            "k_threshold": 1,
            "indicator_ids": [ind_id],
        },
    )
    src_id = r.json()["id"]

    # First clone
    r = client.post(f"/api/strategies/{src_id}/clone")
    assert r.status_code == 201, r.text
    clone = r.json()
    assert clone["id"] != src_id
    assert clone["name"] == "qqq vote-2 (clone)"
    assert clone["benchmark_ticker"] == "QQQ"
    assert clone["risk_on_tickers"] == ["TQQQ"]
    assert clone["k_threshold"] == 1
    assert [i["id"] for i in clone["indicators"]] == [ind_id]

    # Second clone disambiguates the name
    r = client.post(f"/api/strategies/{src_id}/clone")
    assert r.status_code == 201
    assert r.json()["name"] == "qqq vote-2 (clone 2)"


def test_strategy_clone_unknown_id_returns_404(client):
    r = client.post("/api/strategies/9999/clone")
    assert r.status_code == 404


def test_indicator_in_use_blocks_delete(client):
    r = client.post(
        "/api/indicators",
        json={"name": "x", "type": "SMA_GATE", "params": {"period": 50}},
    )
    ind_id = r.json()["id"]

    client.post(
        "/api/strategies",
        json={
            "name": "s",
            "benchmark_ticker": "qqq",
            "risk_on_tickers": ["tqqq"],
            "risk_off_ticker": "zroz",
            "k_threshold": 1,
            "indicator_ids": [ind_id],
        },
    )

    r = client.delete(f"/api/indicators/{ind_id}")
    assert r.status_code == 409


def test_transaction_creation_accepts_lowercase_enum_value(client):
    r = client.post(
        "/api/transactions",
        json={
            "date": "2026-05-08",
            "asset_ticker": "tqqq",
            "side": "buy",
            "n_shares": 0.28613941,
            "price_per_share": 174.74,
            "currency": "USD",
            "fx_rate_to_usd": 1,
            "fees": 0,
            "notes": None,
        },
    )

    assert r.status_code == 201, r.text
    body = r.json()
    assert body["asset_ticker"] == "TQQQ"
    assert body["side"] == "buy"
    assert body["n_shares"] == "0.28613941"


def test_portfolio_history_compares_with_default_benchmark(client, monkeypatch):
    class FakePrices:
        def get_close_series(self, ticker):
            idx = pd.to_datetime(["2026-05-08", "2026-05-11"])
            data = {
                "TQQQ": [100.0, 110.0],
                "SPY": [50.0, 55.0],
            }
            return pd.Series(data[ticker], index=idx, name=ticker)

    import ai_swing.services.portfolio as portfolio_service

    monkeypatch.setattr(portfolio_service, "get_price_service", lambda: FakePrices())

    client.post(
        "/api/transactions",
        json={
            "date": "2026-05-08",
            "asset_ticker": "tqqq",
            "side": "buy",
            "n_shares": 2,
            "price_per_share": 100,
            "currency": "USD",
            "fx_rate_to_usd": 1,
            "fees": 0,
        },
    )

    r = client.get("/api/portfolio/history")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["benchmark_ticker"] == "SPY"
    assert body["points"][-1] == {
        "date": "2026-05-11",
        "portfolio_value_usd": 220.0,
        "benchmark_value_usd": 220.0,
    }
