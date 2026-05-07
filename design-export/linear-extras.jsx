// Telas adicionais Linear DNA: Login, Settings, Empty, Loading, 404, Modal, Command Palette, Sidebar Collapsed, Toast Stack
// Reusa as classes .va-* do var-a-linear.jsx — devem ser usadas dentro do mesmo escopo de tokens.

const ExtraStyles = ({ tokens }) => (
  <style>{`
    .vax-login { min-height: 100vh; display: grid; place-items: center; background: ${tokens.bg}; }
    .vax-login-card { width: 380px; padding: 32px; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; }
    .vax-login-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .vax-login-brand-mark { width: 30px; height: 30px; border-radius: 7px; background: ${tokens.textPrimary}; display: grid; place-items: center; color: ${tokens.bg}; }
    .vax-login-title { font-size: 18px; font-weight: 600; letter-spacing: -0.015em; margin-bottom: 4px; }
    .vax-login-sub { font-size: 12.5px; color: ${tokens.textMuted}; margin-bottom: 24px; }
    .vax-login-divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; color: ${tokens.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .vax-login-divider::before, .vax-login-divider::after { content: ''; flex: 1; height: 1px; background: ${tokens.border}; }
    .vax-login-foot { margin-top: 16px; font-size: 11.5px; color: ${tokens.textMuted}; text-align: center; }

    .vax-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: grid; place-items: center; z-index: 50; }
    .vax-modal { width: 480px; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; box-shadow: 0 24px 64px rgba(0,0,0,0.18); overflow: hidden; }
    .vax-modal-head { padding: 16px 20px; border-bottom: 1px solid ${tokens.border}; display: flex; align-items: center; justify-content: space-between; }
    .vax-modal-title { font-weight: 600; font-size: 14px; letter-spacing: -0.01em; }
    .vax-modal-body { padding: 20px; font-size: 13px; color: ${tokens.textSecondary}; line-height: 1.55; }
    .vax-modal-foot { padding: 12px 20px; border-top: 1px solid ${tokens.border}; display: flex; justify-content: flex-end; gap: 8px; background: ${tokens.bg}; }

    .vax-palette-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: flex-start; padding-top: 120px; z-index: 60; }
    .vax-palette { width: 560px; height: fit-content; max-height: 480px; background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 8px; box-shadow: 0 24px 64px rgba(0,0,0,0.25); overflow: hidden; display: flex; flex-direction: column; }
    .vax-palette-input { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid ${tokens.border}; }
    .vax-palette-input input { flex: 1; border: none; outline: none; background: transparent; font-family: ${tokens.fontSans}; font-size: 14px; color: ${tokens.textPrimary}; }
    .vax-palette-list { max-height: 360px; overflow: auto; padding: 6px 0; }
    .vax-palette-section { padding: 10px 16px 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: ${tokens.textMuted}; font-weight: 500; }
    .vax-palette-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; cursor: pointer; font-size: 13px; }
    .vax-palette-item.active { background: rgba(0,0,0,0.05); }
    .vax-palette-item .ico { color: ${tokens.textMuted}; }
    .vax-palette-item .label { flex: 1; }
    .vax-palette-item .ctx { color: ${tokens.textMuted}; font-size: 11.5px; font-family: ${tokens.fontMono}; }
    .vax-palette-foot { padding: 8px 16px; border-top: 1px solid ${tokens.border}; display: flex; align-items: center; gap: 16px; font-size: 11px; color: ${tokens.textMuted}; background: ${tokens.bg}; }
    .vax-palette-foot .kbd { font-family: ${tokens.fontMono}; font-size: 10px; padding: 1px 5px; border: 1px solid ${tokens.border}; border-radius: 3px; background: ${tokens.surface}; }

    .vax-skel { background: linear-gradient(90deg, ${tokens.borderSubtle} 0%, ${tokens.border} 50%, ${tokens.borderSubtle} 100%); border-radius: 4px; }

    .vax-empty-card { padding: 64px 24px; text-align: center; background: ${tokens.surface}; border: 1px dashed ${tokens.border}; border-radius: 8px; }
    .vax-empty-icon { width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 10px; background: ${tokens.borderSubtle}; display: grid; place-items: center; color: ${tokens.textMuted}; }
    .vax-empty-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .vax-empty-sub { font-size: 12.5px; color: ${tokens.textMuted}; max-width: 360px; margin: 0 auto 16px; line-height: 1.55; }

    .vax-404 { min-height: 100vh; display: grid; place-items: center; background: ${tokens.bg}; }
    .vax-404-inner { text-align: center; max-width: 420px; padding: 32px; }
    .vax-404-code { font-family: ${tokens.fontMono}; font-size: 64px; font-weight: 500; letter-spacing: -0.04em; color: ${tokens.textPrimary}; margin-bottom: 8px; }
    .vax-404-title { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
    .vax-404-sub { font-size: 13px; color: ${tokens.textMuted}; margin-bottom: 20px; }

    .vax-toast-stack { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 70; width: 320px; }
    .vax-toast { background: ${tokens.surface}; border: 1px solid ${tokens.border}; border-radius: 6px; padding: 11px 14px; display: flex; align-items: flex-start; gap: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.10); font-size: 12.5px; }
    .vax-toast-icon { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
    .vax-toast-icon.success { background: ${tokens.successSoft}; color: ${tokens.success}; }
    .vax-toast-icon.danger { background: ${tokens.dangerSoft}; color: ${tokens.danger}; }
    .vax-toast-icon.info { background: ${tokens.infoSoft}; color: ${tokens.info}; }
    .vax-toast-body { flex: 1; }
    .vax-toast-title { font-weight: 500; color: ${tokens.textPrimary}; }
    .vax-toast-sub { color: ${tokens.textMuted}; margin-top: 2px; font-family: ${tokens.fontMono}; font-size: 11px; }
    .vax-toast-close { color: ${tokens.textMuted}; cursor: pointer; padding: 0 2px; flex-shrink: 0; }

    .vax-settings-grid { display: grid; grid-template-columns: 200px 1fr; gap: 32px; }
    .vax-settings-nav { display: flex; flex-direction: column; gap: 1px; font-size: 12.5px; }
    .vax-settings-nav .item { padding: 6px 8px; border-radius: 5px; cursor: pointer; color: ${tokens.textSecondary}; }
    .vax-settings-nav .item.active { background: rgba(0,0,0,0.06); color: ${tokens.textPrimary}; font-weight: 500; }
    .vax-settings-section { padding: 16px 0; border-bottom: 1px solid ${tokens.borderSubtle}; }
    .vax-settings-section:last-child { border-bottom: none; }
    .vax-settings-row { display: grid; grid-template-columns: 1fr 280px; gap: 24px; padding: 12px 0; }
    .vax-settings-row .lbl { font-weight: 500; font-size: 13px; }
    .vax-settings-row .desc { font-size: 11.5px; color: ${tokens.textMuted}; margin-top: 2px; }
  `}</style>
);

