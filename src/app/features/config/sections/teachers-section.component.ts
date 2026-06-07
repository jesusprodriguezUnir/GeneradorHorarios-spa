import { Component, inject, signal, computed, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { TeachersApiService } from '../../../core/api/teachers-api.service';
import { Teacher, SchoolStage, SubjectAllocation } from '../../../core/models';
import { TEACHER_TYPES } from '../config.constants';
import { BLOCKS, EtapaBlock } from '../../../core/blocks.model';
import { BlockStateService } from '../../../core/block-state.service';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';

@Component({
  selector: 'app-teachers-section',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, TableModule, InputText, LecIconComponent],
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
  readonly teachersChange = output<Teacher[]>();
  
  readonly isTeacherModalOpen = signal(false);
  readonly editingTeacher = signal<Teacher | null>(null);

  readonly expandedStages = signal<Set<string>>(new Set<string>());

  teacherForm = signal({
    fullName: '',
    email: '',
    teacherType: 'definitivo',
    maxWeeklyHours: 25,
    subjectHours: {} as Record<string, number>,
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

  // ── Subjects in / out of form carga ──────────────────────────────────────

  readonly activeSubjects = computed(() => {
    const sh = this.teacherForm().subjectHours;
    return this.subjects().filter(s => s.subjectKey in sh);
  });

  readonly inactiveSubjects = computed(() => {
    const sh = this.teacherForm().subjectHours;
    return this.subjects().filter(s => !(s.subjectKey in sh));
  });

  // ── Accordion Helpers ────────────────────────────────────────────────────────
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
    return this.teachers().filter(t =>
      t.stageAssignments?.some(sa => sa.stageId === stageId)
    );
  }

  teachersWithoutStage(): Teacher[] {
    return this.teachers().filter(t =>
      !t.stageAssignments || t.stageAssignments.length === 0
    );
  }

  teacherTypeLabel(type: string): string {
    const found = TEACHER_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  subjectSummary(t: Teacher): string {
    if (!t.subjectHours?.length) return '—';
    const total = t.subjectHours.reduce((s, sh) => s + sh.weeklyHours, 0);
    return `${t.subjectHours.length} áreas · ${total}h`;
  }

  openAddModal(): void {
    this.editingTeacher.set(null);
    
    let defaultStages: string[] = [];
    const active = this.blockState.activeBlock();
    if (active !== 'all') {
      const activeStage = this.stages().find(s => this.getEtapaId(s.stageType) === active);
      if (activeStage) {
        defaultStages = [activeStage.id];
      }
    }

    this.teacherForm.set({
      fullName: '',
      email: '',
      teacherType: 'definitivo',
      maxWeeklyHours: 25,
      subjectHours: {},
      colorKey: 'mat',
      selectedStageIds: defaultStages,
    });
    this.isTeacherModalOpen.set(true);
  }

  editTeacher(t: Teacher): void {
    this.editingTeacher.set(t);
    const selectedStageIds = t.stageAssignments?.map(sa => sa.stageId) ?? [];
    this.teacherForm.set({
      fullName: t.fullName,
      email: t.email,
      teacherType: t.teacherType,
      maxWeeklyHours: t.maxWeeklyHours,
      subjectHours: Object.fromEntries(t.subjectHours.map(sh => [sh.subjectKey, sh.weeklyHours])),
      colorKey: t.colorKey,
      selectedStageIds,
    });
    this.isTeacherModalOpen.set(true);
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

    const stageAssignments = form.selectedStageIds.map(stageId => ({
      stageId,
      cycle: null as number | null
    }));

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      teacherType: form.teacherType,
      maxWeeklyHours: Number(form.maxWeeklyHours),
      subjectHours: Object.entries(form.subjectHours).map(([subjectKey, weeklyHours]) => ({ subjectKey, weeklyHours })),
      colorKey: form.colorKey,
      stageAssignments,
    };

    try {
      if (editing) {
        await this.api.updateTeacher(editing.id, payload);
      } else {
        await this.api.createTeacher(payload);
      }
      
      const updatedTeachers = await this.api.getTeachers();
      this.teachersChange.emit(updatedTeachers);
      this.isTeacherModalOpen.set(false);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail: 'No se pudo guardar el profesor. Por favor, comprueba los datos.' });
    }
  }

  adjustTeacherHours(amount: number): void {
    this.teacherForm.update(f => {
      const newHours = Math.max(1, Math.min(40, f.maxWeeklyHours + amount));
      return { ...f, maxWeeklyHours: newHours };
    });
  }

  totalHours(): number {
    return Object.values(this.teacherForm().subjectHours).reduce((s, h) => s + (h || 0), 0);
  }

  loadTemplate(): void {
    const hours: Record<string, number> = {};
    for (const s of this.subjects()) {
      hours[s.subjectKey] = s.weeklyHoursDefault;
    }
    this.teacherForm.update(f => ({ ...f, subjectHours: hours }));
  }

  adjustSubjectHours(key: string, delta: number): void {
    this.teacherForm.update(f => {
      const s = this.subjects().find(x => x.subjectKey === key);
      const min = s?.weeklyHoursMin ?? 0;
      const max = s?.weeklyHoursMax ?? 12;
      const next = Math.max(min, Math.min(max, (f.subjectHours[key] ?? 0) + delta));
      return { ...f, subjectHours: { ...f.subjectHours, [key]: next } };
    });
  }

  removeSubject(key: string): void {
    this.teacherForm.update(f => {
      const { [key]: _, ...rest } = f.subjectHours;
      return { ...f, subjectHours: rest };
    });
  }

  addSubject(event: Event): void {
    const sel = event.target as HTMLSelectElement;
    const key = sel.value;
    sel.value = '';
    if (!key) return;
    const s = this.subjects().find(x => x.subjectKey === key);
    if (!s) return;
    this.teacherForm.update(f => ({
      ...f,
      subjectHours: { ...f.subjectHours, [key]: s.weeklyHoursDefault },
    }));
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
