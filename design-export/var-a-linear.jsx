// Variation A — Linear DNA: dense, neutral cool, sharp 6px radius, sidebar w/ active accent
const VarA = ({ accent }) => {
  const { Icon, Sparkline } = window.AISWING_UI;
  const { STRATEGIES, TRANSITIONS_RECENT, SIGNAL_HISTORY, INDICATORS_CATALOG } = window.AISWING;
  const { EquityChart, RatioChart } = window.AISWING_CHARTS;

  const [route, setRoute] = React.useState({ name: 'dashboard' });
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  const tokens = {
    bg: '#fafafa', surface: '#ffffff', surfaceElevated: '#ffffff',
    sidebarBg: '#f5f5f4',
    textPrimary: '#0a0a0a', textSecondary: '#404040', textMuted: '#737373',
    border: '#e5e5e5', borderSubtle: '#ededed',
    accent, accentText: '#ffffff',
    success: '#16a34a', successSoft: 'rgba(22,163,74,0.10)',
    danger:  '#dc2626', dangerSoft:  'rgba(220,38,38,0.10)',
    warn:    '#d97706', warnSoft:    'rgba(217,119,6,0.10)',
    info:    '#2563eb', infoSoft:    'rgba(37,99,235,0.18)',
    fontSans: "'IBM Plex Sans', system-ui, sans-serif",
    fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  };

  const css = `
    .va { font-family: ${tokens.fontSans}; color: ${tokens.textPrimary}; background: ${tokens.bg}; min-height: 100%; display: flex; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
    .va-mono { font-family: ${tokens.fontMono}; font-feature-settings: 'tnum'; }
    .va aside { width: 232px; flex-shrink: 0; background: ${tokens.sidebarBg}; border-right: 1px solid ${tokens.border}; display: flex; flex-direction: column; padding: 16px 12px; height: 100vh; position: sticky; top: 0; }
    .va-brand { display: flex; align-items: center; gap: 8px; padding: 6px 8px 16px; }
    .va-brand-mark { width: 22px; height: 22px; border-radius: 5px; background: ${tokens.textPrimary}; display: grid; place-items: center; color: ${tokens.bg}; }
    .va-brand-name { font-weight: 600; letter-spacing: -0.01em; font-size: 13.5px; }
    .va-nav { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
    .va-nav-section { font-size: 11px; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px 8px 6px; font-weight: 500; }
    .va-nav-item { display: flex; align-items: center; gap: 9px; padding: 6px 8px; border-radius: 5px; cursor: pointer; color: ${tokens.textSecondary}; user-select: none; position: relative; }
    .va-nav-item:hover { background: rgba(0,0,0,0.04); color: ${tokens.textPrimary}; }
    .va-nav-item.active { background: rgba(0,0,0,0.06); color: ${tokens.textPrimary}; font-weight: 500; }
    .va-nav-item .kbd { margin-left: auto; font-family: ${tokens.fontMono}; font-size: 10px; color: ${tokens.textMuted}; background: ${tokens.surface}; border: 1px solid ${tokens.border}; padding: 1px 5px; border-radius: 3px; }
    .va-status { margin-top: auto; padding: 10px 8px; border-top: 1px solid ${tokens.border}; }
    .va-status-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: ${tokens.textMuted}; }
    .va-status-dot { width: 6px; height: 6px; border-radius: 50%; background: ${tokens.success}; }
    .va-refresh { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 5px 8px; border-radius: 5px; border: 1px solid ${tokens.border}; background: ${tokens.surface}; cursor: pointer; color: ${tokens.textSecondary}; font-size: 12px; width: 100%; font-family: inherit; justify-content: center; }
    .va-refresh:hover { background: ${tokens.borderSubtle}; }
    .va-theme-row { display: flex; gap: 4px; margin-top: 8px; padding: 2px; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; }
    .va-theme-btn { flex: 1; display: grid; place-items: center; padding: 4px; border-radius: 4px; cursor: pointer; color: ${tokens.textMuted}; }
    .va-theme-btn.active { background: ${tokens.borderSubtle}; color: ${tokens.textPrimary}; }
    .va main { flex: 1; min-width: 0; padding: 24px 32px 64px; max-width: 1280px; }
    .va-banner { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${tokens.warnSoft}; border: 1px solid ${tokens.warn}33; border-radius: 6px; font-size: 12.5px; color: ${tokens.textPrimary}; margin-bottom: 16px; }
    .va-banner-close { margin-left: auto; cursor: pointer; color: ${tokens.textMuted}; padding: 2px; }
    .va-page-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid ${tokens.border}; }
    .va-h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; }
    .va-page-sub { color: ${tokens.textMuted}; font-size: 12.5px; margin-top: 3px; }
    .va-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 500; cursor: pointer; border: 1px solid ${tokens.border}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-family: inherit; }
    .va-btn:hover { background: ${tokens.borderSubtle}; }
    .va-btn-primary { background: ${tokens.accent}; color: ${tokens.accentText}; border-color: ${tokens.accent}; }
    .va-btn-primary:hover { opacity: 0.9; background: ${tokens.accent}; }
    .va-btn-ghost { border-color: transparent; background: transparent; }
    .va-btn-sm { padding: 3px 8px; font-size: 11.5px; }
    .va-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
    .va-card { background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; position: relative; overflow: hidden; cursor: pointer; transition: border-color 120ms; }
    .va-card:hover { border-color: ${tokens.textMuted}55; }
    .va-card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
    .va-card-accent.on { background: ${tokens.success}; }
    .va-card-accent.off { background: ${tokens.danger}; }
    .va-card-accent.borderline { background: ${tokens.warn}; }
    .va-card-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 10px; }
    .va-tickers { display: flex; align-items: center; gap: 6px; font-weight: 500; }
    .va-tickers .arrow { color: ${tokens.textMuted}; }
    .va-tickers .on { color: ${tokens.success}; }
    .va-tickers .off { color: ${tokens.danger}; }
    .va-badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; font-family: ${tokens.fontMono}; }
    .va-badge.on { background: ${tokens.successSoft}; color: ${tokens.success}; }
    .va-badge.off { background: ${tokens.dangerSoft}; color: ${tokens.danger}; }
    .va-badge.borderline { background: ${tokens.warnSoft}; color: ${tokens.warn}; }
    .va-card-meta { display: flex; align-items: baseline; justify-content: space-between; padding: 0 14px 8px; font-size: 11.5px; color: ${tokens.textMuted}; }
    .va-score { font-family: ${tokens.fontMono}; color: ${tokens.textPrimary}; font-weight: 500; }
    .va-spark { padding: 0 8px 6px; }
    .va-ind-list { padding: 8px 14px 14px; border-top: 1px solid ${tokens.borderSubtle}; }
    .va-ind-row { display: grid; grid-template-columns: 14px 84px 1fr; gap: 8px; align-items: center; padding: 3px 0; font-size: 11.5px; }
    .va-ind-row .det { font-family: ${tokens.fontMono}; color: ${tokens.textMuted}; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .va-ind-row .name { color: ${tokens.textSecondary}; }
    .va-ind-row .pass { color: ${tokens.success}; }
    .va-ind-row .fail { color: ${tokens.danger}; }
    .va-meta-bar { display: flex; gap: 16px; padding: 16px 0; align-items: baseline; }
    .va-meta-bar > div { display: flex; flex-direction: column; gap: 2px; }
    .va-meta-bar .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: ${tokens.textMuted}; }
    .va-meta-bar .val { font-family: ${tokens.fontMono}; font-size: 18px; font-weight: 500; }
    .va-section { background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; margin-top: 14px; }
    .va-section-head { padding: 12px 16px; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; }
    .va-section-title { font-weight: 500; font-size: 13px; }
    .va-section-sub { font-size: 11.5px; color: ${tokens.textMuted}; margin-top: 2px; }
    .va-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; padding: 0; }
    .va-metric-card { padding: 14px 16px; border-right: 1px solid ${tokens.border}; }
    .va-metric-card:last-child { border-right: none; }
    .va-metric-card.highlight { border-left: 2px solid ${tokens.success}; }
    .va-metric-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: ${tokens.textMuted}; }
    .va-metric-rows { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
    .va-metric-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .va-metric-row .k { font-size: 12px; color: ${tokens.textSecondary}; }
    .va-metric-row .v { font-family: ${tokens.fontMono}; font-weight: 500; font-size: 13.5px; }
    .va-metric-row .diff { font-family: ${tokens.fontMono}; font-size: 10.5px; }
    .va-metric-row .diff.pos { color: ${tokens.success}; }
    .va-metric-row .diff.neg { color: ${tokens.danger}; }
    .va-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0; }
    .va-chart-cell { padding: 12px 16px; border-right: 1px solid ${tokens.border}; }
    .va-chart-cell:last-child { border-right: none; }
    .va-chart-cap { font-size: 11px; color: ${tokens.textMuted}; margin-bottom: 6px; font-family: ${tokens.fontMono}; }
    .va-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .va-table th { text-align: left; padding: 8px 14px; font-weight: 500; color: ${tokens.textMuted}; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid ${tokens.border}; background: ${tokens.bg}; }
    .va-table td { padding: 9px 14px; border-bottom: 1px solid ${tokens.borderSubtle}; }
    .va-table tr:hover td { background: ${tokens.bg}; }
    .va-table .actions { opacity: 0; display: flex; gap: 2px; justify-content: flex-end; }
    .va-table tr:hover .actions { opacity: 1; }
    .va-icon-btn { padding: 4px; border-radius: 4px; cursor: pointer; color: ${tokens.textMuted}; background: transparent; border: none; }
    .va-icon-btn:hover { background: ${tokens.borderSubtle}; color: ${tokens.textPrimary}; }
    .va-input { width: 100%; padding: 7px 10px; border: 1px solid ${tokens.border}; border-radius: 5px; background: ${tokens.surface}; font-family: inherit; font-size: 13px; color: ${tokens.textPrimary}; }
    .va-input:focus { outline: 2px solid ${tokens.accent}33; border-color: ${tokens.accent}; }
    .va-form { max-width: 560px; }
    .va-field { margin-bottom: 16px; }
    .va-label { display: block; font-size: 11.5px; font-weight: 500; margin-bottom: 5px; color: ${tokens.textPrimary}; }
    .va-hint { font-size: 11px; color: ${tokens.textMuted}; margin-top: 4px; font-family: ${tokens.fontMono}; }
    .va-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .va-chip { padding: 4px 10px; border-radius: 4px; border: 1px solid ${tokens.border}; background: ${tokens.surface}; font-size: 12px; cursor: pointer; user-select: none; display: inline-flex; align-items: center; gap: 5px; }
    .va-chip.selected { background: ${tokens.textPrimary}; color: ${tokens.bg}; border-color: ${tokens.textPrimary}; }
    .va-tabs { display: flex; gap: 0; border-bottom: 1px solid ${tokens.border}; margin-bottom: 16px; }
    .va-tab { padding: 8px 14px; font-size: 12.5px; cursor: pointer; color: ${tokens.textMuted}; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .va-tab.active { color: ${tokens.textPrimary}; border-bottom-color: ${tokens.textPrimary}; font-weight: 500; }
    .va-pill-group { display: inline-flex; padding: 2px; background: ${tokens.bg}; border: 1px solid ${tokens.border}; border-radius: 5px; }
    .va-pill { padding: 3px 9px; border-radius: 3px; font-size: 11.5px; cursor: pointer; color: ${tokens.textSecondary}; font-family: ${tokens.fontMono}; }
    .va-pill.active { background: ${tokens.surface}; color: ${tokens.textPrimary}; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .va-empty { padding: 32px 16px; text-align: center; color: ${tokens.textMuted}; font-size: 12.5px; }
  `;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'strategies', label: 'Estratégias', icon: 'layers' },
    { id: 'indicators', label: 'Indicadores', icon: 'activity' },
  ];

  return (
    <div className="va">
      <style>{css}</style>
      <aside>
        <div className="va-brand">
          <div className="va-brand-mark"><Icon name="bolt" size={12} /></div>
          <div className="va-brand-name">AI-Swing</div>
        </div>
        <div className="va-nav-section">Workspace</div>
        <div className="va-nav">
          {navItems.map((n, i) => (
            <div key={n.id}
              className={'va-nav-item' + (route.name === n.id || (n.id === 'strategies' && route.name === 'strategy-detail') ? ' active' : '')}
              onClick={() => setRoute({ name: n.id })}>
              <Icon name={n.icon} size={14} />
              <span>{n.label}</span>
              <span className="kbd">G {i + 1}</span>
            </div>
          ))}
        </div>
        <div className="va-status">
          <div className="va-status-row">
            <div className="va-status-dot" />
            <span>Atualizado <span className="va-mono">14:32 ET</span></span>
          </div>
          <button className="va-refresh"><Icon name="refresh" size={12} /> Refresh</button>
        </div>
      </aside>
      <main>
        {route.name === 'dashboard' && <DashA tokens={tokens} setRoute={setRoute} bannerDismissed={bannerDismissed} setBannerDismissed={setBannerDismissed} />}
        {route.name === 'strategies' && <StratListA tokens={tokens} setRoute={setRoute} />}
        {route.name === 'strategy-detail' && <DetailA tokens={tokens} stratId={route.id} setRoute={setRoute} />}
        {route.name === 'strategy-form' && <StratFormA tokens={tokens} setRoute={setRoute} editing={route.editing} />}
        {route.name === 'indicators' && <IndListA tokens={tokens} setRoute={setRoute} />}
        {route.name === 'indicator-form' && <IndFormA tokens={tokens} setRoute={setRoute} editing={route.editing} />}
      </main>
    </div>
  );
};

