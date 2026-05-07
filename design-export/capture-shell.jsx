// Versão de captura: VarA com tokens dinâmicos (light/dark), sidebar collapsed, e suporte a screens extras

const TOKENS_LIGHT = {
  bg: '#fafafa', surface: '#ffffff', surfaceElevated: '#ffffff',
  sidebarBg: '#f5f5f4',
  textPrimary: '#0a0a0a', textSecondary: '#404040', textMuted: '#737373',
  border: '#e5e5e5', borderSubtle: '#ededed',
  accent: '#5e6ad2', accentText: '#ffffff',
  success: '#16a34a', successSoft: 'rgba(22,163,74,0.10)',
  danger:  '#dc2626', dangerSoft:  'rgba(220,38,38,0.10)',
  warn:    '#d97706', warnSoft:    'rgba(217,119,6,0.10)',
  info:    '#2563eb', infoSoft:    'rgba(37,99,235,0.18)',
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const TOKENS_DARK = {
  bg: '#08090a', surface: '#101113', surfaceElevated: '#16181b',
  sidebarBg: '#0c0d0f',
  textPrimary: '#f7f8f8', textSecondary: '#b4bbc4', textMuted: '#7d818b',
  border: '#23262d', borderSubtle: '#1a1c20',
  accent: '#7170ff', accentText: '#ffffff',
  success: '#4cb782', successSoft: 'rgba(76,183,130,0.14)',
  danger:  '#eb5757', dangerSoft:  'rgba(235,87,87,0.14)',
  warn:    '#f2994a', warnSoft:    'rgba(242,153,74,0.14)',
  info:    '#5e6ad2', infoSoft:    'rgba(94,106,210,0.20)',
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
};

const buildCss = (tokens, collapsed) => `
  .va { font-family: ${tokens.fontSans}; color: ${tokens.textPrimary}; background: ${tokens.bg}; min-height: 100vh; display: flex; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .va-mono { font-family: ${tokens.fontMono}; font-feature-settings: 'tnum'; }
  .va aside { width: ${collapsed ? '52' : '232'}px; flex-shrink: 0; background: ${tokens.sidebarBg}; border-right: 1px solid ${tokens.border}; display: flex; flex-direction: column; padding: 16px ${collapsed ? '8' : '12'}px; height: 100vh; position: sticky; top: 0; transition: width 180ms; }
  .va-brand { display: flex; align-items: center; gap: 8px; padding: 6px ${collapsed ? '4' : '8'}px 16px; }
  .va-brand-mark { width: 22px; height: 22px; border-radius: 5px; background: ${tokens.textPrimary}; display: grid; place-items: center; color: ${tokens.bg}; flex-shrink: 0; }
  .va-brand-name { font-weight: 600; letter-spacing: -0.01em; font-size: 13.5px; ${collapsed ? 'display:none;' : ''} }
  .va-nav { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
  .va-nav-section { font-size: 11px; color: ${tokens.textMuted}; text-transform: uppercase; letter-spacing: 0.06em; padding: 12px 8px 6px; font-weight: 500; ${collapsed ? 'display:none;' : ''} }
  .va-nav-item { display: flex; align-items: center; gap: 9px; padding: 6px ${collapsed ? '6' : '8'}px; border-radius: 5px; cursor: pointer; color: ${tokens.textSecondary}; user-select: none; position: relative; ${collapsed ? 'justify-content:center;' : ''} }
  .va-nav-item:hover { background: ${tokens.borderSubtle}; color: ${tokens.textPrimary}; }
  .va-nav-item.active { background: ${tokens.borderSubtle}; color: ${tokens.textPrimary}; font-weight: 500; }
  .va-nav-item .label { ${collapsed ? 'display:none;' : ''} }
  .va-nav-item .kbd { margin-left: auto; font-family: ${tokens.fontMono}; font-size: 10px; color: ${tokens.textMuted}; background: ${tokens.surface}; border: 1px solid ${tokens.border}; padding: 1px 5px; border-radius: 3px; ${collapsed ? 'display:none;' : ''} }
  .va-status { margin-top: auto; padding: 10px ${collapsed ? '0' : '8'}px; border-top: 1px solid ${tokens.border}; ${collapsed ? 'display:none;' : ''} }
  .va-status-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: ${tokens.textMuted}; }
  .va-status-dot { width: 6px; height: 6px; border-radius: 50%; background: ${tokens.success}; }
  .va-refresh { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 5px 8px; border-radius: 5px; border: 1px solid ${tokens.border}; background: ${tokens.surface}; cursor: pointer; color: ${tokens.textSecondary}; font-size: 12px; width: 100%; font-family: inherit; justify-content: center; }
  .va-refresh:hover { background: ${tokens.borderSubtle}; }
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
  .va-brand-mark svg .wick { stroke: ${tokens.bg}; }
  .va-brand-mark svg .body-up { fill: ${tokens.success}; }
  .va-brand-mark svg .body-dn { fill: ${tokens.danger}; }
  .va-brand-mark svg .arrow { stroke: ${tokens.bg}; fill: none; }
`;

// Logo: candlestick trio + upward swing arrow. 1:1 mark + optional wordmark.
const LogoMark = ({ size = 22, tokens }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* down candle (left, smaller) */}
    <line className="wick" x1="5.5" y1="6.5" x2="5.5" y2="14.5" strokeWidth="1.2" strokeLinecap="round" />
    <rect className="body-dn" x="4" y="9" width="3" height="4" rx="0.4" />
    {/* up candle (middle) */}
    <line className="wick" x1="12" y1="3.5" x2="12" y2="13" strokeWidth="1.2" strokeLinecap="round" />
    <rect className="body-up" x="10.5" y="5.5" width="3" height="6" rx="0.4" />
    {/* up candle (right, tallest) */}
    <line className="wick" x1="18.5" y1="2" x2="18.5" y2="11.5" strokeWidth="1.2" strokeLinecap="round" />
    <rect className="body-up" x="17" y="3.5" width="3" height="7" rx="0.4" />
    {/* swing arrow underline */}
    <path className="arrow" d="M3 19.5 Q 8 17 12 18.5 T 21 16" strokeWidth="1.6" strokeLinecap="round" />
    <path className="arrow" d="M19 14.5 L 21.2 16 L 19.7 18.2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Logo = ({ tokens, size = 22, showWordmark = true, fontSize = 13.5 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div className="va-brand-mark" style={{ width: size + 8, height: size + 8, borderRadius: 6, background: tokens.textPrimary, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <LogoMark size={size} tokens={tokens} />
    </div>
    {showWordmark && (
      <div style={{ fontWeight: 600, letterSpacing: '-0.015em', fontSize, color: tokens.textPrimary, display: 'flex', alignItems: 'baseline', gap: 0 }}>
        <span style={{ color: tokens.textPrimary }}>AI</span>
        <span style={{ color: tokens.textMuted, margin: '0 1px' }}>·</span>
        <span style={{ color: tokens.textPrimary }}>Swing</span>
      </div>
    )}
  </div>
);

const Shell = ({ tokens, collapsed, route, setRoute, children }) => {
  const { Icon } = window.AISWING_UI;
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'strategies', label: 'Estratégias', icon: 'layers' },
    { id: 'indicators', label: 'Indicadores', icon: 'activity' },
  ];
  return (
    <div className="va">
      <style>{buildCss(tokens, collapsed)}</style>
      <aside>
        <div className="va-brand">
          <Logo tokens={tokens} size={18} showWordmark={!collapsed} fontSize={13.5} />
        </div>
        {!collapsed && <div className="va-nav-section">Workspace</div>}
        <div className="va-nav">
          {navItems.map((n, i) => (
            <div key={n.id}
              className={'va-nav-item' + (route.name === n.id || (n.id === 'strategies' && route.name === 'strategy-detail') ? ' active' : '')}
              onClick={() => setRoute({ name: n.id })}
              title={collapsed ? n.label : ''}>
              <Icon name={n.icon} size={14} />
              <span className="label">{n.label}</span>
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
      <main>{children}</main>
    </div>
  );
};

window.AISWING_CAPTURE = { TOKENS_LIGHT, TOKENS_DARK, Shell, Logo, LogoMark };
