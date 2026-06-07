import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeachersApiService } from '../../core/api/teachers-api.service';
import { ConstraintsApiService } from '../../core/api/constraints-api.service';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Teacher, TeacherConstraint, TimeSlot, School, DAYS, DAYS_SHORT, SUBJECT_COLORS } from '../../core/models';
import { MessageService } from 'primeng/api';

const SUBJECT_NAMES: Record<string, string> = {
  mat: 'Matemáticas', len: 'Lengua', ing: 'Inglés', cie: 'Naturales',
  soc: 'Sociales', ef: 'E. Física', art: 'Plástica', mus: 'Música',
  rel: 'Religión', tut: 'Tutoría',
};

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div style="margin-bottom:24px">
        <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">Mi perfil</h1>
        <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
          Gestiona tu disponibilidad semanal y consulta tu carga horaria
        </p>
      </div>

      @if (teacher()) {
        <div class="profile-layout">

          <!-- Columna izquierda -->
          <div class="left-col">

            <!-- Tarjeta de identidad -->
            <div class="lec-card" style="padding:var(--space-5)">
              <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
                <div class="avatar-large"
                  [style.background]="'var(--subj-' + teacher()!.colorKey + ')'"
                  [style.color]="'var(--subj-' + teacher()!.colorKey + '-fg)'">
                  {{ initials(teacher()!.fullName) }}
                </div>
                <div>
                  <h2 style="font-size:var(--text-xl);font-weight:700;line-height:1.2">{{ teacher()!.fullName }}</h2>
                  <p style="color:var(--muted-foreground);font-size:var(--text-sm);margin-top:3px">{{ teacher()!.email }}</p>
                </div>
              </div>

              @if (teacher()!.subjectHours.length) {
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  @for (sh of teacher()!.subjectHours; track sh.subjectKey) {
                    <span class="specialty-badge">{{ subjectName(sh.subjectKey) }} · {{ sh.weeklyHours }}h</span>
                  }
                </div>
              }
            </div>

            <!-- Tarjeta de carga horaria -->
            <div class="lec-card" style="padding:var(--space-5)">
              <div style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);
                text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
                Carga horaria
              </div>
              <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
                <span style="font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.02em">
                  {{ teacher()!.assignedHours }}
                </span>
                <span style="font-size:var(--text-base);color:var(--muted-foreground)">
                  / {{ teacher()!.maxWeeklyHours }} h/sem.
                </span>
              </div>
              <p style="font-size:var(--text-sm);margin-bottom:14px"
                [style.color]="loadLabel().color">
                {{ loadLabel().text }}
              </p>
              <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
                <div style="height:100%;border-radius:99px;transition:width .5s cubic-bezier(0.22,1,0.36,1)"
                  [style.width]="loadPct() + '%'"
                  [style.background]="loadPct() > 100 ? 'var(--destructive)' : loadPct() >= 90 ? 'var(--warning)' : 'var(--primary)'">
                </div>
              </div>
              @if (remaining() > 0) {
                <p style="font-size:var(--text-xs);color:var(--muted-foreground);margin-top:8px">
                  {{ remaining() }} h disponibles aún sin asignar
                </p>
              }
            </div>

            <!-- Tarjeta "Imparte" (asignaturas por clave de color) -->
            @if (subjectKeys().length > 0) {
              <div class="lec-card" style="padding:var(--space-5)">
                <div style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground);
                  text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">
                  Imparte
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  @for (key of subjectKeys(); track key) {
                    <div class="subject-chip"
                      [style.background]="'var(--subj-' + key + ')'"
                      [style.color]="'var(--subj-' + key + '-fg)'">
                      {{ subjectName(key) }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Columna derecha: disponibilidad semanal -->
          <div class="lec-card" style="padding:var(--space-5);height:fit-content">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px;flex-wrap:wrap">
              <h3 style="font-weight:700;font-size:var(--text-base)">Disponibilidad semanal</h3>
              @if (blockedCount() > 0) {
                <span style="font-size:var(--text-xs);font-weight:700;padding:3px 10px;border-radius:var(--radius-full);
                  background:var(--destructive-tint);color:var(--destructive)">
                  {{ blockedCount() }} franja{{ blockedCount() !== 1 ? 's' : '' }} bloqueada{{ blockedCount() !== 1 ? 's' : '' }}
                </span>
              }
            </div>
            <p style="color:var(--muted-foreground);font-size:var(--text-sm);margin-bottom:16px">
              Marca en rojo los momentos en que no puedes impartir clase.
            </p>

            <!-- Leyenda -->
            <div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:7px;font-size:var(--text-xs);font-weight:600">
                <span style="width:14px;height:14px;border-radius:4px;background:var(--success-tint);border:1.5px solid var(--success);flex-shrink:0"></span>
                Disponible
              </div>
              <div style="display:flex;align-items:center;gap:7px;font-size:var(--text-xs);font-weight:600">
                <span style="width:14px;height:14px;border-radius:4px;background:var(--destructive-tint);border:1.5px solid var(--destructive);flex-shrink:0"></span>
                No disponible
              </div>
            </div>

            <!-- Rejilla -->
            <div class="availability-grid">
              <div></div>
              @for (day of days; track day) {
                <div class="avail-header">{{ daysShort[$index] }}</div>
              }
              @for (slot of gridSlots(); track slot.index) {
                <div class="slot-label">
                  <span class="slot-time">{{ slot.startTime }}</span>
                </div>
                @for (day of days; track day) {
                  <button class="avail-cell"
                    [class.avail-unavailable]="hasConstraint($index + 1, slot.index)"
                    (click)="toggleConstraint($index + 1, slot.index)">
                    @if (hasConstraint($index + 1, slot.index)) {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    } @else {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  </button>
                }
              }
            </div>
          </div>
        </div>

      } @else {
        <div style="text-align:center;padding:48px;color:var(--muted-foreground)">
          Cargando perfil...
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 760px) {
      .profile-layout { grid-template-columns: 1fr; }
    }
    .left-col { display: flex; flex-direction: column; gap: 14px; }
    .avatar-large {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 22px; flex-shrink: 0;
    }
    .specialty-badge {
      background: var(--primary-tint); color: var(--primary-strong);
      font-size: 11px; font-weight: 700; padding: 3px 10px;
      border-radius: var(--radius-full);
    }
    .subject-chip {
      font-size: 12px; font-weight: 700; padding: 5px 12px;
      border-radius: var(--radius-full); white-space: nowrap;
    }
    .availability-grid {
      display: grid;
      grid-template-columns: 56px repeat(5, 1fr);
      gap: 5px;
    }
    .avail-header {
      text-align: center; font-size: var(--text-xs); font-weight: 700;
      color: var(--muted-foreground); padding: 4px; white-space: nowrap;
    }
    .slot-label {
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 6px;
    }
    .slot-time {
      font-size: 10px; font-weight: 600;
      color: var(--muted-foreground); white-space: nowrap;
    }
    .avail-cell {
      height: 40px; border-radius: var(--radius-sm); border: 1.5px solid var(--success);
      background: var(--success-tint); color: var(--success);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
    }
    .avail-cell:hover { transform: scale(1.06); }
    .avail-unavailable {
      background: var(--destructive-tint);
      color: var(--destructive);
      border-color: var(--destructive);
    }
  `],
})
export class TeacherProfileComponent implements OnInit {
  private readonly teachersApi = inject(TeachersApiService);
  private readonly constraintsApi = inject(ConstraintsApiService);
  private readonly schoolsApi = inject(SchoolsApiService);
  private readonly auth  = inject(AuthService);
  private readonly toast = inject(MessageService);

  readonly teacher     = signal<Teacher | null>(null);
  readonly constraints = signal<TeacherConstraint[]>([]);
  readonly school      = signal<School | null>(null);

  readonly days      = DAYS;
  readonly daysShort = DAYS_SHORT;

  // ── computed ────────────────────────────────────────────────────────────────

  readonly loadPct = computed(() => {
    const t = this.teacher();
    if (!t || t.maxWeeklyHours === 0) return 0;
    return Math.min(150, Math.round((t.assignedHours / t.maxWeeklyHours) * 100));
  });

  readonly remaining = computed(() => {
    const t = this.teacher();
    if (!t) return 0;
    return Math.max(0, t.maxWeeklyHours - t.assignedHours);
  });

  readonly loadLabel = computed((): { text: string; color: string } => {
    const pct = this.loadPct();
    if (pct >= 100) return { text: 'Carga completa', color: 'var(--success)' };
    if (pct >= 80)  return { text: 'Con carga alta', color: 'var(--warning-foreground)' };
    return { text: 'Con margen disponible', color: 'var(--muted-foreground)' };
  });

  readonly blockedCount = computed(() => this.constraints().length);

  readonly gridSlots = computed((): TimeSlot[] => {
    const s = this.school();
    if (s?.computedSlots?.length) {
      return s.computedSlots.filter(sl => !sl.isBreak);
    }
    return Array.from({ length: 5 }, (_, i) => ({
      index: i, startTime: '', endTime: '', isBreak: false,
    }));
  });

  readonly subjectKeys = computed((): string[] => {
    const t = this.teacher();
    if (!t) return [];
    return t.subjectHours.map(sh => sh.subjectKey).slice(0, 6);
  });

  // ── lifecycle ────────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.teacher?.id) return;

    try {
      const [teachers, constraints, school] = await Promise.all([
        this.teachersApi.getTeachers(),
        this.constraintsApi.getTeacherConstraints(user.teacher.id),
        this.schoolsApi.getMySchool().catch(() => null),
      ]);
      this.teacher.set(teachers.find(t => t.id === user.teacher!.id) ?? null);
      this.constraints.set(constraints);
      this.school.set(school);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de carga', detail: 'No se pudieron obtener los datos de tu perfil.' });
    }
  }

  // ── métodos ──────────────────────────────────────────────────────────────────

  hasConstraint(day: number, slot: number): boolean {
    return this.constraints().some(c => c.dayOfWeek === day && c.slotIndex === slot);
  }

  async toggleConstraint(day: number, slot: number): Promise<void> {
    const existing = this.constraints().find(c => c.dayOfWeek === day && c.slotIndex === slot);
    if (existing) {
      try {
        await this.constraintsApi.deleteConstraint(existing.id);
        this.constraints.update(cs => cs.filter(c => c.id !== existing.id));
        this.toast.add({ severity: 'success', summary: 'Disponibilidad guardada', detail: 'Franja horaria liberada.' });
      } catch {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo modificar la disponibilidad.' });
      }
    } else {
      const teacherId = this.teacher()?.id;
      if (!teacherId) return;
      try {
        const newC = await this.constraintsApi.createConstraint({
          teacherId, constraintType: 'unavailable',
          dayOfWeek: day, slotIndex: slot, weight: 10,
        });
        this.constraints.update(cs => [...cs, newC]);
        this.toast.add({ severity: 'success', summary: 'Disponibilidad guardada', detail: 'Franja horaria marcada como no disponible.' });
      } catch {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo marcar la franja horaria.' });
      }
    }
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  subjectName(key: string): string {
    return SUBJECT_NAMES[key] ?? key;
  }
}