const LoginScreen = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  const { Logo } = window.AISWING_CAPTURE;
  const { buildCss } = window.AISWING_CAPTURE.helpers || {};
  return (
    <div className="va" style={{ display: 'block', minHeight: '100vh' }}>
      <style>{`
        .va { font-family: ${tokens.fontSans}; color: ${tokens.textPrimary}; background: ${tokens.bg}; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
        .va-mono { font-family: ${tokens.fontMono}; font-feature-settings: 'tnum'; }
        .va-input { width: 100%; padding: 7px 10px; border-radius: 5px; border: 1px solid ${tokens.border}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-family: inherit; font-size: 13px; box-sizing: border-box; outline: none; transition: border-color 120ms; }
        .va-input:focus { border-color: ${tokens.textPrimary}; }
        .va-field { margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; }
        .va-label { font-size: 11.5px; font-weight: 500; color: ${tokens.textSecondary}; text-transform: uppercase; letter-spacing: 0.05em; }
        .va-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 500; cursor: pointer; border: 1px solid ${tokens.border}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-family: inherit; }
        .va-btn:hover { background: ${tokens.borderSubtle}; }
        .va-btn-primary { background: ${tokens.accent}; color: ${tokens.accentText}; border-color: ${tokens.accent}; }
        .va-btn-primary:hover { opacity: 0.92; }
      `}</style>
      <ExtraStyles tokens={tokens} />
      <div className="vax-login">
        <div className="vax-login-card">
          <div className="vax-login-brand">
            <Logo tokens={tokens} size={20} fontSize={15} />
          </div>
          <div className="vax-login-title">Entrar</div>
          <div className="vax-login-sub">Acesso ao monitor de estratégias rotacionais.</div>
          <div className="va-field"><label className="va-label">Email</label><input className="va-input" defaultValue="trader@aiswing.dev" /></div>
          <div className="va-field"><label className="va-label">Senha</label><input className="va-input" type="password" defaultValue="••••••••••" /></div>
          <button className="va-btn-primary va-btn" style={{ width: '100%', justifyContent: 'center', padding: '9px 12px', marginTop: 4 }}>Entrar</button>
          <div className="vax-login-divider">ou</div>
          <button className="va-btn" style={{ width: '100%', justifyContent: 'center', padding: '9px 12px' }}>
            <Icon name="command" size={13} /> Continuar com SSO
          </button>
          <div className="vax-login-foot">v0.4.2 · cron 22h ET · last sync 14:32</div>
        </div>
      </div>
    </div>
  );
};

