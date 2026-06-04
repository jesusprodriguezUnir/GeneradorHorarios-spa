import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchedulesApiService } from '../../core/api/schedules-api.service';
import { MySchedule, ScheduleGridEntry, TimeSlot, DAYS, DAYS_SHORT } from '../../core/models';
import { DeviceService } from '../../core/device.service';
import { MessageService } from 'primeng/api';
import { ScheduleGridComponent } from '../../shared/schedule-grid/schedule-grid.component';
import { SubjectLegendComponent } from '../../shared/ui/subject-legend.component';
import { PeriodSelectorComponent } from '../../shared/ui/period-selector.component';
import { PeriodStateService } from '../../core/period-state.service';
import { COURSE_PERIODS, PeriodId } from '../../core/periods.model';

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule, ScheduleGridComponent, SubjectLegendComponent, PeriodSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Mi horario</h1>
          @if (schedule()) {
            <p class="page-sub">
              {{ activePeriodObj().name }} · {{ activePeriodObj().months }} · {{ schedule()!.academicYear }}
            </p>
          }
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <app-period-selector
            [period]="activePeriod()"
            [schedByPeriod]="{}"
            variant="light"
            (periodChange)="onPeriodChange($event)" />
          @if (schedule()) {
            <button class="btn-pdf" (click)="downloadPdf()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              Descargar PDF
            </button>
          }
        </div>
      </div>

      <!-- Aviso de cambio de jornada entre periodos -->
      <div style="display:flex;align-items:flex-start;gap:9px;
        background:var(--primary-tint);color:var(--primary-strong);
        padding:10px 14px;border-radius:var(--radius-md);
        font-size:var(--text-sm);font-weight:600;margin-bottom:16px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        @if (activePeriodObj().tarde) {
          <span>En junio y septiembre la jornada es continua (solo mañana): tu horario cambia.
            Selecciona <b>Jornada reducida</b> arriba para verlo.</span>
        } @else {
          <span>Estás viendo la jornada reducida (jun + sep). El resto del curso
            tu horario incluye sesiones de tarde.</span>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando tu horario...</p>
        </div>
      } @else if (notPublished()) {
        <!-- Sin horario publicado -->
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>El horario aún no está disponible</h3>
          <p>El equipo directivo todavía no ha publicado el horario para este curso. Te avisaremos cuando esté listo.</p>
          <div style="margin-top:14px">
            <span class="lec-badge" style="background:var(--warning-tint);color:var(--warning-foreground)">
              Pendiente de publicación
            </span>
          </div>
        </div>
      } @else if (schedule()) {
        <!-- Navegación de semana -->
        <div class="week-nav">
          <div style="display:flex;align-items:center;gap:8px">
            <button class="week-btn" (click)="prevWeek()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div style="min-width:150px;text-align:center">
              <div style="font-weight:700;font-size:var(--text-base)">Semana actual</div>
              <div style="font-size:11px;color:var(--muted-foreground)">Curso {{ schedule()!.academicYear }}</div>
            </div>
            <button class="week-btn" (click)="nextWeek()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="lec-badge" style="background:var(--success-tint);color:var(--success)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:3px">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Publicado
            </span>
            @if (totalHours() > 0) {
              <span style="font-size:var(--text-sm);color:var(--muted-foreground)">
                <b style="color:var(--foreground)">{{ totalHours() }}h</b> lectivas/semana
              </span>
            }
          </div>
        </div>

        <!-- Banner semana en curso -->
        <div class="week-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Esta es tu semana en curso.
        </div>

        <!-- Rejilla compartida -->
        <div class="lec-card" style="padding:var(--space-4)">
          <app-schedule-grid
            [entries]="gridEntries()"
            [slots]="slots()"
            [conflicts]="[]"
            [editable]="false" />
        </div>

        <!-- Leyenda -->
        <app-subject-legend [subjectKeys]="usedSubjectKeys()" style="display:block;margin-top:16px" />
      }
    </div>
  `,
  styles: [`
    .page-head {
      display: flex; align-items: flex-start;
      justify-content: space-between; gap: 16px;
      margin-bottom: 20px; flex-wrap: wrap;
    }
    .page-title { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; }
    .page-sub { color: var(--muted-foreground); margin-top: 4px; font-size: var(--text-sm); }
    .btn-pdf {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; min-height: 42px;
      background: var(--card); color: var(--foreground);
      box-shadow: inset 0 0 0 1px var(--border-strong);
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .btn-pdf:hover { box-shadow: inset 0 0 0 1px var(--primary); color: var(--primary); }
    .loading-state, .empty-state {
      text-align: center; padding: 48px 16px;
      color: var(--muted-foreground);
    }
    .empty-icon { display: flex; justify-content: center; margin-bottom: 16px; }
    .empty-state h3 { font-size: var(--text-xl); font-weight: 700; color: var(--foreground); margin-bottom: 8px; }
    .spinner {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--primary);
      animation: lec-spin 0.8s linear infinite; margin: 0 auto 16px;
    }
    .week-nav {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .week-btn {
      width: 38px; height: 38px; border-radius: var(--radius-md);
      background: var(--card); border: 1px solid var(--border-strong);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s; color: var(--foreground);
    }
    .week-btn:hover { border-color: var(--primary); color: var(--primary); }
    .week-banner {
      display: flex; align-items: center; gap: 8px;
      background: var(--primary-tint); color: var(--primary-strong);
      padding: 9px 14px; border-radius: var(--radius-md);
      font-size: var(--text-sm); font-weight: 600;
      margin-bottom: 16px; width: fit-content;
    }
  `],
})
export class MyScheduleComponent implements OnInit {
  private readonly api    = inject(SchedulesApiService);
  protected readonly device = inject(DeviceService);
  private readonly toast  = inject(MessageService);
  private readonly periodState = inject(PeriodStateService);

  readonly activePeriod = this.periodState.activePeriod;
  readonly activePeriodObj = computed(() =>
    COURSE_PERIODS.find(p => p.id === this.activePeriod()) ?? COURSE_PERIODS[0],
  );

  onPeriodChange(id: PeriodId): void {
    this.periodState.setActivePeriod(id);
  }

  readonly schedule    = signal<MySchedule | null>(null);
  readonly loading     = signal(true);
  readonly notPublished = signal(false);

  readonly days     = DAYS;
  readonly daysShort = DAYS_SHORT;

  /** Entradas convertidas al formato que espera ScheduleGridComponent */
  readonly gridEntries = computed((): ScheduleGridEntry[] => {
    const s = this.schedule();
    if (!s) return [];
    return s.entries.map(e => ({
      id:              `${e.dayOfWeek}-${e.slotIndex}`,
      dayOfWeek:       e.dayOfWeek,
      slotIndex:       e.slotIndex,
      groupId:         '',
      groupDisplay:    e.groupLabel,
      teacherId:       '',
      teacherName:     '',
      teacherColorKey: '',
      allocationId:    '',
      subjectName:     e.subjectName,
      subjectKey:      e.subjectKey,
      subjectShort:    e.subjectShort,
      classroomId:     '',
      classroomName:   e.classroomName,
      isManualOverride: false,
    }));
  });

  readonly slots = computed((): TimeSlot[] => this.schedule()?.slots ?? []);

  readonly totalHours = computed(() => {
    const s = this.schedule();
    if (!s) return 0;
    return s.entries.length;   // cada entrada = 1 sesión = 1h (aprox.)
  });

  readonly usedSubjectKeys = computed(() => {
    const s = this.schedule();
    if (!s) return [];
    return [...new Set(s.entries.map(e => e.subjectKey))];
  });

  async ngOnInit(): Promise<void> {
    try {
      const schedule = await this.api.getMySchedule();
      this.schedule.set(schedule);
    } catch (err: any) {
      if (err?.status === 404) {
        this.notPublished.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: 'Error de carga', detail: 'No se pudo obtener tu horario.' });
      }
    } finally {
      this.loading.set(false);
    }
  }

  prevWeek(): void { /* navegación de semana — v2 */ }
  nextWeek(): void { /* navegación de semana — v2 */ }

  downloadPdf(): void {
    window.print();
  }
}
