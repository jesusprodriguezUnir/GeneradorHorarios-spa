import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { GroupsApiService } from '../../../core/api/groups-api.service';
import { CourseGroup, Teacher, Classroom, SubjectAllocation, School } from '../../../core/models';

@Component({
  selector: 'app-groups-section',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, TableModule, InputText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './groups-section.component.html',
  styleUrls: ['./groups-section.component.scss']
})
export class GroupsSectionComponent {
  private readonly api = inject(GroupsApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly school = input.required<School | null>();
  readonly groups = input.required<CourseGroup[]>();
  readonly groupsChange = output<CourseGroup[]>();
  readonly teachers = input.required<Teacher[]>();
  readonly classrooms = input.required<Classroom[]>();
  readonly subjects = input.required<SubjectAllocation[]>();

  readonly isGroupModalOpen = signal(false);
  readonly editingGroup = signal<CourseGroup | null>(null);
  
  groupForm = signal({
    courseLevel: 1,
    groupLabel: 'A',
    studentCount: 25,
    tutorId: '',
    homeClassroomId: '',
    subjectHours: {} as Record<string, number>,
  });

  getClassroomName(classroomId: string | null): string {
    if (!classroomId) return '—';
    return this.classrooms().find(c => c.id === classroomId)?.name ?? '—';
  }

  classroomTypeLabel(type: string): string {
    const map: Record<string, string> = {
      regular: 'Ordinaria', gym: 'Gimnasio', music: 'Música',
      lab: 'Laboratorio', it: 'Informática', support: 'Apoyo',
    };
    return map[type] ?? type;
  }

  getSubjectHoursList(g: CourseGroup): { key: string; short: string; hours: number }[] {
    if (!g.subjectHours) return [];
    return Object.entries(g.subjectHours)
      .filter(([_, hours]) => hours > 0)
      .map(([key, hours]) => {
        const sub = this.subjects().find(s => s.subjectKey === key);
        return {
          key,
          short: sub?.subjectShort || key.toUpperCase(),
          hours
        };
      });
  }

  getSchoolCourseLevels(): number[] {
    const s = this.school();
    if (!s) return [1, 2, 3, 4, 5, 6];
    const levels = [];
    for (let i = s.minCourseLevel; i <= s.maxCourseLevel; i++) {
      levels.push(i);
    }
    return levels;
  }

  openAddModal(): void {
    const minCourse = this.school()?.minCourseLevel ?? 1;
    const initialHours: Record<string, number> = {};
    for (const s of this.subjects()) {
      initialHours[s.subjectKey] = s.weeklyHoursDefault;
    }
    this.editingGroup.set(null);
    this.groupForm.set({
      courseLevel: minCourse,
      groupLabel: 'A',
      studentCount: 25,
      tutorId: '',
      homeClassroomId: '',
      subjectHours: initialHours,
    });
    this.isGroupModalOpen.set(true);
  }

  editGroup(g: CourseGroup): void {
    this.editingGroup.set(g);
    const initialHours: Record<string, number> = {};
    for (const s of this.subjects()) {
      initialHours[s.subjectKey] = g.subjectHours?.[s.subjectKey] ?? s.weeklyHoursDefault;
    }
    this.groupForm.set({
      courseLevel: g.courseLevel,
      groupLabel: g.groupLabel,
      studentCount: g.studentCount,
      tutorId: g.tutorId ?? '',
      homeClassroomId: g.homeClassroomId ?? '',
      subjectHours: initialHours,
    });
    this.isGroupModalOpen.set(true);
  }

  async saveGroup(): Promise<void> {
    const form = this.groupForm();
    const editing = this.editingGroup();

    if (!form.groupLabel || form.groupLabel.trim() === '') {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El identificador/letra del grupo es obligatorio.' });
      return;
    }

    const payload = {
      courseLevel: Number(form.courseLevel),
      groupLabel: form.groupLabel.trim().toUpperCase(),
      studentCount: Number(form.studentCount),
      tutorId: form.tutorId ? form.tutorId : null,
      homeClassroomId: form.homeClassroomId ? form.homeClassroomId : null,
      subjectHours: form.subjectHours,
    };

    try {
      if (editing) {
        await this.api.updateGroup(editing.id, payload);
      } else {
        await this.api.createGroup(payload);
      }
      
      const updatedGroups = await this.api.getGroups();
      this.groupsChange.emit(updatedGroups);
      this.isGroupModalOpen.set(false);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail: 'No se pudo guardar el grupo. Por favor, comprueba los datos.' });
    }
  }

  onGroupLabelInput(ev: Event): void {
    const val = (ev.target as HTMLInputElement).value;
    this.groupForm.update(f => ({ ...f, groupLabel: val.toUpperCase() }));
  }

  adjustStudentCount(amount: number): void {
    this.groupForm.update(f => {
      const newCount = Math.max(1, Math.min(100, f.studentCount + amount));
      return { ...f, studentCount: newCount };
    });
  }

  getTutorInitialsOrText(): string {
    const tutorId = this.groupForm().tutorId;
    if (!tutorId) return 'Sin tutor';
    const tutor = this.teachers().find(t => t.id === tutorId);
    return tutor ? `Tutor: ${tutor.fullName}` : 'Sin tutor';
  }

  onGroupSubjectHourChange(key: string, val: number): void {
    this.groupForm.update(f => {
      const updated = { ...f.subjectHours, [key]: Number(val) };
      return { ...f, subjectHours: updated };
    });
  }

  deleteGroup(id: string): void {
    this.confirmation.confirm({
      message: '¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.',
      header: 'Eliminar grupo',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.api.deleteGroup(id).catch(() => {});
        const updatedGroups = await this.api.getGroups();
        this.groupsChange.emit(updatedGroups);
        this.msg.add({ severity: 'success', summary: 'Grupo eliminado', detail: 'El grupo ha sido eliminado correctamente.' });
      },
    });
  }
}