const NotFoundScreen = ({ tokens, setRoute }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <div className="va" style={{ display: 'block', minHeight: '100vh' }}>
      <style>{`
        .va { font-family: ${tokens.fontSans}; color: ${tokens.textPrimary}; background: ${tokens.bg}; font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
        .va-mono { font-family: ${tokens.fontMono}; font-feature-settings: 'tnum'; }
        .va-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid ${tokens.border}; background: ${tokens.surface}; color: ${tokens.textPrimary}; font-family: inherit; }
        .va-btn:hover { background: ${tokens.borderSubtle}; }
        .va-btn-primary { background: ${tokens.accent}; color: ${tokens.accentText}; border-color: ${tokens.accent}; }
        .va-btn-primary:hover { opacity: 0.92; }
      `}</style>
      <ExtraStyles tokens={tokens} />
      <div className="vax-404">
        <div className="vax-404-inner">
          <div className="vax-404-code">404</div>
          <div className="vax-404-title">Estratégia não encontrada</div>
          <div className="vax-404-sub">A rota <span className="va-mono" style={{ color: tokens.textPrimary }}>/strategies/47</span> não existe ou foi removida do catálogo.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="va-btn" onClick={() => setRoute && setRoute({ name: 'dashboard' })}><Icon name="arrowLeft" size={12} /> Voltar ao dashboard</button>
            <button className="va-btn-primary va-btn"><Icon name="search" size={12} /> Buscar estratégias</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyStateBlock = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="va-page-head">
        <div>
          <div className="va-h1">Estratégias</div>
          <div className="va-page-sub">Catálogo · CRUD</div>
        </div>
        <button className="va-btn-primary va-btn"><Icon name="plus" size={12} /> Nova estratégia</button>
      </div>
      <div className="vax-empty-card">
        <div className="vax-empty-icon"><Icon name="layers" size={20} /></div>
        <div className="vax-empty-title">Nenhuma estratégia ainda</div>
        <div className="vax-empty-sub">Crie sua primeira estratégia rotacional. Cada uma combina um benchmark, dois targets (risk-on/off) e um conjunto de indicadores parametrizáveis.</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="va-btn"><Icon name="search" size={12} /> Importar template</button>
          <button className="va-btn-primary va-btn"><Icon name="plus" size={12} /> Criar do zero</button>
        </div>
      </div>
    </>
  );
};

