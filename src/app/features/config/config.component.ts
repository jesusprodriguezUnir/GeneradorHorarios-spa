import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { TeachersApiService } from '../../core/api/teachers-api.service';
import { GroupsApiService } from '../../core/api/groups-api.service';
import { SubjectsApiService } from '../../core/api/subjects-api.service';
import { ClassroomsApiService } from '../../core/api/classrooms-api.service';
import { School, Teacher, CourseGroup, Classroom, SubjectAllocation } from '../../core/models';
import { SchoolSectionComponent } from './sections/school-section.component';
import { ClassroomsSectionComponent } from './sections/classrooms-section.component';
import { GroupsSectionComponent } from './sections/groups-section.component';
import { TeachersSectionComponent } from './sections/teachers-section.component';
import { SubjectsSectionComponent } from './sections/subjects-section.component';

type Tab = 'school' | 'classrooms' | 'groups' | 'teachers' | 'subjects';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    CommonModule,
    SchoolSectionComponent,
    ClassroomsSectionComponent,
    GroupsSectionComponent,
    TeachersSectionComponent,
    SubjectsSectionComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  private readonly schoolsApi = inject(SchoolsApiService);
  private readonly teachersApi = inject(TeachersApiService);
  private readonly groupsApi = inject(GroupsApiService);
  private readonly subjectsApi = inject(SubjectsApiService);
  private readonly classroomsApi = inject(ClassroomsApiService);

  readonly activeTab = signal<Tab>('school');
  
  readonly school = signal<School | null>(null);
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly subjects = signal<SubjectAllocation[]>([]);
  readonly classrooms = signal<Classroom[]>([]);

  readonly tabs = [
    { id: 'school' as Tab, label: 'Centro' },
    { id: 'classrooms' as Tab, label: 'Aulas' },
    { id: 'groups' as Tab, label: 'Grupos' },
    { id: 'teachers' as Tab, label: 'Profesores' },
    { id: 'subjects' as Tab, label: 'Asignaturas' },
  ];

  async ngOnInit(): Promise<void> {
    const [school, teachers, groups, subjects, classrooms] = await Promise.all([
      this.schoolsApi.getMySchool().catch(() => null),
      this.teachersApi.getTeachers().catch(() => []),
      this.groupsApi.getGroups().catch(() => []),
      this.subjectsApi.getSubjects().catch(() => []),
      this.classroomsApi.getClassrooms().catch(() => []),
    ]);

    this.school.set(school);
    this.teachers.set(teachers);
    this.groups.set(groups);
    this.subjects.set(subjects);
    this.classrooms.set(classrooms);
  }

  count(tab: Tab): number {
    switch (tab) {
      case 'teachers': return this.teachers().length;
      case 'groups': return this.groups().length;
      case 'subjects': return this.subjects().length;
      case 'classrooms': return this.classrooms().length;
      default: return 0;
    }
  }
}
