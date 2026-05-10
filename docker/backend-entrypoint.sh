#!/bin/sh
set -eu

python - <<'PY'
import os
import time

from sqlalchemy import create_engine, text

database_url = os.environ.get("DATABASE_URL", "")
if not database_url.startswith("postgresql"):
    raise SystemExit(0)

deadline = time.time() + int(os.environ.get("DB_WAIT_TIMEOUT_S", "60"))
last_error = None

while time.time() < deadline:
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        raise SystemExit(0)
    except Exception as exc:
        last_error = exc
        time.sleep(1)

raise SystemExit(f"Database is not ready: {last_error}")
PY

alembic upgrade head

if [ "${RUN_SEED:-true}" = "true" ]; then
  python -m scripts.seed
fi

exec "$@"
