import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CohortReport,
  CrisisAttribution,
  DeployScore,
  Indicator,
  IndicatorTypeInfo,
  PortfolioSummary,
  RefreshStatus,
  RollingStress,
  SignalSnapshot,
  SignalTransition,
  Strategy,
  StrategyCreate,
  StrategyReport,
  Transaction,
  TransactionCreate,
} from './models';

const BASE_URL = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Indicators
  listIndicators(): Observable<Indicator[]> {
    return this.http.get<Indicator[]>(`${BASE_URL}/indicators`);
  }

  getIndicator(id: number): Observable<Indicator> {
    return this.http.get<Indicator>(`${BASE_URL}/indicators/${id}`);
  }

  createIndicator(body: Partial<Indicator>): Observable<Indicator> {
    return this.http.post<Indicator>(`${BASE_URL}/indicators`, body);
  }

  updateIndicator(id: number, body: Partial<Indicator>): Observable<Indicator> {
    return this.http.put<Indicator>(`${BASE_URL}/indicators/${id}`, body);
  }

  deleteIndicator(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/indicators/${id}`);
  }

  listIndicatorTypes(): Observable<IndicatorTypeInfo[]> {
    return this.http.get<IndicatorTypeInfo[]>(`${BASE_URL}/indicators/types`);
  }

  // Strategies
  listStrategies(): Observable<Strategy[]> {
    return this.http.get<Strategy[]>(`${BASE_URL}/strategies`);
  }

  getStrategy(id: number): Observable<Strategy> {
    return this.http.get<Strategy>(`${BASE_URL}/strategies/${id}`);
  }

  createStrategy(body: StrategyCreate): Observable<Strategy> {
    return this.http.post<Strategy>(`${BASE_URL}/strategies`, body);
  }

  updateStrategy(id: number, body: Partial<StrategyCreate>): Observable<Strategy> {
    return this.http.put<Strategy>(`${BASE_URL}/strategies/${id}`, body);
  }

  deleteStrategy(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/strategies/${id}`);
  }

  cloneStrategy(id: number): Observable<Strategy> {
    return this.http.post<Strategy>(`${BASE_URL}/strategies/${id}/clone`, {});
  }

  // Signals
  signalHistory(strategyId: number, range: string = '1y'): Observable<SignalSnapshot[]> {
    return this.http.get<SignalSnapshot[]>(
      `${BASE_URL}/signals/${strategyId}/history?range=${range}`
    );
  }

  transitions(strategyId: number, limit: number = 50): Observable<SignalTransition[]> {
    return this.http.get<SignalTransition[]>(
      `${BASE_URL}/signals/${strategyId}/transitions?limit=${limit}`
    );
  }

  recentTransitions(days: number = 7): Observable<SignalTransition[]> {
    return this.http.get<SignalTransition[]>(`${BASE_URL}/signals/transitions/recent?days=${days}`);
  }

  // Refresh
  triggerRefresh(force: boolean = false): Observable<RefreshStatus> {
    return this.http.post<RefreshStatus>(`${BASE_URL}/refresh?force=${force}`, {});
  }

  refreshStatus(): Observable<RefreshStatus> {
    return this.http.get<RefreshStatus>(`${BASE_URL}/refresh/status`);
  }

  // AI reports
  latestReport(strategyId: number): Observable<StrategyReport | null> {
    return this.http.get<StrategyReport | null>(`${BASE_URL}/strategies/${strategyId}/report`);
  }

  regenerateReport(strategyId: number): Observable<StrategyReport> {
    return this.http.post<StrategyReport>(`${BASE_URL}/strategies/${strategyId}/report`, {});
  }

  crisisAttribution(strategyId: number): Observable<CrisisAttribution> {
    return this.http.get<CrisisAttribution>(
      `${BASE_URL}/strategies/${strategyId}/crisis-attribution`
    );
  }

  deployScore(strategyId: number, bonusPts = 0, rangeYears = 10): Observable<DeployScore> {
    const url = `${BASE_URL}/strategies/${strategyId}/deploy-score`
      + `?range_years=${rangeYears}&bonus_pts=${bonusPts}`;
    return this.http.get<DeployScore>(url);
  }

  rollingStress(strategyId: number, stepMonths = 3): Observable<RollingStress> {
    const url = `${BASE_URL}/backtest/${strategyId}/rolling-stress?step_months=${stepMonths}`;
    return this.http.post<RollingStress>(url, {});
  }

  cohortEntry(strategyId: number, forwardYears = 5): Observable<CohortReport> {
    const url = `${BASE_URL}/strategies/${strategyId}/cohort-entry?forward_years=${forwardYears}`;
    return this.http.get<CohortReport>(url);
  }

  // Transactions / portfolio
  listTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${BASE_URL}/transactions`);
  }

  createTransaction(body: TransactionCreate): Observable<Transaction> {
    return this.http.post<Transaction>(`${BASE_URL}/transactions`, body);
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/transactions/${id}`);
  }

  getPortfolio(): Observable<PortfolioSummary> {
    return this.http.get<PortfolioSummary>(`${BASE_URL}/portfolio`);
  }
}
