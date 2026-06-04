import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Login (pública)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
    title: 'Lectivo — Acceder',
  },

  // Shell autenticada
  {
    path: '',
    loadComponent: () =>
      import('./shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      // Profesor
      {
        path: 'horario',
        loadComponent: () =>
          import('./features/my-schedule/my-schedule.component').then(m => m.MyScheduleComponent),
        title: 'Lectivo — Mi horario',
        data: { preload: true },
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/teacher-profile/teacher-profile.component').then(m => m.TeacherProfileComponent),
        title: 'Lectivo — Mi perfil',
      },
      // Admin
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Panel',
        data: { preload: true },
      },
      {
        path: 'generador',
        loadComponent: () =>
          import('./features/generator/generator.component').then(m => m.GeneratorComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Generador',
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./features/schedule-result/schedule-result.component').then(m => m.ScheduleResultComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Horarios',
      },
      {
        path: 'horarios/:id',
        loadComponent: () =>
          import('./features/schedule-result/schedule-result.component').then(m => m.ScheduleResultComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Ver horario',
      },
      {
        path: 'estructura',
        loadComponent: () =>
          import('./features/estructura/estructura.component').then(m => m.EstructuraComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Estructura del centro',
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./features/config/config.component').then(m => m.ConfigComponent),
        canActivate: [adminGuard],
        title: 'Lectivo — Configuración',
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
