import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { TeachersApiService } from '../../core/api/teachers-api.service';
import { GroupsApiService } from '../../core/api/groups-api.service';
import { SubjectsApiService } from '../../core/api/subjects-api.service';
import { ClassroomsApiService } from '../../core/api/classrooms-api.service';
import { School, Teacher, CourseGroup, Classroom, SubjectAllocation, SchoolStage } from '../../core/models';
import { SchoolSectionComponent } from './sections/school-section.component';
import { CiclosSectionComponent } from './sections/ciclos-section.component';
import { ClassroomsSectionComponent } from './sections/classrooms-section.component';
import { GroupsSectionComponent } from './sections/groups-section.component';
import { TeachersSectionComponent } from './sections/teachers-section.component';
import { SubjectsSectionComponent } from './sections/subjects-section.component';
import { BlockStateService } from '../../core/block-state.service';

type Tab = 'school' | 'ciclos' | 'classrooms' | 'groups' | 'teachers' | 'subjects';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    SchoolSectionComponent,
    CiclosSectionComponent,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<Tab>('school');

  readonly school = signal<School | null>(null);
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly subjects = signal<SubjectAllocation[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly stages = signal<SchoolStage[]>([]);

  readonly activeBlock = inject(BlockStateService).activeBlock;

  readonly filteredStages = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.stages();
    return this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
  });

  readonly filteredGroups = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.groups();
    const stagesForBlock = this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
    if (stagesForBlock.length === 0) return [];
    
    return this.groups().filter(g => 
      stagesForBlock.some(s => g.courseLevel >= s.minLevel && g.courseLevel <= s.maxLevel)
    );
  });

  readonly filteredTeachers = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.teachers();
    const stagesForBlock = this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
    if (stagesForBlock.length === 0) return [];
    const stageIds = new Set(stagesForBlock.map(s => s.id));
    
    return this.teachers().filter(t =>
      t.stageAssignments?.some(sa => stageIds.has(sa.stageId))
    );
  });

  readonly filteredSubjects = computed(() => {
    const ab = this.activeBlock();
    if (ab === 'all') return this.subjects();
    const stagesForBlock = this.stages().filter(s => {
      const type = s.stageType.toLowerCase();
      if (ab === 'inf') return type.includes('inf');
      if (ab === 'pri') return type.includes('pri');
      if (ab === 'sec') return type.includes('sec') || type.includes('eso');
      return false;
    });
    if (stagesForBlock.length === 0) return [];
    
    return this.subjects().filter(subj => {
      if (subj.courseLevel) {
        return stagesForBlock.some(s => subj.courseLevel! >= s.minLevel && subj.courseLevel! <= s.maxLevel);
      }
      if (subj.cycle) {
        return stagesForBlock.some(st => {
          const maxCycle = Math.ceil((st.maxLevel - st.minLevel + 1) / 2);
          return subj.cycle! >= 1 && subj.cycle! <= maxCycle;
        });
      }
      return true;
    });
  });

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'school',     label: 'Centro',       icon: '🏛' },
    { id: 'ciclos',     label: 'Ciclos',        icon: '🕐' },
    { id: 'teachers',   label: 'Profesores',    icon: '👥' },
    { id: 'groups',     label: 'Grupos',        icon: '📚' },
    { id: 'subjects',   label: 'Asignaturas',   icon: '📖' },
    { id: 'classrooms', label: 'Aulas',         icon: '🚪' },
  ];

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (this.isValidTab(tab)) {
        this.activeTab.set(tab);
      } else {
        this.activeTab.set('school');
      }
    });

    const [school, teachers, groups, subjects, classrooms, stages] = await Promise.all([
      this.schoolsApi.getMySchool().catch(() => null),
      this.teachersApi.getTeachers().catch(() => []),
      this.groupsApi.getGroups().catch(() => []),
      this.subjectsApi.getSubjects().catch(() => []),
      this.classroomsApi.getClassrooms().catch(() => []),
      this.schoolsApi.getStages().catch(() => []),
    ]);

    this.school.set(school);
    this.teachers.set(teachers);
    this.groups.set(groups);
    this.subjects.set(subjects);
    this.classrooms.set(classrooms);
    this.stages.set(stages);
  }

  async onSchoolChange(updatedSchool: School): Promise<void> {
    this.school.set(updatedSchool);
    try {
      const stages = await this.schoolsApi.getStages();
      this.stages.set(stages);
    } catch (err) {
      console.error('Error updating stages after school change:', err);
    }
  }

  count(tab: Tab): number {
    switch (tab) {
      case 'teachers':   return this.filteredTeachers().length;
      case 'groups':     return this.filteredGroups().length;
      case 'subjects':   return this.filteredSubjects().length;
      case 'classrooms': return this.classrooms().length;
      default: return 0;
    }
  }

  goToCiclos(): void {
    this.selectTab('ciclos');
  }

  selectTab(tabId: Tab): void {
    this.activeTab.set(tabId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private isValidTab(tab: string | null): tab is Tab {
    return !!tab && ['school', 'ciclos', 'classrooms', 'groups', 'teachers', 'subjects'].includes(tab);
  }
}

