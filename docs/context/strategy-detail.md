# Strategy Detail

Strategy Detail is the main decision screen.

## Purpose

- Explain what the strategy is doing now.
- Show historical performance and risk.
- Validate whether the strategy has benchmark-relative robustness.
- Inspect indicator behavior and signal history.

## Current Layout

1. Header and meta bar: tickers, current signal state, score, and edit action.
2. AI report card when a report exists.
3. Main tab with backtest, signal history, Benchmark Edge Windows, Validation Snapshot, and Cohort Entry.
4. Indicators tab with per-indicator time series.

## Important Cards

- Backtest Panel: gross/net performance, benchmark, risk-on buy-and-hold, metrics, and tax drag.
- Benchmark Edge Windows: rolling windows for `% above benchmark` and final `equity / benchmark`.
- Validation Snapshot: informational view of statistical and robustness gates.
- Cohort Entry: curated historical start dates and forward outcomes.
- Signal History: daily score and risk-on/risk-off decisions.

## UX Notes

- This screen should not become a generic analytics dump.
- Prefer benchmark-relative language over absolute performance language.
- Keep validation explanations explicit enough to prevent false confidence.
