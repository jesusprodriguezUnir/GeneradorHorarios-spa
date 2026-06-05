import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TeachersApiService } from '../../core/api/teachers-api.service';
import { GroupsApiService } from '../../core/api/groups-api.service';
import { SchedulesApiService } from '../../core/api/schedules-api.service';
import { ClassroomsApiService } from '../../core/api/classrooms-api.service';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { BlockStateService } from '../../core/block-state.service';
import { AuthService } from '../../core/auth/auth.service';
import { Teacher, CourseGroup, Classroom, ScheduleList, SchoolStage, SUBJECT_COLORS } from '../../core/models';
import { PeriodStateService } from '../../core/period-state.service';
import {
  CoursePeriod, PeriodId, PeriodScheduleState, COURSE_PERIODS,
  PERIOD_STATE_COLORS, PERIOD_STATE_LABELS,
} from '../../core/periods.model';

// Paleta de colores para el mini-preview de la rejilla en el dashboard
const PREVIEW_SUBJECTS = ['mat','ing','len','cie','ef','len','mat','art','mus','soc','ing','len','mat','ef','cie'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera con saludo -->
      <div class="page-head">
        <div>
          <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">
            Hola, {{ firstName() }}
          </h1>
          <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
            Curso {{ currentYear() }} · {{ auth.schoolName() }}
          </p>
        </div>
        <button class="btn-primary" (click)="router.navigate(['/generador'])">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          Generar horario
        </button>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" (click)="goToConfig('teachers')">
          <div class="kpi-icon" style="background:var(--primary-tint);color:var(--primary)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Profesores</div>
            <div class="kpi-value">{{ filteredTeachers().length }}</div>
            <div class="kpi-sub">{{ teachersWithLoad() }} con carga asignada</div>
          </div>
        </div>

        <div class="kpi-card" (click)="goToConfig('groups')">
          <div class="kpi-icon" style="background:var(--accent-tint);color:var(--accent-foreground)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Grupos</div>
            <div class="kpi-value">{{ filteredGroups().length }}</div>
            <div class="kpi-sub">{{ groupLevels() }}</div>
          </div>
        </div>

        <div class="kpi-card" (click)="goToConfig('classrooms')">
          <div class="kpi-icon" style="background:var(--secondary);color:var(--secondary-foreground)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Aulas</div>
            <div class="kpi-value">{{ classrooms().length }}</div>
            <div class="kpi-sub">{{ specialClassrooms() }} especiales</div>
          </div>
        </div>

        <div class="kpi-card" (click)="latestSchedule() && router.navigate(['/horarios', latestSchedule()!.id])">
          <div class="kpi-icon"
            [style.background]="conflictsCount() > 0 ? 'var(--destructive-tint)' : 'var(--success-tint)'"
            [style.color]="conflictsCount() > 0 ? 'var(--destructive)' : 'var(--success)'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Conflictos</div>
            <div class="kpi-value">{{ conflictsCount() }}</div>
            <div class="kpi-sub">{{ conflictsCount() === 0 ? 'Sin problemas' : 'Por resolver' }}</div>
          </div>
        </div>
      </div>

      <!-- Cuerpo: estado del horario + acciones rápidas -->
      <div class="body-grid">

        <!-- Tarjetas de periodo: una por jornada -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Cabecera de sección -->
          <div style="display:flex;align-items:center;gap:8px;
            color:var(--muted-foreground);font-size:var(--text-xs);
            font-weight:700;text-transform:uppercase;letter-spacing:0.04em">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Horarios del curso · dos jornadas
          </div>

          @for (p of coursePeriods; track p.id) {
            <div class="lec-card period-card"
              style="padding:0;overflow:hidden"
              [class.period-card--active]="p.id === activePeriod()">
              <!-- Header de la tarjeta -->
              <div class="period-card-header"
                [style.background]="p.id === activePeriod() ? 'var(--primary-tint)' : 'transparent'">
                <div style="display:flex;align-items:center;gap:11px;min-width:0">
                  <!-- Icono de jornada -->
                  <div style="width:38px;height:38px;border-radius:var(--radius-md);flex-shrink:0;
                    display:flex;align-items:center;justify-content:center;"
                    [style.background]="p.id === activePeriod() ? 'var(--primary)' : 'var(--secondary)'"
                    [style.color]="p.id === activePeriod() ? '#fff' : 'var(--muted-foreground)'">
                    @if (p.tarde) {
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                        <polyline points="2 17 12 22 22 17"/>
                        <polyline points="2 12 12 17 22 12"/>
                      </svg>
                    } @else {
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                  <div style="min-width:0">
                    <div style="font-weight:700;font-size:var(--text-base)">{{ p.name }}</div>
                    <div style="font-size:11px;color:var(--muted-foreground)">
                      {{ p.months }} · {{ p.rangeLabel }} · {{ p.jornada }}
                    </div>
                  </div>
                </div>
                <!-- Badge de estado -->
                <span class="period-state-badge"
                  [style.background]="periodStateBg(p.id)"
                  [style.color]="periodStateColor(p.id)">
                  <span style="width:6px;height:6px;border-radius:50%;flex-shrink:0"
                    [style.background]="periodStateColor(p.id)"></span>
                  {{ periodStateLabel(p.id) }}
                </span>
              </div>

              <!-- Body -->
              <div style="padding:16px 20px">
                <!-- Mini-preview rejilla -->
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px">
                  @for (item of periodPreview(p); track $index) {
                    <div style="height:26px;border-radius:6px"
                      [style.background]="previewBg(item.key, item.id)"></div>
                  }
                </div>
                <div style="font-size:11px;color:var(--muted-foreground);margin-bottom:14px">
                  {{ p.lec }} sesiones/día · {{ p.horas }}h semanales
                  {{ p.tarde ? ' · incluye sesiones de tarde' : ' · solo mañana' }}
                </div>
                <div style="display:flex;gap:9px;flex-wrap:wrap">
                  @if (periodScheduleState(p.id) === 'none') {
                    <button class="btn-primary" (click)="goGenerate(p.id)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                      </svg>
                      Generar este horario
                    </button>
                  } @else {
                    <button class="btn-secondary" (click)="goResult(p.id)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver horario
                    </button>
                    @if (periodScheduleState(p.id) === 'conflicts') {
                      <button class="btn-primary" (click)="goResult(p.id)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                        </svg>
                        Resolver conflictos
                      </button>
                    }
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Columna derecha: acciones rápidas + alertas -->
        <div style="display:flex;flex-direction:column;gap:18px">

          <!-- Acciones rápidas -->
          <div class="lec-card">
            <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:12px">Acciones rápidas</h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (a of quickActions; track a.label) {
                <button class="action-row" (click)="router.navigate([a.path])">
                  <span class="action-icon" [style.background]="a.iconBg" [style.color]="a.iconColor">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path [attr.d]="a.iconPath"/>
                    </svg>
                  </span>
                  <span style="flex:1;font-weight:600;font-size:var(--text-sm);text-align:left">{{ a.label }}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted-foreground)">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              }
            </div>
          </div>

          <!-- Alertas de conflictos -->
          @if (conflictsCount() > 0 && latestSchedule()) {
            <div class="lec-card" style="padding:0;border:1px solid var(--warning);overflow:hidden">
              <div style="padding:13px 18px;background:var(--warning-tint);
                display:flex;align-items:center;gap:9px">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning-foreground)" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                </svg>
                <span style="font-weight:700;font-size:var(--text-sm);color:var(--warning-foreground)">
                  {{ conflictsCount() }} conflicto{{ conflictsCount() !== 1 ? 's' : '' }} detectado{{ conflictsCount() !== 1 ? 's' : '' }}
                </span>
              </div>
              <div style="padding:6px 0">
                @for (c of conflictDescriptions(); track $index; let i = $index) {
                  <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 18px"
                    [style.border-top]="i > 0 ? '1px solid var(--border)' : 'none'">
                    <span style="width:7px;height:7px;border-radius:50%;background:var(--destructive);flex-shrink:0;margin-top:5px"></span>
                    <span style="font-size:var(--text-sm);flex:1">{{ c }}</span>
                  </div>
                }
                <div style="padding:10px 18px">
                  <button class="btn-subtle" (click)="router.navigate(['/horarios', latestSchedule()!.id])">
                    Resolver en el horario →
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card {
      background: var(--card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm); border: 1px solid var(--border);
      padding: var(--space-5); display: flex; align-items: flex-start;
      justify-content: space-between; gap: 10px; cursor: pointer; transition: all .15s;
    }
    .kpi-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
    .kpi-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; order: 1; }
    .kpi-label { font-size: var(--text-xs); font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-value { font-size: var(--text-3xl); font-weight: 800; letter-spacing: -0.02em; margin-top: 2px; line-height: 1; }
    .kpi-sub { font-size: 11px; color: var(--muted-foreground); margin-top: 4px; }
    .body-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; align-items: start; }
    @media (max-width: 840px) { .body-grid { grid-template-columns: 1fr; } }
    .btn-primary {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      background: var(--primary); color: var(--primary-foreground);
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s; white-space: nowrap;
      box-shadow: var(--shadow-sm);
    }
    .btn-primary:hover { background: var(--primary-strong); }
    .btn-secondary {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      background: var(--card); color: var(--foreground);
      box-shadow: inset 0 0 0 1px var(--border-strong);
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .btn-subtle {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px;
      background: var(--primary-tint); color: var(--primary-strong);
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s; width: 100%;
    }
    .status-badge { font-size: var(--text-xs); font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); background: var(--secondary); color: var(--secondary-foreground); }
    .badge--published { background: var(--success-tint); color: var(--success); }
    .badge--generated { background: var(--warning-tint); color: var(--warning-foreground); }
    .action-row {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 11px 12px; border-radius: var(--radius-md);
      background: var(--surface-2); transition: all .15s; border: 1px solid transparent;
      cursor: pointer;
    }
    .action-row:hover { border-color: var(--border-strong); background: var(--card); }
    .action-icon {
      width: 34px; height: 34px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .period-card { border: 1.5px solid var(--border); transition: border-color .15s; }
    .period-card--active { border-color: var(--primary); }
    .period-card-header {
      padding: 14px 18px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .period-state-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: var(--text-xs); font-weight: 700; padding: 4px 10px;
      border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0;
    }
  `],
})
export class DashboardComponent implements OnInit {
  protected readonly teachersApi   = inject(TeachersApiService);
  protected readonly groupsApi     = inject(GroupsApiService);
  protected readonly schedulesApi  = inject(SchedulesApiService);
  protected readonly classroomsApi = inject(ClassroomsApiService);
  private readonly schoolsApi      = inject(SchoolsApiService);
  private readonly blockState      = inject(BlockStateService);
  protected readonly auth   = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly periodState = inject(PeriodStateService);

  readonly teachers    = signal<Teacher[]>([]);
  readonly groups      = signal<CourseGroup[]>([]);
  readonly classrooms  = signal<Classroom[]>([]);
  readonly schedules   = signal<ScheduleList[]>([]);
  readonly stages      = signal<SchoolStage[]>([]);

  readonly activeBlock = this.blockState.activeBlock;

  readonly filteredStages = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.stages();
    return this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
  });

  readonly filteredGroups = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.groups();
    const stagesForBlock = this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
    if (stagesForBlock.length === 0) return [];
    return this.groups().filter(g =>
      stagesForBlock.some(s => g.courseLevel >= s.minLevel && g.courseLevel <= s.maxLevel)
    );
  });

  readonly filteredTeachers = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.teachers();
    const stagesForBlock = this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
    if (stagesForBlock.length === 0) return [];
    const stageIds = new Set(stagesForBlock.map(s => s.id));
    return this.teachers().filter(t =>
      t.stageAssignments?.some(sa => stageIds.has(sa.stageId))
    );
  });

  readonly previewSubjects = PREVIEW_SUBJECTS.map((key, id) => ({ key, id }));

  // ── Periodos del curso ────────────────────────────────────────────────────
  readonly coursePeriods: CoursePeriod[] = COURSE_PERIODS;
  readonly activePeriod = this.periodState.activePeriod;

  periodScheduleState(id: PeriodId): PeriodScheduleState {
    const s = this.schedules();
    if (id === 'completa') {
      const latest = s.find(x => x.status === 'published') ?? s[0];
      if (!latest) return 'none';
      if (latest.status === 'published') return 'published';
      if (latest.totalConflicts > 0) return 'conflicts';
      return 'ok';
    }
    // 'reducida' — por ahora sin datos del API; marcamos 'none'
    return this.periodState.schedByPeriod()[id] ?? 'none';
  }

  periodStateBg(id: PeriodId): string {
    const state = this.periodScheduleState(id);
    const map: Record<PeriodScheduleState, string> = {
      none: 'var(--secondary)', generating: 'var(--warning-tint)',
      conflicts: 'var(--warning-tint)', ok: 'var(--success-tint)', published: 'var(--success-tint)',
    };
    return map[state];
  }

  periodStateColor(id: PeriodId): string {
    return PERIOD_STATE_COLORS[this.periodScheduleState(id)];
  }

  periodStateLabel(id: PeriodId): string {
    return PERIOD_STATE_LABELS[this.periodScheduleState(id)];
  }

  periodPreview(p: CoursePeriod): { key: string; id: number }[] {
    const rows = p.lec >= 5 ? 3 : 2;
    return PREVIEW_SUBJECTS.slice(0, rows * 5).map((key, id) => ({ key, id }));
  }

  goGenerate(periodId: PeriodId): void {
    this.periodState.setActivePeriod(periodId);
    this.router.navigate(['/generador']);
  }

  goResult(periodId: PeriodId): void {
    this.periodState.setActivePeriod(periodId);
    const s = this.schedules();
    const target = s.find(x => x.status === 'published') ?? s[0];
    if (target) this.router.navigate(['/horarios', target.id]);
    else this.router.navigate(['/horarios']);
  }

  readonly quickActions = [
    {
      label: 'Generar horario',  path: '/generador',
      iconBg: 'var(--primary-tint)', iconColor: 'var(--primary)',
      iconPath: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    },
    {
      label: 'Ver horarios',     path: '/horarios',
      iconBg: 'var(--secondary)', iconColor: 'var(--secondary-foreground)',
      iconPath: 'M3 10h18M3 6h18M3 14h18M3 18h18M8 2v4M16 2v4',
    },
    {
      label: 'Configurar colegio', path: '/config',
      iconBg: 'var(--secondary)', iconColor: 'var(--secondary-foreground)',
      iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  // ── computed ──────────────────────────────────────────────────────────────

  readonly latestSchedule = computed(() =>
    this.schedules().find(s => s.status === 'published') ?? this.schedules()[0] ?? null
  );

  readonly conflictsCount = computed(() => this.latestSchedule()?.totalConflicts ?? 0);

  readonly firstName = computed(() => {
    const u = this.auth.currentUser();
    return u?.teacher?.fullName?.split(' ')[0] ?? 'Elena';
  });

  readonly currentYear = computed(() => {
    const s = this.schedules()[0];
    return s?.academicYear ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  });

  readonly teachersWithLoad = computed(() =>
    this.filteredTeachers().filter(t => t.assignedHours > 0).length
  );

  readonly groupLevels = computed(() => {
    const levels = [...new Set(this.filteredGroups().map(g => g.courseLevel))].sort();
    if (levels.length === 0) return 'Sin grupos';
    return levels.map(l => l + 'º').join(', ');
  });

  readonly specialClassrooms = computed(() =>
    this.classrooms().filter(c => c.classroomType !== 'standard' && c.classroomType !== 'aula').length
  );

  readonly scheduleStatusText = computed(() => {
    const s = this.latestSchedule();
    if (!s) return '';
    if (s.status === 'published') return `Publicado · visible para ${this.filteredTeachers().length} docentes.`;
    if (s.status === 'generated' && s.totalConflicts > 0)
      return `Generado · ${s.totalConflicts} conflicto${s.totalConflicts !== 1 ? 's' : ''} por resolver.`;
    if (s.status === 'generated') return 'Generado sin conflictos · listo para publicar.';
    return 'En borrador.';
  });

  /** Descripción breve de cada conflicto para el panel de alertas */
  readonly conflictDescriptions = computed((): string[] => {
    // La API no devuelve el detalle en ScheduleList; usamos un texto genérico
    const count = this.conflictsCount();
    return Array.from({ length: Math.min(count, 3) }, (_, i) =>
      `Conflicto #${i + 1} detectado — ve al horario para ver los detalles.`
    );
  });

  // ── helpers ───────────────────────────────────────────────────────────────

  previewBg(key: string, index: number): string {
    const s = this.latestSchedule();
    const isConflict = s && s.totalConflicts > 0 && (index === 4 || index === 9);
    return isConflict ? 'var(--destructive-tint)' : (SUBJECT_COLORS[key]?.bg ?? SUBJECT_COLORS['tut'].bg);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador', generated: 'Generado',
      published: 'Publicado', archived: 'Archivado',
    };
    return map[status] ?? status;
  }

  goToConfig(tab: string): void {
    this.router.navigate(['/config'], { queryParams: { tab } });
  }

  async ngOnInit(): Promise<void> {
    const [teachers, groups, schedules, classrooms, stages] = await Promise.all([
      this.teachersApi.getTeachers().catch(() => []),
      this.groupsApi.getGroups().catch(() => []),
      this.schedulesApi.getSchedules().catch(() => []),
      this.classroomsApi.getClassrooms().catch(() => []),
      this.schoolsApi.getStages().catch(() => []),
    ]);
    this.teachers.set(teachers);
    this.groups.set(groups);
    this.schedules.set(schedules);
    this.classrooms.set(classrooms);
    this.stages.set(stages);
  }
}
