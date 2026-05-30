import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Teacher, TeacherConstraint, DAYS, DAYS_SHORT } from '../../core/models';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em;margin-bottom:20px">Mi perfil</h1>

      @if (teacher()) {
        <!-- Datos personales -->
        <div class="lec-card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:16px">
            <div class="avatar-large" [style.background]="'var(--subj-' + teacher()!.colorKey + ')'"
              [style.color]="'var(--subj-' + teacher()!.colorKey + '-fg)'">
              {{ initials(teacher()!.fullName) }}
            </div>
            <div>
              <h2 style="font-size:var(--text-xl);font-weight:700">{{ teacher()!.fullName }}</h2>
              <p style="color:var(--muted-foreground);font-size:var(--text-sm)">{{ teacher()!.email }}</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                @for (s of teacher()!.specialties; track s) {
                  <span class="specialty-badge">{{ s }}</span>
                }
              </div>
            </div>
          </div>

          <!-- Carga horaria -->
          <div style="margin-top:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:600;font-size:var(--text-sm)">Carga horaria</span>
              <span style="font-size:var(--text-sm);color:var(--muted-foreground)">
                {{ teacher()!.assignedHours }} / {{ teacher()!.maxWeeklyHours }} h/semana
              </span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
              <div style="height:100%;border-radius:99px;transition:width .5s cubic-bezier(0.22,1,0.36,1)"
                [style.width]="loadPct() + '%'"
                [style.background]="loadPct() > 100 ? 'var(--destructive)' : loadPct() >= 90 ? 'var(--warning)' : 'var(--primary)'">
              </div>
            </div>
          </div>
        </div>

        <!-- Disponibilidad semanal -->
        <div class="lec-card">
          <h3 style="font-weight:700;margin-bottom:16px">Disponibilidad semanal</h3>
          <p style="color:var(--muted-foreground);font-size:var(--text-sm);margin-bottom:16px">
            Las franjas marcadas en rojo son los momentos en que no puedes impartir clase.
          </p>
          <div class="availability-grid">
            <div></div>
            @for (day of days; track $index) {
              <div class="avail-header">{{ daysShort[$index] }}</div>
            }
            @for (slot of [0,1,2,3,4]; track slot) {
              <div class="slot-label">Sesión {{ slot + 1 }}</div>
              @for (day of days; track $index) {
                <button class="avail-cell"
                  [class.avail-unavailable]="hasConstraint($index + 1, slot)"
                  (click)="toggleConstraint($index + 1, slot)">
                  @if (hasConstraint($index + 1, slot)) {
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
      } @else {
        <div style="text-align:center;padding:48px;color:var(--muted-foreground)">
          Cargando perfil...
        </div>
      }
    </div>
  `,
  styles: [`
    .avatar-large { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px; flex-shrink: 0; }
    .specialty-badge { background: var(--primary-tint); color: var(--primary-strong); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); }
    .availability-grid { display: grid; grid-template-columns: 72px repeat(5, 1fr); gap: 6px; }
    .avail-header { text-align: center; font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); padding: 4px; }
    .slot-label { font-size: var(--text-xs); font-weight: 600; color: var(--muted-foreground); display: flex; align-items: center; }
    .avail-cell {
      height: 40px; border-radius: var(--radius-sm); border: 1.5px solid var(--border);
      background: var(--success-tint); color: var(--success);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
    }
    .avail-cell:hover { transform: scale(1.05); }
    .avail-unavailable { background: var(--destructive-tint); color: var(--destructive); border-color: var(--destructive); }
  `],
})
export class TeacherProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly teacher = signal<Teacher | null>(null);
  readonly constraints = signal<TeacherConstraint[]>([]);

  readonly days = DAYS;
  readonly daysShort = DAYS_SHORT;

  readonly loadPct = computed(() => {
    const t = this.teacher();
    if (!t || t.maxWeeklyHours === 0) return 0;
    return Math.min(150, Math.round((t.assignedHours / t.maxWeeklyHours) * 100));
  });

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.teacher?.id) return;

    const [teachers, constraints] = await Promise.all([
      this.api.getTeachers().catch(() => [] as Teacher[]),
      this.api.getTeacherConstraints(user.teacher.id).catch(() => [] as TeacherConstraint[]),
    ]);
    this.teacher.set(teachers.find(t => t.id === user.teacher!.id) ?? null);
    this.constraints.set(constraints);
  }

  hasConstraint(day: number, slot: number): boolean {
    return this.constraints().some(c => c.dayOfWeek === day && c.slotIndex === slot);
  }

  async toggleConstraint(day: number, slot: number): Promise<void> {
    const existing = this.constraints().find(c => c.dayOfWeek === day && c.slotIndex === slot);
    if (existing) {
      await this.api.deleteConstraint(existing.id).catch(() => {});
      this.constraints.update(cs => cs.filter(c => c.id !== existing.id));
    } else {
      const teacherId = this.teacher()?.id;
      if (!teacherId) return;
      const newC = await this.api.createConstraint({
        teacherId, constraintType: 'unavailable',
        dayOfWeek: day, slotIndex: slot, weight: 10,
      } as any).catch(() => null);
      if (newC) this.constraints.update(cs => [...cs, newC]);
    }
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