const LoadingStateBlock = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="va-page-head">
        <div>
          <div className="vax-skel" style={{ width: 180, height: 22, marginBottom: 8 }} />
          <div className="vax-skel" style={{ width: 240, height: 13 }} />
        </div>
        <div className="vax-skel" style={{ width: 140, height: 30 }} />
      </div>
      <div className="va-grid">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="va-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
            <div className="va-card-head">
              <div className="vax-skel" style={{ width: 100, height: 14 }} />
              <div className="vax-skel" style={{ width: 56, height: 16, borderRadius: 4 }} />
            </div>
            <div style={{ padding: '0 14px 8px' }}>
              <div className="vax-skel" style={{ width: 140, height: 11, marginBottom: 12 }} />
              <div className="vax-skel" style={{ width: '100%', height: 42, borderRadius: 4 }} />
            </div>
            <div style={{ padding: '12px 14px', borderTop: '1px solid ' + tokens.borderSubtle, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0,1,2,3].map(j => <div key={j} className="vax-skel" style={{ width: ['82%','74%','90%','68%'][j], height: 10 }} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const ModalOverlay = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="vax-overlay">
        <div className="vax-modal">
          <div className="vax-modal-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: tokens.dangerSoft, color: tokens.danger, display: 'grid', placeItems: 'center' }}>
                <Icon name="alert" size={14} />
              </div>
              <div className="vax-modal-title">Excluir estratégia?</div>
            </div>
            <button className="va-icon-btn"><Icon name="x" size={14} /></button>
          </div>
          <div className="vax-modal-body">
            Você está prestes a excluir <span className="va-mono" style={{ color: tokens.textPrimary, fontWeight: 500 }}>QQQ → TQQQ vote-of-2</span>. Esta ação remove a estratégia, todo o histórico de sinais e cache de backtest associado.
            <div style={{ background: tokens.bg, border: '1px solid ' + tokens.border, borderRadius: 6, padding: '10px 12px', marginTop: 12, fontSize: 12, fontFamily: tokens.fontMono, color: tokens.textMuted }}>
              <div>67 trades registrados · 10y de backtest cache</div>
              <div>Esta operação não pode ser desfeita.</div>
            </div>
          </div>
          <div className="vax-modal-foot">
            <button className="va-btn">Cancelar</button>
            <button className="va-btn" style={{ background: tokens.danger, color: '#fff', borderColor: tokens.danger }}>
              <Icon name="trash" size={12} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const CommandPaletteOverlay = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="vax-palette-overlay">
        <div className="vax-palette">
          <div className="vax-palette-input">
            <Icon name="search" size={14} style={{ color: tokens.textMuted }} />
            <input defaultValue="qqq" placeholder="Buscar estratégias, indicadores, comandos…" />
            <span style={{ fontFamily: tokens.fontMono, fontSize: 10, color: tokens.textMuted }}>esc</span>
          </div>
          <div className="vax-palette-list">
            <div className="vax-palette-section">Estratégias</div>
            <div className="vax-palette-item active">
              <Icon name="layers" size={14} className="ico" />
              <span className="label">QQQ → TQQQ vote-of-2</span>
              <span className="ctx">Risk on · 4/4</span>
            </div>
            <div className="vax-palette-item">
              <Icon name="layers" size={14} className="ico" />
              <span className="label">SMH → SOXL vote-of-2</span>
              <span className="ctx">Risk on · 4/4</span>
            </div>
            <div className="vax-palette-section">Ações</div>
            <div className="vax-palette-item">
              <Icon name="plus" size={14} className="ico" />
              <span className="label">Nova estratégia</span>
              <span className="ctx">⌘N</span>
            </div>
            <div className="vax-palette-item">
              <Icon name="refresh" size={14} className="ico" />
              <span className="label">Refresh sinais agora</span>
              <span className="ctx">⌘R</span>
            </div>
            <div className="vax-palette-section">Navegação</div>
            <div className="vax-palette-item">
              <Icon name="dashboard" size={14} className="ico" />
              <span className="label">Ir para Dashboard</span>
              <span className="ctx">G 1</span>
            </div>
            <div className="vax-palette-item">
              <Icon name="activity" size={14} className="ico" />
              <span className="label">Ir para Indicadores</span>
              <span className="ctx">G 3</span>
            </div>
          </div>
          <div className="vax-palette-foot">
            <span><span className="kbd">↑↓</span> navegar</span>
            <span><span className="kbd">↵</span> selecionar</span>
            <span><span className="kbd">esc</span> fechar</span>
            <span style={{ marginLeft: 'auto' }}>6 resultados</span>
          </div>
        </div>
      </div>
    </>
  );
};

