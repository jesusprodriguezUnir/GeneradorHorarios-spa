import { Component, inject, signal, computed, input, output, ChangeDetectionStrategy, afterNextRender } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { ClassroomsApiService } from '../../../core/api/classrooms-api.service';
import { Classroom, SchoolStage } from '../../../core/models';
import { CLASSROOM_TYPES } from '../config.constants';

@Component({
  selector: 'app-classrooms-section',
  standalone: true,
  imports: [FormsModule, Dialog, TableModule, InputText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './classrooms-section.component.html',
  styleUrls: ['./classrooms-section.component.scss']
})
export class ClassroomsSectionComponent {
  private readonly api = inject(ClassroomsApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly classrooms = input.required<Classroom[]>();
  readonly classroomsChange = output<Classroom[]>();
  readonly stages = input<SchoolStage[]>([]);

  readonly isClassroomModalOpen = signal(false);
  readonly editingClassroom = signal<Classroom | null>(null);
  readonly openAccordions = signal<Set<string>>(new Set<string>());
  readonly searchQuery = signal('');

  classroomForm = signal({
    name: '',
    classroomType: 'regular',
    capacity: 30,
    isShared: false,
    stageId: '',
  });

  constructor() {
    afterNextRender(() => {
      const first = this.stages()[0];
      if (first && this.openAccordions().size === 0) {
        this.openAccordions.set(new Set([first.id]));
      }
    });
  }

  readonly classroomsMap = computed(() => {
    const map: Record<string, Classroom[]> = {};
    for (const c of this.classrooms()) {
      if (c.stageId) {
        (map[c.stageId] ??= []).push(c);
      }
    }
    return map;
  });

  readonly unassignedClassrooms = computed(() =>
    this.classrooms().filter(c => !c.stageId)
  );

  readonly filteredClassroomsMap = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const map = this.classroomsMap();
    if (!q) return map;
    const out: Record<string, Classroom[]> = {};
    for (const [sid, cs] of Object.entries(map)) {
      out[sid] = cs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        this.classroomTypeLabel(c.classroomType).toLowerCase().includes(q)
      );
    }
    return out;
  });

  readonly filteredUnassigned = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.unassignedClassrooms();
    return this.unassignedClassrooms().filter(c =>
      c.name.toLowerCase().includes(q) ||
      this.classroomTypeLabel(c.classroomType).toLowerCase().includes(q)
    );
  });

  classroomTypeLabel(type: string): string {
    const found = CLASSROOM_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  }

  // ── Accordion helpers ─────────────────────────────────────────────────────

  isStageOpen(stageId: string): boolean {
    return this.openAccordions().has(stageId);
  }

  toggleStage(stageId: string): void {
    this.openAccordions.update(set => {
      const next = new Set(set);
      if (next.has(stageId)) { next.delete(stageId); } else { next.add(stageId); }
      return next;
    });
  }

  allForStage(stageId: string): Classroom[] {
    return this.classroomsMap()[stageId] ?? [];
  }

  filteredForStage(stageId: string): Classroom[] {
    return this.filteredClassroomsMap()[stageId] ?? [];
  }

  // ── Visual helpers ────────────────────────────────────────────────────────

  getStageColor(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return 'oklch(0.64 0.15 40)';
    if (t.includes('sec') || t.includes('eso')) return 'oklch(0.55 0.11 205)';
    return 'var(--primary)';
  }

  getStageColorTint(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return 'oklch(0.95 0.05 40)';
    if (t.includes('sec') || t.includes('eso')) return 'oklch(0.93 0.055 200)';
    return 'var(--primary-tint)';
  }

  getStageAgeRange(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return '3 – 6 años';
    if (t.includes('sec') || t.includes('eso')) return '12 – 16 años';
    return '6 – 12 años';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openAddModal(stageId?: string): void {
    this.editingClassroom.set(null);
    this.classroomForm.set({
      name: '',
      classroomType: 'regular',
      capacity: 30,
      isShared: false,
      stageId: stageId ?? '',
    });
    this.isClassroomModalOpen.set(true);
  }

  editClassroom(c: Classroom): void {
    this.editingClassroom.set(c);
    this.classroomForm.set({
      name: c.name,
      classroomType: c.classroomType,
      capacity: c.capacity,
      isShared: c.isShared,
      stageId: c.stageId ?? '',
    });
    this.isClassroomModalOpen.set(true);
  }

  async saveClassroom(): Promise<void> {
    const form = this.classroomForm();
    const editing = this.editingClassroom();

    if (!form.name || form.name.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre del aula es obligatorio.' });
      return;
    }

    const payload: Partial<Classroom> = {
      name: form.name.trim(),
      classroomType: form.classroomType,
      capacity: Number(form.capacity),
      isShared: form.isShared,
      stageId: form.stageId || undefined,
    };

    try {
      if (editing) {
        await this.api.updateClassroom(editing.id, payload);
      } else {
        await this.api.createClassroom(payload);
      }

      const updatedClassrooms = await this.api.getClassrooms();
      this.classroomsChange.emit(updatedClassrooms);
      this.isClassroomModalOpen.set(false);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail: 'No se pudo guardar el aula. Por favor, comprueba los datos.' });
    }
  }

  adjustClassroomCapacity(amount: number): void {
    this.classroomForm.update(f => {
      const newCapacity = Math.max(1, Math.min(100, f.capacity + amount));
      return { ...f, capacity: newCapacity };
    });
  }

  deleteClassroom(id: string): void {
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas eliminar esta aula? Esta acción no se puede deshacer.',
      header: 'Eliminar aula',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.api.deleteClassroom(id).catch(() => {});
        const updatedClassrooms = await this.api.getClassrooms();
        this.classroomsChange.emit(updatedClassrooms);
        this.msg.add({ severity: 'success', summary: 'Aula eliminada', detail: 'El aula ha sido eliminada correctamente.' });
      },
    });
  }
}
