import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  isDevMode
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless — Angular 20 (constitución art. 3.2)
    provideZonelessChangeDetection(),

    // Router con lazy loading
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HTTP con interceptor de auth
    provideHttpClient(withInterceptors([authInterceptor])),

    // Animaciones asíncronas
    provideAnimationsAsync(),

    // PrimeNG con tema Aura personalizado (tokens Lectivo aplicados vía CSS vars)
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.lectivo-dark',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, app-styles',
          },
        },
      },
    }),

    // PWA Service Worker
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // Servicios de feedback PrimeNG
    MessageService,
    ConfirmationService,
  ],
};
