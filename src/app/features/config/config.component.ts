import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { Teacher, CourseGroup, Classroom, SubjectAllocation } from '../../core/models';

type Tab = 'teachers' | 'groups' | 'subjects' | 'classrooms';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <div style="margin-bottom:24px">
        <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">Configuración del colegio</h1>
        <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
          Gestiona los datos que usa el generador de horarios
        </p>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        @for (t of tabs; track t.id) {
          <button class="tab-btn" [class.tab-btn--active]="activeTab() === t.id" (click)="activeTab.set(t.id)">
            {{ t.label }}
            <span class="tab-count">{{ count(t.id) }}</span>
          </button>
        }
      </div>

      <!-- Contenido -->
      <div class="lec-card" style="padding:0;overflow:hidden;margin-top:16px">
        @switch (activeTab()) {
          @case ('teachers') {
            <div data-testid="config-teachers-section">
            <ng-container [ngTemplateOutlet]="tableHeader"
              [ngTemplateOutletContext]="{title:'Profesores', addLabel:'+ Añadir profesor'}" />
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Email</th><th>Tipo</th>
                  <th>H. máx/semana</th><th>Especialidades</th><th>H. asignadas</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (t of teachers(); track t.id) {
                  <tr>
                    <td><span class="avatar-sm" [style.background]="'var(--subj-' + t.colorKey + ')'">{{ initials(t.fullName) }}</span> {{ t.fullName }}</td>
                    <td style="color:var(--muted-foreground)">{{ t.email }}</td>
                    <td>{{ t.teacherType }}</td>
                    <td>{{ t.maxWeeklyHours }}h</td>
                    <td>{{ t.specialties.join(', ') }}</td>
                    <td>
                      <div class="mini-bar-wrap">
                        <div class="mini-bar" [style.width]="((t.assignedHours / t.maxWeeklyHours) * 100) + '%'"
                          [style.background]="t.assignedHours > t.maxWeeklyHours ? 'var(--destructive)' : 'var(--primary)'"></div>
                      </div>
                      <span style="font-size:11px">{{ t.assignedHours }}/{{ t.maxWeeklyHours }}</span>
                    </td>
                    <td>
                      <button (click)="deleteTeacher(t.id)" class="btn-del">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          }
          @case ('groups') {
            <div data-testid="config-groups-section">
            <ng-container [ngTemplateOutlet]="tableHeader"
              [ngTemplateOutletContext]="{title:'Grupos y cursos', addLabel:'+ Añadir grupo'}" />
            <table class="data-table">
              <thead><tr><th>Grupo</th><th>Alumnos</th><th>Tutor/a</th><th></th></tr></thead>
              <tbody>
                @for (g of groups(); track g.id) {
                  <tr>
                    <td><strong>{{ g.displayName }}</strong></td>
                    <td>{{ g.studentCount }}</td>
                    <td>{{ g.tutorName ?? '—' }}</td>
                    <td>
                      <button (click)="deleteGroup(g.id)" class="btn-del">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          }
          @case ('subjects') {
            <div data-testid="config-subjects-section">
            <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
              <h3 style="font-weight:700">Asignaturas y horas semanales</h3>
              <span class="official-badge">Plantilla oficial Madrid</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Asignatura</th><th>Clave</th><th>Horas (mín–máx)</th>
                  <th>Horas actuales</th><th>Especialista</th>
                </tr>
              </thead>
              <tbody>
                @for (s of subjects(); track s.id) {
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span class="subj-dot" [style.background]="'var(--subj-' + s.subjectKey + ')'"
                          [style.color]="'var(--subj-' + s.subjectKey + '-fg)'"></span>
                        {{ s.subjectName }}
                        @if (s.isOfficial) {
                          <span class="official-mini">LOMLOE</span>
                        }
                      </div>
                    </td>
                    <td style="color:var(--muted-foreground)">{{ s.subjectShort }}</td>
                    <td style="color:var(--muted-foreground)">{{ s.weeklyHoursMin }}–{{ s.weeklyHoursMax }}h</td>
                    <td>
                      <input type="number" [value]="s.weeklyHoursDefault"
                        [min]="s.weeklyHoursMin" [max]="s.weeklyHoursMax"
                        class="hours-input"
                        (change)="updateSubjectHours(s.id, $event, s.weeklyHoursMin, s.weeklyHoursMax)" />
                    </td>
                    <td>{{ s.requiresSpecialist ? 'Sí' : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          }
          @case ('classrooms') {
            <div data-testid="config-classrooms-section">
            <ng-container [ngTemplateOutlet]="tableHeader"
              [ngTemplateOutletContext]="{title:'Aulas', addLabel:'+ Añadir aula'}" />
            <table class="data-table">
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Capacidad</th><th></th></tr></thead>
              <tbody>
                @for (r of classrooms(); track r.id) {
                  <tr>
                    <td>{{ r.name }}</td>
                    <td>{{ classroomTypeLabel(r.classroomType) }}</td>
                    <td>{{ r.capacity }} alumnos</td>
                    <td>
                      <button (click)="deleteClassroom(r.id)" class="btn-del">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          }
        }
      </div>
    </div>

    <!-- Plantilla cabecera tabla -->
    <ng-template #tableHeader let-title="title" let-addLabel="addLabel">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-weight:700">{{ title }}</h3>
      </div>
    </ng-template>
  `,
  styles: [`
    .tabs-bar { display: flex; gap: 2px; background: var(--secondary); border-radius: var(--radius-md); padding: 4px; }
    .tab-btn { padding: 9px 16px; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: all .15s; background: transparent; color: var(--muted-foreground); display: flex; align-items: center; gap: 6px; }
    .tab-btn--active { background: var(--card); color: var(--foreground); box-shadow: var(--shadow-xs); }
    .tab-count { font-size: 11px; opacity: 0.7; font-weight: 700; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .data-table th { padding: 10px 14px; text-align: left; font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface-2); }
    .avatar-sm { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; font-size: 11px; margin-right: 8px; }
    .mini-bar-wrap { height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; width: 60px; display: inline-block; margin-right: 6px; vertical-align: middle; }
    .mini-bar { height: 100%; border-radius: 99px; transition: width .3s; }
    .btn-del { color: var(--muted-foreground); padding: 6px; border-radius: 6px; cursor: pointer; transition: color .15s; }
    .btn-del:hover { color: var(--destructive); }
    .official-badge { background: var(--primary-tint); color: var(--primary-strong); font-size: var(--text-xs); font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full); }
    .official-mini { background: var(--primary-tint); color: var(--primary-strong); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: var(--radius-full); }
    .subj-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .hours-input { width: 64px; padding: 5px 8px; border: 1px solid var(--input); border-radius: var(--radius-sm); font-size: var(--text-sm); font-family: var(--font-sans); text-align: center; }
  `],
})
export class ConfigComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly activeTab = signal<Tab>('teachers');
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly subjects = signal<SubjectAllocation[]>([]);
  readonly classrooms = signal<Classroom[]>([]);

  readonly tabs = [
    { id: 'teachers' as Tab, label: 'Profesores' },
    { id: 'groups' as Tab, label: 'Grupos' },
    { id: 'subjects' as Tab, label: 'Asignaturas' },
    { id: 'classrooms' as Tab, label: 'Aulas' },
  ];

  async ngOnInit(): Promise<void> {
    const [teachers, groups, subjects, classrooms] = await Promise.all([
      this.api.getTeachers().catch(() => []),
      this.api.getGroups().catch(() => []),
      this.api.getSubjects().catch(() => []),
      this.api.getClassrooms().catch(() => []),
    ]);
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
    }
  }

  async deleteTeacher(id: string): Promise<void> {
    if (!confirm('¿Eliminar este profesor?')) return;
    await this.api.deleteTeacher(id).catch(() => {});
    this.teachers.update(ts => ts.filter(t => t.id !== id));
  }

  async deleteGroup(id: string): Promise<void> {
    if (!confirm('¿Eliminar este grupo?')) return;
    await this.api.deleteGroup(id).catch(() => {});
    this.groups.update(gs => gs.filter(g => g.id !== id));
  }

  async deleteClassroom(id: string): Promise<void> {
    if (!confirm('¿Eliminar esta aula?')) return;
    await this.api.deleteClassroom(id).catch(() => {});
    this.classrooms.update(rs => rs.filter(r => r.id !== id));
  }

  async updateSubjectHours(id: string, ev: Event, min: number, max: number): Promise<void> {
    const val = parseInt((ev.target as HTMLInputElement).value, 10);
    if (isNaN(val) || val < min || val > max) return;
    await this.api.updateSubjectHours(id, val).catch(() => {});
    this.subjects.update(ss => ss.map(s => s.id === id ? { ...s, weeklyHoursDefault: val } : s));
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  classroomTypeLabel(type: string): string {
    const map: Record<string, string> = {
      regular: 'Ordinaria', gym: 'Gimnasio', music: 'Música',
      lab: 'Laboratorio', it: 'Informática', support: 'Apoyo',
    };
    return map[type] ?? type;
  }
}
