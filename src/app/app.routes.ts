import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Login - iFinance Capital',
  },
  {
    path: 'hub',
    loadComponent: () =>
      import('./features/hub/hub.component').then((m) => m.HubComponent),
    canActivate: [authGuard],
    title: 'Central de Operações - iFinance Capital',
  },
  {
    path: 'investments',
    loadComponent: () =>
      import('./core/layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'strategy',
        pathMatch: 'full',
      },
      {
        path: 'strategy',
        loadComponent: () =>
          import('./features/investments/pages/strategy-page.component').then(
            (m) => m.StrategyPageComponent
          ),
        title: 'Estratégia de Metas - iFinance Capital',
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./features/investments/pages/portfolio-page.component').then(
            (m) => m.PortfolioPageComponent
          ),
        title: 'Carteira & Cotações - iFinance Capital',
      },
      {
        path: 'aportes',
        loadComponent: () =>
          import('./features/investments/pages/aportes-page.component').then(
            (m) => m.AportesPageComponent
          ),
        title: 'Aportes Inteligentes - iFinance Capital',
      },
    ],
  },
  {
    path: 'financial',
    loadComponent: () =>
      import('./core/layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/financial/pages/financial-dashboard-page.component'
          ).then((m) => m.FinancialDashboardPageComponent),
        title: 'Dashboard Financeiro - iFinance Capital',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'hub',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'hub',
  },
];
