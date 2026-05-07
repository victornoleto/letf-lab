import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';

export interface RatioPoint { date: string; ratio: number; }

export function ratioOptions(series: RatioPoint[], t: ChartTokens): EChartsOption {
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
