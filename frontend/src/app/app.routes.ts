import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'strategies',
    loadComponent: () =>
      import('./pages/strategies/strategies-list').then((m) => m.StrategiesListComponent),
  },
  {
    path: 'strategies/new',
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id/edit',
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id',
    loadComponent: () =>
      import('./pages/strategy-detail/strategy-detail').then((m) => m.StrategyDetailComponent),
  },
  {
    path: 'indicators',
    loadComponent: () =>
      import('./pages/indicators/indicators-list').then((m) => m.IndicatorsListComponent),
  },
  {
    path: 'indicators/new',
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  {
    path: 'indicators/:id/edit',
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
