// Shared mock data for all variations
const STRATEGIES = [
  {
    id: 1, name: 'QQQ → TQQQ vote-of-2', benchmark: 'QQQ', riskOn: 'TQQQ', riskOff: 'ZROZ',
    status: 'on', score: 4, k: 2, n: 4,
    indicators: [
      { name: 'SMA200', pass: true,  detail: 'price 694.86 > SMA200 604.71' },
      { name: 'SMA50',  pass: true,  detail: 'price 694.86 > SMA50 617.01' },
      { name: 'Vol21d<40%', pass: true, detail: 'vol21d 15.8% < 40%' },
      { name: 'AR(1)_30d>0', pass: true, detail: 'AR(1)_30d +0.115 > +0.00' },
    ],
    spark: generateSpark(56, 0.6, 1.0, 0.12),
    metrics: { cagr: 44.79, maxdd: -73.96, sharpe: 0.95, trades: 67, hit: 98.13 },
    bench:   { cagr: 21.56, maxdd: -35.12, sharpe: 0.99 },
    letf:    { cagr: 44.13, maxdd: -81.66, sharpe: 0.89 },
  },
  {
    id: 2, name: 'SPY → UPRO vote-of-2', benchmark: 'SPY', riskOn: 'UPRO', riskOff: 'ZROZ',
    status: 'on', score: 4, k: 2, n: 4,
    indicators: [
      { name: 'SMA200', pass: true, detail: 'price 733.89 > SMA200 669.47' },
      { name: 'SMA50',  pass: true, detail: 'price 733.89 > SMA50 681.92' },
      { name: 'Vol21d<40%', pass: true, detail: 'vol21d 12.4% < 40%' },
      { name: 'AR(1)_30d>0', pass: true, detail: 'AR(1)_30d +0.128 > +0.00' },
    ],
    spark: generateSpark(57, 0.65, 1.0, 0.10),
    metrics: { cagr: 28.4, maxdd: -41.2, sharpe: 1.02, trades: 54, hit: 91.4 },
    bench:   { cagr: 12.8, maxdd: -25.4, sharpe: 0.91 },
    letf:    { cagr: 26.9, maxdd: -68.2, sharpe: 0.84 },
  },
  {
    id: 3, name: 'SMH → SOXL vote-of-2', benchmark: 'SMH', riskOn: 'SOXL', riskOff: 'ZROZ',
    status: 'on', score: 4, k: 2, n: 4,
    indicators: [
      { name: 'SMA200', pass: true, detail: 'price 547.85 > SMA200 365.68' },
      { name: 'SMA50',  pass: true, detail: 'price 547.85 > SMA50 429.15' },
      { name: 'Vol21d<40%', pass: true, detail: 'vol21d 32.0% < 40%' },
      { name: 'AR(1)_30d>0', pass: true, detail: 'AR(1)_30d +0.099 > +0.00' },
    ],
    spark: generateSpark(58, 0.55, 1.0, 0.18),
    metrics: { cagr: 52.1, maxdd: -78.4, sharpe: 0.91, trades: 71, hit: 96.2 },
    bench:   { cagr: 24.3, maxdd: -42.1, sharpe: 0.95 },
    letf:    { cagr: 51.0, maxdd: -85.1, sharpe: 0.86 },
  },
  {
    id: 4, name: 'MU → MUU vote-of-2', benchmark: 'MU', riskOn: 'MUU', riskOff: 'ZROZ',
    status: 'borderline', score: 3, k: 2, n: 4,
    indicators: [
      { name: 'SMA200', pass: true,  detail: 'price 659.44 > SMA200 284.54' },
      { name: 'SMA50',  pass: true,  detail: 'price 659.44 > SMA50 437.76' },
      { name: 'Vol21d<40%', pass: false, detail: 'vol21d 65.1% >= 40%' },
      { name: 'AR(1)_30d>0', pass: true,  detail: 'AR(1)_30d +0.040 > +0.00' },
    ],
    spark: generateSpark(59, 0.5, 1.0, 0.22),
    metrics: { cagr: 38.2, maxdd: -82.4, sharpe: 0.81, trades: 49, hit: 88.7 },
    bench:   { cagr: 18.4, maxdd: -52.1, sharpe: 0.72 },
    letf:    { cagr: 36.1, maxdd: -89.3, sharpe: 0.78 },
  },
  {
    id: 5, name: 'FTEC → TECL vote-of-2', benchmark: 'FTEC', riskOn: 'TECL', riskOff: 'ZROZ',
    status: 'on', score: 4, k: 2, n: 4,
    indicators: [
      { name: 'SMA200', pass: true, detail: 'price 260.79 > SMA200 221.13' },
      { name: 'SMA50',  pass: true, detail: 'price 260.79 > SMA50 225.18' },
      { name: 'Vol21d<40%', pass: true, detail: 'vol21d 19.4% < 40%' },
      { name: 'AR(1)_30d>0', pass: true, detail: 'AR(1)_30d +0.056 > +0.00' },
    ],
    spark: generateSpark(60, 0.6, 1.0, 0.14),
    metrics: { cagr: 41.8, maxdd: -71.2, sharpe: 0.93, trades: 64, hit: 95.1 },
    bench:   { cagr: 19.7, maxdd: -33.2, sharpe: 0.95 },
    letf:    { cagr: 40.2, maxdd: -79.4, sharpe: 0.87 },
  },
];

