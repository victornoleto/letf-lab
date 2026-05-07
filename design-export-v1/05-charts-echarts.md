# 05 — Charts (ECharts)

> Token resolver compartilhado + 4 configs prontas. ECharts não consome CSS vars; resolvemos uma vez por tema e re-aplicamos quando o tema muda.

---

## Token resolver

`src/app/shared/charts/chart-tokens.ts`:

```ts
export interface ChartTokens {
  bg: string;
  text: string;
  textMuted: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipFg: string;
  series: {
    strategy: string;
    benchmark: string;
    leveraged: string;
    ratioPos: string;
    ratioNeg: string;
  };
  fontMono: string;
  fontSans: string;
}

const LIGHT: ChartTokens = {
  bg: 'transparent',
  text: '#1a1f36',
  textMuted: '#697386',
  grid: '#eef0f4',
  axis: '#697386',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e3e8ee',
  tooltipFg: '#1a1f36',
  series: {
    strategy: '#1f8e4d',
    benchmark: '#697386',
    leveraged: '#bb5504',
    ratioPos: '#3f6fd6',
    ratioNeg: '#cd3500',
  },
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  fontSans: "'IBM Plex Sans', system-ui, sans-serif",
};

const DARK: ChartTokens = {
  bg: 'transparent',
  text: '#f5f6f8',
  textMuted: '#7d828c',
  grid: '#16181e',
  axis: '#7d828c',
  tooltipBg: '#15171c',
  tooltipBorder: '#2c2f38',
  tooltipFg: '#f5f6f8',
  series: {
    strategy: '#3ddc84',
    benchmark: '#7d828c',
    leveraged: '#f5a524',
    ratioPos: '#7aa9ff',
    ratioNeg: '#ff5a4a',
  },
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  fontSans: "'IBM Plex Sans', system-ui, sans-serif",
};

export function getChartTokens(mode: 'light' | 'dark'): ChartTokens {
  return mode === 'dark' ? DARK : LIGHT;
}
```

### Hook to ThemeService

Each chart component subscribes to theme changes and re-applies options:

```ts
// inside an Angular chart component
private theme = inject(ThemeService);
private chart!: echarts.ECharts;

ngAfterViewInit() {
  this.chart = echarts.init(this.host.nativeElement);
  effect(() => {
    const tokens = getChartTokens(this.theme.effective());
    this.chart.setOption(this.buildOption(tokens));
  });
}
```

---

## Common base options

Use as starting point for every chart in the app:

```ts
import type { EChartsOption } from 'echarts';
import type { ChartTokens } from './chart-tokens';

export function baseOption(t: ChartTokens): Partial<EChartsOption> {
  return {
    backgroundColor: t.bg,
    textStyle: {
      fontFamily: t.fontSans,
      color: t.text,
    },
    grid: { left: 56, right: 16, top: 24, bottom: 36, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: t.tooltipFg, fontFamily: t.fontMono, fontSize: 12 },
      axisPointer: { lineStyle: { color: t.axis, type: 'dashed', width: 1 } },
      extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(60,66,87,0.08); border-radius: 8px;',
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: t.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: t.textMuted,
        fontFamily: t.fontMono,
        fontSize: 11,
        margin: 12,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: t.textMuted,
        fontFamily: t.fontMono,
        fontSize: 11,
        margin: 12,
      },
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
    },
    animation: true,
    animationDuration: 400,
    animationEasing: 'cubicOut',
  };
}
```

---

## Chart 1 — Sparkline (dashboard card)

90 dias, single series, sem eixos, sem tooltip persistente. Usado dentro de `strategy-card.ts`.

```ts
export function sparklineOption(t: ChartTokens, data: number[], state: 'on' | 'off' | 'borderline'): EChartsOption {
  const color = state === 'on' ? t.series.strategy : state === 'off' ? t.series.ratioNeg : '#bb5504';
  return {
    backgroundColor: 'transparent',
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false, boundaryGap: false },
    yAxis: { type: 'value', show: false, scale: true },
    tooltip: { show: false },
    series: [{
      type: 'line',
      data,
      smooth: 0.2,
      symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '33' },
            { offset: 1, color: color + '00' },
          ],
        },
      },
    }],
    animation: false,
  };
}
```

Dimensions: chart container `width: 100%; height: 56px;`.

---

## Chart 2 — Equity curves (Strategy Detail)

3 séries: strategy / benchmark / leveraged. Y-axis em base 1.0 (normalizado). Marca o ponto atual.

