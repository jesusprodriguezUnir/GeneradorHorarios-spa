import { Component, ChangeDetectionStrategy, input, model, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Teacher, SubjectAllocation, Classroom, TimeSlot, DAYS } from '../../core/models';
import { LecIconComponent } from '../../shared/ui/lec-icon.component';
import {
  ProConstraint, ConstraintTypeDef, GEN_CTYPES, GEN_CAT_ORDER,
} from '../../core/generation.model';

/**
 * Paso 3 — Biblioteca rica de restricciones agrupadas por categoría, con
 * reglas obligatorias (duras) vs. preferencias (blandas) y prioridad.
 */
@Component({
  selector: 'app-step-constraints',
  standalone: true,
  imports: [CommonModule, FormsModule, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="max-width:820px">
      <div class="intro">
        <p style="color:var(--muted-foreground);font-size:var(--text-sm);flex:1;min-width:240px">
          Define reglas en lenguaje natural. Las <b style="color:var(--foreground)">duras</b> son obligatorias;
          las <b style="color:var(--foreground)">preferencias</b> el motor intenta cumplirlas según su prioridad.
        </p>
        <div style="display:flex;gap:8px">
          <span class="lec-badge" style="background:var(--primary-tint);color:var(--primary-strong)"><lec-icon name="lock" [size]="12"></lec-icon> {{ hardCount() }} duras</span>
          <span class="lec-badge" style="background:var(--accent-tint);color:var(--accent-foreground)"><lec-icon name="star" [size]="12"></lec-icon> {{ softCount() }} preferencias</span>
        </div>
      </div>

      <!-- Paleta de tipos -->
      <div class="lec-card" style="padding:14px;margin-bottom:16px">
        @for (cat of cats; track cat) {
          <div style="margin-bottom:10px">
            <div class="cat-label">{{ cat }}</div>
            <div style="display:flex;flex-wrap:wrap;gap:7px">
              @for (ct of typesFor(cat); track ct.id) {
                <button class="palette-btn" (click)="openForm(ct.id)" [attr.data-testid]="'ctype-' + ct.id">
                  <lec-icon [name]="ct.icon" [size]="14"></lec-icon> {{ ct.label }}
                  <lec-icon name="plus" [size]="13" style="opacity:0.5"></lec-icon>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Formulario -->
      @if (formType(); as ftype) {
        <div class="lec-card lec-scale-in form-card">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:12px;display:flex;align-items:center;gap:8px">
            <lec-icon [name]="def(ftype)!.icon" [size]="16"></lec-icon> {{ def(ftype)!.label }}
          </div>

          <div class="sentence">
            @switch (ftype) {
              @case ('no-disp') {
                <span>El docente</span>
                <select [(ngModel)]="fTeacher" class="nl-select">@for (t of teachers(); track t.id) {<option [value]="t.id">{{ t.fullName }}</option>}</select>
                <span>no puede el</span>
                <select [(ngModel)]="fDay" class="nl-select">@for (d of days; track $index) {<option [value]="$index">{{ d }}</option>}</select>
                <select [(ngModel)]="fSlot" class="nl-select"><option value="">todo el día</option>@for (s of lecSlots(); track s.index) {<option [value]="s.index">{{ s.startTime }}–{{ s.endTime }}</option>}</select>
              }
              @case ('turno') {
                <span>El docente</span>
                <select [(ngModel)]="fTeacher" class="nl-select">@for (t of teachers(); track t.id) {<option [value]="t.id">{{ t.fullName }}</option>}</select>
                <span>prefiere</span>
                <select [(ngModel)]="fTurno" class="nl-select"><option value="manana">la mañana</option><option value="tarde">la tarde</option></select>
              }
              @case ('media') {
                <span>El docente</span>
                <select [(ngModel)]="fTeacher" class="nl-select">@for (t of teachers(); track t.id) {<option [value]="t.id">{{ t.fullName }}</option>}</select>
                <span>libra los</span>
                <select [(ngModel)]="fDay" class="nl-select">@for (d of days; track $index) {<option [value]="$index">{{ d }}</option>}</select>
              }
              @case ('dificil') {
                <span>La asignatura</span>
                <select [(ngModel)]="fSubject" class="nl-select">@for (s of hardSubjects(); track s.id) {<option [value]="s.subjectKey">{{ s.subjectName }}</option>}</select>
                <span>preferentemente a</span>
                <select [(ngModel)]="fPos" class="nl-select"><option value="1">1ª hora</option><option value="2">2ª hora</option></select>
              }
              @case ('seguidas') {
                <span>Máximo</span>
                <select [(ngModel)]="fN" class="nl-select"><option [value]="1">1 sesión</option><option [value]="2">2 sesiones</option><option [value]="3">3 sesiones</option></select>
                <span>seguidas de</span>
                <select [(ngModel)]="fSubject" class="nl-select">@for (s of subjects(); track s.id) {<option [value]="s.subjectKey">{{ s.subjectName }}</option>}</select>
              }
              @case ('no-tramo') {
                <span>La asignatura</span>
                <select [(ngModel)]="fSubject" class="nl-select">@for (s of subjects(); track s.id) {<option [value]="s.subjectKey">{{ s.subjectName }}</option>}</select>
                <span>no en el</span>
                <select [(ngModel)]="fPos" class="nl-select"><option value="primero">primer tramo</option><option value="ultimo">último tramo</option></select>
              }
              @case ('aula') {
                <span>La asignatura</span>
                <select [(ngModel)]="fSubject" class="nl-select">@for (s of subjects(); track s.id) {<option [value]="s.subjectKey">{{ s.subjectName }}</option>}</select>
                <span>en</span>
                <select [(ngModel)]="fRoom" class="nl-select">@for (r of specialRooms(); track r.id) {<option [value]="r.id">{{ r.name }}</option>}</select>
              }
              @case ('recreo') {
                <span>Sincronizar recreos</span>
                <select [(ngModel)]="fScope" class="nl-select"><option value="centro">en todo el centro</option><option value="nivel">por nivel</option></select>
              }
              @case ('codoc') {
                <span>Desdoblar</span>
                <select [(ngModel)]="fSubject" class="nl-select">@for (s of subjects(); track s.id) {<option [value]="s.subjectKey">{{ s.subjectName }}</option>}</select>
                <span>en</span>
                <select [(ngModel)]="fGroup" class="nl-select">@for (g of groups(); track g) {<option [value]="g">{{ g }}</option>}</select>
              }
            }
          </div>

          <div class="form-opts">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground)">Tipo</span>
              <div class="seg">
                <button class="seg-btn" [class.seg-btn--on]="fKind() === 'hard'" (click)="fKind.set('hard')"><lec-icon name="lock" [size]="14"></lec-icon> Obligatoria</button>
                <button class="seg-btn" [class.seg-btn--on]="fKind() === 'soft'" (click)="fKind.set('soft')"><lec-icon name="star" [size]="14"></lec-icon> Preferencia</button>
              </div>
            </div>
            @if (fKind() === 'soft') {
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:var(--text-xs);font-weight:700;color:var(--muted-foreground)">Prioridad</span>
                <div style="display:flex;gap:5px">
                  @for (n of [1,2,3]; track n) {
                    <button (click)="fPriority.set(n)" class="prio-dot" [style.background]="n <= fPriority() ? 'var(--accent)' : 'var(--border-strong)'"></button>
                  }
                </div>
              </div>
            }
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
            <button class="btn-ghost" (click)="cancelForm()">Cancelar</button>
            <button class="btn-primary" (click)="save()"><lec-icon name="check" [size]="16"></lec-icon> Añadir regla</button>
          </div>
        </div>
      }

      <!-- Lista de reglas -->
      <div style="display:flex;flex-direction:column;gap:9px" [style.margin-top.px]="formType() ? 16 : 0">
        @for (c of constraints(); track c.id) {
          <div class="lec-card rule-row" [style.border-left]="'3px solid ' + (c.kind === 'hard' ? 'var(--primary)' : 'var(--accent)')">
            <span class="rule-icon" [style.background]="c.kind === 'hard' ? 'var(--primary-tint)' : 'var(--accent-tint)'"
              [style.color]="c.kind === 'hard' ? 'var(--primary-strong)' : 'var(--accent-foreground)'">
              <lec-icon [name]="def(c.type)?.icon || 'ban'" [size]="17"></lec-icon>
            </span>
            <div style="flex:1;font-size:var(--text-sm);line-height:1.45;min-width:0" [innerHTML]="describe(c)"></div>
            @if (c.kind === 'hard') {
              <span class="lec-badge" style="background:var(--primary-tint);color:var(--primary-strong)"><lec-icon name="lock" [size]="12"></lec-icon> Obligatoria</span>
            } @else {
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:10px;color:var(--muted-foreground);font-weight:600">Prioridad</span>
                <div style="display:flex;gap:2px">
                  @for (n of [1,2,3]; track n) {
                    <span class="prio-mini" [style.background]="n <= (c.priority || 2) ? 'var(--accent)' : 'var(--border-strong)'"></span>
                  }
                </div>
              </div>
            }
            <button (click)="remove(c.id)" class="rule-del"><lec-icon name="x" [size]="16"></lec-icon></button>
          </div>
        }
        @if (constraints().length === 0 && !formType()) {
          <div class="empty">Sin reglas. El motor tendrá libertad total.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .intro { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .cat-label { font-size: 10px; font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 7px; }
    .palette-btn { display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-xs); background: var(--surface-2); color: var(--foreground); border: 1px solid var(--border); transition: all .12s; }
    .palette-btn:hover { border-color: var(--primary); color: var(--primary-strong); }
    .form-card { border: 1px solid var(--primary); background: var(--primary-tint); }
    .sentence { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: var(--card); padding: 14px; border-radius: var(--radius-md); font-size: var(--text-sm); line-height: 2.4; }
    .nl-select { padding: 6px 9px; border-radius: var(--radius-sm); border: 1px solid var(--primary); background: var(--primary-tint); color: var(--primary-strong); font-weight: 700; font-size: var(--text-sm); cursor: pointer; outline: none; font-family: var(--font-sans); }
    .form-opts { display: flex; align-items: center; gap: 14px; margin-top: 14px; flex-wrap: wrap; }
    .seg { display: inline-flex; background: var(--secondary); border-radius: var(--radius-md); padding: 3px; gap: 2px; }
    .seg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 600; color: var(--muted-foreground); transition: all .15s; }
    .seg-btn--on { background: var(--card); color: var(--foreground); box-shadow: var(--shadow-xs); }
    .prio-dot { width: 16px; height: 16px; border-radius: 50%; transition: background .12s; }
    .prio-mini { width: 7px; height: 7px; border-radius: 50%; }
    .rule-row { padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
    .rule-icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .rule-del { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground); }
    .rule-del:hover { background: var(--secondary); color: var(--destructive); }
    .empty { text-align: center; padding: 32px; color: var(--muted-foreground); border: 1.5px dashed var(--border-strong); border-radius: var(--radius-lg); }
    .btn-ghost { padding: 10px 16px; background: transparent; color: var(--foreground); border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); }
    .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--primary); color: #fff; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-sm); }
  `],
})
export class StepConstraintsComponent {
  readonly teachers = input<Teacher[]>([]);
  readonly subjects = input<SubjectAllocation[]>([]);
  readonly classrooms = input<Classroom[]>([]);
  readonly groups = input<string[]>([]);
  readonly slots = input<TimeSlot[]>([]);
  readonly constraints = model<ProConstraint[]>([]);

  protected readonly days = DAYS;
  protected readonly cats = GEN_CAT_ORDER;
  protected readonly formType = signal<string | null>(null);

  // estado del formulario
  protected readonly fKind = signal<'hard' | 'soft'>('hard');
  protected readonly fPriority = signal(2);
  fTeacher = '';
  fDay = 4;
  fSlot = '';
  fTurno: 'manana' | 'tarde' = 'manana';
  fSubject = '';
  fN = 2;
  fPos = '1';
  fRoom = '';
  fScope: 'centro' | 'nivel' = 'centro';
  fGroup = '';

  protected readonly hardCount = computed(() => this.constraints().filter(c => c.kind === 'hard').length);
  protected readonly softCount = computed(() => this.constraints().length - this.hardCount());
  protected readonly lecSlots = computed(() => this.slots().filter(s => !s.isBreak));
  protected readonly specialRooms = computed(() => this.classrooms().filter(r => r.classroomType !== 'ordinaria'));
  protected readonly hardSubjects = computed(() => this.subjects().filter(s => ['mat', 'len', 'ing', 'cie'].includes(s.subjectKey)));

  protected typesFor(cat: string): ConstraintTypeDef[] { return GEN_CTYPES.filter(c => c.cat === cat); }
  protected def(id: string): ConstraintTypeDef | undefined { return GEN_CTYPES.find(c => c.id === id); }

  protected openForm(id: string): void {
    const d = this.def(id);
    this.fKind.set(d?.kind ?? 'hard');
    this.fPriority.set(2);
    this.fTeacher = this.teachers()[0]?.id ?? '';
    this.fSubject = this.subjects()[0]?.subjectKey ?? 'mat';
    this.fRoom = this.specialRooms()[0]?.id ?? '';
    this.fGroup = this.groups()[0] ?? '';
    this.formType.set(id);
  }
  protected cancelForm(): void { this.formType.set(null); }

  protected save(): void {
    const type = this.formType();
    if (!type) return;
    const kind = this.fKind();
    const base: ProConstraint = {
      id: Date.now(),
      type,
      kind,
      priority: kind === 'soft' ? this.fPriority() : undefined,
    };
    const params: Partial<ProConstraint> = {
      'no-disp': { teacherId: this.fTeacher, day: +this.fDay, slot: this.fSlot || null },
      'turno': { teacherId: this.fTeacher, turno: this.fTurno },
      'media': { teacherId: this.fTeacher, day: +this.fDay },
      'dificil': { subjectKey: this.fSubject, pos: this.fPos },
      'seguidas': { subjectKey: this.fSubject, n: +this.fN },
      'no-tramo': { subjectKey: this.fSubject, pos: this.fPos },
      'aula': { subjectKey: this.fSubject, roomId: this.fRoom },
      'recreo': { scope: this.fScope },
      'codoc': { subjectKey: this.fSubject, groupId: this.fGroup },
    }[type] ?? {};
    this.constraints.update(cs => [...cs, { ...base, ...params }]);
    this.formType.set(null);
  }

  protected remove(id: number): void {
    this.constraints.update(cs => cs.filter(c => c.id !== id));
  }

  private teacherName(id?: string): string { return this.teachers().find(t => t.id === id)?.fullName ?? '—'; }
  private subjectName(key?: string): string { return this.subjects().find(s => s.subjectKey === key)?.subjectName ?? '—'; }
  private roomName(id?: string): string { return this.classrooms().find(r => r.id === id)?.name ?? '—'; }
  private slotStart(index?: string | null): string {
    if (index == null || index === '') return '';
    return this.slots().find(s => s.index === +index)?.startTime ?? '';
  }

  protected describe(c: ProConstraint): string {
    const b = (s: string) => `<b>${s}</b>`;
    switch (c.type) {
      case 'no-disp': return `${b(this.teacherName(c.teacherId))} no está disponible el ${b(this.days[c.day ?? 0])}${c.slot ? ` a las ${this.slotStart(c.slot)}` : ' (todo el día)'}`;
      case 'turno': return `${b(this.teacherName(c.teacherId))} prefiere clase por la ${b(c.turno === 'tarde' ? 'tarde' : 'mañana')}`;
      case 'media': return `${b(this.teacherName(c.teacherId))} libra los ${b(this.days[c.day ?? 0])} (media jornada)`;
      case 'dificil': return `${b(this.subjectName(c.subjectKey))} preferentemente a ${b(c.pos === '2' ? '2ª' : '1ª')} hora`;
      case 'seguidas': return `No más de ${b(c.n + ' sesiones seguidas')} de ${b(this.subjectName(c.subjectKey))}`;
      case 'no-tramo': return `${b(this.subjectName(c.subjectKey))} nunca en el ${b(c.pos === 'primero' ? 'primer' : 'último')} tramo`;
      case 'aula': return `${b(this.subjectName(c.subjectKey))} debe impartirse en ${b(this.roomName(c.roomId))}`;
      case 'recreo': return `Recreos ${b('sincronizados')} ${c.scope === 'nivel' ? 'por nivel' : 'en todo el centro'}`;
      case 'codoc': return `${b(this.subjectName(c.subjectKey))} con ${b('2 docentes')} en ${b(c.groupId ?? '')} (desdoble)`;
      default: return '';
    }
  }
}
