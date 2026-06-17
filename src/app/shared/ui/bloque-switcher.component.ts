import {
  Component, input, output, signal, computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  BlockId, EtapaBlock, BLOCKS,
  BLOCK_STATE_COLORS, BLOCK_STATE_LABELS,
} from '../../core/blocks.model';
import { PeriodId, PeriodScheduleState } from '../../core/periods.model';

// SVG paths por iconKey
const ICON_PATHS: Record<string, string> = {
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z',
  bookOpen: 'M12 7v14M3 18a1 1 0 01-1-1V4a1 1 0 011-1h5a4 4 0 014 4 4 4 0 014-4h5a1 1 0 011 1v13a1 1 0 01-1 1h-6a3 3 0 00-3 3 3 3 0 00-3-3z',
  graduation: 'M21.42 10.922a1 1 0 00-.019-1.838L12.83 5.18a2 2 0 00-1.66 0L2.6 9.08a1 1 0 000 1.832l8.57 3.908a2 2 0 001.66 0z M22 10v6M6 12.5V16a6 3 0 0012 0v-3.5',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
};

@Component({
  selector: 'app-bloque-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style.position]="'relative'" [style.width]="full() ? '100%' : 'auto'">

      <!-- Trigger -->
      <button (click)="_open.update(v => !v)" [style]="btnStyle()">
        <!-- Icono de etapa activa -->
        <span style="width:22px;height:22px;border-radius:7px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;"
          [style.background]="isAll() ? 'rgba(255,255,255,0.2)' : currentBlock()!.tint"
          [style.color]="isAll() ? '#fff' : currentBlock()!.fg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path [attr.d]="currentIconPath()" />
          </svg>
        </span>

        <span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.12;"
          [style.flex]="full() ? '1' : 'none'">
          <span style="font-weight:700;font-size:var(--text-sm)">
            {{ isAll() ? 'Todo el colegio' : currentBlock()!.short }}
          </span>
          <span style="font-size:10.5px;font-weight:600;opacity:0.72">
            {{ isAll() ? (blocks.length + ' etapas') : currentBlock()!.ages }}
          </span>
        </span>

        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          style="flex-shrink:0;opacity:0.8;transition:transform .18s"
          [style.transform]="_open() ? 'rotate(180deg)' : 'none'">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <!-- Dropdown -->
      @if (_open()) {
        <div (click)="_open.set(false)"
          style="position:fixed;inset:0;z-index:80"></div>

        <div class="lec-scale-in" style="
          position:absolute;top:calc(100% + 8px);
          width:302px;background:var(--card);
          border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
          border:1px solid var(--border);padding:7px;z-index:90;"
          [style.right]="full() ? 'auto' : '0'"
          [style.left]="full() ? '0' : 'auto'">

          <div style="font-size:10.5px;font-weight:700;color:var(--muted-foreground);
            text-transform:uppercase;letter-spacing:0.05em;padding:7px 9px 6px">
            Etapa del centro
          </div>

          <!-- Opción Todo el colegio -->
          <button (click)="select('all')" style="
            display:flex;align-items:center;gap:11px;width:100%;
            padding:10px;border-radius:var(--radius-md);text-align:left;
            transition:background .12s;cursor:pointer;"
            [style.background]="activeBlock() === 'all' ? 'var(--primary-tint)' : 'transparent'">
            <div style="width:34px;height:34px;border-radius:var(--radius-md);flex-shrink:0;
              display:flex;align-items:center;justify-content:center;"
              [style.background]="activeBlock() === 'all' ? 'var(--primary)' : 'var(--secondary)'"
              [style.color]="activeBlock() === 'all' ? '#fff' : 'var(--muted-foreground)'">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="ICON_PATHS['building']"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:var(--text-sm)"
                [style.color]="activeBlock() === 'all' ? 'var(--primary-strong)' : 'var(--foreground)'">
                Todo el colegio
              </div>
              <div style="font-size:11px;color:var(--muted-foreground);margin-top:1px">
                Vista agregada de las {{ blocks.length }} etapas
              </div>
            </div>
            @if (activeBlock() === 'all') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                style="flex-shrink:0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            }
          </button>

          <div style="height:1px;background:var(--border);margin:5px 7px"></div>

          <!-- Etapas -->
          @for (b of blocks; track b.id) {
            <button (click)="select(b.id)" style="
              display:flex;align-items:center;gap:11px;width:100%;
              padding:10px;border-radius:var(--radius-md);text-align:left;
              transition:background .12s;cursor:pointer;"
              [style.background]="activeBlock() === b.id ? b.tint : 'transparent'">

              <div style="width:34px;height:34px;border-radius:var(--radius-md);flex-shrink:0;
                display:flex;align-items:center;justify-content:center;"
                [style.background]="activeBlock() === b.id ? b.color : b.tint"
                [style.color]="activeBlock() === b.id ? '#fff' : b.fg">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="ICON_PATHS[b.iconKey]"/>
                </svg>
              </div>

              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:var(--text-sm)"
                  [style.color]="activeBlock() === b.id ? b.strong : 'var(--foreground)'">
                  {{ b.short }}
                </div>
                <div style="font-size:11px;color:var(--muted-foreground);margin-top:1px">
                  {{ b.ages }} · {{ b.nGroups }} grupos · {{ b.ciclos.length }} {{ b.ciclos.length === 1 ? 'ciclo' : 'ciclos' }}
                </div>
                <div style="display:flex;align-items:center;gap:5px;margin-top:4px">
                  <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0"
                    [style.background]="dotColor(b)"></span>
                  <span style="font-size:10.5px;font-weight:600;color:var(--muted-foreground)">
                    {{ stateLabel(b) }}
                  </span>
                </div>
              </div>

              @if (activeBlock() === b.id) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  [attr.stroke]="b.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
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
export class BloqueSwitcherComponent {
  readonly activeBlock = input<BlockId>('all');
  readonly period = input<PeriodId>('completa');
  readonly variant = input<'onPrimary' | 'light'>('onPrimary');
  readonly full = input<boolean>(false);
  readonly blockChange = output<BlockId>();

  protected readonly ICON_PATHS = ICON_PATHS;
  protected readonly blocks: EtapaBlock[] = BLOCKS;
  protected readonly _open = signal(false);

  readonly isAll = computed(() => this.activeBlock() === 'all');

  readonly currentBlock = computed((): EtapaBlock | null => {
    const active = this.activeBlock();
    if (active === 'all') return null;
    return BLOCKS.find(b => b.id === active) ?? null;
  });

  readonly currentIconPath = computed((): string => {
    const b = this.currentBlock();
    return b ? ICON_PATHS[b.iconKey] : ICON_PATHS['building'];
  });

  readonly btnStyle = computed(() => {
    const base = `display:flex;align-items:center;gap:9px;
      padding:6px 11px 6px 7px;border-radius:var(--radius-md);
      font-weight:700;font-size:var(--text-sm);transition:all .15s;cursor:pointer;
      width:${this.full() ? '100%' : 'auto'};`;
    if (this.variant() === 'onPrimary') {
      return base + `background:rgba(255,255,255,0.14);color:#fff;
        border:1px solid rgba(255,255,255,0.18);`;
    }
    return base + `background:var(--card);color:var(--foreground);
      border:1px solid var(--border-strong);`;
  });

  dotColor(b: EtapaBlock): string {
    const state = (b.sched[this.period()] ?? 'none') as PeriodScheduleState;
    return BLOCK_STATE_COLORS[state];
  }

  stateLabel(b: EtapaBlock): string {
    const state = (b.sched[this.period()] ?? 'none') as PeriodScheduleState;
    return BLOCK_STATE_LABELS[state];
  }

  select(id: BlockId): void {
    this._open.set(false);
    this.blockChange.emit(id);
  }
}
