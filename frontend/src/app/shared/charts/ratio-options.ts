import type { EChartsOption } from 'echarts';
import { tok, type ChartTokens } from './chart-tokens';

export interface RatioPoint { date: string; ratio: number; }

export function ratioOptions(series: RatioPoint[], t: ChartTokens): EChartsOption {
  return {
    grid: { left: 4, right: 8, top: 8, bottom: 48, containLabel: true },
    animation: false,
    textStyle: { fontFamily: t.fontMono, fontSize: 11, color: t.textMuted },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      lineStyle: { color: t.border, width: 1 },
    },
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
      scale: true,
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
        handleStyle: { color: t.ratio, borderColor: t.ratio },
        moveHandleStyle: { color: t.border },
        textStyle: { color: t.textMuted, fontSize: 10 },
        labelFormatter: (_v, str) => (str ? str.slice(0, 7) : ''),
      },
    ],
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