const ToastStack = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="vax-toast-stack">
        <div className="vax-toast">
          <div className="vax-toast-icon success"><Icon name="check" size={11} stroke={2.5} /></div>
          <div className="vax-toast-body">
            <div className="vax-toast-title">Sinais atualizados</div>
            <div className="vax-toast-sub">5 estratégias · asof 2026-05-06 14:32 ET</div>
          </div>
          <span className="vax-toast-close"><Icon name="x" size={12} /></span>
        </div>
        <div className="vax-toast">
          <div className="vax-toast-icon info"><Icon name="alert" size={11} stroke={2.5} /></div>
          <div className="vax-toast-body">
            <div className="vax-toast-title">Transição detectada</div>
            <div className="vax-toast-sub">MU → MUU saiu de risk-on para no fio</div>
          </div>
          <span className="vax-toast-close"><Icon name="x" size={12} /></span>
        </div>
        <div className="vax-toast">
          <div className="vax-toast-icon danger"><Icon name="x" size={11} stroke={2.5} /></div>
          <div className="vax-toast-body">
            <div className="vax-toast-title">Falha em SOXL price feed</div>
            <div className="vax-toast-sub">retry em 60s · provider yfinance</div>
          </div>
          <span className="vax-toast-close"><Icon name="x" size={12} /></span>
        </div>
      </div>
    </>
  );
};

const SettingsScreen = ({ tokens }) => {
  const { Icon } = window.AISWING_UI;
  return (
    <>
      <ExtraStyles tokens={tokens} />
      <div className="va-page-head">
        <div>
          <div className="va-h1">Configurações</div>
          <div className="va-page-sub">Workspace · cron · feeds · aparência</div>
        </div>
      </div>
      <div className="vax-settings-grid">
        <div className="vax-settings-nav">
          <div className="item active">Geral</div>
          <div className="item">Cron & jobs</div>
          <div className="item">Feeds de preço</div>
          <div className="item">Notificações</div>
          <div className="item">Aparência</div>
          <div className="item">API & tokens</div>
        </div>
        <div>
          <div className="vax-settings-section">
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Nome do workspace</div>
                <div className="desc">Aparece no header e em emails de transição.</div>
              </div>
              <input className="va-input" defaultValue="AI-Swing · trader@aiswing.dev" />
            </div>
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Timezone</div>
                <div className="desc">Usado para timestamps do cron diário.</div>
              </div>
              <select className="va-input"><option>America/New_York (ET)</option><option>America/Sao_Paulo</option></select>
            </div>
          </div>
          <div className="vax-settings-section">
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Cron diário</div>
                <div className="desc">Quando rodar o pipeline de sinais. Default 22h ET (após close).</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="va-input va-mono" defaultValue="0 22 * * 1-5" />
              </div>
            </div>
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Provider de preços</div>
                <div className="desc">Fonte primária dos OHLC.</div>
              </div>
              <div className="va-pill-group" style={{ alignSelf: 'start' }}>
                <span className="va-pill active">yfinance</span>
                <span className="va-pill">polygon</span>
                <span className="va-pill">tiingo</span>
              </div>
            </div>
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Cache de backtest</div>
                <div className="desc">Local. Limpe se mudar a definição de indicadores.</div>
              </div>
              <button className="va-btn" style={{ alignSelf: 'start' }}><Icon name="trash" size={12} /> Limpar cache (124 MB)</button>
            </div>
          </div>
          <div className="vax-settings-section">
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Email em transição</div>
                <div className="desc">Avisa quando uma estratégia muda de estado (on ↔ off ↔ borderline).</div>
              </div>
              <div className="va-pill-group" style={{ alignSelf: 'start' }}>
                <span className="va-pill active">on</span>
                <span className="va-pill">off</span>
              </div>
            </div>
            <div className="vax-settings-row">
              <div>
                <div className="lbl">Aparência</div>
                <div className="desc">Tema do app · respeita preferência do SO.</div>
              </div>
              <div className="va-pill-group" style={{ alignSelf: 'start' }}>
                <span className="va-pill"><Icon name="sun" size={11} /> Light</span>
                <span className="va-pill active"><Icon name="moon" size={11} /> Dark</span>
                <span className="va-pill"><Icon name="monitor" size={11} /> System</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

window.AISWING_EXTRAS = { LoginScreen, NotFoundScreen, EmptyStateBlock, LoadingStateBlock, ModalOverlay, CommandPaletteOverlay, ToastStack, SettingsScreen };
