import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Teacher, CourseGroup, ScheduleList } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div style="margin-bottom:24px">
        <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">
          Panel de dirección
        </h1>
        <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
          {{ auth.schoolName() }}
        </p>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" (click)="router.navigate(['/config'])">
          <div class="kpi-icon" style="background:var(--primary-tint);color:var(--primary)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.04em">Profesores</div>
            <div style="font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.02em;margin-top:4px">{{ teachers().length }}</div>
          </div>
        </div>

        <div class="kpi-card" (click)="router.navigate(['/config'])">
          <div class="kpi-icon" style="background:var(--accent-tint);color:var(--accent-foreground)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"/>
            </svg>
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.04em">Grupos</div>
            <div style="font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.02em;margin-top:4px">{{ groups().length }}</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" [style.background]="scheduleStatusBg()" [style.color]="scheduleStatusColor()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.04em">Horario activo</div>
            <div style="font-size:var(--text-xl);font-weight:800;letter-spacing:-0.02em;margin-top:4px">
              {{ latestScheduleStatus() }}
            </div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" [style.background]="conflictsCount() > 0 ? 'var(--destructive-tint)' : 'var(--success-tint)'"
            [style.color]="conflictsCount() > 0 ? 'var(--destructive)' : 'var(--success)'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
            </svg>
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:0.04em">Conflictos</div>
            <div style="font-size:var(--text-3xl);font-weight:800;letter-spacing:-0.02em;margin-top:4px">{{ conflictsCount() }}</div>
          </div>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div style="margin-top:24px;margin-bottom:24px">
        <h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:12px">Acciones rápidas</h2>
        <div class="actions-grid">
          <button class="action-btn action-btn--primary" (click)="router.navigate(['/generador'])">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
            <span>Generar horario</span>
          </button>
          <button class="action-btn" (click)="router.navigate(['/horarios'])">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10h18M3 6h18M3 14h18M3 18h18M8 2v4M16 2v4"/>
            </svg>
            <span>Ver horarios</span>
          </button>
          <button class="action-btn" (click)="router.navigate(['/config'])">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Configurar colegio</span>
          </button>
        </div>
      </div>

      <!-- Horarios recientes -->
      @if (schedules().length > 0) {
        <div>
          <h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:12px">Horarios generados</h2>
          <div class="lec-card" style="padding:0;overflow:hidden">
            @for (s of schedules().slice(0,5); track s.id; let last = $last) {
              <div class="schedule-row" [class.schedule-row--last]="last"
                (click)="router.navigate(['/horarios', s.id])">
                <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                  <span class="status-dot" [class.dot--published]="s.status === 'published'"
                    [class.dot--generated]="s.status === 'generated'"
                    [class.dot--archived]="s.status === 'archived'"></span>
                  <div>
                    <div style="font-weight:700;font-size:var(--text-sm)">{{ s.academicYear }}</div>
                    <div style="font-size:var(--text-xs);color:var(--muted-foreground)">
                      {{ statusLabel(s.status) }} · {{ s.totalConflicts }} conflictos
                    </div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.4">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
    .kpi-card {
      background: var(--card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm); border: 1px solid var(--border);
      padding: var(--space-5); display: flex; align-items: flex-start;
      justify-content: space-between; gap: 8px; cursor: pointer; transition: all .15s;
    }
    .kpi-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
    .kpi-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; order: 1; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .action-btn {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 20px 16px; background: var(--card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm); border: 1px solid var(--border);
      font-weight: 700; font-size: var(--text-sm); cursor: pointer; transition: all .15s;
      color: var(--foreground);
    }
    .action-btn:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
    .action-btn--primary { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: var(--shadow-primary); }
    .action-btn--primary:hover { background: var(--primary-strong); }
    .schedule-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; cursor: pointer; transition: background .15s;
      border-bottom: 1px solid var(--border);
    }
    .schedule-row--last { border-bottom: none; }
    .schedule-row:hover { background: var(--secondary); }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      background: var(--border-strong);
    }
    .dot--published { background: var(--success); }
    .dot--generated { background: var(--warning); }
    .dot--archived { background: var(--muted-foreground); }
  `],
})
export class DashboardComponent implements OnInit {
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);

  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly schedules = signal<ScheduleList[]>([]);

  readonly latestSchedule = computed(() =>
    this.schedules().find(s => s.status === 'published') ??
    this.schedules()[0] ?? null
  );

  readonly latestScheduleStatus = computed(() => {
    const s = this.latestSchedule();
    if (!s) return 'Sin generar';
    return this.statusLabel(s.status);
  });

  readonly conflictsCount = computed(() => this.latestSchedule()?.totalConflicts ?? 0);

  readonly scheduleStatusBg = computed(() => {
    const s = this.latestSchedule();
    if (!s) return 'var(--secondary)';
    if (s.status === 'published') return 'var(--success-tint)';
    if (s.status === 'generated') return 'var(--warning-tint)';
    return 'var(--secondary)';
  });

  readonly scheduleStatusColor = computed(() => {
    const s = this.latestSchedule();
    if (!s) return 'var(--muted-foreground)';
    if (s.status === 'published') return 'var(--success)';
    if (s.status === 'generated') return 'var(--warning)';
    return 'var(--muted-foreground)';
  });

  async ngOnInit(): Promise<void> {
    const [teachers, groups, schedules] = await Promise.all([
      this.api.getTeachers().catch(() => []),
      this.api.getGroups().catch(() => []),
      this.api.getSchedules().catch(() => []),
    ]);
    this.teachers.set(teachers);
    this.groups.set(groups);
    this.schedules.set(schedules);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador', generated: 'Generado',
      published: 'Publicado', archived: 'Archivado',
    };
    return map[status] ?? status;
  }
}
