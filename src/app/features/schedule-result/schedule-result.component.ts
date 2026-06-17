import {
  Component, OnInit, inject, signal, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PeriodStateService } from '../../core/period-state.service';
import { COURSE_PERIODS, CoursePeriod, PeriodId } from '../../core/periods.model';
import { SchedulesApiService } from '../../core/api/schedules-api.service';
import { TeachersApiService } from '../../core/api/teachers-api.service';
import { GroupsApiService } from '../../core/api/groups-api.service';
import { ClassroomsApiService } from '../../core/api/classrooms-api.service';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { BlockStateService } from '../../core/block-state.service';
import { ScheduleGrid, ScheduleGridEntry, ScheduleList, Teacher, CourseGroup, Classroom, TimeSlot, SchoolStage, cycleFromLevel } from '../../core/models';
import { groupsByBlock, teachersByBlock } from '../../core/block-filter.utils';
import { ScheduleGridComponent, CellClickEvent } from '../../shared/schedule-grid/schedule-grid.component';
import { SubjectLegendComponent } from '../../shared/ui/subject-legend.component';
import { QualityScorecardComponent } from '../../shared/ui/quality-scorecard.component';
import { GenerationStateService } from '../../core/generation-state.service';
import { MessageService, ConfirmationService } from 'primeng/api';

type ViewMode = 'group' | 'teacher' | 'room';

