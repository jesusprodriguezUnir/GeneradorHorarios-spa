import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { ClassroomsApiService } from '../../../core/api/classrooms-api.service';
import { Classroom } from '../../../core/models';
import { CLASSROOM_TYPES } from '../config.constants';

@Component({
  selector: 'app-classrooms-section',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, TableModule, InputText],
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

  readonly isClassroomModalOpen = signal(false);
  readonly editingClassroom = signal<Classroom | null>(null);
  
  classroomForm = signal({
    name: '',
    classroomType: 'regular',
    capacity: 30,
    isShared: false,
  });

  classroomTypeLabel(type: string): string {
    const found = CLASSROOM_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  }

  openAddModal(): void {
    this.editingClassroom.set(null);
    this.classroomForm.set({
      name: '',
      classroomType: 'regular',
      capacity: 30,
      isShared: false,
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

    const payload = {
      name: form.name.trim(),
      classroomType: form.classroomType,
      capacity: Number(form.capacity),
      isShared: form.isShared,
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
