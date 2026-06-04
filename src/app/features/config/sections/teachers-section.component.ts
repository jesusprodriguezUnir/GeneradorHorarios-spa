import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { TeachersApiService } from '../../../core/api/teachers-api.service';
import { Teacher } from '../../../core/models';
import { TEACHER_TYPES } from '../config.constants';

@Component({
  selector: 'app-teachers-section',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, TableModule, InputText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teachers-section.component.html',
  styleUrls: ['./teachers-section.component.scss']
})
export class TeachersSectionComponent {
  private readonly api = inject(TeachersApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly teachers = input.required<Teacher[]>();
  readonly teachersChange = output<Teacher[]>();
  
  readonly isTeacherModalOpen = signal(false);
  readonly editingTeacher = signal<Teacher | null>(null);

  teacherForm = signal({
    fullName: '',
    email: '',
    teacherType: 'definitivo',
    maxWeeklyHours: 25,
    specialtiesRaw: '',
    colorKey: 'mat',
  });

  teacherTypeLabel(type: string): string {
    const found = TEACHER_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  openAddModal(): void {
    this.editingTeacher.set(null);
    this.teacherForm.set({
      fullName: '',
      email: '',
      teacherType: 'definitivo',
      maxWeeklyHours: 25,
      specialtiesRaw: 'Generalista',
      colorKey: 'mat',
    });
    this.isTeacherModalOpen.set(true);
  }

  editTeacher(t: Teacher): void {
    this.editingTeacher.set(t);
    this.teacherForm.set({
      fullName: t.fullName,
      email: t.email,
      teacherType: t.teacherType,
      maxWeeklyHours: t.maxWeeklyHours,
      specialtiesRaw: t.specialties.join(', '),
      colorKey: t.colorKey,
    });
    this.isTeacherModalOpen.set(true);
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

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      teacherType: form.teacherType,
      maxWeeklyHours: Number(form.maxWeeklyHours),
      specialties,
      colorKey: form.colorKey,
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
