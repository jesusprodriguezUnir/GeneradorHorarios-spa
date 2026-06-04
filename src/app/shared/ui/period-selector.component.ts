import {
  Component, Input, Output, EventEmitter, signal, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  CoursePeriod, PeriodId, PeriodScheduleState, ScheduleStateByPeriod,
  COURSE_PERIODS, PERIOD_STATE_COLORS, PERIOD_STATE_LABELS,
} from '../../core/periods.model';

@Component({
  selector: 'app-period-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style.position]="'relative'" [style.width]="block ? '100%' : 'auto'">

      <!-- Trigger button -->
      <button (click)="_open.update(v => !v)" [style]="btnStyle()">
        <!-- Icono calendar -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          style="flex-shrink:0;opacity:0.9">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>

        <span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;"
          [style.flex]="block ? '1' : 'none'">
          <span style="font-weight:700;font-size:var(--text-sm)">{{ currentPeriod().name }}</span>
          <span style="font-size:10.5px;font-weight:600;opacity:0.72">
            {{ currentPeriod().months }} · {{ currentPeriod().jornada }}
          </span>
        </span>

        <!-- Chevron -->
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          style="flex-shrink:0;opacity:0.8;transition:transform .18s"
          [style.transform]="_open() ? 'rotate(180deg)' : 'none'">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <!-- Overlay + Dropdown -->
      @if (_open()) {
        <div (click)="_open.set(false)"
          style="position:fixed;inset:0;z-index:80"></div>

        <div class="lec-scale-in" style="
          position:absolute;top:calc(100% + 8px);
          width:288px;background:var(--card);
          border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
          border:1px solid var(--border);padding:7px;z-index:90;"
          [style.right]="block ? 'auto' : '0'"
          [style.left]="block ? '0' : 'auto'">

          <div style="font-size:10.5px;font-weight:700;color:var(--muted-foreground);
            text-transform:uppercase;letter-spacing:0.05em;padding:7px 9px 6px">
            Periodo del curso 2025/26
          </div>

          @for (p of periods; track p.id) {
            <button (click)="select(p.id)"
              style="display:flex;align-items:center;gap:11px;width:100%;
                padding:10px;border-radius:var(--radius-md);text-align:left;
                transition:background .12s;cursor:pointer;"
              [style.background]="p.id === period ? 'var(--primary-tint)' : 'transparent'">

              <!-- Icono periodo -->
              <div style="width:34px;height:34px;border-radius:var(--radius-md);flex-shrink:0;
                display:flex;align-items:center;justify-content:center;"
                [style.background]="p.id === period ? 'var(--primary)' : 'var(--secondary)'"
                [style.color]="p.id === period ? '#fff' : 'var(--muted-foreground)'">
                @if (p.tarde) {
                  <!-- Icono layers (jornada partida) -->
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                } @else {
                  <!-- Icono sol / mañana -->
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                }
              </div>

              <!-- Info del periodo -->
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:var(--text-sm)"
                  [style.color]="p.id === period ? 'var(--primary-strong)' : 'var(--foreground)'">
                  {{ p.name }}
                </div>
                <div style="font-size:11px;color:var(--muted-foreground);margin-top:1px">
                  {{ p.months }} · {{ p.rangeLabel }} · {{ p.lec }} ses/día
                </div>
                <!-- Estado dot -->
                <div style="display:flex;align-items:center;gap:5px;margin-top:4px">
                  <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0"
                    [style.background]="dotColor(p.id)"></span>
                  <span style="font-size:10.5px;font-weight:600;color:var(--muted-foreground)">
                    {{ stateLabel(p.id) }}
                  </span>
                </div>
              </div>

              <!-- Checkmark si activo -->
              @if (p.id === period) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  style="flex-shrink:0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class PeriodSelectorComponent {
  @Input() period: PeriodId = 'completa';
  @Input() schedByPeriod: ScheduleStateByPeriod = {};
  @Input() variant: 'onPrimary' | 'light' = 'onPrimary';
  @Input() block = false;
  @Output() periodChange = new EventEmitter<PeriodId>();

  readonly _open = signal(false);

  readonly periods: CoursePeriod[] = COURSE_PERIODS;

  readonly currentPeriod = computed(() =>
    COURSE_PERIODS.find(p => p.id === this.period) ?? COURSE_PERIODS[0],
  );

  btnStyle(): string {
    const base = `display:flex;align-items:center;gap:9px;padding:8px 12px;
      border-radius:var(--radius-md);font-weight:700;font-size:var(--text-sm);
      transition:all .15s;cursor:pointer;width:${this.block ? '100%' : 'auto'};`;
    if (this.variant === 'onPrimary') {
      return base + `background:rgba(255,255,255,0.14);color:#fff;
        border:1px solid rgba(255,255,255,0.18);`;
    }
    return base + `background:var(--card);color:var(--foreground);
      border:1px solid var(--border-strong);`;
  }

  dotColor(id: PeriodId): string {
    const state = (this.schedByPeriod[id] ?? 'none') as PeriodScheduleState;
    return PERIOD_STATE_COLORS[state];
  }

  stateLabel(id: PeriodId): string {
    const state = (this.schedByPeriod[id] ?? 'none') as PeriodScheduleState;
    return PERIOD_STATE_LABELS[state];
  }

  select(id: PeriodId): void {
    this._open.set(false);
    this.periodChange.emit(id);
  }
}
