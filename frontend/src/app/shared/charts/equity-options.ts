import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';

export interface EquityPoint { date: string; equity: number; bench: number; }

export function equityOptions(series: EquityPoint[], t: ChartTokens): EChartsOption {
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
