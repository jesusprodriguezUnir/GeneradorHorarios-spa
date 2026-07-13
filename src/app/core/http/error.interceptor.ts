import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from '../auth/auth.service';

/**
 * Interceptor global de errores HTTP: manejo centralizado de 401/403,
 * caídas de red y errores del servidor. El error se re-lanza siempre para
 * que cada llamador pueda añadir su propio manejo específico si lo necesita.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(MessageService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        switch (err.status) {
          case 401:
            // Sesión inválida: limpiar estado y volver al login (salvo el propio /auth/me)
            if (!req.url.endsWith('/auth/me')) {
              auth.logout();
            }
            break;
          case 403:
            toast.add({
              severity: 'warn', summary: 'Sin permisos',
              detail: 'No tienes permisos para realizar esta acción.',
            });
            break;
          case 0:
            toast.add({
              severity: 'error', summary: 'Sin conexión',
              detail: 'No se pudo conectar con el servidor. Comprueba tu conexión.',
            });
            break;
          default:
            if (err.status >= 500) {
              toast.add({
                severity: 'error', summary: 'Error del servidor',
                detail: 'Se produjo un error inesperado. Inténtalo de nuevo.',
              });
            }
        }
      }
      return throwError(() => err);
    })
  );
};
