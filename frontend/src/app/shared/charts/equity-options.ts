import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';
import { axisTooltipFormatter } from './tooltip-formatter';

export interface EquityPoint { date: string; equity: number; bench: number; }

/**
 * Equity curve options. The `axisPointerLink` group ID lets external code
 * call echarts.connect(group) to sync the axis pointer (and zoom) between
 * separate chart instances rendered on the same page.
 */
export function equityOptions(series: EquityPoint[], t: ChartTokens): EChartsOption {
  return {
    // top:28 reserves a row above the plot for the legend (Estratégia /
    // Buy & Hold). Without it the topmost y-axis label collides with the
    // legend text in the top-right corner — visible as overlapping glyphs.
    grid: { left: 4, right: 8, top: 28, bottom: 48, containLabel: true },
    animation: false,
    textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      lineStyle: { color: t.border, width: 1 },
    },
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
      scale: true,
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
      padding: [10, 12],
      textStyle: { color: t.textPrimary, fontSize: 12, fontFamily: t.fontMono },
      axisPointer: { lineStyle: { color: t.border, width: 1, type: 'solid' } },
      formatter: axisTooltipFormatter(),
    },
    legend: {
      // Anchored left so it sits right under the chart's HTML caption.
      top: 0, left: 0,
      itemWidth: 14, itemHeight: 2, itemGap: 16,
      textStyle: { color: t.textMuted, fontSize: 11, fontFamily: tok('--font-sans') },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 18,
        bottom: 4,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fillerColor: tok('--surface-muted'),
        handleSize: '70%',
        handleStyle: { color: t.equity, borderColor: t.equity },
        moveHandleStyle: { color: t.border },
        textStyle: { color: t.textMuted, fontSize: 10 },
        labelFormatter: (_v, str) => (str ? str.slice(0, 7) : ''),
      },
    ],
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
