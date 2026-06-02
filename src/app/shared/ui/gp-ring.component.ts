import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';

/** Anillo de progreso circular con el porcentaje en el centro. */
@Component({
  selector: 'gp-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style.width.px]="size" [style.height.px]="size" style="position:relative;flex-shrink:0">
      <svg [attr.width]="size" [attr.height]="size" style="transform:rotate(-90deg)">
        <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="r" fill="none" stroke="var(--muted)" stroke-width="6"></circle>
        <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="r" fill="none" [attr.stroke]="tone" stroke-width="6"
          stroke-linecap="round" [attr.stroke-dasharray]="circ()" [attr.stroke-dashoffset]="offset()"
          style="transition:stroke-dashoffset .6s cubic-bezier(0.22,1,0.36,1)"></circle>
      </svg>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;letter-spacing:-0.02em"
        [style.font-size.px]="size*0.28">{{ pct() }}</div>
    </div>
  `,
})
export class GpRingComponent {
  readonly pct = signal(0);
  @Input() set value(v: number) { this.pct.set(v); }
  @Input() size = 56;
  @Input() tone = 'var(--primary)';

  protected get r() { return (this.size - 8) / 2; }
  protected readonly circ = computed(() => 2 * Math.PI * this.r);
  protected readonly offset = computed(() => this.circ() * (1 - this.pct() / 100));
}
