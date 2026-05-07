# Task 004 (v2) — Chart tokens helper + ECharts option helpers (Linear DNA)

**Goal:** Replace the previous `chart-tokens.ts` (typed light/dark constants with `getChartTokens(mode)`) with the new design's `readChartTokens()` that reads CSS custom properties at call-time. Add the canonical option-builders: `equityOptions(...)`, `ratioOptions(...)`, `drawdownOptions(...)` per the new specs. Also expose a small helper `tok(name)` for ad-hoc consumers.

After this task the chart utilities exist but consumer components (sparkline, backtest-panel) still use the old API. Tasks 008/009 swap them over.

## Pre-conditions

- Tasks 001-003 done.
- New tokens.scss has `--chart-grid`, `--chart-axis`, `--chart-equity`, `--chart-equity-fill`, `--chart-ratio` (Linear) — NOT the old `--chart-strategy`, `--chart-benchmark`, `--chart-leveraged`, `--chart-tooltip-*`.
- `ThemeService.resolved()` exists and `themechange` event fires.

## Sources

1. `design-export/05-charts-echarts.md` — entire file
2. `design-export/06-theme-toggle.md` §5 — chart re-render pattern via `themechange` listener

## Files to modify

### Replace `frontend/src/app/shared/charts/chart-tokens.ts`

```ts
// chart-tokens.ts — Linear DNA
// Reads CSS custom properties at call-time. Re-call after every 'themechange' event.

export interface ChartTokens {
  textPrimary: string;
  textMuted:   string;
  border:      string;
  grid:        string;
  axis:        string;
  equity:      string;
  equityFill:  string;
  ratio:       string;
  fontMono:    string;
}

export function tok(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
}

export function readChartTokens(): ChartTokens {
  return {
    textPrimary: tok('--text-primary'),
    textMuted:   tok('--text-muted'),
    border:      tok('--border'),
    grid:        tok('--chart-grid'),
    axis:        tok('--chart-axis'),
    equity:      tok('--chart-equity'),
    equityFill:  tok('--chart-equity-fill'),
    ratio:       tok('--chart-ratio'),
    fontMono:    tok('--font-mono').replace(/['"]/g, '') || 'JetBrains Mono',
  };
}
```

### New file `frontend/src/app/shared/charts/equity-options.ts`

Exact `equityOptions()` function from `05-charts-echarts.md` §3:

```ts
import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';

export interface EquityPoint { date: string; equity: number; bench: number; }

export function equityOptions(series: EquityPoint[], t: ChartTokens): EChartsOption {
  // ... (copy verbatim from §3) ...
}
```

(Copy the full `equityOptions` body from `05-charts-echarts.md` §3 — DO NOT rewrite it.)

### New file `frontend/src/app/shared/charts/ratio-options.ts`

```ts
import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';

export interface RatioPoint { date: string; ratio: number; }

export function ratioOptions(series: RatioPoint[], t: ChartTokens): EChartsOption {
  // ... (copy verbatim from 05-charts-echarts.md §4) ...
}
```

### New file `frontend/src/app/shared/charts/drawdown-options.ts` (optional, future-use)

If `drawdownOptions` is in `05-charts-echarts.md`, copy. If not, skip — only equity + ratio are needed for the Strategy Detail page.

### Convenience barrel `frontend/src/app/shared/charts/index.ts` (optional)

```ts
export * from './chart-tokens';
export * from './equity-options';
export * from './ratio-options';
```

Lets consumers import as `import { readChartTokens, equityOptions, ratioOptions } from '../shared/charts';`.

## What NOT to modify

- `sparkline.ts` — task 008 replaces it with the SVG component
- `backtest-panel.ts` — task 009 swaps to the new option helpers

These two files currently call `getChartTokens(mode)`. Leaving them broken-but-compiling is acceptable IF the build still passes. To keep the build green:

1. Either: leave the OLD `getChartTokens` function as a thin shim in `chart-tokens.ts` that returns a partially-shaped object satisfying current callers, with a `@deprecated` JSDoc — to be removed in tasks 008/009.

   ```ts
   /** @deprecated use readChartTokens() — removed once components migrate */
   export function getChartTokens(_mode: 'light' | 'dark') {
     return {
       series: { strategy: tok('--chart-equity'), benchmark: tok('--chart-axis'),
                 leveraged: tok('--chart-equity'), ratioPos: tok('--chart-ratio'),
                 ratioNeg: tok('--danger') },
       fontSans: tok('--font-sans').replace(/['"]/g, '') || 'Inter',
       fontMono: tok('--font-mono').replace(/['"]/g, '') || 'JetBrains Mono',
       text: tok('--text-primary'),
       textMuted: tok('--text-muted'),
       grid: tok('--chart-grid'),
       axis: tok('--chart-axis'),
       tooltipBg: tok('--surface-elevated'),
       tooltipBorder: tok('--border'),
       tooltipFg: tok('--text-primary'),
       bg: 'transparent',
     };
   }
   ```

2. Or: do this task strictly and trust tasks 008/009 to fix the breakage. **Choose option 1** for safety: build never breaks midway.

## Verification

```bash
cd /var/www/pessoal/ai-swing/frontend
npx ng build --configuration=development
```

Build passes. New files exist:
```bash
ls /var/www/pessoal/ai-swing/frontend/src/app/shared/charts/equity-options.ts
ls /var/www/pessoal/ai-swing/frontend/src/app/shared/charts/ratio-options.ts
```

Smoke test (in dev tools console after the app boots):
```js
const t = (await import('/<dynamic chunk>/chart-tokens')).readChartTokens();
console.log(t.equity); // should print the resolved hex of --chart-equity
```

## Definition of done

1. `chart-tokens.ts` exports `tok`, `readChartTokens`, and a deprecated `getChartTokens` shim.
2. `equity-options.ts` and `ratio-options.ts` exist with the exact functions from the spec.
3. Build passes.
4. Print `TASK DONE: task-004-chart-tokens-and-options.md` at end.
