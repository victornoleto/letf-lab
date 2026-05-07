export type IndicatorType = 'SMA_GATE' | 'EMA_GATE' | 'VOL_GATE' | 'AR1_GATE';

export interface Indicator {
  id: number;
  name: string;
  type: IndicatorType;
  params: Record<string, number>;
  description: string | null;
  created_at: string;
}

export interface IndicatorTypeInfo {
  type: IndicatorType;
  label: string;
  description: string;
  params_schema: { properties: Record<string, ParamProperty>; title?: string };
  default_params: Record<string, number>;
}

export interface ParamProperty {
  type: string;
  default?: number;
  description?: string;
  minimum?: number;
  maximum?: number;
}

export interface IndicatorResult {
  indicator_id: number;
  indicator_name: string;
  indicator_type: IndicatorType;
  gate_passed: boolean;
  value: number;
  raw_summary: string;
  headroom_pct: number | null;
}

export interface SignalSnapshot {
  date: string;
  score: number;
  total: number;
  risk_on: boolean;
  results: IndicatorResult[];
}

export interface StrategyReport {
  date: string;
  headline: string;
  body: string;
  proximity_state: string | null;
  model: string;
  generated_at: string;
}

export interface Strategy {
  id: number;
  name: string;
  benchmark_ticker: string;
  risk_on_ticker: string;
  risk_off_ticker: string;
  k_threshold: number;
  enabled: boolean;
  created_at: string;
  indicators: Indicator[];
  current_signal: SignalSnapshot | null;
  sparkline_90d: number[];
  report: StrategyReport | null;
}

export interface SignalTransition {
  id: number;
  strategy_id: number;
  date: string;
  from_state: boolean;
  to_state: boolean;
  score: number;
  total: number;
}

export interface RefreshStatus {
  last_started_at: string | null;
  last_finished_at: string | null;
  status: string | null;
  n_strategies: number | null;
  n_transitions: number | null;
  error: string | null;
}

export interface StrategyCreate {
  name: string;
  benchmark_ticker: string;
  risk_on_ticker: string;
  risk_off_ticker: string;
  k_threshold: number;
  enabled?: boolean;
  indicator_ids: number[];
}

export type TransactionSide = 'buy' | 'sell';

export interface Transaction {
  id: number;
  date: string;
  asset_ticker: string;
  side: TransactionSide;
  n_shares: string; // serialized Decimal
  price_per_share: string;
  currency: string;
  fx_rate_to_usd: string;
  fees: string;
  notes: string | null;
  strategy_id: number | null;
  created_at: string;
}

export interface TransactionCreate {
  date: string;
  asset_ticker: string;
  side: TransactionSide;
  n_shares: number | string;
  price_per_share: number | string;
  currency?: string;
  fx_rate_to_usd?: number | string;
  fees?: number | string;
  notes?: string | null;
  strategy_id?: number | null;
}

export interface PortfolioPosition {
  asset_ticker: string;
  n_shares: string;
  avg_cost_usd: string;
  invested_usd: string;
  current_price_usd: string | null;
  market_value_usd: string | null;
  pl_usd: string | null;
  pl_pct: number | null;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  invested_usd: string;
  market_value_usd: string;
  pl_usd: string;
  pl_pct: number | null;
}

export type CrisisVerdict = 'beats' | 'loses' | 'insufficient_data';

export interface CrisisPoint {
  date: string;
  strategy: number;
  spy: number;
}

export interface CrisisResult {
  name: string;
  label: string;
  start: string;
  end: string;
  verdict: CrisisVerdict;
  pct_above_spy: number | null;
  end_ratio: number | null;
  points: CrisisPoint[];
}

export interface CrisisAttribution {
  results: CrisisResult[];
  n_beats: number;
  n_eligible: number;
}

export type CriterionStatus = 'ok' | 'warn' | 'fail' | 'pending';

export interface CriterionScore {
  key: string;
  label: string;
  points: number;
  max_points: number;
  status: CriterionStatus;
  note: string;
}

export interface DeployScore {
  asof_date: string;
  range_start: string;
  range_end: string;
  total: number;
  tier_label: 'FAIL' | 'NEAR_FAIL' | 'MARGINAL' | 'PROMISING' | 'STRONG' | 'WINNER';
  winner_conditions_met: boolean;
  criteria: CriterionScore[];
}

export interface RollingCell {
  entry_date: string;
  sharpe: number | null;
  pct_above_spy: number | null;
}

export interface RollingRow {
  window_years: number;
  cells: RollingCell[];
}

export interface RollingStress {
  asof_date: string;
  history_start: string;
  window_years: number[];
  entry_dates: string[];
  rows: RollingRow[];
}

export interface CohortEntry {
  entry_date: string;
  label: string;
  forward_years: number;
  has_data: boolean;
  n_days: number;
  cagr: number | null;
  sharpe: number | null;
  max_drawdown: number | null;
}

export interface CohortReport {
  asof_date: string;
  forward_years: number;
  entries: CohortEntry[];
}
