import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Interceptor que añade el header X-User-Email a cada petición.
 * Esto simula la autenticación hasta integrar Supabase/JWT.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const email = auth.emailHeader;

  if (email) {
    const cloned = req.clone({
      setHeaders: { 'X-User-Email': email },
    });
    return next(cloned);
  }

  return next(req);
};
