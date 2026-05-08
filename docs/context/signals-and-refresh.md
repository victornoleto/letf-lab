# Signals and Refresh

Signals are daily snapshots of each strategy's indicator votes and risk-on/risk-off state.

## Refresh Flow

1. Fetch recent prices for all tickers used by enabled strategies.
2. Compute today's indicator results and strategy snapshot.
3. Upsert signal snapshots.
4. Detect signal transitions.
5. Refresh validation gates.
6. Generate AI reports when AI is configured.

## Scheduler

The FastAPI app starts an APScheduler background scheduler:

- Daily refresh: `REFRESH_HOUR_ET` in America/New_York.
- Weekly digest: Monday 09:00 ET.

## Manual Endpoints

- `POST /api/refresh?force=false`
- `GET /api/refresh/status`

## UX Notes

- Refresh failures should be visible but should not corrupt existing snapshots.
- Gate refresh failures are non-fatal to the daily refresh.
