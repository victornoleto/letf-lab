# Dashboard

The dashboard is the landing page after login.

## Purpose

- Show the current state of all enabled strategies.
- Surface recent signal state, score, tickers, sparkline, and AI summary when available.
- Provide quick navigation to strategy details.

## Main Data

- `GET /api/strategies`
- `GET /api/signals/transitions/recent`

## UX Notes

- Strategy cards should stay compact and scannable.
- The dashboard should answer: which strategies are risk-on, risk-off, or borderline today?
- Detailed validation belongs in Strategy Detail, not here.
