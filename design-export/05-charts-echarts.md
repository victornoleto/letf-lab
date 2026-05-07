# Charts (ECharts) — AI-Swing (Linear DNA)

> Usamos **ngx-echarts** (Apache ECharts wrapper Angular). Toda chart segue um único `themeOptions()`
> que lê os tokens via `getComputedStyle(document.documentElement)` — assim light/dark trocam sem reinit.

---

## 1 · Setup

```bash
npm i echarts ngx-echarts
```

```ts
// app.config.ts
import { provideEcharts } from 'ngx-echarts';

providers: [
  provideEcharts({ echarts: () => import('echarts') }),
]
```

```html
<!-- chart-host.component.html -->
<div echarts [options]="options" [theme]="null" class="chart" [style.height.px]="height"></div>
```

**Não use `theme` do echarts** — controle todas as cores via `getComputedStyle()` lendo `--chart-*`. Isso garante reuso 1:1 do dark/light tokens.

---

## 2 · Helpers compartilhados

```ts
// chart-tokens.ts — leia o CSS custom property atual
export function tok(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
}

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

Reler ao trocar tema: emitir um event no toggle (`document.dispatchEvent(new Event('themechange'))`) e cada chart faz `setOption()` com o snapshot novo.

---

## 3 · Equity curve (Detail page)

Linha simples, area gradient leve, sem markers, eixo Y compacto à direita, eixo X anos.

```ts
import type { EChartsOption } from 'echarts';

export function equityOptions(
  series: { date: string; equity: number; bench: number }[],
  t: ChartTokens
): EChartsOption {
  return {
    grid: { left: 8, right: 56, top: 8, bottom: 24, containLabel: true },
    animation: false,
    textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
    xAxis: {
      type: 'time',
      axisLine:  { lineStyle: { color: t.border } },
      axisTick:  { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10, hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tok('--surface-elevated'),
      borderColor: t.border,
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
      axisPointer: { lineStyle: { color: t.border, width: 1, type: 'solid' } },
    },
    legend: {
      top: 0, right: 0,
      itemWidth: 14, itemHeight: 2, itemGap: 16,
      textStyle: { color: t.textMuted, fontSize: 11, fontFamily: tok('--font-sans') },
    },
    series: [
      {
        name: 'Estratégia',
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { color: t.equity, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: t.equityFill },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
        },
        data: series.map(d => [d.date, d.equity]),
      },
      {
        name: 'Buy & Hold',
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { color: t.textMuted, width: 1, type: [4, 3] },
        data: series.map(d => [d.date, d.bench]),
      },
    ],
  };
}
```

**Princípios visuais:**
- Sem marker dots — linha pura, smooth=false (Linear não usa curvas).
- 1.5px na linha principal, 1px tracejada no benchmark.
- Area gradient soft (12% no topo → 0% no bottom).
- Y-axis à direita (deixa label próximo ao último ponto, padrão financeiro).
- Tooltip mono, sem shadow, border 1px.

---

## 4 · Ratio chart (entre risk-on e risk-off ticker)

Linha indigo (accent), referência 1.0 horizontal.

```ts
export function ratioOptions(
  series: { date: string; ratio: number }[],
  t: ChartTokens
): EChartsOption {
  return {
    grid: { left: 8, right: 56, top: 8, bottom: 24, containLabel: true },
    animation: false,
    textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tok('--surface-elevated'),
      borderColor: t.border, borderWidth: 1,
      textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
    },
    series: [
      {
        type: 'line',
        showSymbol: false,
        smooth: false,
        lineStyle: { color: t.ratio, width: 1.5 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: t.textMuted, type: [3, 3], width: 1 },
          data: [{ yAxis: 1.0, label: { show: false } }],
        },
        data: series.map(d => [d.date, d.ratio]),
      },
    ],
  };
}
```

---

## 5 · Sparkline (Strategy card)

**Não usar ECharts** pra sparklines — overkill. SVG inline 60×42 é mais barato e renderiza 5 cards × 5 sparklines sem sustos.

```ts
@Component({
  selector: 'app-sparkline',
  template: `
    <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" [attr.width]="w" [attr.height]="h" preserveAspectRatio="none">
      <path [attr.d]="fillPath" [attr.fill]="fill" stroke="none" />
      <path [attr.d]="linePath" [attr.stroke]="color" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `,
  styles: [`:host{display:block}svg{display:block}`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent {
  @Input() data: number[] = [];
  @Input() color = 'var(--success)';
  @Input() fill  = 'var(--success-soft)';
  @Input() w     = 240;
  @Input() h     = 42;

  get linePath() {
    if (!this.data.length) return '';
    const min = Math.min(...this.data), max = Math.max(...this.data);
    const span = max - min || 1;
    const step = this.w / (this.data.length - 1);
    return this.data.map((v, i) => {
      const x = i * step;
      const y = this.h - ((v - min) / span) * (this.h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }
  get fillPath() {
    return `${this.linePath} L${this.w},${this.h} L0,${this.h} Z`;
  }
}
```

**Cor por status:**
- `on`  → `var(--success)` / `var(--success-soft)`
- `off` → `var(--danger)`  / `var(--danger-soft)`
- `borderline` → `var(--warn)` / `var(--warn-soft)`

---

## 6 · Indicator distribution (Indicators page — opcional)

Histograma simples com `series.type: 'bar'`. Cor única `--accent`. Bar width fixo, sem gap entre bars.

```ts
export function distributionOptions(
  bins: { label: string; count: number }[],
  t: ChartTokens
): EChartsOption {
  return {
    grid: { left: 8, right: 8, top: 16, bottom: 24, containLabel: true },
    animation: false,
    textStyle: { fontFamily: t.fontMono, fontSize: 10, color: t.textMuted },
    xAxis: {
      type: 'category',
      data: bins.map(b => b.label),
      axisLine: { lineStyle: { color: t.border } },
      axisTick: { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.textMuted, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid, type: [3, 3] } },
    },
    series: [{
      type: 'bar',
      data: bins.map(b => b.count),
      itemStyle: { color: tok('--accent'), borderRadius: [2, 2, 0, 0] },
      barCategoryGap: '20%',
    }],
  };
}
```

---

## 7 · NÃO fazer

- ❌ Animação no load (`animation: false`). Linear DNA é instantâneo.
- ❌ Gradiente no fill da linha principal além do indigo→transparent ou success→transparent. Sem multi-stop colorido.
- ❌ Markers (símbolos circulares nos pontos). A linha já basta.
- ❌ Background no `grid`. Usar somente splitLines tracejadas.
- ❌ Shadow em tooltip. Border 1px é suficiente.
- ❌ Eixo Y com nome ("Equity %"). O contexto da page já diz isso.
- ❌ Misturar cores acima de 3. Equity / bench / ratio. Mais que isso vira bagunça.
