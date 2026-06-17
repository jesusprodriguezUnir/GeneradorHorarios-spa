import { Component, inject, signal, computed, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { TeachersApiService } from '../../../core/api/teachers-api.service';
import {
  Teacher, SchoolStage, SubjectAllocation, CourseGroup,
  TeacherAssignmentInput,
} from '../../../core/models';
import { TEACHER_TYPES } from '../config.constants';
import { BLOCKS, EtapaBlock } from '../../../core/blocks.model';
import { BlockStateService } from '../../../core/block-state.service';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';

@Component({
  selector: 'app-teachers-section',
  standalone: true,
  imports: [FormsModule, Dialog, TableModule, InputText, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teachers-section.component.html',
  styleUrls: ['./teachers-section.component.scss']
})
export class TeachersSectionComponent {
  private readonly api = inject(TeachersApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly blockState = inject(BlockStateService);

  readonly teachers = input.required<Teacher[]>();
  readonly stages = input.required<SchoolStage[]>();
  readonly subjects = input.required<SubjectAllocation[]>();
  readonly groups = input.required<CourseGroup[]>();
  readonly teachersChange = output<Teacher[]>();

  readonly isTeacherModalOpen = signal(false);
  readonly editingTeacher = signal<Teacher | null>(null);

  readonly expandedStages = signal<Set<string>>(new Set<string>());
  readonly stageCycleFilters = signal<Record<string, number | null>>({});

  teacherForm = signal({
    fullName: '',
    email: '',
    teacherType: 'definitivo',
    maxWeeklyHours: 25,
    /** Distribución real: lista de filas asignatura+grupo+horas. */
    assignments: [] as TeacherAssignmentInput[],
    colorKey: 'mat',
    selectedStageIds: [] as string[],
  });

  constructor() {
    effect(() => {
      const active = this.blockState.activeBlock();
      if (active !== 'all') {
        this.expandedStages.set(new Set([active]));
      } else {
        this.expandedStages.set(new Set(['inf', 'pri', 'sec']));
      }
    });
  }

  // ── Grupos disponibles para el modal (solo los de las etapas seleccionadas) ──

  readonly availableGroups = computed(() => {
    const stageIds = new Set(this.teacherForm().selectedStageIds);
    return this.groups().filter(g => g.stageId && stageIds.has(g.stageId));
  });

  /** Grupos que el usuario ya ha añadido al form (tienen al menos 1 asignación). */
  readonly assignedGroupIds = computed(() => {
    const ids = new Set<string>();
    for (const a of this.teacherForm().assignments) ids.add(a.groupId);
    return ids;
  });

  /** Grupos disponibles que aún no están añadidos. */
  readonly groupsToAdd = computed(() =>
    this.availableGroups().filter(g => !this.assignedGroupIds().has(g.id))
  );

  /** Grupos presentes en el form (con sus datos completos). */
  readonly activeGroups = computed(() => {
    const ids = this.assignedGroupIds();
    // Devolvemos tanto los grupos de las etapas seleccionadas como los que
    // ya tenían asignaciones aunque la etapa se haya deseleccionado (no perder datos).
    const all = this.groups();
    return all.filter(g => ids.has(g.id));
  });

  // ── Asignaturas elegibles por grupo ─────────────────────────────────────────

  /** Asignaturas que ya están asignadas a un grupo concreto (para excluirlas del select). */
  assignedSubjectIdsForGroup(groupId: string): Set<string> {
    const ids = new Set<string>();
    for (const a of this.teacherForm().assignments) {
      if (a.groupId === groupId) ids.add(a.allocationId);
    }
    return ids;
  }

  /** Asignaturas elegibles para añadir a un grupo (filtradas por curso/ciclo del grupo, sin las ya añadidas). */
  subjectsForGroup(group: CourseGroup): SubjectAllocation[] {
    const stage = this.stages().find(s => s.id === group.stageId);
    const ciclo = stage ? this.cicloForLevel(group.courseLevel, stage) : null;
    const assigned = this.assignedSubjectIdsForGroup(group.id);
    return this.subjects().filter(s => {
      if (assigned.has(s.id)) return false;
      if (s.courseLevel && s.courseLevel !== group.courseLevel) return false;
      if (s.cycle && !s.courseLevel && ciclo && s.cycle !== ciclo) return false;
      return true;
    });
  }

  // ── Asignaciones del form por grupo ─────────────────────────────────────────

  assignmentsForGroup(groupId: string): (TeacherAssignmentInput & { subject: SubjectAllocation | undefined })[] {
    return this.teacherForm().assignments
      .filter(a => a.groupId === groupId)
      .map(a => ({ ...a, subject: this.subjects().find(s => s.id === a.allocationId) }));
  }

  // ── Operaciones CRUD sobre assignments ──────────────────────────────────────

  addGroup(groupId: string): void {
    if (!groupId) return;
    // Añadir el grupo sin asignaciones aún (se añaden asignaturas después).
    // Noop si ya existe.
    if (!this.assignedGroupIds().has(groupId)) {
      // No añadimos fila todavía, pero al haber "tocado" el grupo queremos mostrarlo.
      // Añadimos una centinela vacía que no se enviará: mejor simplemente no añadimos
      // nada y dejamos que assignedGroupIds detecte el grupo solo cuando haya filas.
      // En cambio, para mostrar el bloque vacío necesitamos trackear los groupIds de otra forma.
      // Solución: guardamos los groupIds activos en un signal separado.
      this._activeGroupIds.update(ids => new Set([...ids, groupId]));
    }
  }

  /** Quita un grupo y todas sus asignaciones. */
  removeGroup(groupId: string): void {
    this.teacherForm.update(f => ({
      ...f,
      assignments: f.assignments.filter(a => a.groupId !== groupId),
    }));
    this._activeGroupIds.update(ids => {
      const next = new Set(ids);
      next.delete(groupId);
      return next;
    });
  }

  /** Añade una asignatura a un grupo con las horas por defecto. */
  addAssignment(groupId: string, allocationId: string): void {
    if (!allocationId) return;
    const subject = this.subjects().find(s => s.id === allocationId);
    if (!subject) return;
    const weeklyHours = subject.weeklyHoursDefault;
    this.teacherForm.update(f => ({
      ...f,
      assignments: [...f.assignments, { allocationId, groupId, weeklyHours }],
    }));
  }

  /** Ajusta las horas de una asignación (stepper ±1 con clamp min/max). */
  adjustAssignmentHours(allocationId: string, groupId: string, delta: number): void {
    this.teacherForm.update(f => {
      const subject = this.subjects().find(s => s.id === allocationId);
      const min = subject?.weeklyHoursMin ?? 1;
      const max = subject?.weeklyHoursMax ?? 12;
      return {
        ...f,
        assignments: f.assignments.map(a =>
          a.allocationId === allocationId && a.groupId === groupId
            ? { ...a, weeklyHours: Math.max(min, Math.min(max, a.weeklyHours + delta)) }
            : a
        ),
      };
    });
  }

  /** Quita una asignatura de un grupo. */
  removeAssignment(allocationId: string, groupId: string): void {
    this.teacherForm.update(f => ({
      ...f,
      assignments: f.assignments.filter(
        a => !(a.allocationId === allocationId && a.groupId === groupId)
      ),
    }));
  }

  // ── Totales ──────────────────────────────────────────────────────────────────

  readonly totalAssignedHours = computed(() =>
    this.teacherForm().assignments.reduce((s, a) => s + (a.weeklyHours || 0), 0)
  );

  readonly hoursExceeded = computed(() =>
    this.totalAssignedHours() > this.teacherForm().maxWeeklyHours
  );

  readonly hoursProgressPct = computed(() => {
    const max = this.teacherForm().maxWeeklyHours;
    if (!max) return 0;
    return Math.min(100, Math.round((this.totalAssignedHours() / max) * 100));
  });

  // ── Signal auxiliar: grupos "activos" en el form (con o sin asignaturas) ────
  // Necesitamos esto para mostrar un grupo vacío justo tras añadirlo.

  private readonly _activeGroupIds = signal<Set<string>>(new Set<string>());

  readonly formGroupIds = computed(() => {
    // Unión de los groupIds con asignaciones + los groupIds "abiertos" sin asignaturas aún.
    const withAssignments = this.assignedGroupIds();
    const opened = this._activeGroupIds();
    return new Set([...withAssignments, ...opened]);
  });

  readonly formActiveGroups = computed(() => {
    const ids = this.formGroupIds();
    return this.groups().filter(g => ids.has(g.id));
  });

  // ── Resumen de la tabla del claustro ─────────────────────────────────────────

  subjectSummary(t: Teacher): string {
    // Preferir assignments si están disponibles, si no usar subjectHours derivado.
    if (t.assignments?.length) {
      const groupIds = new Set(t.assignments.map(a => a.groupId));
      const total = t.assignments.reduce((s, a) => s + a.weeklyHours, 0);
      return `${groupIds.size} grupo${groupIds.size !== 1 ? 's' : ''} · ${total}h`;
    }
    if (!t.subjectHours?.length) return '—';
    const total = t.subjectHours.reduce((s, sh) => s + sh.weeklyHours, 0);
    return `${t.subjectHours.length} áreas · ${total}h`;
  }

  // ── Helpers de ciclo ─────────────────────────────────────────────────────────

  cicloForLevel(level: number, stage: SchoolStage): number {
    return Math.ceil((level - stage.minLevel + 1) / 2);
  }

  cicloLabel(c: number | null): string {
    if (!c) return '';
    return c === 1 ? '1.er Ciclo' : c === 3 ? '3.er Ciclo' : `${c}.º Ciclo`;
  }

  groupCicloLabel(group: CourseGroup): string {
    const stage = this.stages().find(s => s.id === group.stageId);
    if (!stage) return '';
    return this.cicloLabel(this.cicloForLevel(group.courseLevel, stage));
  }

  // ── Accordion helpers ────────────────────────────────────────────────────────

  toggleStage(stageId: string): void {
    const stage = this.stages().find(s => s.id === stageId);
    const blockId = stage ? this.getEtapaId(stage.stageType) : stageId;

    this.expandedStages.update(prev => {
      const next = new Set(prev);
      if (next.has(stageId) || next.has(blockId)) {
        next.delete(stageId);
        next.delete(blockId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }

  isStageExpanded(stageId: string): boolean {
    const stage = this.stages().find(s => s.id === stageId);
    const blockId = stage ? this.getEtapaId(stage.stageType) : stageId;
    return this.expandedStages().has(stageId) || this.expandedStages().has(blockId);
  }

  getEtapaId(stageType: string): string {
    const type = stageType.toLowerCase();
    if (type.includes('inf')) return 'inf';
    if (type.includes('pri')) return 'pri';
    if (type.includes('sec') || type.includes('eso')) return 'sec';
    return type;
  }

  getEtapaBlock(stageType: string): EtapaBlock | undefined {
    const id = this.getEtapaId(stageType);
    return BLOCKS.find(b => b.id === id);
  }

  teachersForStage(stageId: string): Teacher[] {
    const cycle = this.cycleFilterFor(stageId);
    return this.teachers().filter(t =>
      t.stageAssignments?.some(sa =>
        sa.stageId === stageId &&
        (cycle === null || sa.cycle === null || sa.cycle === cycle)
      )
    );
  }

  teachersWithoutStage(): Teacher[] {
    return this.teachers().filter(t =>
      !t.stageAssignments || t.stageAssignments.length === 0
    );
  }

  cyclesForStage(stage: SchoolStage): number[] {
    const maxCycle = Math.ceil((stage.maxLevel - stage.minLevel + 1) / 2);
    const out = [];
    for (let i = 1; i <= maxCycle; i++) out.push(i);
    return out;
  }

  cycleFilterFor(stageId: string): number | null {
    return this.stageCycleFilters()[stageId] ?? null;
  }

  setCycleFilter(stageId: string, cycle: number | null): void {
    this.stageCycleFilters.update(prev => ({ ...prev, [stageId]: cycle }));
  }

  // ── Otros helpers ────────────────────────────────────────────────────────────

  teacherTypeLabel(type: string): string {
    const found = TEACHER_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  isStageSelected(stageId: string): boolean {
    return this.teacherForm().selectedStageIds.includes(stageId);
  }

  toggleStageSelection(stageId: string): void {
    this.teacherForm.update(f => {
      const ids = f.selectedStageIds.includes(stageId)
        ? f.selectedStageIds.filter(id => id !== stageId)
        : [...f.selectedStageIds, stageId];
      return { ...f, selectedStageIds: ids };
    });
  }

  adjustTeacherHours(amount: number): void {
    this.teacherForm.update(f => {
      const newHours = Math.max(1, Math.min(40, f.maxWeeklyHours + amount));
      return { ...f, maxWeeklyHours: newHours };
    });
  }

  // ── Modal: abrir / guardar ────────────────────────────────────────────────────

  openAddModal(): void {
    this.editingTeacher.set(null);

    let defaultStages: string[] = [];
    const active = this.blockState.activeBlock();
    if (active !== 'all') {
      const activeStage = this.stages().find(s => this.getEtapaId(s.stageType) === active);
      if (activeStage) defaultStages = [activeStage.id];
    }

    this._activeGroupIds.set(new Set());
    this.teacherForm.set({
      fullName: '',
      email: '',
      teacherType: 'definitivo',
      maxWeeklyHours: 25,
      assignments: [],
      colorKey: 'mat',
      selectedStageIds: defaultStages,
    });
    this.isTeacherModalOpen.set(true);
  }

  async editTeacher(t: Teacher): Promise<void> {
    this.editingTeacher.set(t);

    try {
      const full = await this.api.getTeacher(t.id);
      const selectedStageIds = full.stageAssignments?.map(sa => sa.stageId) ?? [];
      const assignments: TeacherAssignmentInput[] = (full.assignments ?? []).map(a => ({
        allocationId: a.allocationId,
        groupId: a.groupId,
        weeklyHours: a.weeklyHours,
      }));
      const groupIds = new Set(assignments.map(a => a.groupId));
      this._activeGroupIds.set(groupIds);

      this.teacherForm.set({
        fullName: full.fullName,
        email: full.email,
        teacherType: full.teacherType,
        maxWeeklyHours: full.maxWeeklyHours,
        assignments,
        colorKey: full.colorKey,
        selectedStageIds,
      });
      this.isTeacherModalOpen.set(true);
    } catch {
      this.msg.add({
        severity: 'error',
        summary: 'Error al cargar',
        detail: 'No se pudieron cargar los datos del profesor. Inténtalo de nuevo.',
      });
    }
  }

  async saveTeacher(): Promise<void> {
    const form = this.teacherForm();
    const editing = this.editingTeacher();

    if (!form.fullName || form.fullName.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre del profesor es obligatorio.' });
      return;
    }
    if (!form.email || form.email.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El email es obligatorio.' });
      return;
    }
    if (this.hoursExceeded()) {
      this.msg.add({
        severity: 'warn',
        summary: 'Horas excedidas',
        detail: `Has asignado ${this.totalAssignedHours()}h, pero el máximo del profesor es ${form.maxWeeklyHours}h. Ajusta la distribución antes de guardar.`,
      });
      return;
    }

    const stageAssignments = form.selectedStageIds.map(stageId => {
      const originals = editing?.stageAssignments?.filter(sa => sa.stageId === stageId) ?? [];
      if (originals.length > 0) {
        return originals.map(sa => ({ stageId: sa.stageId, cycle: sa.cycle }));
      }
      return [{ stageId, cycle: null as number | null }];
    }).flat();

    // Payload básico del profesor (sin assignments).
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      teacherType: form.teacherType,
      maxWeeklyHours: Number(form.maxWeeklyHours),
      colorKey: form.colorKey,
      stageAssignments,
    };

    try {
      let savedTeacher: Teacher;
      if (editing) {
        savedTeacher = await this.api.updateTeacher(editing.id, payload);
      } else {
        savedTeacher = await this.api.createTeacher(payload);
      }

      // Guardar distribución de horas por grupo (replace transaccional).
      // Solo si hay asignaciones o si se está editando (para poder limpiarlas).
      if (form.assignments.length > 0 || editing) {
        try {
          await this.api.updateTeacherAssignments(savedTeacher.id, form.assignments);
        } catch (err: any) {
          const detail =
            err?.error?.message ||
            err?.message ||
            'El profesor se guardó, pero la distribución horaria no pudo persistirse. Revisa que los grupos y asignaturas sean válidos.';
          this.msg.add({ severity: 'warn', summary: 'Datos básicos guardados', detail });
        }
      }

      const updatedTeachers = await this.api.getTeachers();
      this.teachersChange.emit(updatedTeachers);
      this.isTeacherModalOpen.set(false);
    } catch (err: any) {
      const detail = err?.error?.message || err?.message || 'No se pudo guardar el profesor. Por favor, comprueba los datos.';
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail });
    }
  }

  deleteTeacher(id: string): void {
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas eliminar este profesor? Esta acción no se puede deshacer.',
      header: 'Eliminar profesor',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.api.deleteTeacher(id).catch(() => {});
        const updatedTeachers = await this.api.getTeachers();
        this.teachersChange.emit(updatedTeachers);
        this.msg.add({ severity: 'success', summary: 'Profesor eliminado', detail: 'El profesor ha sido eliminado correctamente.' });
      },
    });
  }
}
