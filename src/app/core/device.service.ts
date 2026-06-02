import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Detecta si el viewport está en modo móvil (< 760px).
 * Equivalente a `useViewport` del prototipo Lectivo.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _isMobile = signal(false);
  readonly isMobile = this._isMobile.asReadonly();

  private resizeRaf?: number;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.update();
      window.addEventListener('resize', this.onResize);
    }
  }

  private readonly onResize = (): void => {
    if (this.resizeRaf !== undefined) cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => this.update());
  };

  private update(): void {
    this._isMobile.set(window.innerWidth < 760);
  }
}
