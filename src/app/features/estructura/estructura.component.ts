import {
  Component, inject, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BlockStateService } from '../../core/block-state.service';
import { PeriodStateService } from '../../core/period-state.service';
import {
  EtapaBlock, BLOCKS,
} from '../../core/blocks.model';
import { PeriodScheduleState } from '../../core/periods.model';

const ICON_PATHS: Record<string, string> = {
  sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z',
  bookOpen: 'M12 7v14M3 18a1 1 0 01-1-1V4a1 1 0 011-1h5a4 4 0 014 4 4 4 0 014-4h5a1 1 0 011 1v13a1 1 0 01-1 1h-6a3 3 0 00-3 3 3 3 0 00-3-3z',
  graduation: 'M21.42 10.922a1 1 0 00-.019-1.838L12.83 5.18a2 2 0 00-1.66 0L2.6 9.08a1 1 0 000 1.832l8.57 3.908a2 2 0 001.66 0z M22 10v6M6 12.5V16a6 3 0 0012 0v-3.5',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  sparkles: 'M9.94 14.34A2 2 0 008.66 13.06L3 11l5.66-2.06a2 2 0 001.28-1.28L12 2l2.06 5.66a2 2 0 001.28 1.28L21 11l-5.66 2.06a2 2 0 00-1.28 1.28L12 20z M19 3v4M21 5h-4',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 18a6 6 0 100-12 6 6 0 000 12z M12 14a2 2 0 100-4 2 2 0 000 4z',
  check: 'M20 6L9 17l-5-5',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2',
  alert: 'm21.73 18-8-14a2 2 0 00-3.48 0l-8 14A2 2 0 004 21h16a2 2 0 001.73-3z M12 9v4M12 17h.01',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  doorOpen: 'M13 4h3a2 2 0 012 2v14M2 20h3M13 20h9M10 12v.01M13 4.562v16.157a1 1 0 01-1.242.97L5 20V5.562a2 2 0 011.515-1.94l4-1A2 2 0 0113 4.561z',
  bookOpenSmall: 'M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 8h.01M11 12h1v4h1',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
};

const BLK_STATUS: Record<PeriodScheduleState, { tone: string; icon: string; label: string }> = {
  none:      { tone: 'neutral', icon: 'clock',       label: 'Sin generar' },
  generating:{ tone: 'warning', icon: 'clock',       label: 'Generando…' },
  conflicts: { tone: 'warning', icon: 'alert',       label: 'Con conflictos' },
  ok:        { tone: 'success', icon: 'check',       label: 'Sin conflictos' },
  published: { tone: 'success', icon: 'check',       label: 'Publicado' },
};

const TONE_BG: Record<string, string> = {
  neutral: 'var(--secondary)',
  warning: 'var(--warning-tint)',
  success: 'var(--success-tint)',
};
const TONE_FG: Record<string, string> = {
  neutral: 'var(--secondary-foreground)',
  warning: 'oklch(0.45 0.11 65)',
  success: 'var(--success)',
};

