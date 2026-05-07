import type { Strategy } from '../core/models';

export type CardState = 'on' | 'off' | 'borderline';

export function stateOf(s: Strategy): CardState {
  const sig = s.current_signal;
  if (!sig) return 'off';
  if (sig.risk_on) return 'on';
  if (sig.score === s.k_threshold) return 'borderline';
  return 'off';
}

export function stateLabel(s: Strategy): string {
  return ({ on: 'RISK ON', off: 'RISK OFF', borderline: 'BORDERLINE' } as const)[stateOf(s)];
}

export function badgeClass(s: Strategy): string {
  return ({ on: 'badge--success', off: 'badge--danger', borderline: 'badge--warn' } as const)[stateOf(s)];
}

export function cardAccentClass(s: Strategy): string {
  return ({ on: 'card--accent-success', off: 'card--accent-danger', borderline: 'card--accent-warn' } as const)[stateOf(s)];
}

export function scoreClass(s: Strategy): string {
  const k = s.k_threshold;
  const score = s.current_signal?.score ?? 0;
  if (score > k) return 'text-success';
  if (score === k) return 'text-warn';
  return 'text-danger';
}