@Component({
  selector: 'app-schedule-result',
  standalone: true,
  imports: [FormsModule, ScheduleGridComponent, SubjectLegendComponent, QualityScorecardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div class="page-head">
        <div>
          <h1 class="page-title" data-testid="page-title">Horarios generados</h1>
          @if (currentSchedule()) {
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
              <span class="status-badge" [class.badge--published]="currentSchedule()!.status === 'published'"
                [class.badge--generated]="currentSchedule()!.status === 'generated'" data-testid="status-badge">
                {{ statusLabel(currentSchedule()!.status) }}
              </span>
              <span style="color:var(--muted-foreground);font-size:var(--text-sm)">
                {{ currentSchedule()!.academicYear }}
              </span>
              @if (currentSchedule()!.totalConflicts > 0) {
                <span class="conflict-badge" data-testid="conflict-badge">
                  {{ currentSchedule()!.totalConflicts }} conflictos
                </span>
              }
            </div>
          }
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          @if (grid() && grid()!.status === 'generated') {
            <button class="btn-primary" (click)="publish()" data-testid="publish-button">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              Publicar horario
            </button>
          }
          <button class="btn-secondary" (click)="exportPdf()">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Exportar PDF
          </button>
          <button class="btn-secondary" (click)="router.navigate(['/generador'])">
            Volver a generar
          </button>
        </div>
      </div>

      <!-- Selector de horario -->
      @if (schedules().length > 0) {
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <label style="font-weight:600;font-size:var(--text-sm)">Horario:</label>
          <select (change)="selectSchedule($event)" class="field-select">
            @for (s of schedules(); track s.id) {
              <option [value]="s.id" [selected]="selectedId() === s.id">
                {{ s.academicYear }} — {{ statusLabel(s.status) }}
              </option>
            }
          </select>
          @if (currentSchedule()) {
            @if (currentSchedule()!.status === 'draft' || currentSchedule()!.status === 'generated') {
              <button class="btn-secondary" (click)="discard()" data-testid="discard-button">Descartar</button>
            }
            @if (currentSchedule()!.status !== 'published') {
              <button class="btn-secondary btn-danger" (click)="remove()" data-testid="delete-button">Borrar</button>
            }
          }
        </div>
      }

      @if (loading()) {
        <div style="text-align:center;padding:48px;color:var(--muted-foreground)">
          <div class="spinner"></div>
          Cargando horario...
        </div>
      } @else if (grid()) {
        <!-- Cuadro de calidad del horario -->
        <app-quality-scorecard [solution]="chosenSolution()"
          [state]="grid()!.conflicts.length > 0 ? 'conflicts' : 'clean'"
          [conflicts]="grid()!.conflicts.length" />

        <!-- Selector de periodo -->
        <div style="display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap">
          @for (p of periods; track p.id) {
            <button (click)="switchPeriod(p.id)"
              style="padding:8px 16px;border-radius:var(--radius-full);
                font-weight:600;font-size:var(--text-sm);white-space:nowrap;
                transition:all .15s;cursor:pointer;"
              [style.background]="p.id === activePeriod() ? 'var(--primary)' : 'var(--card)'"
              [style.color]="p.id === activePeriod() ? '#fff' : 'var(--foreground)'"
              [style.border]="'1px solid ' + (p.id === activePeriod() ? 'var(--primary)' : 'var(--border-strong)')">
              {{ p.name }}
              <span style="font-size:10px;opacity:0.7;margin-left:4px">{{ p.months }}</span>
            </button>
          }
          <span class="lec-badge" style="background:var(--primary-tint);color:var(--primary-strong)">
            {{ activePeriodObj().lec }} ses/día · {{ activePeriodObj().jornada }}
          </span>
        </div>

        <!-- Tabs de vista -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;margin-top:16px;flex-wrap:wrap">
          <div class="view-tabs">
            @for (t of viewTabs; track t.id) {
              <button class="view-tab" [class.view-tab--active]="viewMode() === t.id"
                (click)="viewMode.set(t.id)" [attr.data-testid]="'view-tab-' + t.id">
                {{ t.label }}
              </button>
            }
          </div>
          @if (viewMode() === 'group') {
            <select (change)="selectFilter($event)" class="field-select" [value]="selectedFilter()">
              @for (g of filteredGroupsForSelect(); track g.id) {
                <option [value]="g.id" [selected]="selectedFilter() === g.id">{{ g.displayName }}</option>
              }
            </select>
          }
          @if (viewMode() === 'teacher') {
            <select (change)="selectFilter($event)" class="field-select" [value]="selectedFilter()">
              @for (t of filteredTeachersForSelect(); track t.id) {
                <option [value]="t.id" [selected]="selectedFilter() === t.id">{{ t.fullName }}</option>
              }
            </select>
          }
          @if (viewMode() === 'room') {
            <select (change)="selectFilter($event)" class="field-select" [value]="selectedFilter()">
              @for (r of classrooms(); track r.id) {
                <option [value]="r.id" [selected]="selectedFilter() === r.id">{{ r.name }}</option>
              }
            </select>
          }
        </div>

        <!-- Grid del horario -->
        <div class="lec-card" style="padding:var(--space-5)">
          <app-schedule-grid
            [entries]="filteredEntries()"
            [slots]="activeSlots()"
            [conflicts]="grid()!.conflicts"
            [editable]="grid()!.status !== 'published'"
            (cellClick)="onCellClick($event)" />

          <!-- Leyenda de colores -->
          <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border)">
            <app-subject-legend />
          </div>
        </div>

        <!-- Conflictos -->
        @if (grid()!.conflicts.length > 0) {
          <div style="margin-top:20px">
            <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:12px">
              Conflictos detectados ({{ grid()!.conflicts.length }})
            </h3>
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (c of grid()!.conflicts; track $index) {
                <div class="conflict-row" [class.conflict-error]="c.severity === 'error'" [class.conflict-warn]="c.severity === 'warning'">
                  <div>
                    <div style="font-weight:700;font-size:var(--text-sm)">{{ c.description }}</div>
                    @if (c.suggestions.length > 0) {
                      <ul style="margin:6px 0 0 16px;font-size:var(--text-xs)">
                        @for (s of c.suggestions; track s) {
                          <li>{{ s }}</li>
                        }
                      </ul>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="empty-state">
          <h3>No hay horarios generados</h3>
          <p>Ve al Generador para crear el primer horario del colegio.</p>
          <button class="btn-primary" style="margin-top:16px" (click)="router.navigate(['/generador'])">
            Ir al generador
          </button>
        </div>
      }
    </div>

    <!-- Modal de edición de celda -->
    @if (editModal()) {
      <div class="modal-backdrop" (click)="editModal.set(null)">
        <div class="modal-card lec-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Editar sesión</h3>
            <button (click)="editModal.set(null)" style="padding:4px;color:var(--muted-foreground)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div style="padding:20px">
            <p style="font-size:var(--text-sm);color:var(--muted-foreground);margin-bottom:16px">
              {{ editModal()?.subjectName }} · {{ editModal()?.groupDisplay }} · Día {{ editModal()?.dayOfWeek }}
            </p>
            <label class="form-field">
              <span class="field-label">Profesor</span>
              <select [(ngModel)]="editTeacherId" class="field-select">
                @for (t of teachers(); track t.id) {
                  <option [value]="t.id">{{ t.fullName }}</option>
                }
              </select>
            </label>
            <label class="form-field" style="margin-top:12px">
              <span class="field-label">Aula</span>
              <select [(ngModel)]="editClassroomId" class="field-select">
                @for (r of classrooms(); track r.id) {
                  <option [value]="r.id">{{ r.name }}</option>
                }
              </select>
            </label>
          </div>
          <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end">
            <button class="btn-secondary" (click)="editModal.set(null)">Cancelar</button>
            <button class="btn-primary" (click)="saveEdit()">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .page-title { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; }
    .status-badge { font-size: var(--text-xs); font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); background: var(--secondary); color: var(--secondary-foreground); }
    .badge--published { background: var(--success-tint); color: var(--success); }
    .badge--generated { background: var(--warning-tint); color: var(--warning-foreground); }
    .conflict-badge { font-size: var(--text-xs); font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); background: var(--destructive-tint); color: var(--destructive); }
    .field-select { padding: 9px 12px; border: 1px solid var(--input); border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-sans); background: var(--card); color: var(--foreground); }
    .spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--primary); animation: lec-spin 0.8s linear infinite; margin: 0 auto 16px; }
    
    .view-tabs { display: inline-flex; background: var(--secondary); border-radius: var(--radius-md); padding: 4px; gap: 2px; }
    .view-tab { padding: 7px 16px; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: all .15s; background: transparent; color: var(--muted-foreground); }
    .view-tab--active { background: var(--card); color: var(--foreground); box-shadow: var(--shadow-xs); }
    
    .conflict-row { padding: 12px 14px; border-radius: var(--radius-md); font-size: var(--text-sm); }
    .conflict-error { background: var(--destructive-tint); color: var(--destructive); }
    .conflict-warn { background: var(--warning-tint); color: var(--warning-foreground); }
    
    .empty-state { text-align: center; padding: 48px 16px; color: var(--muted-foreground); }
    .empty-state h3 { font-size: var(--text-xl); font-weight: 700; color: var(--foreground); margin-bottom: 8px; }
    
    .modal-backdrop { position: fixed; inset: 0; z-index: 80; background: oklch(0.2 0.02 255 / 0.45); display: flex; align-items: flex-end; justify-content: center; }
    .modal-card { background: var(--card); border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-lg); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: var(--text-lg); font-weight: 700; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }

  `],
})
export class ScheduleResultComponent implements OnInit {
  protected readonly schedulesApi = inject(SchedulesApiService);
  protected readonly teachersApi   = inject(TeachersApiService);
  protected readonly groupsApi     = inject(GroupsApiService);
  protected readonly classroomsApi = inject(ClassroomsApiService);
  private readonly schoolsApi     = inject(SchoolsApiService);
  private readonly blockState     = inject(BlockStateService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly genState = inject(GenerationStateService);
  private readonly periodState = inject(PeriodStateService);

  // ── Periodos del curso ────────────────────────────────────────────────────
  readonly periods: CoursePeriod[] = COURSE_PERIODS;
  readonly activePeriod = this.periodState.activePeriod;
  readonly activePeriodObj = computed(() =>
    COURSE_PERIODS.find(p => p.id === this.activePeriod()) ?? COURSE_PERIODS[0],
  );

  switchPeriod(id: PeriodId): void {
    this.periodState.setActivePeriod(id);
  }

  /** Candidata elegida en el generador (para el Cuadro de calidad). */
  readonly chosenSolution = this.genState.chosenSolution;

  readonly schedules = signal<ScheduleList[]>([]);
  readonly grid = signal<ScheduleGrid | null>(null);
  readonly loading = signal(false);
  readonly selectedId = signal<string>('');
  readonly viewMode = signal<ViewMode>('group');
  readonly selectedFilter = signal<string>('');
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly stages = signal<SchoolStage[]>([]);
  readonly editModal = signal<ScheduleGridEntry | null>(null);

  editTeacherId = '';
  editClassroomId = '';

  readonly currentSchedule = computed(() =>
    this.schedules().find(s => s.id === this.selectedId())
  );

  readonly filteredGroupsForSelect = computed(() =>
    groupsByBlock(this.blockState.activeBlock(), this.stages(), this.groups())
  );

  readonly filteredTeachersForSelect = computed(() =>
    teachersByBlock(this.blockState.activeBlock(), this.stages(), this.teachers())
  );

  constructor() {
    effect(() => {
      const mode = this.viewMode();
      if (mode === 'group') {
        const list = this.filteredGroupsForSelect();
        if (list.length > 0) {
          if (!list.some(x => x.id === this.selectedFilter())) {
            this.selectedFilter.set(list[0].id);
          }
        } else {
          this.selectedFilter.set('');
        }
      } else if (mode === 'teacher') {
        const list = this.filteredTeachersForSelect();
        if (list.length > 0) {
          if (!list.some(x => x.id === this.selectedFilter())) {
            this.selectedFilter.set(list[0].id);
          }
        } else {
          this.selectedFilter.set('');
        }
      } else if (mode === 'room') {
        const list = this.classrooms();
        if (list.length > 0) {
          if (!list.some(x => x.id === this.selectedFilter())) {
            this.selectedFilter.set(list[0].id);
          }
        } else {
          this.selectedFilter.set('');
        }
      }
    });
  }

  readonly filteredEntries = computed(() => {
    const entries = this.grid()?.entries ?? [];
    const filter = this.selectedFilter();
    if (!filter) return entries;
    switch (this.viewMode()) {
      case 'group': return entries.filter(e => e.groupId === filter);
      case 'teacher': return entries.filter(e => e.teacherId === filter);
      case 'room': return entries.filter(e => e.classroomId === filter);
    }
  });

  /**
   * Slots a mostrar en el grid: cuando la vista es "por grupo" usamos los slots
   * del ciclo del grupo seleccionado; en las demás vistas usamos los del colegio.
   */
  readonly activeSlots = computed((): TimeSlot[] => {
    const g = this.grid();
    if (!g) return [];
    if (this.viewMode() !== 'group') return g.slots;
    const groupId = this.selectedFilter();
    const group = this.groups().find(gr => gr.id === groupId);
    if (!group) return g.slots;
    const cycle = cycleFromLevel(group.courseLevel);
    return g.slotsByCycle?.[cycle] ?? g.slots;
  });

  readonly viewTabs = [
    { id: 'group' as ViewMode, label: 'Por grupo' },
    { id: 'teacher' as ViewMode, label: 'Por profesor' },
    { id: 'room' as ViewMode, label: 'Por aula' },
  ];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const [schedules, teachers, groups, classrooms, stages] = await Promise.all([
        this.schedulesApi.getSchedules(),
        this.teachersApi.getTeachers(),
        this.groupsApi.getGroups(),
        this.classroomsApi.getClassrooms(),
        this.schoolsApi.getStages().catch(() => []),
      ]);
      this.schedules.set(schedules);
      this.teachers.set(teachers);
      this.groups.set(groups);
      this.classrooms.set(classrooms);
      this.stages.set(stages);

      const targetId = id ?? schedules.find(s => s.status === 'published')?.id ?? schedules[0]?.id;
      if (targetId) {
        this.selectedId.set(targetId);
        await this.loadGrid(targetId);
      }
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de carga', detail: 'No se pudieron cargar los datos de horarios.' });
    }
  }

  async loadGrid(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const grid = await this.schedulesApi.getSchedule(id);
      this.grid.set(grid);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener el grid del horario.' });
    } finally {
      this.loading.set(false);
    }
  }

  selectSchedule(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value;
    this.selectedId.set(id);
    this.loadGrid(id);
  }

  selectFilter(ev: Event): void {
    this.selectedFilter.set((ev.target as HTMLSelectElement).value);
  }

  onCellClick(ev: CellClickEvent): void {
    if (!ev.entry) return;
    this.editModal.set(ev.entry);
    this.editTeacherId = ev.entry.teacherId;
    this.editClassroomId = ev.entry.classroomId;
  }

  async saveEdit(): Promise<void> {
    const entry = this.editModal();
    const id = this.selectedId();
    if (!entry || !id) return;
    try {
      await this.schedulesApi.updateScheduleEntry(id, entry.id, this.editTeacherId, this.editClassroomId);
      await this.loadGrid(id);
      this.editModal.set(null);
      this.toast.add({ severity: 'success', summary: 'Sesión editada', detail: 'Se ha actualizado la sesión correctamente.' });
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la edición de la sesión.' });
    }
  }

  publish(): void {
    const id = this.selectedId();
    if (!id) return;
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas publicar este horario? Una vez publicado, todos los profesores podrán visualizar su horario correspondiente en sus perfiles.',
      header: 'Confirmar publicación',
      icon: 'pi pi-send',
      acceptLabel: 'Publicar',
      rejectLabel: 'Cancelar',
      acceptVisible: true,
      rejectVisible: true,
      acceptButtonProps: { label: 'Publicar', severity: 'primary' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: async () => {
        try {
          await this.schedulesApi.publishSchedule(id);
          const schedules = await this.schedulesApi.getSchedules();
          this.schedules.set(schedules);
          await this.loadGrid(id);
          this.toast.add({ severity: 'success', summary: 'Horario publicado', detail: 'El horario está ahora activo y visible para los profesores.' });
        } catch {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar el horario.' });
        }
      }
    });
  }

  discard(): void {
    const id = this.selectedId();
    if (!id) return;
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas descartar este horario? Quedará archivado (puedes borrarlo definitivamente después).',
      header: 'Descartar horario',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Descartar',
      rejectLabel: 'Cancelar',
      acceptVisible: true,
      rejectVisible: true,
      acceptButtonProps: { label: 'Descartar', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: async () => {
        try {
          await this.schedulesApi.archiveSchedule(id);
          const schedules = await this.schedulesApi.getSchedules();
          this.schedules.set(schedules);
          await this.loadGrid(id);
          this.toast.add({ severity: 'success', summary: 'Horario archivado', detail: 'El horario ha sido descartado y archivado.' });
        } catch {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descartar el horario.' });
        }
      }
    });
  }

  remove(): void {
    const id = this.selectedId();
    if (!id) return;
    this.confirmation.confirm({
      message: 'Esta acción no se puede deshacer.',
      header: 'Borrar horario',
      icon: 'pi pi-trash',
      acceptLabel: 'Borrar',
      rejectLabel: 'Cancelar',
      acceptVisible: true,
      rejectVisible: true,
      acceptButtonProps: { label: 'Borrar', severity: 'danger' },
      rejectButtonProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      accept: async () => {
        try {
          await this.schedulesApi.deleteSchedule(id);
          const schedules = await this.schedulesApi.getSchedules();
          this.schedules.set(schedules);
          const targetId = schedules.find(s => s.status === 'published')?.id ?? schedules[0]?.id;
          if (targetId) {
            this.selectedId.set(targetId);
            await this.loadGrid(targetId);
          } else {
            this.selectedId.set('');
            this.grid.set(null);
          }
          this.toast.add({ severity: 'success', summary: 'Horario borrado', detail: 'El horario ha sido eliminado permanentemente.' });
        } catch {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo borrar el horario.' });
        }
      }
    });
  }

  exportPdf(): void {
    window.print();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador', generated: 'Generado',
      published: 'Publicado', archived: 'Archivado',
    };
    return map[status] ?? status;
  }
}
