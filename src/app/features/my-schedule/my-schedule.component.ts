import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { MySchedule, MyScheduleEntry, TimeSlot, DAYS, DAYS_SHORT, SUBJECT_COLORS } from '../../core/models';
import { DeviceService } from '../../core/device.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Mi horario</h1>
          @if (schedule()) {
            <p class="page-sub">{{ schedule()!.schoolName }} · {{ schedule()!.academicYear }}</p>
          }
        </div>
        @if (schedule()) {
          <button class="btn-pdf" (click)="downloadPdf()">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Descargar PDF
          </button>
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
        </div>
      } @else if (schedule()) {
        <!-- Navegación de semana -->
        <div class="week-nav">
          <button class="week-btn" (click)="prevWeek()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="week-label">Semana actual</span>
          <button class="week-btn" (click)="nextWeek()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        @if (isMobile()) {
          <!-- Vista móvil: día a día -->
          <div>
            <div style="display:flex;gap:6px;margin-bottom:12px">
              @for (day of days; track $index) {
                <button class="day-tab"
                  [class.day-tab--active]="selectedDay() === $index"
                  (click)="selectedDay.set($index)">
                  {{ daysShort[$index] }}
                </button>
              }
            </div>

            <div style="display:flex;flex-direction:column;gap:8px">
              @for (slot of lectiveSlots(); track slot.index) {
                @if (slot.index === breakAfterIndex()) {
                  <div class="recreo-band">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                    RECREO · {{ breakTime() }}
                  </div>
                }
                <div style="display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:stretch">
                  <div class="time-label">
                    <span class="time-h">{{ slot.startTime }}</span>
                    <span class="time-end">{{ slot.endTime }}</span>
                  </div>
                  <ng-container [ngTemplateOutlet]="cellTpl"
                    [ngTemplateOutletContext]="{entry: getEntry(selectedDay(), slot.index)}" />
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Vista escritorio: semana completa -->
          <div class="grid-wrapper thin-scroll">
            <div class="grid-inner">
              <!-- Header días -->
              <div class="grid-header">
                <div></div>
                @for (day of days; track $index) {
                  <div class="day-header">{{ day }}</div>
                }
              </div>
              <!-- Filas -->
              @for (slot of lectiveSlots(); track slot.index) {
                @if (slot.index === breakAfterIndex()) {
                  <div class="grid-row">
                    <div></div>
                    <div class="recreo-band" style="grid-column:span 5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                      </svg>
                      RECREO · {{ breakTime() }}
                    </div>
                  </div>
                }
                <div class="grid-row">
                  <div class="time-label">
                    <span class="time-h">{{ slot.startTime }}</span>
                    <span class="time-end">{{ slot.endTime }}</span>
                  </div>
                  @for (day of days; track $index) {
                    <ng-container [ngTemplateOutlet]="cellTpl"
                      [ngTemplateOutletContext]="{entry: getEntry($index, slot.index), dense: true}" />
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    </div>

    <!-- Template de celda -->
    <ng-template #cellTpl let-entry="entry" let-dense="dense">
      @if (entry) {
        <div class="schedule-cell"
          [style.background]="cellBg(entry.subjectKey)"
          [style.color]="cellFg(entry.subjectKey)">
          <span class="cell-bar" [style.background]="cellFg(entry.subjectKey)"></span>
          <div class="cell-subject">{{ entry.subjectShort }}</div>
          <div class="cell-meta">
            <span>{{ entry.groupLabel }}</span>
            <span style="opacity:0.5">·</span>
            <span>{{ entry.classroomName }}</span>
          </div>
        </div>
      } @else {
        <div class="cell-empty"></div>
      }
    </ng-template>
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
      cursor: pointer; transition: all .15s;
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
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 16px;
    }
    .week-btn {
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: var(--card); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
    }
    .week-btn:hover { border-color: var(--primary); color: var(--primary); }
    .week-label { font-weight: 600; font-size: var(--text-sm); }
    .day-tab {
      flex: 1; min-width: 0; padding: 9px 4px;
      border-radius: var(--radius-md); font-weight: 700;
      font-size: var(--text-sm); cursor: pointer; transition: all .15s;
      background: var(--card); color: var(--muted-foreground);
      border: 1px solid var(--border);
    }
    .day-tab--active {
      background: var(--primary) !important;
      color: #fff !important;
      border-color: var(--primary) !important;
    }
    .recreo-band {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--secondary); border-radius: var(--radius-sm);
      color: var(--muted-foreground); font-weight: 600;
      font-size: var(--text-xs); padding: 7px 0; letter-spacing: 0.03em;
    }
    .time-label {
      display: flex; flex-direction: column;
      align-items: flex-end; justify-content: center; line-height: 1.2;
    }
    .time-h { font-weight: 700; font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
    .time-end { font-size: 11px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
    .grid-wrapper { overflow-x: auto; }
    .grid-inner { min-width: 720px; }
    .grid-header {
      display: grid; grid-template-columns: 64px repeat(5, 1fr);
      gap: 8px; margin-bottom: 8px;
    }
    .day-header { text-align: center; font-weight: 700; font-size: var(--text-sm); padding: 4px 0; }
    .grid-row { display: grid; grid-template-columns: 64px repeat(5, 1fr); gap: 8px; margin-bottom: 8px; }
    .schedule-cell {
      position: relative; border-radius: var(--radius-sm);
      min-height: 62px; padding: 8px 10px 8px 13px; overflow: hidden;
    }
    .cell-bar {
      position: absolute; left: 0; top: 6px; bottom: 6px;
      width: 4px; border-radius: 99px; opacity: 0.65;
    }
    .cell-subject { font-weight: 700; font-size: var(--text-sm); line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cell-meta { font-size: var(--text-xs); opacity: 0.82; margin-top: 2px; font-weight: 500; display: flex; align-items: center; gap: 5px; }
    .cell-empty { border: 1.5px dashed var(--border-strong); background: var(--surface-2); border-radius: var(--radius-sm); min-height: 62px; }
  `],
})
export class MyScheduleComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly device = inject(DeviceService);
  private readonly toast = inject(MessageService);

  readonly schedule = signal<MySchedule | null>(null);
  readonly loading = signal(true);
  readonly notPublished = signal(false);
  readonly selectedDay = signal(new Date().getDay() - 1 < 0 ? 0 : Math.min(new Date().getDay() - 1, 4));

  readonly isMobile = this.device.isMobile;
  readonly days = DAYS;
  readonly daysShort = DAYS_SHORT;

  readonly lectiveSlots = computed(() =>
    (this.schedule()?.slots ?? []).filter(s => !s.isBreak)
  );

  readonly breakAfterIndex = computed(() => {
    const slots = this.schedule()?.slots ?? [];
    let count = 0;
    for (const s of slots) {
      if (s.isBreak) return count;
      count++;
    }
    return 2;
  });

  readonly breakTime = computed(() => {
    const s = (this.schedule()?.slots ?? []).find(s => s.isBreak);
    return s ? `${s.startTime}–${s.endTime}` : '11:00–11:30';
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

  getEntry(dayIndex: number, slotIndex: number): MyScheduleEntry | null {
    return this.schedule()?.entries.find(
      e => (e.dayOfWeek - 1) === dayIndex && e.slotIndex === slotIndex
    ) ?? null;
  }

  cellBg(key: string): string {
    return SUBJECT_COLORS[key]?.bg ?? SUBJECT_COLORS['tut'].bg;
  }
  cellFg(key: string): string {
    return SUBJECT_COLORS[key]?.fg ?? SUBJECT_COLORS['tut'].fg;
  }

  prevWeek(): void { /* navegación semana - en v2 */ }
  nextWeek(): void { /* navegación semana - en v2 */ }

  downloadPdf(): void {
    window.print();
  }
}
