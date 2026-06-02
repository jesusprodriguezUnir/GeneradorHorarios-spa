import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as signalR from '@microsoft/signalr';
import { ApiService } from '../../core/api/api.service';
import {
  TeacherConstraint, Teacher, CourseGroup, School, SubjectAllocation, Classroom, TimeSlot,
} from '../../core/models';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';
import { GenerationStateService } from '../../core/generation-state.service';
import { GenCandidate, ProConstraint, GEN_PRESETS, ObjectiveWeights } from '../../core/generation.model';
import { LecIconComponent } from '../../shared/ui/lec-icon.component';
import { StepAssignmentsComponent, AssignmentMap, asgKey } from './step-assignments.component';
import { StepConstraintsComponent } from './step-constraints.component';
import { StepGenerationComponent } from './step-generation.component';

interface ProgressMessage { assigned: number; total: number; percentage: number; currentAction: string; }

/**
 * Generador de horarios — stepper de 4 pasos potenciado (diseño Lectivo "pro"):
 *   1. Configuración base de la jornada
 *   2. Matriz de asignaciones profesor × grupo (editable)
 *   3. Biblioteca rica de restricciones (duras vs. preferencias)
 *   4. Objetivos de optimización + motor en vivo + soluciones candidatas
 */
@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LecIconComponent,
    StepAssignmentsComponent, StepConstraintsComponent, StepGenerationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div style="margin-bottom:22px">
        <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">Generador de horarios</h1>
        <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
          Cuatro pasos para resolver el horario completo del centro
        </p>
      </div>

      <!-- Stepper -->
      <div class="stepper" role="list" aria-label="Pasos del generador">
        @for (s of steps; track $index) {
          <div class="step" role="listitem"
            [class.step--active]="currentStep() === $index"
            [class.step--done]="currentStep() > $index"
            [attr.role]="$index < currentStep() ? 'button' : 'listitem'"
            [attr.aria-label]="$index < currentStep() ? 'Volver a: ' + s.t : s.t"
            [attr.aria-current]="currentStep() === $index ? 'step' : null"
            [style.cursor]="$index < currentStep() ? 'pointer' : 'default'"
            (click)="jumpTo($index)">
            <div class="step-num" aria-hidden="true">
              @if (currentStep() > $index) {
                <lec-icon name="check" [size]="15" [stroke]="3"></lec-icon>
              } @else {
                <lec-icon [name]="s.icon" [size]="15"></lec-icon>
              }
            </div>
            <div class="step-info">
              <span class="step-label">{{ s.t }}</span>
              <span class="step-desc-sm">{{ s.d }}</span>
            </div>
          </div>
          @if ($index < steps.length - 1) {
            <div class="step-line" [class.step-line--done]="currentStep() > $index" aria-hidden="true"></div>
          }
        }
      </div>

      <div style="margin-top:24px">
        @switch (currentStep()) {
          @case (0) {
            <div class="step-content lec-card">
              <h2 class="step-title">Configuración de la jornada</h2>
              <p class="step-desc">Define el tipo de jornada, horario de entrada y duración de las sesiones.</p>
              <div class="form-grid">
                <label class="form-field">
                  <span class="field-label">Tipo de jornada</span>
                  <select [(ngModel)]="scheduleType" class="field-select" data-testid="school-schedule-type">
                    <option value="continua">Continua (mañana)</option>
                    <option value="partida">Partida (mañana y tarde)</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="field-label">Hora de entrada</span>
                  <input type="time" [(ngModel)]="morningStart" class="field-input" data-testid="school-morning-start" />
                </label>
                <label class="form-field">
                  <span class="field-label">Duración de sesión (minutos)</span>
                  <select [(ngModel)]="slotMinutes" class="field-select" data-testid="school-slot-minutes">
                    <option [value]="45">45 min</option>
                    <option [value]="50">50 min</option>
                    <option [value]="60">60 min (recomendado)</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="field-label">Recreo tras la sesión nº</span>
                  <select [(ngModel)]="breakAfterSlot" class="field-select" data-testid="school-break-after-slot">
                    <option [value]="2">2ª sesión (recomendado)</option>
                    <option [value]="3">3ª sesión</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="field-label">Duración del recreo (minutos)</span>
                  <select [(ngModel)]="breakMinutes" class="field-select" data-testid="school-break-minutes">
                    <option [value]="20">20 min</option>
                    <option [value]="25">25 min</option>
                    <option [value]="30">30 min (recomendado)</option>
                  </select>
                </label>
                <label class="form-field">
                  <span class="field-label">Curso escolar</span>
                  <input type="text" [(ngModel)]="academicYear" class="field-input" placeholder="2025-2026" data-testid="school-academic-year" />
                </label>
              </div>
            </div>
          }
          @case (1) {
            @if (loading()) {
              <div class="loading-box">Cargando asignaciones…</div>
            } @else {
              <app-step-assignments [teachers]="teachers()" [groups]="groups()" [subjects]="subjects()"
                [(assignments)]="assignments" />
            }
          }
          @case (2) {
            <app-step-constraints [teachers]="teachers()" [subjects]="subjects()" [classrooms]="classrooms()"
              [groups]="groupNames()" [slots]="slots()" [(constraints)]="proConstraints" />
          }
          @case (3) {
            @if (hubState() !== 'connected') {
              <div class="hub-banner" [class.hub-banner--connecting]="hubState() === 'connecting'" role="status" aria-live="polite">
                @if (hubState() === 'connecting') {
                  <span class="hub-dot hub-dot--pulse" aria-hidden="true"></span> Conectando al servidor de generación…
                } @else {
                  <span class="hub-dot hub-dot--error" aria-hidden="true"></span> Sin conexión al servidor. El progreso en tiempo real no está disponible.
                }
              </div>
            }
            <app-step-generation [(objectives)]="objectives"
              [constraintsCount]="proConstraints().length" [hardCount]="hardCount()"
              [groupsCount]="groups().length" [teachersCount]="teachers().length" [completionPct]="completionPct()"
              (launch)="generate()" (choose)="onChoose($event)" />
          }
        }
      </div>

      @if (currentStep() < 3) {
        <div class="nav-buttons">
          <button class="btn-secondary" (click)="prevStep()" [disabled]="currentStep() === 0" data-testid="wizard-prev">
            <lec-icon name="arrowLeft" [size]="16"></lec-icon> Atrás
          </button>
          <button class="btn-primary" (click)="nextStep()" data-testid="wizard-next">
            {{ currentStep() === 2 ? 'Ir a generación' : 'Continuar' }} <lec-icon name="arrowRight" [size]="16"></lec-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .stepper { display: flex; align-items: center; margin-bottom: 4px; overflow-x: auto; gap: 0; }
    .step { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .step-num { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: var(--secondary); color: var(--muted-foreground); display: flex; align-items: center; justify-content: center; transition: all .2s; }
    .step--active .step-num { background: var(--primary); color: #fff; box-shadow: var(--shadow-primary); }
    .step--done .step-num { background: var(--success); color: #fff; }
    .step-info { display: flex; flex-direction: column; }
    .step-label { font-size: var(--text-sm); font-weight: 700; color: var(--muted-foreground); white-space: nowrap; }
    .step-desc-sm { font-size: 11px; color: var(--muted-foreground); white-space: nowrap; display: none; }
    .step--active .step-label { color: var(--foreground); }
    @media (min-width: 600px) { .step-desc-sm { display: block; } }
    .step-line { flex: 1; height: 2px; background: var(--border); min-width: 16px; margin: 0 10px; transition: background .2s; }
    .step-line--done { background: var(--success); }

    .step-content { margin-bottom: 0; }
    .step-title { font-size: var(--text-xl); font-weight: 700; margin-bottom: 6px; }
    .step-desc { color: var(--muted-foreground); font-size: var(--text-sm); margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    .field-input, .field-select { padding: 10px 12px; border: 1px solid var(--input); border-radius: var(--radius-md); font-size: var(--text-sm); font-family: var(--font-sans); background: var(--card); color: var(--foreground); transition: border-color .15s; }
    .field-input:focus, .field-select:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 2px var(--primary-tint); }
    .loading-box { text-align: center; padding: 48px; color: var(--muted-foreground); }

    .nav-buttons { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }
    .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--primary); color: #fff; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); transition: all .15s; }
    .btn-primary:hover { background: var(--primary-strong); }
    .btn-secondary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--card); color: var(--foreground); box-shadow: inset 0 0 0 1px var(--border-strong); border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Banner de estado del hub SignalR */
    .hub-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--text-xs); font-weight: 600; margin-bottom: 12px; background: var(--destructive-tint); color: var(--destructive); border: 1px solid var(--destructive); }
    .hub-banner--connecting { background: var(--warning-tint); color: var(--warning-foreground); border-color: var(--warning); }
    .hub-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .hub-dot--pulse { background: var(--warning); animation: lec-pulse-dot 1.1s ease-in-out infinite; }
    .hub-dot--error { background: var(--destructive); }
  `],
})
export class GeneratorComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly genState = inject(GenerationStateService);
  private hubConnection?: signalR.HubConnection;

  readonly currentStep = signal(0);
  readonly loading = signal(true);
  readonly hubState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  readonly teachers = signal<Teacher[]>([]);
  readonly groups = signal<CourseGroup[]>([]);
  readonly subjects = signal<SubjectAllocation[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly slots = signal<TimeSlot[]>([]);

  readonly assignments = signal<AssignmentMap>({});
  readonly proConstraints = signal<ProConstraint[]>([]);
  readonly objectives = signal<ObjectiveWeights>({ ...GEN_PRESETS['equilibrado'] });

  readonly groupNames = computed(() => this.groups().map(g => g.displayName));
  readonly hardCount = computed(() => this.proConstraints().filter(c => c.kind === 'hard').length);
  readonly completionPct = computed(() => {
    const total = this.subjects().length * this.groups().length;
    if (!total) return 0;
    const filled = Object.values(this.assignments()).filter(Boolean).length;
    return Math.round((filled / total) * 100);
  });

  private lastScheduleId = '';

  // Configuración del paso 1
  scheduleType = 'continua';
  morningStart = '09:00';
  slotMinutes = 60;
  breakAfterSlot = 2;
  breakMinutes = 30;
  academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  readonly steps = [
    { t: 'Configuración base', d: 'Jornada y franjas', icon: 'clock' },
    { t: 'Asignaciones', d: 'Profesor × grupo', icon: 'users' },
    { t: 'Restricciones', d: 'Reglas del centro', icon: 'ban' },
    { t: 'Generación', d: 'Motor y soluciones', icon: 'cpu' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const [teachers, groups, subjects, classrooms, school, summaries, constraints] = await Promise.all([
        this.api.getTeachers().catch(() => []),
        this.api.getGroups().catch(() => []),
        this.api.getSubjects().catch(() => []),
        this.api.getClassrooms().catch(() => []),
        this.api.getMySchool().catch(() => null),
        this.api.getAssignments().catch(() => []),
        this.api.getConstraints().catch(() => []),
      ]);
      this.teachers.set(teachers);
      this.groups.set(groups);
      this.subjects.set(subjects);
      this.classrooms.set(classrooms);
      if (school) {
        this.slots.set(school.computedSlots ?? []);
        this.scheduleType = school.scheduleType ?? this.scheduleType;
        this.morningStart = school.morningStart ?? this.morningStart;
        this.slotMinutes = school.slotMinutes ?? this.slotMinutes;
        this.breakAfterSlot = school.breakAfterSlot ?? this.breakAfterSlot;
        this.breakMinutes = school.breakMinutes ?? this.breakMinutes;
        this.academicYear = school.academicYear ?? this.academicYear;
      }
      this.assignments.set(this.buildAssignmentMap(subjects, groups, summaries));
      this.seedConstraints(constraints);
      this.setupSignalR();
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de carga', detail: 'No se pudieron cargar los datos del generador.' });
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void { this.hubConnection?.stop(); }

  private buildAssignmentMap(subjects: SubjectAllocation[], groups: CourseGroup[], summaries: { assignments: { allocationId: string; groupId: string; teacherId: string }[] }[]): AssignmentMap {
    const map: AssignmentMap = {};
    for (const s of subjects) for (const g of groups) map[asgKey(s.id, g.id)] = null;
    for (const sum of summaries) for (const a of sum.assignments ?? []) {
      map[asgKey(a.allocationId, a.groupId)] = a.teacherId;
    }
    return map;
  }

  /** Pre-carga las restricciones existentes (tipo "no disponible") como reglas duras. */
  private seedConstraints(constraints: TeacherConstraint[]): void {
    const seeded: ProConstraint[] = constraints.map((c, i) => ({
      id: Date.now() + i,
      type: c.constraintType === 'unavailable' ? 'no-disp' : 'turno',
      kind: c.constraintType === 'unavailable' ? 'hard' : 'soft',
      teacherId: c.teacherId,
      day: c.dayOfWeek,
      slot: String(c.slotIndex),
      priority: 2,
    }));
    this.proConstraints.set(seeded);
  }

  private setupSignalR(): void {
    this.hubState.set('connecting');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl)
      .withAutomaticReconnect()
      .build();
    this.hubConnection.onreconnecting(() => this.hubState.set('connecting'));
    this.hubConnection.onreconnected(() => this.hubState.set('connected'));
    this.hubConnection.onclose(() => this.hubState.set('disconnected'));
    this.hubConnection.on('Progress', (_msg: ProgressMessage) => { /* el motor en vivo es visual; el progreso real se ignora aquí */ });
    this.hubConnection.start()
      .then(async () => {
        this.hubState.set('connected');
        const user = this.auth.currentUser();
        if (user?.schoolId) {
          await this.hubConnection?.invoke('JoinSchoolGroup', user.schoolId).catch(() => {});
        }
      })
      .catch(() => this.hubState.set('disconnected'));
  }

  jumpTo(i: number): void { if (i < this.currentStep()) this.currentStep.set(i); }
  nextStep(): void { if (this.currentStep() < 3) this.currentStep.update(s => s + 1); }
  prevStep(): void { if (this.currentStep() > 0) this.currentStep.update(s => s - 1); }

  /** Lanza la generación real en el backend mientras el motor en vivo se anima. */
  async generate(): Promise<void> {
    try {
      const schoolConfig: Partial<School> = {
        scheduleType: this.scheduleType as 'continua' | 'partida',
        morningStart: this.morningStart,
        slotMinutes: Number(this.slotMinutes),
        breakAfterSlot: Number(this.breakAfterSlot),
        breakMinutes: Number(this.breakMinutes),
      };
      await this.api.updateMySchool(schoolConfig);
      const result = await this.api.generateSchedule(this.academicYear, 30);
      this.lastScheduleId = result.scheduleId;
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de generación', detail: 'No se pudo completar el horario. Revisa especialistas o aulas.' });
    }
  }

  /** El usuario elige una candidata → guardamos su scorecard y abrimos el resultado real. */
  onChoose(candidate: GenCandidate): void {
    this.genState.setChosen(candidate);
    if (this.lastScheduleId) {
      this.router.navigate(['/horarios', this.lastScheduleId]);
    } else {
      this.toast.add({ severity: 'warn', summary: 'Generación en curso', detail: 'El horario aún se está calculando, inténtalo de nuevo en unos segundos.' });
    }
  }
}
