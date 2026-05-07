import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'strategies',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/strategies/strategies-list').then((m) => m.StrategiesListComponent),
  },
  {
    path: 'strategies/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/strategies/strategy-form').then((m) => m.StrategyFormComponent),
  },
  {
    path: 'strategies/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/strategy-detail/strategy-detail').then((m) => m.StrategyDetailComponent),
  },
  {
    path: 'indicators',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/indicators/indicators-list').then((m) => m.IndicatorsListComponent),
  },
  {
    path: 'indicators/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  {
    path: 'indicators/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/indicators/indicator-form').then((m) => m.IndicatorFormComponent),
  },
  {
    path: 'portfolio',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/portfolio/portfolio').then((m) => m.PortfolioComponent),
  },
  {
    path: 'compare',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/compare/compare').then((m) => m.CompareComponent),
  },
  {
    path: 'digest',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/digest/digest').then((m) => m.DigestComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