const DashA = ({ tokens, setRoute, bannerDismissed, setBannerDismissed }) => {
  const { Sparkline, Icon } = window.AISWING_UI;
  const { STRATEGIES } = window.AISWING;
  const onCount = STRATEGIES.filter(s => s.status === 'on').length;
  return (
    <>
      {!bannerDismissed && (
        <div className="va-banner">
          <Icon name="alert" size={14} />
          <span><b>2 transições</b> nos últimos 7 dias · MU → MUU saiu para borderline · SPY → UPRO entrou em risk-on</span>
          <span style={{ marginLeft: 8, color: tokens.textMuted, cursor: 'pointer', fontSize: 12 }}>Ver →</span>
          <span className="va-banner-close" onClick={() => setBannerDismissed(true)}><Icon name="x" size={12} /></span>
        </div>
      )}
      <div className="va-page-head">
        <div>
          <div className="va-h1">Dashboard</div>
          <div className="va-page-sub">{onCount}/{STRATEGIES.length} estratégias em risk-on · asof <span className="va-mono">2026-05-06</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="va-pill-group">
            <span className="va-pill active">Todas</span>
            <span className="va-pill">Risk-on</span>
            <span className="va-pill">Risk-off</span>
          </div>
          <button className="va-btn-primary va-btn"><Icon name="plus" size={12} /> Nova estratégia</button>
        </div>
      </div>
      <div className="va-grid">
        {STRATEGIES.map(s => (
          <div key={s.id} className="va-card" onClick={() => setRoute({ name: 'strategy-detail', id: s.id })}>
            <div className={'va-card-accent ' + s.status} />
            <div className="va-card-head">
              <div className="va-tickers">
                <span>{s.benchmark}</span>
                <span className="arrow"><Icon name="arrowRight" size={11} /></span>
                <span className={s.status === 'off' ? 'off' : 'on'}>{s.riskOn}</span>
              </div>
              <span className={'va-badge ' + s.status}>
                {s.status === 'on' ? 'Risk on' : s.status === 'off' ? 'Risk off' : 'No fio'}
              </span>
            </div>
            <div className="va-card-meta">
              <span className="va-mono">Score <span className="va-score">{s.score}/{s.n}</span> · k≥{s.k}</span>
              <span style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: s.n }).map((_, i) => (
                  <span key={i} style={{ width: 14, height: 4, borderRadius: 1, background: i < s.score ? (s.status === 'borderline' ? tokens.warn : tokens.success) : tokens.borderSubtle }} />
                ))}
              </span>
            </div>
            <div className="va-spark">
              <Sparkline data={s.spark} color={s.status === 'off' ? tokens.danger : s.status === 'borderline' ? tokens.warn : tokens.success} fill={s.status === 'off' ? tokens.dangerSoft : s.status === 'borderline' ? tokens.warnSoft : tokens.successSoft} height={42} />
            </div>
            <div className="va-ind-list">
              {s.indicators.map(ind => (
                <div key={ind.name} className="va-ind-row">
                  <span className={ind.pass ? 'pass' : 'fail'}>
                    <Icon name={ind.pass ? 'check' : 'x'} size={12} stroke={2.2} />
                  </span>
                  <span className="name">{ind.name}</span>
                  <span className="det">{ind.detail}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const DetailA = ({ tokens, stratId, setRoute }) => {
  const { Icon } = window.AISWING_UI;
  const { STRATEGIES, SIGNAL_HISTORY } = window.AISWING;
  const { EquityChart, RatioChart } = window.AISWING_CHARTS;
  const s = STRATEGIES.find(x => x.id === stratId) || STRATEGIES[0];
  const diff = (a, b) => {
    const d = a - b; const sign = d >= 0 ? '+' : '';
    return { val: `${sign}${d.toFixed(2)}pp`, pos: d >= 0 };
  };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: tokens.textMuted, marginBottom: 4 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => setRoute({ name: 'dashboard' })}>← Dashboard</span>
        <span>/</span>
        <span>Estratégias</span>
      </div>
      <div className="va-page-head">
        <div>
          <div className="va-h1 va-mono">{s.benchmark} → {s.riskOn} <span style={{ color: tokens.textMuted, fontWeight: 400 }}>vote-of-2</span></div>
        </div>
        <button className="va-btn" onClick={() => setRoute({ name: 'strategy-form', editing: s.id })}><Icon name="edit" size={12} /> Editar</button>
      </div>
      <div className="va-meta-bar">
        <div><span className="label">Benchmark</span><span className="val">{s.benchmark}</span></div>
        <div><span className="label">Risk-on</span><span className="val" style={{ color: tokens.success }}>{s.riskOn}</span></div>
        <div><span className="label">Risk-off</span><span className="val" style={{ color: tokens.danger }}>{s.riskOff}</span></div>
        <div style={{ marginLeft: 'auto' }}><span className="label">Status</span><span className="val" style={{ color: s.status === 'on' ? tokens.success : s.status === 'borderline' ? tokens.warn : tokens.danger }}>{s.status === 'on' ? 'RISK ON' : s.status === 'borderline' ? 'NO FIO' : 'RISK OFF'}</span></div>
        <div><span className="label">Score</span><span className="val">{s.score}/{s.n} <span style={{ color: tokens.textMuted, fontSize: 12 }}>(k≥{s.k})</span></span></div>
      </div>

      <div className="va-section">
        <div className="va-section-head">
          <div>
            <div className="va-section-title">Backtest</div>
            <div className="va-section-sub va-mono">2016-05-09 → 2026-05-06 (10y) · asof 2026-05-06 · cache hit</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="va-pill-group">
              <span className="va-pill">3y</span>
              <span className="va-pill">5y</span>
              <span className="va-pill active">10y</span>
              <span className="va-pill">20y</span>
            </span>
            <button className="va-btn va-btn-sm"><Icon name="refresh" size={11} /> Rerun</button>
          </div>
        </div>
        <div className="va-metrics-grid">
          <div className="va-metric-card highlight">
            <div className="va-metric-title">Estratégia</div>
            <div className="va-metric-rows">
              <div className="va-metric-row"><span className="k">CAGR</span><span><span className="v">{s.metrics.cagr}%</span> <span className={'diff ' + (diff(s.metrics.cagr, s.bench.cagr).pos ? 'pos' : 'neg')}>{diff(s.metrics.cagr, s.bench.cagr).val}</span></span></div>
              <div className="va-metric-row"><span className="k">MaxDD</span><span><span className="v">{s.metrics.maxdd}%</span> <span className={'diff ' + (diff(s.metrics.maxdd, s.bench.maxdd).pos ? 'pos' : 'neg')}>{diff(s.metrics.maxdd, s.bench.maxdd).val}</span></span></div>
              <div className="va-metric-row"><span className="k">Sharpe</span><span><span className="v">{s.metrics.sharpe}</span> <span className={'diff ' + (s.metrics.sharpe >= s.bench.sharpe ? 'pos' : 'neg')}>{(s.metrics.sharpe - s.bench.sharpe).toFixed(2)}</span></span></div>
              <div className="va-metric-row"><span className="k">Trades</span><span className="v">{s.metrics.trades}</span></div>
              <div className="va-metric-row"><span className="k">Hit vs B&H</span><span className="v">{s.metrics.hit}%</span></div>
            </div>
          </div>
          <div className="va-metric-card">
            <div className="va-metric-title">Buy & Hold Benchmark</div>
            <div className="va-metric-rows">
              <div className="va-metric-row"><span className="k">CAGR</span><span className="v">{s.bench.cagr}%</span></div>
              <div className="va-metric-row"><span className="k">MaxDD</span><span className="v">{s.bench.maxdd}%</span></div>
              <div className="va-metric-row"><span className="k">Sharpe</span><span className="v">{s.bench.sharpe}</span></div>
            </div>
          </div>
          <div className="va-metric-card">
            <div className="va-metric-title">Buy & Hold LETF</div>
            <div className="va-metric-rows">
              <div className="va-metric-row"><span className="k">CAGR</span><span className="v">{s.letf.cagr}%</span></div>
              <div className="va-metric-row"><span className="k">MaxDD</span><span className="v">{s.letf.maxdd}%</span></div>
              <div className="va-metric-row"><span className="k">Sharpe</span><span className="v">{s.letf.sharpe}</span></div>
            </div>
          </div>
        </div>
        <div className="va-charts-grid">
          <div className="va-chart-cell">
            <div className="va-chart-cap">EQUITY CURVES (estratégia · benchmark · LETF) — escala log</div>
            <EquityChart tokens={tokens} height={300} />
          </div>
          <div className="va-chart-cell">
            <div className="va-chart-cap">RAZÃO EQUITY/BENCHMARK — acima de 1.0× = batendo o B&H</div>
            <RatioChart tokens={tokens} height={300} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="va-section" style={{ marginTop: 0 }}>
          <div className="va-section-head"><div className="va-section-title">Indicadores hoje <span style={{ color: tokens.textMuted, fontWeight: 400 }} className="va-mono">2026-05-06</span></div></div>
          <div style={{ padding: '12px 16px' }}>
            {s.indicators.map(ind => (
              <div key={ind.name} className="va-ind-row" style={{ gridTemplateColumns: '14px 110px 1fr', padding: '5px 0' }}>
                <span className={ind.pass ? 'pass' : 'fail'}><Icon name={ind.pass ? 'check' : 'x'} size={12} stroke={2.2} /></span>
                <span className="name">{ind.name}</span>
                <span className="det">{ind.detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="va-section" style={{ marginTop: 0 }}>
          <div className="va-section-head"><div className="va-section-title">Transições registradas</div></div>
          <div className="va-empty">
            Sem transições registradas ainda.<br />
            <span className="va-mono" style={{ fontSize: 11 }}>O cron diário (22h ET) populará isto, ou use o refresh manual.</span>
          </div>
        </div>
      </div>

      <div className="va-section">
        <div className="va-section-head">
          <div className="va-section-title">Histórico de sinais</div>
          <span className="va-pill-group">
            <span className="va-pill active">1y</span>
            <span className="va-pill">5y</span>
            <span className="va-pill">All</span>
          </span>
        </div>
        <table className="va-table">
          <thead><tr><th>Data</th><th>Score</th><th>Estado</th><th>SMA200</th><th>SMA50</th><th>VOL21D&lt;40%</th><th>AR(1)_30D&gt;0</th></tr></thead>
          <tbody>
            {SIGNAL_HISTORY.slice(0, 10).map((r, i) => (
              <tr key={i}>
                <td className="va-mono">{r.date}</td>
                <td className="va-mono">{r.score}/4</td>
                <td><span className={'va-badge ' + r.state}>{r.state.toUpperCase()}</span></td>
                <td><Icon name={r.sma200 ? 'check' : 'x'} size={12} stroke={2.2} style={{ color: r.sma200 ? tokens.success : tokens.danger }} /></td>
                <td><Icon name={r.sma50 ? 'check' : 'x'} size={12} stroke={2.2} style={{ color: r.sma50 ? tokens.success : tokens.danger }} /></td>
                <td><Icon name={r.vol21d ? 'check' : 'x'} size={12} stroke={2.2} style={{ color: r.vol21d ? tokens.success : tokens.danger }} /></td>
                <td><Icon name={r.ar1 ? 'check' : 'x'} size={12} stroke={2.2} style={{ color: r.ar1 ? tokens.success : tokens.danger }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const StratListA = ({ tokens, setRoute }) => {
  const { Icon } = window.AISWING_UI;
  const { STRATEGIES } = window.AISWING;
  return (
    <>
      <div className="va-page-head">
        <div>
          <div className="va-h1">Estratégias</div>
          <div className="va-page-sub">{STRATEGIES.length} ativas · CRUD</div>
        </div>
        <button className="va-btn-primary va-btn" onClick={() => setRoute({ name: 'strategy-form' })}><Icon name="plus" size={12} /> Nova estratégia</button>
      </div>
      <div className="va-section" style={{ marginTop: 0 }}>
        <table className="va-table">
          <thead><tr><th>Nome</th><th>Bench</th><th>Risk-on</th><th>Risk-off</th><th>k</th><th>Indicadores</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {STRATEGIES.map(s => (
              <tr key={s.id} onClick={() => setRoute({ name: 'strategy-detail', id: s.id })} style={{ cursor: 'pointer' }}>
                <td>{s.name}</td>
                <td className="va-mono">{s.benchmark}</td>
                <td className="va-mono" style={{ color: tokens.success }}>{s.riskOn}</td>
                <td className="va-mono" style={{ color: tokens.danger }}>{s.riskOff}</td>
                <td className="va-mono">≥{s.k}</td>
                <td className="va-mono" style={{ color: tokens.textMuted }}>{s.n}</td>
                <td><span className={'va-badge ' + s.status}>{s.status === 'on' ? 'Risk on' : s.status === 'borderline' ? 'No fio' : 'Risk off'}</span></td>
                <td>
                  <span className="actions">
                    <button className="va-icon-btn" onClick={(e) => { e.stopPropagation(); setRoute({ name: 'strategy-form', editing: s.id }); }}><Icon name="edit" size={13} /></button>
                    <button className="va-icon-btn"><Icon name="trash" size={13} /></button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const StratFormA = ({ tokens, setRoute, editing }) => {
  const { Icon } = window.AISWING_UI;
  const { INDICATORS_CATALOG } = window.AISWING;
  const [selected, setSelected] = React.useState([1, 2, 4, 5]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  return (
    <>
      <div style={{ fontSize: 12, color: tokens.textMuted, marginBottom: 4, cursor: 'pointer' }} onClick={() => setRoute({ name: 'strategies' })}>← Estratégias</div>
      <div className="va-page-head"><div className="va-h1">{editing ? 'Editar estratégia' : 'Nova estratégia'}</div></div>
      <div className="va-form">
        <div className="va-field"><label className="va-label">Nome</label><input className="va-input" defaultValue={editing ? 'QQQ → TQQQ vote-of-2' : ''} placeholder="Ex: QQQ → TQQQ vote-of-2" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="va-field"><label className="va-label">Benchmark</label><input className="va-input va-mono" defaultValue={editing ? 'QQQ' : ''} placeholder="QQQ" /></div>
          <div className="va-field"><label className="va-label">Risk-on (LETF)</label><input className="va-input va-mono" defaultValue={editing ? 'TQQQ' : ''} placeholder="TQQQ" /></div>
          <div className="va-field"><label className="va-label">Risk-off (defensivo)</label><input className="va-input va-mono" defaultValue={editing ? 'ZROZ' : ''} placeholder="ZROZ" /></div>
        </div>
        <div className="va-field">
          <label className="va-label">Indicadores ({selected.length} selecionados)</label>
          <div className="va-chips">
            {INDICATORS_CATALOG.filter(i => i.active).map(i => (
              <span key={i.id} className={'va-chip' + (selected.includes(i.id) ? ' selected' : '')} onClick={() => toggle(i.id)}>
                {selected.includes(i.id) && <Icon name="check" size={10} stroke={2.5} />}{i.name}
              </span>
            ))}
          </div>
        </div>
        <div className="va-field" style={{ maxWidth: 200 }}>
          <label className="va-label">Threshold k</label>
          <input className="va-input va-mono" type="number" defaultValue={2} />
          <div className="va-hint">k_threshold ≤ {selected.length} (indicadores selecionados)</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid ' + tokens.border, marginTop: 24 }}>
          <button className="va-btn va-btn-ghost" onClick={() => setRoute({ name: 'strategies' })}>Cancelar</button>
          <button className="va-btn-primary va-btn">{editing ? 'Salvar mudanças' : 'Criar estratégia'}</button>
        </div>
      </div>
    </>
  );
};

const IndListA = ({ tokens, setRoute }) => {
  const { Icon } = window.AISWING_UI;
  const { INDICATORS_CATALOG } = window.AISWING;
  return (
    <>
      <div className="va-page-head">
        <div><div className="va-h1">Indicadores</div><div className="va-page-sub">Catálogo de gates parametrizáveis</div></div>
        <button className="va-btn-primary va-btn" onClick={() => setRoute({ name: 'indicator-form' })}><Icon name="plus" size={12} /> Novo indicador</button>
      </div>
      <div className="va-section" style={{ marginTop: 0 }}>
        <table className="va-table">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Parâmetros</th><th>Estratégias</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {INDICATORS_CATALOG.map(i => (
              <tr key={i.id} onClick={() => setRoute({ name: 'indicator-form', editing: i.id })} style={{ cursor: 'pointer' }}>
                <td className="va-mono">{i.name}</td>
                <td><span className="va-mono" style={{ color: tokens.textMuted, fontSize: 11.5 }}>{i.type}</span></td>
                <td className="va-mono" style={{ color: tokens.textMuted, fontSize: 11.5 }}>{i.params}</td>
                <td className="va-mono">{i.strategies}</td>
                <td>{i.active ? <span className="va-badge on">Ativo</span> : <span className="va-badge off">Inativo</span>}</td>
                <td><span className="actions"><button className="va-icon-btn" onClick={(e) => { e.stopPropagation(); setRoute({ name: 'indicator-form', editing: i.id }); }}><Icon name="edit" size={13} /></button><button className="va-icon-btn"><Icon name="trash" size={13} /></button></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const IndFormA = ({ tokens, setRoute, editing }) => {
  const [type, setType] = React.useState('sma');
  return (
    <>
      <div style={{ fontSize: 12, color: tokens.textMuted, marginBottom: 4, cursor: 'pointer' }} onClick={() => setRoute({ name: 'indicators' })}>← Indicadores</div>
      <div className="va-page-head"><div className="va-h1">{editing ? 'Editar indicador' : 'Novo indicador'}</div></div>
      <div className="va-form">
        <div className="va-field"><label className="va-label">Nome</label><input className="va-input va-mono" defaultValue={editing ? 'SMA200' : ''} placeholder="SMA200" /></div>
        <div className="va-field"><label className="va-label">Tipo</label>
          <select className="va-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="sma">SMA — média móvel simples</option>
            <option value="ema">EMA — média móvel exponencial</option>
            <option value="realized_vol">Realized Vol — volatilidade realizada</option>
            <option value="ar1">AR(1) — autocorrelação de primeira ordem</option>
          </select>
        </div>
        <div className="va-field" style={{ maxWidth: 200 }}>
          <label className="va-label">Window (dias)</label>
          <input className="va-input va-mono" type="number" defaultValue={200} />
        </div>
        {type === 'realized_vol' && (
          <div className="va-field" style={{ maxWidth: 200 }}>
            <label className="va-label">Threshold</label>
            <input className="va-input va-mono" type="number" step="0.01" defaultValue={0.40} />
            <div className="va-hint">Vol anualizada · gate passa se vol &lt; threshold</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid ' + tokens.border, marginTop: 24 }}>
          <button className="va-btn va-btn-ghost" onClick={() => setRoute({ name: 'indicators' })}>Cancelar</button>
          <button className="va-btn-primary va-btn">{editing ? 'Salvar' : 'Criar indicador'}</button>
        </div>
      </div>
    </>
  );
};

window.AISWING_VARS = window.AISWING_VARS || {};
window.AISWING_VARS.A = VarA;
window.AISWING_VARS.A_SCREENS = { DashA, DetailA, StratListA, StratFormA, IndListA, IndFormA };
