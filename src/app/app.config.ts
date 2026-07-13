import {
  ApplicationConfig,
  provideZonelessChangeDetection,
  isDevMode
} from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { SelectivePreloadingStrategy } from './core/selective-preloading-strategy';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless — Angular 20 (constitución art. 3.2)
    provideZonelessChangeDetection(),

    // Router con lazy loading selectivo
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),

    // HTTP con interceptores de auth y manejo global de errores
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),

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
