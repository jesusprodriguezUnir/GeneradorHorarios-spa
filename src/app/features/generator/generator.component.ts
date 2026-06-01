import {
  Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as signalR from '@microsoft/signalr';
import { ApiService } from '../../core/api/api.service';
import { AssignmentSummary, TeacherConstraint, Teacher, CourseGroup, School } from '../../core/models';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';

interface ProgressMessage {
  assigned: number;
  total: number;
  percentage: number;
  currentAction: string;
}

interface StepLog {
  text: string;
  done: boolean;
}

@Component({
  selector: 'app-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lec-fade-up">
      <!-- Cabecera -->
      <div style="margin-bottom:24px">
        <h1 style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em">Generador de horarios</h1>
        <p style="color:var(--muted-foreground);margin-top:4px;font-size:var(--text-sm)">
          Completa los 4 pasos para generar el horario del colegio
        </p>
      </div>

      <!-- Stepper -->
      <div class="stepper">
        @for (s of stepLabels; track $index) {
          <div class="step" [class.step--active]="currentStep() === $index"
            [class.step--done]="currentStep() > $index">
            <div class="step-num">
              @if (currentStep() > $index) {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              } @else {
                {{ $index + 1 }}
              }
            </div>
            <div class="step-info">
              <span class="step-label">{{ s.label }}</span>
              <span class="step-desc-sm">{{ s.desc }}</span>
            </div>
          </div>
          @if ($index < stepLabels.length - 1) {
            <div class="step-line" [class.step-line--done]="currentStep() > $index"></div>
          }
        }
      </div>

      <!-- Contenido del paso -->
      <div class="step-content lec-card">
        @switch (currentStep()) {
          @case (0) {
            <!-- Paso 1: Configuración base -->
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
          }

          @case (1) {
            <!-- Paso 2: Verificar asignaciones -->
            <h2 class="step-title">Verificar asignaciones</h2>
            <p class="step-desc">Comprueba que todas las asignaturas tienen profesores asignados a todos los grupos.</p>
            @if (loadingAssignments()) {
              <div style="text-align:center;padding:24px;color:var(--muted-foreground)">Cargando asignaciones...</div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:12px">
                @for (subj of assignments(); track subj.subjectName) {
                  <div class="assignment-row">
                    <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                      <div class="subj-dot" [style.background]="'var(--subj-' + subj.subjectKey + ')'"></div>
                      <div>
                        <div style="font-weight:700;font-size:var(--text-sm)">{{ subj.subjectName }}</div>
                        <div style="font-size:var(--text-xs);color:var(--muted-foreground)">
                          {{ subj.assignedHours }} / {{ subj.requiredHours }} h asignadas
                        </div>
                      </div>
                    </div>
                    <div class="completion-bar-wrap">
                      <div class="completion-bar"
                        [style.width]="subj.completionPct + '%'"
                        [style.background]="subj.completionPct >= 100 ? 'var(--success)' : 'var(--warning)'">
                      </div>
                    </div>
                    <span class="completion-pct"
                      [style.color]="subj.completionPct >= 100 ? 'var(--success)' : 'var(--warning)'">
                      {{ subj.completionPct | number:'1.0-0' }}%
                    </span>
                  </div>
                }
              </div>
              @if (completionWarning()) {
                <div class="warning-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                  </svg>
                  Algunas asignaturas no tienen todas las horas asignadas. El horario se generará con los datos disponibles.
                </div>
              }
            }
          }

          @case (2) {
            <!-- Paso 3: Restricciones -->
            <h2 class="step-title">Restricciones de profesores</h2>
            <p class="step-desc">Añade las franjas en las que los profesores no pueden dar clase.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
              <select [(ngModel)]="constraintTeacher" class="field-select" style="flex:1;min-width:160px">
                <option value="">Selecciona un profesor</option>
                @for (t of teachers(); track t.id) {
                  <option [value]="t.id">{{ t.fullName }}</option>
                }
              </select>
              <select [(ngModel)]="constraintDay" class="field-select">
                <option [value]="1">Lunes</option>
                <option [value]="2">Martes</option>
                <option [value]="3">Miércoles</option>
                <option [value]="4">Jueves</option>
                <option [value]="5">Viernes</option>
              </select>
              <select [(ngModel)]="constraintSlot" class="field-select">
                @for (i of [0,1,2,3,4]; track i) {
                  <option [value]="i">Sesión {{ i + 1 }}</option>
                }
              </select>
              <button class="btn-primary" (click)="addConstraint()">+ Añadir</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (c of constraints(); track c.id) {
                <div class="constraint-row">
                  <div style="flex:1">
                    <span style="font-weight:600">{{ c.teacherName }}</span>
                    <span style="color:var(--muted-foreground);font-size:var(--text-xs);margin-left:8px">
                      No disponible · {{ dayName(c.dayOfWeek) }} sesión {{ c.slotIndex + 1 }}
                    </span>
                  </div>
                  <button (click)="removeConstraint(c.id)" style="color:var(--destructive);padding:4px;cursor:pointer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                </div>
              }
              @if (constraints().length === 0) {
                <div style="text-align:center;padding:20px;color:var(--muted-foreground);font-size:var(--text-sm)">
                  No hay restricciones añadidas. El motor optimizará sin restricciones adicionales.
                </div>
              }
            </div>
          }

          @case (3) {
            <!-- Paso 4: Generación -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
              <h2 class="step-title">Generar horario</h2>
              <span class="hub-status-badge" [class.hub--connected]="hubStatus() === 'connected'" [class.hub--disconnected]="hubStatus() === 'disconnected'" [class.hub--connecting]="hubStatus() === 'connecting'">
                SignalR: {{ hubStatus() === 'connected' ? 'Conectado' : hubStatus() === 'connecting' ? 'Conectando...' : 'Desconectado' }}
              </span>
            </div>

            @if (!generating() && !generated()) {
              <!-- Tarjeta "Todo listo para generar" -->
              <div class="ready-card">
                <div class="ready-sparkle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                  </svg>
                </div>
                <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:8px">Todo listo para generar</h3>
                <p style="color:var(--muted-foreground);font-size:var(--text-sm);margin-bottom:24px;max-width:380px;margin-inline:auto">
                  El motor analizará {{ totalRequiredHours() }} asignaciones
                  y generará el horario óptimo en menos de 30 segundos.
                </p>
                <div class="ready-stats">
                  <div class="ready-stat">
                    <div class="ready-stat-value">{{ groupCount() }}</div>
                    <div class="ready-stat-label">Grupos</div>
                  </div>
                  <div class="ready-stat-sep"></div>
                  <div class="ready-stat">
                    <div class="ready-stat-value">{{ teachers().length }}</div>
                    <div class="ready-stat-label">Docentes</div>
                  </div>
                  <div class="ready-stat-sep"></div>
                  <div class="ready-stat">
                    <div class="ready-stat-value">{{ constraints().length }}</div>
                    <div class="ready-stat-label">Restricciones</div>
                  </div>
                </div>
                <button class="btn-generate" (click)="generate()" data-testid="generate-button">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                  </svg>
                  Generar horario
                </button>
              </div>
            }

            @if (generated()) {
              <div class="result-box" [class.result-box--success]="!hasConflicts()" [class.result-box--warn]="hasConflicts()" data-testid="result-box">
                <div style="display:flex;align-items:center;gap:12px">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    [attr.stroke]="hasConflicts() ? 'var(--warning)' : 'var(--success)'" stroke-width="2">
                    @if (hasConflicts()) {
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
                    } @else {
                      <polyline points="20 6 9 17 4 12"/>
                    }
                  </svg>
                  <div>
                    <div style="font-weight:700">
                      {{ hasConflicts() ? 'Horario generado con conflictos' : '¡Horario generado correctamente!' }}
                    </div>
                    <div style="font-size:var(--text-sm);opacity:0.8;margin-top:2px">
                      {{ totalConflicts() }} conflictos · generado en {{ generationSeconds() }}s
                    </div>
                  </div>
                </div>
                <button class="btn-view" (click)="viewSchedule()" data-testid="view-schedule-button">Ver horario →</button>
              </div>
            }
          }
        }
      </div>

      <!-- Modal de progreso (backdrop blur) -->
      @if (generating()) {
        <div class="gen-backdrop" data-testid="progress-overlay">
          <div class="gen-modal lec-scale-in">
            <div class="gen-modal-head">
              <div class="progress-spinner"></div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:var(--text-base)">Generando horario...</div>
                <div style="color:var(--muted-foreground);font-size:var(--text-sm);margin-top:2px">{{ progressMessage() }}</div>
              </div>
              <div class="progress-pct" data-testid="progress-pct">{{ progressPct() }}%</div>
            </div>
            <!-- Barra rayada animada -->
            <div class="striped-bar-outer">
              <div class="striped-bar-inner" [style.width]="progressPct() + '%'"></div>
            </div>
            <!-- Log de eventos -->
            <div class="progress-log">
              @for (log of progressLog(); track $index) {
                <div class="log-line lec-fade-up" [class.log-done]="log.done">
                  @if (log.done) {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  } @else {
                    <div class="log-spinner"></div>
                  }
                  {{ log.text }}
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Botones de navegación -->
      <div class="nav-buttons">
        <button class="btn-secondary" (click)="prevStep()" [disabled]="currentStep() === 0 || generating()" data-testid="wizard-prev">
          ← Anterior
        </button>
        @if (currentStep() < 3) {
          <button class="btn-primary" (click)="nextStep()" data-testid="wizard-next">
            Siguiente →
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── Stepper ── */
    .stepper { display: flex; align-items: center; margin-bottom: 24px; overflow-x: auto; gap: 0; }
    .step { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .step-num {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: var(--secondary); color: var(--muted-foreground);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: var(--text-sm); transition: all .2s;
    }
    .step--active .step-num { background: var(--primary); color: #fff; box-shadow: var(--shadow-primary); }
    .step--done .step-num   { background: var(--success); color: #fff; }
    .step-info { display: flex; flex-direction: column; }
    .step-label { font-size: var(--text-sm); font-weight: 700; color: var(--muted-foreground); white-space: nowrap; }
    .step-desc-sm { font-size: 11px; color: var(--muted-foreground); white-space: nowrap; display: none; }
    .step--active .step-label { color: var(--foreground); }
    @media (min-width: 600px) { .step-desc-sm { display: block; } }
    .step-line { flex: 1; height: 2px; background: var(--border); min-width: 16px; margin: 0 10px; transition: background .2s; }
    .step-line--done { background: var(--success); }

    /* ── Contenido de pasos ── */
    .step-content { margin-bottom: 20px; }
    .step-title { font-size: var(--text-xl); font-weight: 700; margin-bottom: 6px; }
    .step-desc  { color: var(--muted-foreground); font-size: var(--text-sm); margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; }
    .field-input, .field-select {
      padding: 10px 12px; border: 1px solid var(--input); border-radius: var(--radius-md);
      font-size: var(--text-sm); font-family: var(--font-sans); background: var(--card);
      color: var(--foreground); transition: border-color .15s;
    }
    .field-input:focus, .field-select:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 2px var(--primary-tint); }
    .assignment-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: var(--secondary); border-radius: var(--radius-md);
    }
    .subj-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .completion-bar-wrap { flex: 1; height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; min-width: 80px; }
    .completion-bar { height: 100%; border-radius: 99px; transition: width .5s cubic-bezier(0.22,1,0.36,1); }
    .completion-pct { font-size: var(--text-xs); font-weight: 700; min-width: 36px; text-align: right; }
    .warning-box {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px;
      background: var(--warning-tint); color: var(--warning-foreground);
      border-radius: var(--radius-md); font-size: var(--text-sm); margin-top: 16px;
    }
    .constraint-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: var(--secondary); border-radius: var(--radius-md); font-size: var(--text-sm);
    }

    /* ── Tarjeta "Todo listo" ── */
    .ready-card {
      text-align: center; padding: 32px 24px;
    }
    .ready-sparkle {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--primary-tint); color: var(--primary);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    .ready-stats {
      display: flex; align-items: center; justify-content: center;
      gap: 0; margin-bottom: 28px;
      background: var(--secondary); border-radius: var(--radius-lg);
      padding: 16px; width: fit-content; margin-inline: auto;
    }
    .ready-stat { padding: 0 24px; text-align: center; }
    .ready-stat-value { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; }
    .ready-stat-label { font-size: var(--text-xs); color: var(--muted-foreground); font-weight: 600; margin-top: 2px; }
    .ready-stat-sep { width: 1px; height: 36px; background: var(--border); }

    /* ── Botones ── */
    .btn-primary {
      padding: 10px 16px; background: var(--primary); color: #fff;
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s;
    }
    .btn-primary:hover { background: var(--primary-strong); }
    .btn-secondary {
      padding: 10px 16px; background: var(--card); color: var(--foreground);
      box-shadow: inset 0 0 0 1px var(--border-strong);
      border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm);
      cursor: pointer; transition: all .15s;
    }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-generate {
      display: inline-flex; align-items: center; gap: 12px;
      padding: 16px 32px; background: var(--primary); color: #fff;
      border-radius: var(--radius-xl); font-weight: 700; font-size: var(--text-lg);
      cursor: pointer; box-shadow: var(--shadow-primary); transition: all .15s;
    }
    .btn-generate:hover { background: var(--primary-strong); transform: translateY(-1px); }

    /* ── Modal de progreso (backdrop blur) ── */
    .gen-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: oklch(0.12 0.015 250 / 0.55);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .gen-modal {
      background: var(--card); border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-lg); border: 1px solid var(--border);
      padding: 28px 32px; width: 100%; max-width: 480px;
    }
    .gen-modal-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    .progress-spinner {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      border: 3px solid var(--border); border-top-color: var(--primary);
      animation: lec-spin 0.8s linear infinite;
    }
    .progress-pct { font-size: var(--text-3xl); font-weight: 800; margin-left: auto; }

    /* Barra rayada animada (usa @keyframes lec-bar de styles.scss) */
    .striped-bar-outer {
      height: 10px; background: var(--muted); border-radius: 99px;
      overflow: hidden; margin-bottom: 20px;
    }
    .striped-bar-inner {
      height: 100%; border-radius: 99px;
      background: repeating-linear-gradient(
        60deg,
        var(--primary) 0,
        var(--primary) 10px,
        var(--primary-tint-2) 10px,
        var(--primary-tint-2) 18px
      );
      background-size: 28px 100%;
      animation: lec-bar 0.6s linear infinite;
      transition: width .5s cubic-bezier(0.22,1,0.36,1);
    }
    .progress-log { display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; }
    .log-line { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); color: var(--muted-foreground); }
    .log-done { color: var(--foreground); }
    .log-spinner { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--border); border-top-color: var(--primary); animation: lec-spin 0.8s linear infinite; }

    /* ── Resultado ── */
    .result-box {
      padding: 16px 20px; border-radius: var(--radius-lg); margin-top: 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }
    .result-box--success { background: var(--success-tint); color: var(--success); }
    .result-box--warn    { background: var(--warning-tint); color: var(--warning-foreground); }
    .btn-view {
      padding: 10px 16px; background: var(--primary); color: #fff;
      border-radius: var(--radius-md); font-weight: 700; font-size: var(--text-sm);
      cursor: pointer; white-space: nowrap;
    }
    .nav-buttons { display: flex; justify-content: space-between; gap: 12px; }

    /* ── Badge SignalR ── */
    .hub-status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); background: var(--secondary); color: var(--secondary-foreground); }
    .hub--connected    { background: var(--success-tint); color: var(--success); }
    .hub--connecting   { background: var(--warning-tint); color: var(--warning-foreground); }
    .hub--disconnected { background: var(--destructive-tint); color: var(--destructive); }
  `],
})
export class GeneratorComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private hubConnection?: signalR.HubConnection;

  readonly currentStep = signal(0);
  readonly assignments = signal<AssignmentSummary[]>([]);
  readonly teachers   = signal<Teacher[]>([]);
  readonly groups     = signal<CourseGroup[]>([]);
  readonly constraints = signal<TeacherConstraint[]>([]);
  readonly groupCount  = computed(() => this.groups().length);
  readonly loadingAssignments = signal(false);
  readonly generating = signal(false);
  readonly generated = signal(false);
  readonly progressPct = signal(0);
  readonly progressMessage = signal('Iniciando...');
  readonly progressLog = signal<StepLog[]>([]);
  readonly totalConflicts = signal(0);
  readonly generationSeconds = signal(0);
  readonly hasConflicts = computed(() => this.totalConflicts() > 0);
  readonly completionWarning = computed(() => this.assignments().some(a => a.completionPct < 100));
  readonly hubStatus = signal<'connected' | 'disconnected' | 'connecting'>('connecting');

  private lastScheduleId = '';

  // Configuración del paso 1
  scheduleType = 'continua';
  morningStart = '09:00';
  slotMinutes = 60;
  breakAfterSlot = 2;
  breakMinutes = 30;
  academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Paso 3
  constraintTeacher = '';
  constraintDay = 1;
  constraintSlot = 0;

  readonly stepLabels = [
    { label: 'Configuración', desc: 'Tipo de jornada y horario' },
    { label: 'Asignaciones',  desc: 'Verificar cobertura curricular' },
    { label: 'Restricciones', desc: 'Disponibilidad de profesores' },
    { label: 'Generar',       desc: 'Lanzar el motor de horarios' },
  ];

  readonly totalRequiredHours = computed(() =>
    this.assignments().reduce((sum, a) => sum + a.requiredHours, 0)
  );

  async ngOnInit(): Promise<void> {
    try {
      const [teachers, groups, constraints] = await Promise.all([
        this.api.getTeachers().catch(() => []),
        this.api.getGroups().catch(() => []),
        this.api.getConstraints().catch(() => []),
      ]);
      this.teachers.set(teachers);
      this.groups.set(groups);
      this.constraints.set(constraints);
      await this.loadAssignments();
      this.setupSignalR();
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error de carga', detail: 'No se pudieron cargar los datos del generador.' });
    }
  }

  ngOnDestroy(): void {
    this.hubConnection?.stop();
  }

  private setupSignalR(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('Progress', (msg: ProgressMessage) => {
      this.progressPct.set(msg.percentage);
      this.progressMessage.set(msg.currentAction);
      this.progressLog.update(log => {
        const existing = log.find(l => l.text === msg.currentAction);
        if (!existing) {
          const updated = log.map(l => ({ ...l, done: true }));
          return [...updated, { text: msg.currentAction, done: false }];
        }
        return log;
      });
    });

    this.hubStatus.set('connecting');
    this.hubConnection.start()
      .then(async () => {
        this.hubStatus.set('connected');
        const user = this.auth.currentUser();
        if (user?.schoolId) {
          await this.hubConnection?.invoke('JoinSchoolGroup', user.schoolId).catch(err => {
            console.error('Error joining school SignalR group:', err);
          });
        }
      })
      .catch(() => {
        this.hubStatus.set('disconnected');
        this.toast.add({ severity: 'warn', summary: 'Canal de progreso desconectado', detail: 'Los avisos en tiempo real no estarán activos, pero la generación funcionará.' });
      });
  }

  private async loadAssignments(): Promise<void> {
    this.loadingAssignments.set(true);
    try {
      const data = await this.api.getAssignments();
      this.assignments.set(data);
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las asignaciones curriculares.' });
    } finally {
      this.loadingAssignments.set(false);
    }
  }

  nextStep(): void {
    if (this.currentStep() < 3) this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    if (this.currentStep() > 0) this.currentStep.update(s => s - 1);
  }

  async addConstraint(): Promise<void> {
    if (!this.constraintTeacher) {
      this.toast.add({ severity: 'warn', summary: 'Falta profesor', detail: 'Por favor, selecciona un profesor para la restricción.' });
      return;
    }
    try {
      await this.api.createConstraint({
        teacherId: this.constraintTeacher,
        constraintType: 'unavailable',
        dayOfWeek: Number(this.constraintDay),
        slotIndex: Number(this.constraintSlot),
        weight: 10,
      });
      const data = await this.api.getConstraints();
      this.constraints.set(data);
      this.toast.add({ severity: 'success', summary: 'Restricción añadida', detail: 'Profesor marcado como no disponible en la franja.' });
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo añadir la restricción.' });
    }
  }

  async removeConstraint(id: string): Promise<void> {
    try {
      await this.api.deleteConstraint(id);
      this.constraints.update(cs => cs.filter(c => c.id !== id));
      this.toast.add({ severity: 'success', summary: 'Restricción eliminada', detail: 'La restricción ha sido removida.' });
    } catch {
      this.toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la restricción.' });
    }
  }

  async generate(): Promise<void> {
    this.generating.set(true);
    this.progressLog.set([{ text: 'Cargando configuración del colegio...', done: false }]);
    this.progressPct.set(0);

    const startTime = performance.now();
    try {
      // Actualizar configuración de jornada
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
      this.totalConflicts.set(result.totalConflicts);
      
      const endTime = performance.now();
      this.generationSeconds.set(Math.max(1, Math.round((endTime - startTime) / 1000)));
      
      this.progressLog.update(log => log.map(l => ({ ...l, done: true })));
      this.generated.set(true);
      this.toast.add({ severity: 'success', summary: 'Horario generado', detail: 'El motor ha terminado con éxito.' });
    } catch (err: any) {
      console.error('Error generando horario:', err);
      this.toast.add({ severity: 'error', summary: 'Error de generación', detail: 'No se pudo completar el horario. Revisa especialistas o aulas.' });
    } finally {
      this.generating.set(false);
    }
  }

  viewSchedule(): void {
    this.router.navigate(['/horarios', this.lastScheduleId]);
  }

  dayName(day: number): string {
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][day - 1] ?? '?';
  }
}
