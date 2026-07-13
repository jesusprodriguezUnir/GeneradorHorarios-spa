import { HttpErrorResponse } from '@angular/common/http';

/** Código de estado HTTP de un error desconocido, o null si no es un error HTTP. */
export function httpStatus(err: unknown): number | null {
  return err instanceof HttpErrorResponse ? err.status : null;
}

/** Mensaje legible de un error de la API, con fallback si no hay mensaje del servidor. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const serverMsg = (err.error as { message?: string } | null)?.message;
    if (serverMsg) return serverMsg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
