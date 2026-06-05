import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { TeachersApiService } from '../../../core/api/teachers-api.service';
import { Teacher, SchoolStage } from '../../../core/models';
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
  readonly teachersChange = output<Teacher[]>();
  
  readonly isTeacherModalOpen = signal(false);
  readonly editingTeacher = signal<Teacher | null>(null);

  readonly expandedStages = signal<Set<string>>(new Set<string>());

  teacherForm = signal({
    fullName: '',
    email: '',
    teacherType: 'definitivo',
    maxWeeklyHours: 25,
    specialtiesRaw: '',
    colorKey: 'mat',
    selectedStageIds: [] as string[],
  });

  constructor() {
    const initial = this.blockState.activeBlock();
    if (initial !== 'all') {
      this.expandedStages.set(new Set([initial]));
    } else {
      this.expandedStages.set(new Set(['inf', 'pri', 'sec']));
    }
  }

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
      specialtiesRaw: 'Generalista',
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
      specialtiesRaw: t.specialties.join(', '),
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

    const specialties = form.specialtiesRaw
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const stageAssignments = form.selectedStageIds.map(stageId => ({
      stageId,
      cycle: null as number | null
    }));

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      teacherType: form.teacherType,
      maxWeeklyHours: Number(form.maxWeeklyHours),
      specialties,
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