const TRANSITIONS_RECENT = [
  { date: '2026-05-02', strategy: 'MU → MUU vote-of-2', from: 'on', to: 'borderline' },
  { date: '2026-04-28', strategy: 'SPY → UPRO vote-of-2', from: 'off', to: 'on' },
];

const SIGNAL_HISTORY = (() => {
  const rows = [];
  const dates = ['2026-05-06','2026-05-05','2026-05-02','2026-05-01','2026-04-30','2026-04-29','2026-04-28','2026-04-25','2026-04-22','2026-04-15','2026-04-08','2026-04-01','2026-03-25','2026-03-18','2026-03-11'];
  let score = 4, state = 'on';
  for (const d of dates) {
    const flip = Math.random() < 0.15;
    if (flip) score = score === 4 ? 3 : 4;
    state = score >= 2 ? 'on' : 'off';
    rows.push({
      date: d, score, state,
      sma200: true, sma50: true, vol21d: score === 4, ar1: true,
    });
  }
  return rows;
})();

const INDICATORS_CATALOG = [
  { id: 1, name: 'SMA200', type: 'sma', params: 'window=200', strategies: 5, active: true },
  { id: 2, name: 'SMA50',  type: 'sma', params: 'window=50',  strategies: 5, active: true },
  { id: 3, name: 'EMA21',  type: 'ema', params: 'window=21',  strategies: 0, active: true },
  { id: 4, name: 'Vol21d<40%', type: 'realized_vol', params: 'window=21, threshold=0.40', strategies: 5, active: true },
  { id: 5, name: 'AR(1)_30d>0', type: 'ar1', params: 'window=30', strategies: 5, active: true },
  { id: 6, name: 'AR(1)_60d>0', type: 'ar1', params: 'window=60', strategies: 0, active: false },
];

// Generate equity curve data (3 series in log scale)
function generateEquityCurves() {
  const days = 365 * 10;
  const dates = [];
  const start = new Date('2016-05-09');
  for (let i = 0; i < days; i += 5) {
    const d = new Date(start.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }
  let strat = 1, bench = 1, letf = 1;
  const stratArr = [], benchArr = [], letfArr = [];
  let seed = 42;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < dates.length; i++) {
    const r = rnd() - 0.5;
    bench *= 1 + (0.0010 + r * 0.025);
    letf  *= 1 + (0.0028 + r * 0.07);
    strat *= 1 + (0.0024 + r * 0.045);
    if (rnd() < 0.05) strat *= 0.94; // crash drawdown
    stratArr.push([dates[i], +strat.toFixed(3)]);
    benchArr.push([dates[i], +bench.toFixed(3)]);
    letfArr .push([dates[i], +letf .toFixed(3)]);
  }
  return { dates, stratArr, benchArr, letfArr };
}

function generateRatioCurve(stratArr, benchArr) {
  const out = [];
  for (let i = 0; i < stratArr.length; i++) {
    const r = stratArr[i][1] / benchArr[i][1];
    out.push([stratArr[i][0], +r.toFixed(3)]);
  }
  return out;
}

function generateSpark(seed, lo, hi, vol) {
  const N = 90;
  const out = [];
  let s = seed;
  let v = lo + Math.random() * (hi - lo) * 0.4;
  for (let i = 0; i < N; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = (s / 233280) - 0.5;
    v *= 1 + r * vol * 0.3 + 0.004;
    out.push(+v.toFixed(4));
  }
  return out;
}

const EQ = generateEquityCurves();
const RATIO = generateRatioCurve(EQ.stratArr, EQ.benchArr);

window.AISWING = { STRATEGIES, TRANSITIONS_RECENT, SIGNAL_HISTORY, INDICATORS_CATALOG, EQ, RATIO };
