import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ScheduleGrid, ScheduleGridEntry, ScheduleList, Teacher, CourseGroup, Classroom, TimeSlot, cycleFromLevel } from '../../core/models';
import { ScheduleGridComponent, CellClickEvent } from '../../shared/schedule-grid/schedule-grid.component';
import { MessageService, ConfirmationService } from 'primeng/api';

type ViewMode = 'group' | 'teacher' | 'room';

@Component({
  selector: 'app-schedule-result',
  standalone: true,
  imports: [CommonModule, FormsModule, ScheduleGridComponent],
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
        </div>
      }

      @if (loading()) {
        <div style="text-align:center;padding:48px;color:var(--muted-foreground)">
          <div class="spinner"></div>
          Cargando horario...
        </div>
      } @else if (grid()) {
        <!-- Tabs de vista -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div class="view-tabs">
            @for (t of viewTabs; track t.id) {
              <button class="view-tab" [class.view-tab--active]="viewMode() === t.id"
                (click)="viewMode.set(t.id)" [attr.data-testid]="'view-tab-' + t.id">
                {{ t.label }}
              </button>
            }
          </div>
          @if (viewMode() === 'group') {
            <select (change)="selectFilter($event)" class="field-select">
              @for (g of groups(); track g.id) {
                <option [value]="g.id">{{ g.displayName }}</option>
              }
            </select>
          }
          @if (viewMode() === 'teacher') {
            <select (change)="selectFilter($event)" class="field-select">
              @for (t of teachers(); track t.id) {
                <option [value]="t.id">{{ t.fullName }}</option>
              }
            </select>
          }
          @if (viewMode() === 'room') {
            <select (change)="selectFilter($event)" class="field-select">
              @for (r of classrooms(); track r.id) {
                <option [value]="r.id">{{ r.name }}</option>
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
          <div class="legend-row">
            <span style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.04em">Leyenda:</span>
            @for (color of subjectLegend; track color.name) {
              <div class="legend-item">
                <span class="legend-dot" [style.background]="color.bg"></span>
                {{ color.name }}
              </div>
            }
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
    .badge--generated { background: var(--warning-tint); color: oklch(0.45 0.11 65); }
    .conflict-badge { font-size: var(--text-xs); font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); background: var(--destructive-tint); color: var(--destructive); }
    .btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--primary); color: #fff; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); cursor: pointer; }
    .btn-primary:hover { background: var(--primary-strong); }
    .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--card); color: var(--foreground); box-shadow: inset 0 0 0 1px var(--border-strong); border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); cursor: pointer; }
    .field-select { padding: 9px 12px; border: 1px solid var(--input); border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-sans); background: var(--card); color: var(--foreground); }
    .spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--primary); animation: lec-spin 0.8s linear infinite; margin: 0 auto 16px; }
    
    .view-tabs { display: inline-flex; background: var(--secondary); border-radius: var(--radius-md); padding: 4px; gap: 2px; }
    .view-tab { padding: 7px 16px; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: all .15s; background: transparent; color: var(--muted-foreground); }
    .view-tab--active { background: var(--card); color: var(--foreground); box-shadow: var(--shadow-xs); }
    
    .conflict-row { padding: 12px 14px; border-radius: var(--radius-md); font-size: var(--text-sm); }
    .conflict-error { background: var(--destructive-tint); color: var(--destructive); }
    .conflict-warn { background: var(--warning-tint); color: oklch(0.45 0.11 65); }
    
    .empty-state { text-align: center; padding: 48px 16px; color: var(--muted-foreground); }
    .empty-state h3 { font-size: var(--text-xl); font-weight: 700; color: var(--foreground); margin-bottom: 8px; }
    
    .modal-backdrop { position: fixed; inset: 0; z-index: 80; background: oklch(0.2 0.02 255 / 0.45); display: flex; align-items: flex-end; justify-content: center; }
    .modal-card { background: var(--card); border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-lg); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: var(--text-lg); font-weight: 700; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }

    .legend-row { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-xs); font-weight: 600; color: var(--foreground); }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
  `],
})
export class ScheduleResultComponent implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly schedules = signal<ScheduleList[]>([]);
  readonly grid = signal<ScheduleGrid | null>(null);
  readonly loading = signal(false);
  readonly selectedId = signal<string>('');
  readonly viewMode = signal<ViewMode>('group');
  readonly selectedFilter = signal<string>('');
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly editModal = signal<ScheduleGridEntry | null>(null);

  editTeacherId = '';
  editClassroomId = '';

  readonly currentSchedule = computed(() =>
    this.schedules().find(s => s.id === this.selectedId())
  );

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

  readonly subjectLegend = [
    { name: 'Matemáticas', bg: 'var(--subj-mat)' },
    { name: 'Lengua', bg: 'var(--subj-len)' },
    { name: 'Ciencias', bg: 'var(--subj-cie)' },
    { name: 'Sociales', bg: 'var(--subj-soc)' },
    { name: 'Inglés', bg: 'var(--subj-ing)' },
    { name: 'E. Física', bg: 'var(--subj-ef)' },
    { name: 'Música', bg: 'var(--subj-mus)' },
    { name: 'Plástica', bg: 'var(--subj-art)' },
    { name: 'Religión', bg: 'var(--subj-rel)' },
    { name: 'Tutoría', bg: 'var(--subj-tut)' },
  ];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const [schedules, teachers, groups, classrooms] = await Promise.all([
        this.api.getSchedules(),
        this.api.getTeachers(),
        this.api.getGroups(),
        this.api.getClassrooms(),
      ]);
      this.schedules.set(schedules);
      this.teachers.set(teachers);
      this.groups.set(groups);
      this.classrooms.set(classrooms);

      if (groups.length > 0) this.selectedFilter.set(groups[0].id);

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
      const grid = await this.api.getSchedule(id);
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
      await this.api.updateScheduleEntry(id, entry.id, this.editTeacherId, this.editClassroomId);
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
      accept: async () => {
        try {
          await this.api.publishSchedule(id);
          const schedules = await this.api.getSchedules();
          this.schedules.set(schedules);
          await this.loadGrid(id);
          this.toast.add({ severity: 'success', summary: 'Horario publicado', detail: 'El horario está ahora activo y visible para los profesores.' });
        } catch {
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo publicar el horario.' });
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
