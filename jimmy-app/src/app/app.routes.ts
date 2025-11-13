import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/products',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products').then(m => m.Products),
    canActivate: [authGuard]
  },
  {
    path: 'campaigns',
    loadComponent: () => import('./pages/campaigns/campaigns').then(m => m.Campaigns),
    canActivate: [authGuard]
  },
  {
    path: 'sales',
    loadComponent: () => import('./pages/sales/sales').then(m => m.Sales),
    canActivate: [authGuard]
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.Analytics),
    canActivate: [authGuard]
  },
  {
    path: 'sync',
    loadComponent: () => import('./pages/sync/sync').then(m => m.SyncComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/products'
  }
];
