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
