// Shared ECharts equity-curve component
const EquityChart = ({ tokens, height = 320 }) => {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !window.echarts) return;
    const chart = window.echarts.init(ref.current, null, { renderer: 'svg' });
    chartRef.current = chart;
    const { EQ } = window.AISWING;
    chart.setOption({
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 48, right: 16, top: 28, bottom: 28 },
      legend: {
        data: ['Estratégia', 'Benchmark (B&H)', 'LETF (B&H)'],
        textStyle: { color: tokens.textSecondary, fontFamily: tokens.fontSans, fontSize: 11 },
        itemWidth: 18, itemHeight: 2, top: 0,
      },
      tooltip: {
        trigger: 'axis', backgroundColor: tokens.surfaceElevated, borderColor: tokens.border,
        textStyle: { color: tokens.textPrimary, fontFamily: tokens.fontMono, fontSize: 11 },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: tokens.border } },
        axisLabel: { color: tokens.textMuted, fontSize: 10, fontFamily: tokens.fontMono },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'log',
        axisLine: { show: false },
        axisLabel: { color: tokens.textMuted, fontSize: 10, fontFamily: tokens.fontMono },
        splitLine: { lineStyle: { color: tokens.borderSubtle, type: 'dashed' } },
      },
      series: [
        { name: 'Estratégia', type: 'line', data: EQ.stratArr, showSymbol: false, lineStyle: { width: 1.6, color: tokens.success }, smooth: false },
        { name: 'Benchmark (B&H)', type: 'line', data: EQ.benchArr, showSymbol: false, lineStyle: { width: 1.2, color: tokens.textMuted }, smooth: false },
        { name: 'LETF (B&H)', type: 'line', data: EQ.letfArr, showSymbol: false, lineStyle: { width: 1.2, color: tokens.info, type: 'dashed' }, smooth: false },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [tokens.success, tokens.info, tokens.border, tokens.textMuted]);

  return <div ref={ref} style={{ width: '100%', height }} />;
};

const RatioChart = ({ tokens, height = 320 }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.echarts) return;
    const chart = window.echarts.init(ref.current, null, { renderer: 'svg' });
    const { RATIO } = window.AISWING;
    chart.setOption({
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 48, right: 16, top: 12, bottom: 28 },
      tooltip: {
        trigger: 'axis', backgroundColor: tokens.surfaceElevated, borderColor: tokens.border,
        textStyle: { color: tokens.textPrimary, fontFamily: tokens.fontMono, fontSize: 11 },
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: tokens.border } },
        axisLabel: { color: tokens.textMuted, fontSize: 10, fontFamily: tokens.fontMono },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: tokens.textMuted, fontSize: 10, fontFamily: tokens.fontMono, formatter: '{value}×' },
        splitLine: { lineStyle: { color: tokens.borderSubtle, type: 'dashed' } },
      },
      series: [
        {
          name: 'Razão', type: 'line', data: RATIO, showSymbol: false,
          lineStyle: { width: 1.4, color: tokens.info },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: tokens.infoSoft },
                { offset: 1, color: 'transparent' },
              ],
            },
          },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 1.0, lineStyle: { color: tokens.textMuted, type: 'dashed', width: 1 }, label: { color: tokens.textMuted, formatter: 'paridade (1.0×)', fontSize: 10, fontFamily: tokens.fontMono } }],
          },
        },
      ],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [tokens.info, tokens.infoSoft, tokens.border]);
  return <div ref={ref} style={{ width: '100%', height }} />;
};

window.AISWING_CHARTS = { EquityChart, RatioChart };
