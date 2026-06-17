import { Component, inject, signal, computed, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { SubjectsApiService } from '../../../core/api/subjects-api.service';
import { SubjectAllocation, SchoolStage } from '../../../core/models';
import { BLOCKS, EtapaBlock } from '../../../core/blocks.model';
import { BlockStateService } from '../../../core/block-state.service';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';

@Component({
  selector: 'app-subjects-section',
  standalone: true,
  imports: [FormsModule, Dialog, TableModule, InputText, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subjects-section.component.html',
  styleUrls: ['./subjects-section.component.scss']
})
export class SubjectsSectionComponent {
  private readonly api = inject(SubjectsApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly blockState = inject(BlockStateService);

  readonly subjects = input.required<SubjectAllocation[]>();
  readonly stages = input.required<SchoolStage[]>();
  readonly subjectsChange = output<SubjectAllocation[]>();

  readonly isSubjectModalOpen = signal(false);
  readonly editingSubject = signal<SubjectAllocation | null>(null);

  readonly expandedStages = signal<Set<string>>(new Set<string>());
  readonly stageCycleFilters = signal<Record<string, number | null>>({});

  subjectForm = signal({
    subjectName: '',
    subjectShort: '',
    subjectKey: '',
    weeklyHoursMin: 1,
    weeklyHoursMax: 6,
    weeklyHoursDefault: 3,
    requiresSpecialist: false,
    requiredClassroomType: '',
    maxConsecutiveSlots: 2,
    splittableAcrossDays: true,
    cycle: null as number | null,
    courseLevel: null as number | null,
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

  readonly isOfficialTemplate = computed(() => 
    this.subjects().length > 0 && this.subjects().every(s => s.isOfficial)
  );

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

  subjectsForStage(stageId: string): SubjectAllocation[] {
    const stage = this.stages().find(s => s.id === stageId);
    if (!stage) return [];
    const filterCycle = this.cycleFilterFor(stageId);
    
    return this.subjects().filter(subj => {
      let subjCycle: number | null = null;
      if (subj.courseLevel) {
        if (subj.courseLevel < stage.minLevel || subj.courseLevel > stage.maxLevel) return false;
        subjCycle = Math.ceil((subj.courseLevel - stage.minLevel + 1) / 2);
      } else if (subj.cycle) {
        const maxCycle = Math.ceil((stage.maxLevel - stage.minLevel + 1) / 2);
        if (subj.cycle < 1 || subj.cycle > maxCycle) return false;
        subjCycle = subj.cycle;
      } else {
        return false;
      }
      
      if (filterCycle !== null && subjCycle !== filterCycle) return false;
      return true;
    });
  }

  genericSubjects(): SubjectAllocation[] {
    return this.subjects().filter(subj => !subj.courseLevel && !subj.cycle);
  }

  cyclesForStage(stage: SchoolStage): number[] {
    const minCycle = 1;
    const maxCycle = Math.ceil((stage.maxLevel - stage.minLevel + 1) / 2);
    const out = [];
    for(let i = minCycle; i <= maxCycle; i++) out.push(i);
    return out;
  }

  cycleFilterFor(stageId: string): number | null {
    return this.stageCycleFilters()[stageId] ?? null;
  }

  setCycleFilter(stageId: string, cycle: number | null): void {
    this.stageCycleFilters.update(prev => ({ ...prev, [stageId]: cycle }));
  }

  cicloLabel(c: number | null): string {
    if (!c) return '';
    return c === 1 ? '1.er Ciclo' : c === 3 ? '3.er Ciclo' : `${c}.º Ciclo`;
  }

  openAddModal(): void {
    this.editingSubject.set(null);
    this.subjectForm.set({
      subjectName: '',
      subjectShort: '',
      subjectKey: '',
      weeklyHoursMin: 1,
      weeklyHoursMax: 6,
      weeklyHoursDefault: 3,
      requiresSpecialist: false,
      requiredClassroomType: '',
      maxConsecutiveSlots: 2,
      splittableAcrossDays: true,
      cycle: null,
      courseLevel: null,
    });
    this.isSubjectModalOpen.set(true);
  }

  editSubject(s: SubjectAllocation): void {
    this.editingSubject.set(s);
    this.subjectForm.set({
      subjectName: s.subjectName,
      subjectShort: s.subjectShort,
      subjectKey: s.subjectKey,
      weeklyHoursMin: s.weeklyHoursMin,
      weeklyHoursMax: s.weeklyHoursMax,
      weeklyHoursDefault: s.weeklyHoursDefault,
      requiresSpecialist: s.requiresSpecialist,
      requiredClassroomType: s.requiredClassroomType ?? '',
      maxConsecutiveSlots: s.maxConsecutiveSlots,
      splittableAcrossDays: s.splittableAcrossDays,
      cycle: s.cycle ?? null,
      courseLevel: s.courseLevel ?? null,
    });
    this.isSubjectModalOpen.set(true);
  }

  async saveSubject(): Promise<void> {
    const form = this.subjectForm();
    const editing = this.editingSubject();

    if (!form.subjectName || form.subjectName.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre de la asignatura es obligatorio.' });
      return;
    }
    if (!form.subjectShort || form.subjectShort.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'Las siglas/nombre corto son obligatorias.' });
      return;
    }
    if (!form.subjectKey || form.subjectKey.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'La clave de asignatura es obligatoria.' });
      return;
    }

    const payload = {
      subjectName: form.subjectName.trim(),
      subjectShort: form.subjectShort.trim(),
      subjectKey: form.subjectKey.trim().toLowerCase(),
      weeklyHoursMin: Number(form.weeklyHoursMin),
      weeklyHoursMax: Number(form.weeklyHoursMax),
      weeklyHoursDefault: Number(form.weeklyHoursDefault),
      requiresSpecialist: form.requiresSpecialist,
      requiredClassroomType: form.requiredClassroomType ? form.requiredClassroomType : null,
      maxConsecutiveSlots: Number(form.maxConsecutiveSlots),
      splittableAcrossDays: form.splittableAcrossDays,
      cycle: form.cycle ? Number(form.cycle) : null,
      courseLevel: form.courseLevel ? Number(form.courseLevel) : null,
    };

    try {
      if (editing) {
        await this.api.updateSubject(editing.id, payload);
      } else {
        await this.api.createSubject(payload);
      }
      
      const updatedSubjects = await this.api.getSubjects();
      this.subjectsChange.emit(updatedSubjects);
      this.isSubjectModalOpen.set(false);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail: 'No se pudo guardar la asignatura. Por favor, comprueba los datos.' });
    }
  }

  async updateSubjectHours(id: string, ev: Event, min: number, max: number): Promise<void> {
    const val = parseInt((ev.target as HTMLInputElement).value, 10);
    if (isNaN(val) || val < min || val > max) return;
    await this.api.updateSubjectHours(id, val).catch(() => {});
    
    const updated = await this.api.getSubjects();
    this.subjectsChange.emit(updated);
  }

  adjustMaxConsecutive(amount: number): void {
    this.subjectForm.update(f => {
      const newSlots = Math.max(1, Math.min(4, f.maxConsecutiveSlots + amount));
      return { ...f, maxConsecutiveSlots: newSlots };
    });
  }

  cloneOfficialTemplate(): void {
    this.confirmation.confirm({
      message: '¿Deseas personalizar el currículo oficial para tu centro? Esto te permitirá añadir y modificar asignaturas propias.',
      header: 'Personalizar currículo LOMLOE',
      acceptLabel: 'Personalizar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          const cloned = await this.api.cloneOfficialTemplate();
          this.subjectsChange.emit(cloned);
          this.msg.add({ severity: 'success', summary: 'Plantilla personalizada', detail: '¡Plantilla LOMLOE personalizada con éxito! Ya puedes añadir y editar asignaturas.' });
        } catch {
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo personalizar la plantilla. Inténtalo de nuevo.' });
        }
      },
    });
  }

  deleteSubject(id: string): void {
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas eliminar esta asignatura? Esta acción no se puede deshacer.',
      header: 'Eliminar asignatura',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.api.deleteSubject(id).catch(() => {});
        const updated = await this.api.getSubjects();
        this.subjectsChange.emit(updated);
        this.msg.add({ severity: 'success', summary: 'Asignatura eliminada', detail: 'La asignatura ha sido eliminada correctamente.' });
      },
    });
  }
}