```ts
export function equityOption(
  t: ChartTokens,
  data: { time: string; strategy: number; benchmark: number; leveraged?: number }[],
): EChartsOption {
  const series: any[] = [
    {
      name: 'Strategy',
      type: 'line',
      data: data.map(d => [d.time, d.strategy]),
      smooth: 0.15,
      symbol: 'none',
      lineStyle: { color: t.series.strategy, width: 2 },
      z: 3,
    },
    {
      name: 'Benchmark',
      type: 'line',
      data: data.map(d => [d.time, d.benchmark]),
      smooth: 0.15,
      symbol: 'none',
      lineStyle: { color: t.series.benchmark, width: 1.5, type: 'dashed' },
      z: 2,
    },
  ];
  if (data.some(d => d.leveraged != null)) {
    series.push({
      name: 'Leveraged 2x',
      type: 'line',
      data: data.map(d => [d.time, d.leveraged]),
      smooth: 0.15,
      symbol: 'none',
      lineStyle: { color: t.series.leveraged, width: 1.5 },
      z: 1,
    });
  }

  return {
    ...baseOption(t),
    legend: {
      data: series.map(s => s.name),
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 4,
      itemGap: 16,
      textStyle: { color: t.textMuted, fontSize: 11, fontFamily: t.fontSans },
    },
    yAxis: {
      ...(baseOption(t).yAxis as any),
      axisLabel: {
        ...(baseOption(t).yAxis as any).axisLabel,
        formatter: (v: number) => v.toFixed(1) + '×',
      },
    },
    series,
  };
}
```

---

## Chart 3 — Ratio chart (Strategy / Benchmark)

Bar chart com cor condicional (azul positivo, vermelho negativo) — visualiza outperformance ao longo do tempo.

```ts
export function ratioOption(
  t: ChartTokens,
  data: { time: string; ratio: number }[], // ratio em pp (ex: +5.2 = +5.2 pp)
): EChartsOption {
  return {
    ...baseOption(t),
    grid: { ...(baseOption(t).grid as any), bottom: 28 },
    yAxis: {
      ...(baseOption(t).yAxis as any),
      axisLabel: {
        ...(baseOption(t).yAxis as any).axisLabel,
        formatter: (v: number) => (v > 0 ? '+' : '') + v.toFixed(0) + 'pp',
      },
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: [d.time, d.ratio],
        itemStyle: { color: d.ratio >= 0 ? t.series.ratioPos : t.series.ratioNeg },
      })),
      barWidth: '70%',
    }],
    markLine: {
      symbol: 'none',
      data: [{ yAxis: 0 }],
      lineStyle: { color: t.axis, type: 'solid', width: 1 },
      label: { show: false },
    } as any,
  };
}
```

---

## Chart 4 — Drawdown (Strategy Detail extra panel)

Area chart sempre negativo, vermelho preenchido.

```ts
export function drawdownOption(
  t: ChartTokens,
  data: { time: string; dd: number }[], // dd em % (sempre <= 0)
): EChartsOption {
  return {
    ...baseOption(t),
    yAxis: {
      ...(baseOption(t).yAxis as any),
      max: 0,
      axisLabel: {
        ...(baseOption(t).yAxis as any).axisLabel,
        formatter: (v: number) => v.toFixed(0) + '%',
      },
    },
    series: [{
      type: 'line',
      data: data.map(d => [d.time, d.dd]),
      smooth: 0.1,
      symbol: 'none',
      lineStyle: { color: t.series.ratioNeg, width: 1.2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: t.series.ratioNeg + '00' },
            { offset: 1, color: t.series.ratioNeg + '40' },
          ],
        },
      },
    }],
  };
}
```

---

## Chart 5 — Monthly returns heatmap (opcional)

Para futuro — heatmap month×year. Aqui só registra o color scale para consistência:

```ts
visualMap: {
  type: 'continuous',
  inRange: {
    color: [
      t.series.ratioNeg, // -10%
      t.tooltipBg,        // 0
      t.series.strategy,  // +10%
    ],
  },
  show: false,
}
```

---

## Datazoom (Strategy Detail)

Adicione apenas no equity chart e ratio chart, sincronizados via `connect`:

```ts
dataZoom: [
  {
    type: 'inside',
    start: 0,
    end: 100,
  },
  {
    type: 'slider',
    height: 20,
    bottom: 4,
    borderColor: t.grid,
    backgroundColor: 'transparent',
    fillerColor: t.series.benchmark + '20',
    handleSize: 14,
    handleStyle: { color: t.tooltipBg, borderColor: t.axis },
    moveHandleSize: 4,
    textStyle: { color: t.textMuted, fontSize: 10, fontFamily: t.fontMono },
  },
]
```

```ts
echarts.connect([equityChart, ratioChart]);
```

---

## Mandatory rules

1. **Nunca hardcode hex no series styling.** Sempre via `t.series.*`.
2. **Mono em todos axisLabels** com números. Sans em legendas.
3. **`tabular-nums` em tooltips** — adicionado via `extraCssText: 'font-feature-settings: "tnum";'` se for renderizar números na mesma coluna.
4. **`animation: false`** em sparklines (50+ instâncias na mesma página).
5. **Resize via ResizeObserver**, não window resize. ECharts:
   ```ts
   const ro = new ResizeObserver(() => this.chart.resize());
   ro.observe(this.host.nativeElement);
   ```
6. **Tema reativo.** Implemente `effect(() => chart.setOption(buildOption(getChartTokens(theme.effective()))))` em cada chart component. Sem isso, troca de tema deixa charts no esquema antigo.
