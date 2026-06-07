import { Component, inject, signal, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { SubjectsApiService } from '../../../core/api/subjects-api.service';
import { SubjectAllocation } from '../../../core/models';

@Component({
  selector: 'app-subjects-section',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, TableModule, InputText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subjects-section.component.html',
  styleUrls: ['./subjects-section.component.scss']
})
export class SubjectsSectionComponent {
  private readonly api = inject(SubjectsApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly subjects = input.required<SubjectAllocation[]>();
  readonly subjectsChange = output<SubjectAllocation[]>();

  readonly isSubjectModalOpen = signal(false);
  readonly editingSubject = signal<SubjectAllocation | null>(null);

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

  readonly isOfficialTemplate = computed(() => 
    this.subjects().length > 0 && this.subjects().every(s => s.isOfficial)
  );

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
    
    const updated = this.subjects().map(s => s.id === id ? { ...s, weeklyHoursDefault: val } : s);
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
        const updated = this.subjects().filter(s => s.id !== id);
        this.subjectsChange.emit(updated);
        this.msg.add({ severity: 'success', summary: 'Asignatura eliminada', detail: 'La asignatura ha sido eliminada correctamente.' });
      },
    });
  }
}
