import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/sync',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'sync',
    loadComponent: () => import('./pages/sync/sync.component').then(m => m.SyncComponent),
    canActivate: [authGuard]
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products').then(m => m.Products),
    canActivate: [authGuard]
  },
  {
    path: 'products/:id/prices',
    loadComponent: () => import('./pages/product-prices/product-prices').then(m => m.ProductPrices),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/sync'
  }
];
