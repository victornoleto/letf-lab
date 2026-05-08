# Indicators

Indicators define the gates that vote on whether a strategy should be risk-on.

## Supported Types

- `SMA_GATE`: price above simple moving average.
- `EMA_GATE`: price above exponential moving average.
- `VOL_GATE`: realized volatility below threshold.
- `AR1_GATE`: autocorrelation/momentum regime above threshold.

## Purpose

- Maintain a closed catalog of reusable signal components.
- Avoid free-form strategy logic until there is a clear need.

## Main Data

- `GET /api/indicators`
- `GET /api/indicators/types`
- `POST /api/indicators`
- `PUT /api/indicators/{id}`
- `DELETE /api/indicators/{id}`

## UX Notes

- Indicator forms are schema-driven by type.
- Indicators in use by strategies should not be deleted accidentally.
