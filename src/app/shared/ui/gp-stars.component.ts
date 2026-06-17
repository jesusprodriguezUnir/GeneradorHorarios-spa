import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/** Las 7 estrellas de la bandera de la Comunidad de Madrid — acento decorativo. */
@Component({
  selector: 'gp-stars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="74" height="40" viewBox="0 0 84 46" aria-hidden="true"
      style="position:absolute;top:12px;right:14px;pointer-events:none"
      [style.opacity]="light() ? 1 : 0.16">
      @for (p of points; track $index) {
        <path [attr.d]="starPath(p[0], p[1])" [attr.fill]="light() ? 'rgba(255,255,255,0.5)' : 'var(--madrid)'"></path>
      }
    </svg>
  `,
})
export class GpStarsComponent {
  readonly light = input(false);
  // disposición 2-3-2 de las estrellas
  protected readonly points: [number, number][] = [
    [0, 0], [1, 0], [0.5, 0.9], [1.5, 0.9], [2.5, 0.9], [0, 1.8], [1, 1.8],
  ];

  protected starPath(x: number, y: number): string {
    const cx = 12 + x * 24;
    const cy = 8 + y * 14;
    const outer = 5.5;
    const inner = 2.4;
    const pts = 5;
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / pts) * i - Math.PI / 2;
      d += (i === 0 ? 'M' : 'L') + (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2) + ' ';
    }
    return d + 'Z';
  }
}
