# Data and Storage

LETF Lab uses relational storage plus local parquet price cache.

## Database

PostgreSQL is recommended for production. SQLite remains useful for quick local development.

Important tables include:

- indicators
- strategies
- strategy_indicators
- signal_snapshots
- signal_transitions
- backtest_cache
- refresh_logs
- users
- transactions
- strategy_reports
- strategy_gates_snapshots
- weekly_digests

## Price Cache

Price data is cached as parquet files in `PRICE_CACHE_DIR`, defaulting to `../data/prices` from the backend directory.

Caches with too few rows are treated as stale/unprimed and can be re-fetched.

## Migrations

Alembic manages schema changes.

```bash
cd backend
../backend/.venv/bin/alembic upgrade head
```

## Backup Notes

For production, back up both:

- PostgreSQL database
- price cache directory, if you want faster recovery without re-downloading prices
