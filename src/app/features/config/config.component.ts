import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { School, CycleSchedule, Teacher, CourseGroup, Classroom, SubjectAllocation, DAYS } from '../../core/models';

type Tab = 'school' | 'teachers' | 'groups' | 'subjects' | 'classrooms';

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
            @if (t.id !== 'school') {
              <span class="tab-count">{{ count(t.id) }}</span>
            }
          </button>
        }
      </div>

      <!-- Contenido -->
      <div class="lec-card" style="padding:0;overflow:hidden;margin-top:16px">
        @switch (activeTab()) {

          <!-- ── PESTAÑA CENTRO ─────────────────────────────────────────────── -->
          @case ('school') {
            @if (school()) {
              <div data-testid="config-school-section">
                <div class="section-header">
                  <h3 style="font-weight:700">Datos del centro</h3>
                  @if (savingSchool()) {
                    <span style="font-size:var(--text-sm);color:var(--muted-foreground)">Guardando…</span>
                  } @else if (savedSchool()) {
                    <span style="font-size:var(--text-sm);color:var(--primary)">✓ Guardado</span>
                  }
                </div>

                <div class="form-grid">
                  <!-- Identificación -->
                  <div class="form-section">
                    <h4 class="form-section-title">Identificación</h4>

                    <div class="field-row">
                      <label class="field-label">Nombre del centro</label>
                      <input class="field-input" type="text" [(ngModel)]="schoolForm.name" placeholder="CEIP..." />
                    </div>
                    <div class="field-row">
                      <label class="field-label">Código de centro</label>
                      <input class="field-input field-input--sm" type="text" [(ngModel)]="schoolForm.centerCode" placeholder="28013291" />
                    </div>
                    <div class="field-row">
                      <label class="field-label">Localidad</label>
                      <input class="field-input" type="text" [(ngModel)]="schoolForm.locality" placeholder="Madrid" />
                    </div>
                    <div class="field-row">
                      <label class="field-label">Comunidad Autónoma</label>
                      <select class="field-input" [(ngModel)]="schoolForm.community">
                        <option value="madrid">Comunidad de Madrid</option>
                        <option value="cataluna">Cataluña</option>
                        <option value="andalucia">Andalucía</option>
                        <option value="valenciana">C. Valenciana</option>
                        <option value="galicia">Galicia</option>
                        <option value="euskadi">País Vasco</option>
                        <option value="castilla-leon">Castilla y León</option>
                        <option value="castilla-lamancha">Castilla-La Mancha</option>
                        <option value="aragon">Aragón</option>
                        <option value="canarias">Canarias</option>
                        <option value="extremadura">Extremadura</option>
                        <option value="murcia">Murcia</option>
                        <option value="asturias">Asturias</option>
                        <option value="cantabria">Cantabria</option>
                        <option value="rioja">La Rioja</option>
                        <option value="navarra">Navarra</option>
                        <option value="baleares">Baleares</option>
                        <option value="ceuta">Ceuta</option>
                        <option value="melilla">Melilla</option>
                      </select>
                    </div>
                    <div class="field-row">
                      <label class="field-label">Etapa educativa</label>
                      <select class="field-input field-input--sm" [(ngModel)]="schoolForm.stage">
                        <option value="infantil">Educación Infantil</option>
                        <option value="primaria">Educación Primaria</option>
                        <option value="secundaria">ESO</option>
                        <option value="bachillerato">Bachillerato</option>
                      </select>
                    </div>
                    <div class="field-row">
                      <label class="field-label">Cursos ofertados</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <select class="field-input field-input--xs" [(ngModel)]="schoolForm.minCourseLevel">
                          @for (n of courseLevels; track n) { <option [value]="n">{{ n }}º</option> }
                        </select>
                        <span style="color:var(--muted-foreground)">hasta</span>
                        <select class="field-input field-input--xs" [(ngModel)]="schoolForm.maxCourseLevel">
                          @for (n of courseLevels; track n) { <option [value]="n">{{ n }}º</option> }
                        </select>
                      </div>
                    </div>
                    <div class="field-row">
                      <label class="field-label">Año académico</label>
                      <input class="field-input field-input--sm" type="text" [(ngModel)]="schoolForm.academicYear" placeholder="2025/2026" />
                    </div>
                  </div>

                  <!-- Jornada -->
                  <div class="form-section">
                    <h4 class="form-section-title">Jornada lectiva</h4>

                    <div class="field-row">
                      <label class="field-label">Tipo de jornada</label>
                      <select class="field-input field-input--sm" [(ngModel)]="schoolForm.scheduleType">
                        <option value="continua">Continua</option>
                        <option value="partida">Partida</option>
                      </select>
                    </div>
                    <div class="field-row">
                      <label class="field-label">Duración del slot</label>
                      <select class="field-input field-input--xs" [(ngModel)]="schoolForm.slotMinutes">
                        <option [value]="45">45 min</option>
                        <option [value]="50">50 min</option>
                        <option [value]="55">55 min</option>
                        <option [value]="60">60 min</option>
                      </select>
                    </div>
                    <div class="field-row">
                      <label class="field-label">Slots por día</label>
                      <input class="field-input field-input--xs" type="number" min="1" max="10" [(ngModel)]="schoolForm.slotsPerDay" />
                    </div>
                    <div class="field-row">
                      <label class="field-label">Recreo tras slot nº</label>
                      <input class="field-input field-input--xs" type="number" min="0" max="9" [(ngModel)]="schoolForm.breakAfterSlot" />
                    </div>
                    <div class="field-row">
                      <label class="field-label">Duración del recreo</label>
                      <select class="field-input field-input--xs" [(ngModel)]="schoolForm.breakMinutes">
                        <option [value]="15">15 min</option>
                        <option [value]="20">20 min</option>
                        <option [value]="25">25 min</option>
                        <option [value]="30">30 min</option>
                      </select>
                    </div>

                    @if (schoolForm.scheduleType === 'partida') {
                      <div class="field-row">
                        <label class="field-label">Slots de tarde</label>
                        <input class="field-input field-input--xs" type="number" min="1" [max]="schoolForm.slotsPerDay - 1" [(ngModel)]="schoolForm.afternoonSlots" />
                      </div>
                    }

                    <div class="field-row field-row--top" style="margin-top:6px">
                      <label class="field-label">Días lectivos</label>
                      <div class="days-checkboxes">
                        @for (day of daysConfig; track day.value) {
                          <label class="day-check">
                            <input type="checkbox"
                              [checked]="schoolForm.workingDays.includes(day.value)"
                              (change)="toggleDay(day.value, $event)" />
                            <span>{{ day.label }}</span>
                          </label>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Ciclos -->
                <div class="form-section" style="border-top:1px solid var(--border);margin-top:0">
                  <h4 class="form-section-title">Horario por ciclo</h4>
                  <p style="font-size:var(--text-sm);color:var(--muted-foreground);margin-bottom:12px">
                    Cada ciclo puede tener su propia hora de entrada y salida. Los demás parámetros
                    (duración de slots, recreo…) son comunes al centro.
                  </p>

                  @for (cycle of cycleForms; track cycle.cycle) {
                    <div style="border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:12px;background:var(--surface)">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <strong style="font-size:var(--text-sm)">
                          {{ cycleLabel(cycle.cycle) }}
                        </strong>
                        <button class="btn-save" style="padding:4px 12px;font-size:var(--text-xs)"
                          [disabled]="cycle.saving"
                          (click)="saveCycle(cycle.cycle)">
                          {{ cycle.saving ? 'Guardando…' : (cycle.saved ? '✓ Guardado' : 'Guardar ciclo') }}
                        </button>
                      </div>

                      @if (schoolForm.scheduleType === 'partida') {
                        <!-- Bloque de mañana (Jornada partida) -->
                        <div style="background:var(--secondary);border-radius:6px;padding:10px 12px;margin-bottom:10px">
                          <div style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em">Horario de Mañana</div>
                          <div class="field-row" style="margin-bottom:6px">
                            <label class="field-label">Entrada mañana</label>
                            <input class="field-input field-input--xs" type="time" [(ngModel)]="cycle.morningStart" />
                          </div>
                          <div class="field-row" style="margin-bottom:0">
                            <label class="field-label">Salida mañana</label>
                            <span style="font-size:var(--text-sm);font-weight:600;color:var(--foreground)">
                              {{ computedMorningEndTime(cycle.morningStart) }}
                            </span>
                          </div>
                        </div>

                        <!-- Bloque de tarde (Jornada partida) -->
                        <div style="background:var(--secondary);border-radius:6px;padding:10px 12px">
                          <div style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em">Horario de Tarde</div>
                          <div class="field-row" style="margin-bottom:6px">
                            <label class="field-label">Entrada tarde</label>
                            <input class="field-input field-input--xs" type="time" [(ngModel)]="cycle.afternoonStart" />
                          </div>
                          <div class="field-row" style="margin-bottom:0">
                            <label class="field-label">Salida tarde</label>
                            <span style="font-size:var(--text-sm);font-weight:600;color:var(--foreground)">
                              {{ computedAfternoonEndTime(cycle.afternoonStart) }}
                            </span>
                          </div>
                        </div>
                      } @else {
                        <!-- Jornada continua -->
                        <div class="field-row">
                          <label class="field-label">Entrada (mañana)</label>
                          <input class="field-input field-input--xs" type="time" [(ngModel)]="cycle.morningStart" />
                        </div>
                        <div class="field-row">
                          <label class="field-label">Salida (mañana)</label>
                          <span style="font-size:var(--text-sm);font-weight:600;color:var(--foreground)">
                            {{ computedMorningEndTime(cycle.morningStart) }}
                          </span>
                        </div>
                      }

                      @if (cycle.error) {
                        <p style="color:var(--destructive);font-size:var(--text-xs);margin-top:6px">{{ cycle.error }}</p>
                      }
                    </div>
                  }
                </div>

                <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                  <button class="btn-save" (click)="saveSchool()" [disabled]="savingSchool()">
                    Guardar configuración
                  </button>
                </div>
              </div>
            } @else {
              <div style="padding:40px;text-align:center;color:var(--muted-foreground)">Cargando…</div>
            }
          }

          <!-- ── PROFESORES ──────────────────────────────────────────────────── -->
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

          <!-- ── GRUPOS ─────────────────────────────────────────────────────── -->
          @case ('groups') {
            <div data-testid="config-groups-section">
            <ng-container [ngTemplateOutlet]="tableHeader"
              [ngTemplateOutletContext]="{title:'Grupos y cursos', addLabel:'+ Añadir grupo', tab:'groups'}" />
            <table class="data-table">
              <thead><tr><th>Grupo</th><th>Alumnos</th><th>Tutor/a</th><th>Aula de referencia</th><th style="text-align:right;padding-right:24px">Acciones</th></tr></thead>
              <tbody>
                @for (g of groups(); track g.id) {
                  <tr>
                    <td><strong>{{ g.displayName }}</strong></td>
                    <td>{{ g.studentCount }} alumnos</td>
                    <td>{{ g.tutorName ?? '—' }}</td>
                    <td>{{ getClassroomName(g.homeClassroomId) }}</td>
                    <td style="text-align:right;padding-right:16px">
                      <div style="display:inline-flex;gap:4px">
                        <button (click)="editGroup(g)" class="btn-edit" title="Editar grupo" style="color:var(--muted-foreground);padding:6px;border-radius:6px;cursor:pointer;transition:color .15s;background:none;border:none">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button (click)="deleteGroup(g.id)" class="btn-del" title="Eliminar grupo" style="background:none;border:none">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          }

          <!-- ── ASIGNATURAS ─────────────────────────────────────────────────── -->
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

          <!-- ── AULAS ───────────────────────────────────────────────────────── -->
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

      <!-- Modal para Añadir / Editar Grupo -->
      @if (isGroupModalOpen()) {
        <div class="modal-backdrop" (click)="isGroupModalOpen.set(false)">
          <div class="modal-card lec-scale-in" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingGroup() ? 'Editar grupo' : 'Añadir grupo' }}</h3>
              <button (click)="isGroupModalOpen.set(false)" style="padding:4px;color:var(--muted-foreground);cursor:pointer;background:none;border:none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; gap:16px">
              <div class="form-field">
                <label class="field-label">Nivel del curso</label>
                <select [(ngModel)]="groupForm().courseLevel" class="field-input" style="width:100%">
                  @for (level of getSchoolCourseLevels(); track level) {
                    <option [value]="level">{{ level }}º de Primaria</option>
                  }
                </select>
              </div>
              
              <div class="form-field">
                <label class="field-label">Letra / Etiqueta del grupo</label>
                <input [(ngModel)]="groupForm().groupLabel" class="field-input" style="width:100%" placeholder="Ej: A, B, C..." type="text" maxlength="5" />
              </div>

              <div class="form-field">
                <label class="field-label">Número de alumnos</label>
                <input [(ngModel)]="groupForm().studentCount" class="field-input" style="width:100%" type="number" min="1" max="100" />
              </div>

              <div class="form-field">
                <label class="field-label">Tutor / a</label>
                <select [(ngModel)]="groupForm().tutorId" class="field-input" style="width:100%">
                  <option value="">Sin tutor asignado</option>
                  @for (t of teachers(); track t.id) {
                    <option [value]="t.id">{{ t.fullName }}</option>
                  }
                </select>
              </div>

              <div class="form-field">
                <label class="field-label">Aula de referencia</label>
                <select [(ngModel)]="groupForm().homeClassroomId" class="field-input" style="width:100%">
                  <option value="">Sin aula de referencia</option>
                  @for (c of classrooms(); track c.id) {
                    <option [value]="c.id">{{ c.name }} ({{ classroomTypeLabel(c.classroomType) }})</option>
                  }
                </select>
              </div>
            </div>
            
            <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end">
              <button class="btn-secondary" (click)="isGroupModalOpen.set(false)" style="padding:8px 16px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600">Cancelar</button>
              <button class="btn-primary" (click)="saveGroup()" style="padding:8px 16px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Plantilla cabecera tabla -->
    <ng-template #tableHeader let-title="title" let-addLabel="addLabel" let-tab="tab">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-weight:700">{{ title }}</h3>
        @if (addLabel) {
          <button class="btn-primary" style="padding:6px 12px;font-size:var(--text-xs);border-radius:var(--radius-sm);cursor:pointer" (click)="openAddModal(tab)">
            {{ addLabel }}
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    .tabs-bar { display: flex; gap: 2px; background: var(--secondary); border-radius: var(--radius-md); padding: 4px; flex-wrap: wrap; }
    .tab-btn { padding: 9px 16px; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: all .15s; background: transparent; color: var(--muted-foreground); display: flex; align-items: center; gap: 6px; }
    .tab-btn--active { background: var(--card); color: var(--foreground); box-shadow: var(--shadow-xs); }
    .tab-count { font-size: 11px; opacity: 0.7; font-weight: 700; }

    /* Formulario Centro */
    .section-header { padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    @media (max-width: 800px) { .form-grid { grid-template-columns: 1fr; } }
    .form-section { padding: 20px 24px; }
    .form-section:first-child { border-right: 1px solid var(--border); }
    .form-section-title { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-bottom: 14px; }
    .field-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; min-height: 34px; }
    .field-row--top { align-items: flex-start; }
    .field-label { font-size: var(--text-sm); color: var(--foreground); flex: 0 0 160px; }
    .field-input { padding: 6px 10px; border: 1px solid var(--input); border-radius: var(--radius-sm); font-size: var(--text-sm); font-family: var(--font-sans); background: var(--card); color: var(--foreground); flex: 1; min-width: 0; }
    .field-input--sm { flex: 0 0 160px; }
    .field-input--xs { flex: 0 0 110px; }
    .days-checkboxes { display: flex; gap: 6px; flex-wrap: wrap; }
    .day-check { display: flex; align-items: center; gap: 5px; font-size: var(--text-sm); cursor: pointer; padding: 5px 10px; border: 1px solid var(--input); border-radius: var(--radius-sm); transition: background .12s; }
    .day-check:has(input:checked) { background: var(--primary-tint); border-color: var(--primary); color: var(--primary-strong); font-weight: 600; }
    .day-check input { display: none; }
    .btn-save { padding: 9px 20px; background: var(--primary); color: var(--primary-foreground); border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: opacity .15s; }
    .btn-save:disabled { opacity: 0.5; cursor: default; }
    .btn-save:not(:disabled):hover { opacity: 0.88; }

    /* Tablas */
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

    /* Modales */
    .modal-backdrop { position: fixed; inset: 0; z-index: 80; background: oklch(0.2 0.02 255 / 0.45); display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(2px); }
    @media (min-width: 640px) { .modal-backdrop { align-items: center; } }
    .modal-card { background: var(--card); border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-lg); border: 1px solid var(--border); display: flex; flex-direction: column; }
    @media (min-width: 640px) { .modal-card { border-radius: var(--radius-lg); } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: var(--text-lg); font-weight: 700; }
    .form-field { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    
    /* Botones */
    .btn-primary { padding: 9px 20px; background: var(--primary); color: var(--primary-foreground); border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: opacity .15s; border: none; }
    .btn-primary:hover { opacity: 0.88; }
    .btn-secondary { padding: 9px 20px; background: var(--card); color: var(--foreground); border: 1px solid var(--input); border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-secondary:hover { background: var(--surface-2); }
    .btn-edit:hover { color: var(--primary) !important; }
  `],
})
export class ConfigComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly activeTab = signal<Tab>('school');
  readonly school = signal<School | null>(null);
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly subjects = signal<SubjectAllocation[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly savingSchool = signal(false);
  readonly savedSchool = signal(false);

  // ── Modales de Grupos ──────────────────────────────────────────────────────
  readonly isGroupModalOpen = signal(false);
  readonly editingGroup = signal<CourseGroup | null>(null);
  readonly groupForm = signal({
    courseLevel: 1,
    groupLabel: 'A',
    studentCount: 25,
    tutorId: '',
    homeClassroomId: '',
  });

  readonly tabs = [
    { id: 'school' as Tab, label: 'Centro' },
    { id: 'groups' as Tab, label: 'Grupos' },
    { id: 'teachers' as Tab, label: 'Profesores' },
    { id: 'subjects' as Tab, label: 'Asignaturas' },
    { id: 'classrooms' as Tab, label: 'Aulas' },
  ];

  readonly courseLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  readonly daysConfig = [
    { value: 1, label: DAYS[0] },
    { value: 2, label: DAYS[1] },
    { value: 3, label: DAYS[2] },
    { value: 4, label: DAYS[3] },
    { value: 5, label: DAYS[4] },
  ];

  // ── Formularios de ciclos ─────────────────────────────────────────────────
  cycleForms: Array<{
    cycle: number;
    morningStart: string;
    endTime: string;
    afternoonStart: string;
    saving: boolean;
    saved: boolean;
    error: string | null;
  }> = [1, 2, 3].map(c => ({
    cycle: c,
    morningStart: '09:00',
    endTime: '14:30',
    afternoonStart: '15:00',
    saving: false,
    saved: false,
    error: null,
  }));

  cycleLabel(cycle: number): string {
    const labels: Record<number, string> = {
      1: '1er ciclo · 1º y 2º',
      2: '2.º ciclo · 3º y 4º',
      3: '3er ciclo · 5º y 6º',
    };
    return labels[cycle] ?? `Ciclo ${cycle}`;
  }

  computedMorningEndTime(morningStart: string): string {
    const s = this.school();
    if (!s || !morningStart) return '';
    const [h, m] = morningStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    let totalMinutes = h * 60 + m;
    const isPartida = this.schoolForm.scheduleType === 'partida';
    const morningSlots = isPartida ? s.slotsPerDay - s.afternoonSlots : s.slotsPerDay;

    for (let i = 0; i < morningSlots; i++) {
      if (i === s.breakAfterSlot) totalMinutes += s.breakMinutes;
      totalMinutes += s.slotMinutes;
    }

    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  computedAfternoonEndTime(afternoonStart: string): string {
    const s = this.school();
    if (!s || !afternoonStart) return '';
    const [h, m] = afternoonStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    let totalMinutes = h * 60 + m;
    const isPartida = this.schoolForm.scheduleType === 'partida';
    if (!isPartida) return '';

    for (let i = 0; i < s.afternoonSlots; i++) {
      totalMinutes += s.slotMinutes;
    }

    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  /** Mantenido por compatibilidad si es necesario */
  computedEndTime(morningStart: string): string {
    return this.computedMorningEndTime(morningStart);
  }

  async saveCycle(cycle: number): Promise<void> {
    const form = this.cycleForms.find(c => c.cycle === cycle);
    if (!form || form.saving) return;
    form.saving = true;
    form.saved = false;
    form.error = null;

    const isPartida = this.schoolForm.scheduleType === 'partida';
    form.endTime = isPartida
      ? this.computedAfternoonEndTime(form.afternoonStart)
      : this.computedMorningEndTime(form.morningStart);

    try {
      const updated = await this.api.updateCycleSchedule(cycle, {
        morningStart: form.morningStart,
        endTime: form.endTime,
        afternoonStart: isPartida ? form.afternoonStart : null,
      });
      form.morningStart = updated.morningStart;
      form.endTime = updated.endTime;
      form.saved = true;
      setTimeout(() => { form.saved = false; }, 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      form.error = e?.error?.message ?? 'Error al guardar el ciclo.';
    } finally {
      form.saving = false;
    }
  }

  // Formulario template-driven (campos planos, igual que el generador)
  schoolForm = {
    name: '',
    centerCode: '',
    locality: '',
    community: 'madrid',
    stage: 'primaria',
    minCourseLevel: 1,
    maxCourseLevel: 6,
    academicYear: '2025/2026',
    scheduleType: 'continua' as 'continua' | 'partida',
    morningStart: '09:00',
    afternoonStart: '15:00',
    slotMinutes: 60,
    breakAfterSlot: 2,
    breakMinutes: 30,
    slotsPerDay: 5,
    afternoonSlots: 0,
    workingDays: [1, 2, 3, 4, 5],
  };

  async ngOnInit(): Promise<void> {
    const [school, teachers, groups, subjects, classrooms] = await Promise.all([
      this.api.getMySchool().catch(() => null as School | null),
      this.api.getTeachers().catch(() => []),
      this.api.getGroups().catch(() => []),
      this.api.getSubjects().catch(() => []),
      this.api.getClassrooms().catch(() => []),
    ]);
    if (school) {
      this.school.set(school);
      this.syncFormFromSchool(school);
    }
    this.teachers.set(teachers);
    this.groups.set(groups);
    this.subjects.set(subjects);
    this.classrooms.set(classrooms);
  }

  private syncFormFromSchool(s: School): void {
    this.schoolForm = {
      name: s.name,
      centerCode: s.centerCode ?? '',
      locality: s.locality ?? '',
      community: s.community,
      stage: s.stage,
      minCourseLevel: s.minCourseLevel,
      maxCourseLevel: s.maxCourseLevel,
      academicYear: s.academicYear,
      scheduleType: s.scheduleType,
      morningStart: s.morningStart,
      afternoonStart: s.afternoonStart ?? '15:00',
      slotMinutes: s.slotMinutes,
      breakAfterSlot: s.breakAfterSlot,
      breakMinutes: s.breakMinutes,
      slotsPerDay: s.slotsPerDay,
      afternoonSlots: s.afternoonSlots,
      workingDays: [...s.workingDays],
    };

    // Sincronizar formularios de ciclos desde los datos del colegio
    for (const cf of this.cycleForms) {
      const serverCycle = s.cycles?.find((c: CycleSchedule) => c.cycle === cf.cycle);
      if (serverCycle) {
        cf.morningStart   = serverCycle.morningStart;
        cf.endTime        = serverCycle.endTime;
        cf.afternoonStart = serverCycle.afternoonStart ?? '15:00';
      } else {
        // Si el ciclo aún no existe en la BD, usar la entrada global como defecto
        cf.morningStart   = s.morningStart;
        cf.endTime        = this.computedEndTime(s.morningStart);
        cf.afternoonStart = s.afternoonStart ?? '15:00';
      }
    }
  }

  toggleDay(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.schoolForm.workingDays = [...this.schoolForm.workingDays, day].sort((a, b) => a - b);
    } else {
      this.schoolForm.workingDays = this.schoolForm.workingDays.filter(d => d !== day);
    }
  }

  async saveSchool(): Promise<void> {
    if (this.savingSchool()) return;
    this.savingSchool.set(true);
    this.savedSchool.set(false);

    const updated = await this.api.updateMySchool({
      name: this.schoolForm.name,
      centerCode: this.schoolForm.centerCode || null,
      locality: this.schoolForm.locality || null,
      community: this.schoolForm.community,
      stage: this.schoolForm.stage,
      minCourseLevel: this.schoolForm.minCourseLevel,
      maxCourseLevel: this.schoolForm.maxCourseLevel,
      academicYear: this.schoolForm.academicYear,
      scheduleType: this.schoolForm.scheduleType,
      morningStart: this.schoolForm.morningStart,
      afternoonStart: this.schoolForm.scheduleType === 'partida' ? this.schoolForm.afternoonStart : '',
      slotMinutes: this.schoolForm.slotMinutes,
      breakAfterSlot: this.schoolForm.breakAfterSlot,
      breakMinutes: this.schoolForm.breakMinutes,
      slotsPerDay: this.schoolForm.slotsPerDay,
      afternoonSlots: this.schoolForm.scheduleType === 'partida' ? this.schoolForm.afternoonSlots : 0,
      workingDays: this.schoolForm.workingDays,
    } as Parameters<typeof this.api.updateMySchool>[0]).catch(() => null as School | null);

    this.savingSchool.set(false);
    if (updated) {
      this.school.set(updated);
      this.syncFormFromSchool(updated);
      this.savedSchool.set(true);
      setTimeout(() => this.savedSchool.set(false), 3000);
    }
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

  getClassroomName(classroomId: string | null): string {
    if (!classroomId) return '—';
    return this.classrooms().find(c => c.id === classroomId)?.name ?? '—';
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

  openAddModal(tab: string): void {
    if (tab === 'groups') {
      const minCourse = this.school()?.minCourseLevel ?? 1;
      this.editingGroup.set(null);
      this.groupForm.set({
        courseLevel: minCourse,
        groupLabel: 'A',
        studentCount: 25,
        tutorId: '',
        homeClassroomId: '',
      });
      this.isGroupModalOpen.set(true);
    }
  }

  editGroup(g: CourseGroup): void {
    this.editingGroup.set(g);
    this.groupForm.set({
      courseLevel: g.courseLevel,
      groupLabel: g.groupLabel,
      studentCount: g.studentCount,
      tutorId: g.tutorId ?? '',
      homeClassroomId: g.homeClassroomId ?? '',
    });
    this.isGroupModalOpen.set(true);
  }

  async saveGroup(): Promise<void> {
    const form = this.groupForm();
    const editing = this.editingGroup();

    if (!form.groupLabel || form.groupLabel.trim() === '') {
      alert('El identificador/letra del grupo es obligatorio.');
      return;
    }

    const payload = {
      courseLevel: Number(form.courseLevel),
      groupLabel: form.groupLabel.trim().toUpperCase(),
      studentCount: Number(form.studentCount),
      tutorId: form.tutorId ? form.tutorId : null,
      homeClassroomId: form.homeClassroomId ? form.homeClassroomId : null,
    };

    try {
      if (editing) {
        await this.api.updateGroup(editing.id, payload);
      } else {
        await this.api.createGroup(payload);
      }
      
      // Refresh groups list
      const updatedGroups = await this.api.getGroups();
      this.groups.set(updatedGroups);
      this.isGroupModalOpen.set(false);
    } catch (err) {
      alert('Error al guardar el grupo. Por favor, comprueba los datos.');
    }
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
