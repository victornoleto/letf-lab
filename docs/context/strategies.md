# Strategies

The Strategies page manages LETF rotation definitions.

## Purpose

- List all strategies.
- Create, edit, clone, and delete strategies.
- Attach indicators and set the vote threshold (`k_threshold`).

## Strategy Model

- Benchmark ticker: the baseline to beat, such as `QQQ` or `SPY`.
- Risk-on ticker: usually a leveraged ETF, such as `TQQQ`, `UPRO`, `SOXL`, or `TECL`.
- Risk-off ticker: defensive asset, such as `ZROZ`, `TLT`, `IEF`, or cash-like alternatives.
- Indicators: gates that vote for risk-on or risk-off.
- `k_threshold`: minimum number of risk-on votes required.

## Main Data

- `GET /api/strategies`
- `POST /api/strategies`
- `PUT /api/strategies/{id}`
- `DELETE /api/strategies/{id}`
- `POST /api/strategies/{id}/clone`

## UX Notes

- Cloning exists to test strategy variants without rebuilding from scratch.
- Strategy comparison was intentionally removed; future comparison flows should be redesigned from first principles.
