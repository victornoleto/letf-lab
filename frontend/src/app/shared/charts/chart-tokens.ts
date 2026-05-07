// chart-tokens.ts — Linear DNA
// Reads CSS custom properties at call-time. Re-call after every 'themechange' event.

export interface ChartTokens {
  // Linear DNA fields (canonical — used by equityOptions / ratioOptions)
  textPrimary: string;
  textMuted:   string;
  border:      string;
  grid:        string;
  axis:        string;
  equity:      string;
  equityFill:  string;
  ratio:       string;
  fontMono:    string;

  // Legacy fields kept until tasks 008/009 migrate sparkline + backtest-panel.
  // @deprecated — do not consume in new code.
  bg: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipFg: string;
  fontSans: string;
  series: {
    strategy: string;
    benchmark: string;
    leveraged: string;
    ratioPos: string;
    ratioNeg: string;
  };
}

export function tok(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
}

export function readChartTokens(): ChartTokens {
  const textPrimary = tok('--text-primary');
  const textMuted   = tok('--text-muted');
  const border      = tok('--border');
  const grid        = tok('--chart-grid');
  const axis        = tok('--chart-axis');
  const equity      = tok('--chart-equity');
  const equityFill  = tok('--chart-equity-fill');
  const ratio       = tok('--chart-ratio');
  const fontMono    = tok('--font-mono').replace(/['"]/g, '') || 'JetBrains Mono';
  const fontSans    = tok('--font-sans').replace(/['"]/g, '') || 'Inter';

  return {
    textPrimary,
    textMuted,
    border,
    grid,
    axis,
    equity,
    equityFill,
    ratio,
    fontMono,
    // Legacy values mapped from the new tokens.
    bg: 'transparent',
    text: textPrimary,
    tooltipBg: tok('--surface-elevated'),
    tooltipBorder: border,
    tooltipFg: textPrimary,
    fontSans,
    series: {
      strategy:  equity,
      benchmark: axis,
      leveraged: equity,
      ratioPos:  ratio,
      ratioNeg:  tok('--danger'),
    },
  };
}

/** @deprecated use readChartTokens() — removed once components migrate (tasks 008/009) */
export function getChartTokens(_mode: 'light' | 'dark'): ChartTokens {
  return readChartTokens();
}