@Component({
  selector: 'app-estructura',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">

      <!-- Cabecera -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
        gap:16px;margin-bottom:22px;flex-wrap:wrap">
        <div>
          <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">
            Estructura del centro
          </h1>
          <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
            {{ schoolName() }} · un único centro con varias etapas
          </p>
        </div>
        @if (activeBlock() !== 'all') {
          <button class="btn-secondary" (click)="blockState.setActiveBlock('all')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path [attr.d]="ICON_PATHS['building']"/>
            </svg>
            Ver todo el colegio
          </button>
        }
      </div>

      <!-- Banner agregado del centro -->
      <div class="centro-banner" style="margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:16px;
          padding:20px 24px;flex-wrap:wrap">
          <div style="width:54px;height:54px;border-radius:14px;
            background:rgba(255,255,255,0.16);display:flex;align-items:center;
            justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;
            box-shadow:inset 0 0 0 1px rgba(255,255,255,0.28)">
            MH
          </div>
          <div style="flex:1;min-width:200px">
            <div style="font-size:var(--text-xl);font-weight:800;letter-spacing:-0.02em">
              {{ schoolName() }}
            </div>
            <div style="font-size:var(--text-sm);opacity:0.9;margin-top:3px">
              Infantil · Primaria · Secundaria · Alcalá de Henares, Madrid
            </div>
          </div>
          <div style="display:flex;gap:26px;flex-wrap:wrap">
            @for (stat of centerStats(); track stat.label) {
              <div>
                <div style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em;line-height:1">
                  {{ stat.value }}
                </div>
                <div style="font-size:10.5px;opacity:0.82;font-weight:600;
                  text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">
                  {{ stat.label }}
                </div>
              </div>
            }
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:9px;
          padding:11px 24px;border-top:1px solid rgba(255,255,255,0.18);
          font-size:var(--text-sm)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="opacity:0.9;flex-shrink:0">
            <path [attr.d]="ICON_PATHS['info']"/>
          </svg>
          <span style="opacity:0.92">
            Cada etapa genera su horario con sus propios ciclos y jornada. Selecciona una etapa arriba para trabajar solo con ella.
          </span>
        </div>
      </div>

      <!-- Columnas de bloque -->
      <div class="blocks-grid">
        @for (b of blocks; track b.id) {
          <div class="block-card"
            [style.opacity]="isBlockDimmed(b.id) ? '0.5' : '1'"
            [style.border]="activeBlock() === b.id ? '1.5px solid ' + b.color : '1px solid var(--border)'"
            [style.box-shadow]="activeBlock() === b.id ? '0 8px 24px ' + b.tint2 : 'var(--shadow-sm)'">

            <!-- Header de la tarjeta -->
            <div style="padding:16px 18px;border-bottom:1px solid var(--border);"
              [style.background]="b.tint">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="width:44px;height:44px;border-radius:12px;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;"
                  [style.background]="b.color" [style.color]="'#fff'">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="ICON_PATHS[b.iconKey]"/>
                  </svg>
                </span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;font-size:var(--text-lg);letter-spacing:-0.01em"
                    [style.color]="b.strong">{{ b.short }}</div>
                  <div style="font-size:var(--text-xs);font-weight:600;opacity:0.85"
                    [style.color]="b.fg">{{ b.name }} · {{ b.ages }}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:7px;margin-top:12px">
                <span class="status-badge"
                  [style.background]="blkStatusBg(b)"
                  [style.color]="blkStatusFg(b)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path [attr.d]="ICON_PATHS[blkStatusIcon(b)]"/>
                  </svg>
                  {{ blkStatusLabel(b) }}
                </span>
                <span style="font-size:11px;font-weight:600;opacity:0.8"
                  [style.color]="b.fg">· {{ periodName() }}</span>
              </div>
            </div>

            <!-- Ciclos -->
            <div style="padding:14px 18px">
              <div style="font-size:10.5px;font-weight:700;color:var(--muted-foreground);
                text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
                {{ b.ciclos.length }} {{ b.ciclos.length === 1 ? 'ciclo' : 'ciclos' }} · {{ b.areasLabel }}
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (c of b.ciclos; track c.id) {
                  <div style="display:flex;align-items:center;gap:11px;
                    padding:10px 11px;background:var(--surface-2);border-radius:var(--radius-md)">
                    <span style="width:26px;height:26px;border-radius:7px;flex-shrink:0;
                      display:flex;align-items:center;justify-content:center;"
                      [style.background]="b.tint" [style.color]="b.fg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path [attr.d]="ICON_PATHS['layers']"/>
                      </svg>
                    </span>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:700;font-size:var(--text-sm)">{{ c.name }}</div>
                      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                        @for (cu of c.cursos; track cu) {
                          <span style="font-size:10.5px;font-weight:700;
                            border-radius:5px;padding:2px 6px"
                            [style.color]="b.fg" [style.background]="b.tint">{{ cu }}</span>
                        }
                      </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="font-weight:800;font-size:var(--text-base)">{{ c.grupos }}</div>
                      <div style="font-size:10px;color:var(--muted-foreground);font-weight:600">grupos</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Stats + jornada + acciones -->
            <div style="padding:0 18px 14px">
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
                @for (s of blockStats(b); track s.label) {
                  <div style="background:var(--surface-2);border-radius:var(--radius-md);
                    padding:9px 6px;text-align:center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                      [style.color]="b.fg" style="margin:0 auto 3px;display:block">
                      <path [attr.d]="ICON_PATHS[s.icon]"/>
                    </svg>
                    <div style="font-weight:800;font-size:var(--text-sm)">{{ s.value }}</div>
                    <div style="font-size:10px;color:var(--muted-foreground);font-weight:600">{{ s.label }}</div>
                  </div>
                }
              </div>

              <div style="display:flex;align-items:center;gap:7px;
                font-size:11px;color:var(--muted-foreground);margin-bottom:12px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="ICON_PATHS['clock']"/>
                </svg>
                Jornada {{ b.jornada.tipo }} · {{ b.jornada.entrada }}–{{ b.jornada.salida }} · {{ b.jornada.slots }} sesiones
              </div>

              <div style="display:flex;gap:8px">
                @if (blockSched(b) === 'none') {
                  <button class="btn-primary" style="flex:1;justify-content:center"
                    (click)="generateBlock(b)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path [attr.d]="ICON_PATHS['sparkles']"/>
                    </svg>
                    Generar
                  </button>
                } @else {
                  <button class="btn-secondary" style="flex:1;justify-content:center"
                    (click)="viewBlock(b)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path [attr.d]="ICON_PATHS['eye']"/>
                    </svg>
                    Ver horario
                  </button>
                }
                <button title="{{ activeBlock() === b.id ? 'Quitar selección' : 'Trabajar con esta etapa' }}"
                  style="width:38px;height:34px;border-radius:var(--radius-md);
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;
                    cursor:pointer;transition:all .15s"
                  [style.border]="activeBlock() === b.id ? '1px solid ' + b.color : '1px solid var(--border-strong)'"
                  [style.background]="activeBlock() === b.id ? b.tint : 'var(--card)'"
                  [style.color]="activeBlock() === b.id ? b.strong : 'var(--muted-foreground)'"
                  (click)="toggleBlock(b)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                    [attr.stroke-width]="activeBlock() === b.id ? 2.5 : 1.75">
                    @if (activeBlock() === b.id) {
                      <path [attr.d]="ICON_PATHS['check']"/>
                    } @else {
                      <path [attr.d]="ICON_PATHS['target']"/>
                    }
                  </svg>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .centro-banner {
      border-radius: var(--radius-xl); overflow: hidden; color: #fff;
      background: linear-gradient(135deg, var(--primary-strong), var(--primary) 60%, oklch(0.55 0.13 305));
      box-shadow: var(--shadow-md);
    }
    .blocks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px; align-items: start;
    }
    .block-card {
      background: var(--card); border-radius: var(--radius-xl);
      overflow: hidden; transition: all .2s;
    }
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: var(--text-xs); font-weight: 700; padding: 4px 10px;
      border-radius: var(--radius-full); white-space: nowrap;
    }
  `],
})
export class EstructuraComponent {
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly blockState = inject(BlockStateService);
  protected readonly periodState = inject(PeriodStateService);

  protected readonly ICON_PATHS = ICON_PATHS;
  protected readonly blocks: EtapaBlock[] = BLOCKS;

  readonly activeBlock = this.blockState.activeBlock;
  readonly schoolName = this.auth.schoolName;

  readonly periodName = computed(() => {
    const p = this.periodState.activePeriod();
    return p === 'completa' ? 'Jornada completa' : 'Jornada reducida';
  });

  readonly centerStats = computed(() => {
    const tot = BLOCKS.reduce(
      (a, b) => ({
        grupos: a.grupos + b.nGroups,
        ciclos: a.ciclos + b.ciclos.length,
        profes: a.profes + b.nTeachers,
      }),
      { grupos: 0, ciclos: 0, profes: 0 },
    );
    return [
      { label: 'Etapas',      value: BLOCKS.length },
      { label: 'Ciclos',      value: tot.ciclos },
      { label: 'Grupos',      value: tot.grupos },
      { label: 'Profesorado', value: tot.profes },
    ];
  });

  isBlockDimmed(id: string): boolean {
    const ab = this.activeBlock();
    return ab !== 'all' && ab !== id;
  }

  blockSched(b: EtapaBlock): PeriodScheduleState {
    return (b.sched[this.periodState.activePeriod()] ?? 'none') as PeriodScheduleState;
  }

  blkStatusBg(b: EtapaBlock): string {
    return TONE_BG[BLK_STATUS[this.blockSched(b)].tone] ?? 'var(--secondary)';
  }
  blkStatusFg(b: EtapaBlock): string {
    return TONE_FG[BLK_STATUS[this.blockSched(b)].tone] ?? 'var(--secondary-foreground)';
  }
  blkStatusIcon(b: EtapaBlock): string {
    return BLK_STATUS[this.blockSched(b)].icon;
  }
  blkStatusLabel(b: EtapaBlock): string {
    return BLK_STATUS[this.blockSched(b)].label;
  }

  blockStats(b: EtapaBlock) {
    return [
      { icon: 'users',         value: b.nTeachers, label: 'Profes' },
      { icon: 'doorOpen',      value: b.nRooms,    label: 'Aulas' },
      { icon: 'bookOpenSmall', value: b.nSubjects,  label: b.id === 'inf' ? 'Áreas' : 'Asign.' },
    ];
  }

  generateBlock(b: EtapaBlock): void {
    this.blockState.setActiveBlock(b.id);
    this.router.navigate(['/generador']);
  }

  viewBlock(b: EtapaBlock): void {
    this.blockState.setActiveBlock(b.id);
    this.router.navigate(['/horarios']);
  }

  toggleBlock(b: EtapaBlock): void {
    const current = this.activeBlock();
    this.blockState.setActiveBlock(current === b.id ? 'all' : b.id);
  }
}
