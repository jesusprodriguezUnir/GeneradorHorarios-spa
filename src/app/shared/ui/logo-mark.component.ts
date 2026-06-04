import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * LogoMark — símbolo de marca Lectivo: mini-rejilla 2×2 con celda coral.
 *
 * - `size`:  tamaño en px del contenedor cuadrado (default 32).
 * - `mono`:  variante monochrome para fondo oscuro (cabecera/sidebar índigo).
 *            En modo mono la celda coral se convierte en blanca al 55%.
 */
@Component({
  selector: 'app-logo-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style]="containerStyle()">
      <span [style]="cellStyle(0.95)"></span>
      <span [style]="accentStyle()"></span>
      <span [style]="cellStyle(0.55)"></span>
      <span [style]="cellStyle(0.95)"></span>
    </div>
  `,
})
export class LogoMarkComponent {
  readonly size  = input<number>(32);
  readonly mono  = input<boolean>(false);

  protected readonly containerStyle = computed(() => {
    const s = this.size();
    const bg = this.mono() ? 'rgba(255,255,255,0.16)' : 'var(--primary)';
    const shadow = this.mono() ? 'none' : 'var(--shadow-primary)';
    return [
      `width:${s}px`, `height:${s}px`,
      `border-radius:${Math.round(s * 0.28)}px`,
      `background:${bg}`,
      `display:grid`,
      `grid-template-columns:1fr 1fr`,
      `grid-template-rows:1fr 1fr`,
      `gap:${Math.round(s * 0.07)}px`,
      `padding:${Math.round(s * 0.20)}px`,
      `box-shadow:${shadow}`,
      `flex-shrink:0`,
    ].join(';');
  });

  protected cellStyle(opacity: number): string {
    return `background:#fff;border-radius:2px;opacity:${opacity}`;
  }

  protected readonly accentStyle = computed(() => {
    const accent = this.mono()
      ? 'rgba(255,255,255,0.55)'
      : 'var(--accent)';
    return `background:${accent};border-radius:2px`;
  });
}
