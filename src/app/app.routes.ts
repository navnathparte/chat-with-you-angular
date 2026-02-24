import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth';

export const routes: Routes = [
  { path: '', redirectTo: '/chat', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./pages/chat/chat-layout/chat-layout').then((m) => m.ChatLayoutComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/chat' },
];
