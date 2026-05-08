# Validation and Robustness

Validation focuses on whether a LETF strategy has durable edge against its benchmark.

## Benchmark Edge Windows

This card uses rolling windows across `3/5/10/15/20` years with monthly entry dates.

It renders two heatmaps:

- `% above benchmark`: percentage of days inside the window where normalized strategy equity is above normalized benchmark equity.
- `Equity / benchmark final`: final normalized strategy equity divided by final normalized benchmark equity.

Color rules:

- `% above benchmark`: red below `30%`, yellow from `30%` to `70%`, blue above `70%`.
- Final edge: red below `1x`; yellow-to-blue from `1x` up to the best observed ratio.

## Validation Snapshot

The card is informational and does not display a deploy score.

It includes:

- `G2 - Confidence`: statistical confidence, currently PSR fallback when there is only one tested configuration.
- `G3 - Window validation`: pass count across chronological windows.
- `G6 - Bootstrap robustness`: block bootstrap Sortino lower confidence bound.
- `G7 - Calculation consistency`: independent CAGR implementation check.
- `OOS + forward post-2020`: Sortino positive in the last 30% of history and after 2020-01-01.

## DSR Note

Full DSR needs the real number of candidate configurations/tests. With one app-defined configuration, the calculation is better described as PSR fallback, not complete DSR.

## Cohort Entry

Cohort Entry evaluates curated historical launch dates and reports:

- CAGR
- Sortino
- Max drawdown
- Final Edge (`equity / benchmark_equity`)
- Number and duration of episodes where strategy equity trailed benchmark equity
