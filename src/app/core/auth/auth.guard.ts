import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Si hay email guardado pero no usuario cargado, intentar cargar
  if (auth.emailHeader && !auth.isLoggedIn()) {
    await auth.loadCurrentUser();
  }

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login']);
  return false;
};
