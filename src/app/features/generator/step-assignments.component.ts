import { Component, ChangeDetectionStrategy, inject, input, model, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Teacher, CourseGroup, SubjectAllocation } from '../../core/models';
import { DeviceService } from '../../core/device.service';
import { LecIconComponent } from '../../shared/ui/lec-icon.component';
import { GpRingComponent } from '../../shared/ui/gp-ring.component';

export type AssignmentMap = Record<string, string | null>;

export function asgKey(allocId: string, groupId: string): string {
  return allocId + '_' + groupId;
}

interface CellRef { allocId: string; groupId: string; }

/**
 * Paso 2 — Matriz profesor × grupo editable, con detección de sobrecarga,
 * autocompletado sugerido y rail de carga docente.
 */
@Component({
  selector: 'app-step-assignments',
  standalone: true,
  imports: [CommonModule, LecIconComponent, GpRingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Banda resumen -->
    <div class="summary-band">
      <div class="lec-card sum-card">
        <gp-ring [value]="completion().pct" [size]="52"></gp-ring>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:var(--text-base)">{{ completion().pct }}% asignado</div>
          <div style="font-size:var(--text-xs);color:var(--muted-foreground)">
            {{ completion().filled }} de {{ completion().total }} celdas · {{ completion().total - completion().filled }} sin docente
          </div>
        </div>
      </div>
      <div class="lec-card sum-card">
        <span class="sum-icon" [style.background]="overloaded() ? 'var(--destructive-tint)' : 'var(--success-tint)'"
          [style.color]="overloaded() ? 'var(--destructive)' : 'var(--success)'">
          <lec-icon [name]="overloaded() ? 'alert' : 'checkCircle'" [size]="20"></lec-icon>
        </span>
        <div>
          <div style="font-weight:800;font-size:var(--text-base)">
            {{ overloaded() === 0 ? 'Sin sobrecargas' : overloaded() + (overloaded() > 1 ? ' docentes al límite' : ' docente al límite') }}
          </div>
          <div style="font-size:var(--text-xs);color:var(--muted-foreground)">Carga vs. máximo lectivo</div>
        </div>
      </div>
      <button class="btn-secondary sum-action" (click)="autocomplete()" data-testid="autocomplete-button">
        <lec-icon name="wand" [size]="17"></lec-icon> Autocompletar sugeridos
      </button>
    </div>

    <!-- Matriz -->
    <div class="lec-card" style="padding:0;overflow:hidden">
      <div class="thin-scroll" style="overflow-x:auto">
        <div [style.min-width.px]="subW() + 96 * groups().length">
          <!-- cabecera -->
          <div class="matrix-row matrix-head" [style.grid-template-columns]="gridCols()">
            <div class="matrix-corner">Asignatura</div>
            @for (g of groups(); track g.id) {
              <div class="matrix-ghead">
                <div class="group-chip">{{ g.displayName }}</div>
                <div style="font-size:10px;color:var(--muted-foreground);margin-top:4px">{{ g.studentCount }} al.</div>
              </div>
            }
          </div>
          <!-- filas -->
          @for (s of subjects(); track s.id; let ri = $index) {
            <div class="matrix-row" [style.grid-template-columns]="gridCols()" [class.matrix-row--bordered]="ri > 0">
              <div class="matrix-subj">
                <span class="subj-icon" [style.background]="'var(--subj-' + s.subjectKey + ')'" [style.color]="'var(--subj-' + s.subjectKey + '-fg)'">
                  <lec-icon name="bookOpen" [size]="15"></lec-icon>
                </span>
                <div style="min-width:0">
                  <div style="font-weight:600;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ s.subjectShort }}</div>
                  <div style="font-size:10px;color:var(--muted-foreground)">{{ s.weeklyHoursDefault }}h/sem</div>
                </div>
              </div>
              @for (g of groups(); track g.id) {
                <button class="matrix-cell" [class.matrix-cell--empty]="!teacherFor(s.id, g.id)"
                  (click)="open(s.id, g.id)" [attr.data-testid]="'cell-' + s.subjectKey + '-' + g.id">
                  @if (teacherFor(s.id, g.id); as t) {
                    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;position:relative">
                      <span class="avatar" [style.background]="'var(--subj-' + t.colorKey + ')'" [style.color]="'var(--subj-' + t.colorKey + '-fg)'">{{ initials(t) }}</span>
                      <span style="font-size:10px;color:var(--muted-foreground);font-weight:600">{{ firstName(t) }}</span>
                      @if (isOver(t.id)) {
                        <span style="position:absolute;top:-4px;right:-8px;color:var(--destructive)"><lec-icon name="alert" [size]="13"></lec-icon></span>
                      }
                    </div>
                  } @else {
                    <span class="cell-plus"><lec-icon name="plus" [size]="16"></lec-icon></span>
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Rail de carga docente -->
    <div style="font-weight:700;font-size:var(--text-sm);margin:20px 0 10px;display:flex;align-items:center;gap:8px">
      <lec-icon name="activity" [size]="16" style="color:var(--primary)"></lec-icon> Carga docente
    </div>
    <div class="load-rail">
      @for (t of teachers(); track t.id) {
        <div class="lec-card load-card" [style.border-color]="loadOf(t.id) > t.maxWeeklyHours ? 'var(--destructive)' : 'var(--border)'">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px">
            <span class="avatar" [style.background]="'var(--subj-' + t.colorKey + ')'" [style.color]="'var(--subj-' + t.colorKey + '-fg)'">{{ initials(t) }}</span>
            <div style="min-width:0;flex:1">
              <div style="font-weight:600;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ t.fullName }}</div>
              <div style="font-size:10px;font-weight:700" [style.color]="loadStatus(t).c">{{ loadStatus(t).l }}</div>
            </div>
            <span style="font-size:var(--text-xs);font-weight:800;white-space:nowrap" [style.color]="loadStatus(t).c">{{ loadOf(t.id) }}/{{ t.maxWeeklyHours }}h</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" [style.width.%]="loadPct(t)" [style.background]="loadStatus(t).c"></div>
          </div>
        </div>
      }
    </div>

    <!-- Modal de asignación -->
    @if (cell(); as c) {
      <div class="modal-backdrop lec-fade" (click)="close()">
        <div class="modal-card lec-scale-in" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 style="font-size:var(--text-lg);font-weight:700">Asignar docente</h3>
            <button (click)="close()" style="color:var(--muted-foreground);padding:4px;display:flex"><lec-icon name="x" [size]="20"></lec-icon></button>
          </div>
          <div class="modal-body">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
              <span class="subj-icon" [style.background]="'var(--subj-' + alloc(c.allocId)!.subjectKey + ')'" [style.color]="'var(--subj-' + alloc(c.allocId)!.subjectKey + '-fg)'">
                <lec-icon name="bookOpen" [size]="15"></lec-icon>
              </span>
              <span style="font-weight:700">{{ alloc(c.allocId)!.subjectName }}</span>
              <span style="color:var(--muted-foreground)">·</span>
              <span class="lec-badge" style="background:var(--primary-tint);color:var(--primary-strong)">{{ groupName(c.groupId) }}</span>
              <span style="margin-left:auto;font-size:var(--text-xs);color:var(--muted-foreground)">{{ alloc(c.allocId)!.weeklyHoursDefault }}h/sem</span>
            </div>
            <div class="thin-scroll teacher-list">
              @for (t of ranked(c); track t.id) {
                <button class="teacher-opt" [class.teacher-opt--sel]="assignments()[key(c)] === t.id" (click)="pick(c, t.id)">
                  <span class="avatar avatar--lg" [style.background]="'var(--subj-' + t.colorKey + ')'" [style.color]="'var(--subj-' + t.colorKey + '-fg)'">{{ initials(t) }}</span>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:7px">
                      <span style="font-weight:600;font-size:var(--text-sm)">{{ t.fullName }}</span>
                      @if (canTeach(t, alloc(c.allocId)!)) {
                        <span class="lec-badge" style="background:var(--success-tint);color:var(--success)"><lec-icon name="star" [size]="12"></lec-icon> Especialista</span>
                      }
                    </div>
                    <div style="font-size:11px;color:var(--muted-foreground);margin-top:1px">{{ roleOf(t) }}</div>
                    <div style="margin-top:6px;display:flex;align-items:center;gap:8px">
                      <div style="flex:1;max-width:130px" class="bar-track">
                        <div class="bar-fill" [style.width.%]="Math.min(100, loadOf(t.id)/t.maxWeeklyHours*100)"
                          [style.background]="wouldOver(c, t) ? 'var(--destructive)' : 'var(--primary)'"></div>
                      </div>
                      <span style="font-size:10px;font-weight:700" [style.color]="wouldOver(c, t) ? 'var(--destructive)' : 'var(--muted-foreground)'">{{ loadOf(t.id) }}/{{ t.maxWeeklyHours }}h</span>
                    </div>
                  </div>
                  @if (assignments()[key(c)] === t.id) {
                    <lec-icon name="check" [size]="18" [stroke]="2.5" style="color:var(--primary)"></lec-icon>
                  } @else if (wouldOver(c, t)) {
                    <span title="Excedería su máximo" style="color:var(--destructive)"><lec-icon name="alert" [size]="16"></lec-icon></span>
                  }
                </button>
              }
            </div>
            @if (assignments()[key(c)]) {
              <button (click)="pick(c, null)" style="margin-top:12px;display:flex;align-items:center;gap:8px;color:var(--destructive);font-size:var(--text-sm);font-weight:600;padding:8px 4px">
                <lec-icon name="x" [size]="16"></lec-icon> Quitar asignación
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .summary-band { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: stretch; }
    .sum-card { flex: 1 1 240px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
    .sum-icon { width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .sum-action { align-self: center; }

    .matrix-row { display: grid; align-items: stretch; }
    .matrix-head { border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card); z-index: 2; }
    .matrix-row--bordered { border-top: 1px solid var(--border); }
    .matrix-corner { padding: 12px 16px; font-size: var(--text-xs); font-weight: 700; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; align-self: center; }
    .matrix-ghead { padding: 10px 4px; text-align: center; border-left: 1px solid var(--border); }
    .group-chip { width: 38px; min-width: 38px; padding: 0 4px; height: 34px; border-radius: 9px; background: var(--primary-tint); color: var(--primary-strong); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: var(--text-sm); margin: 0 auto; }
    .matrix-subj { display: flex; align-items: center; gap: 10px; padding: 8px 16px; min-width: 0; }
    .subj-icon { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .matrix-cell { border-left: 1px solid var(--border); min-height: 56px; padding: 6px; display: flex; align-items: center; justify-content: center; background: transparent; transition: background .12s; cursor: pointer; }
    .matrix-cell:hover { background: var(--surface-2); }
    .matrix-cell--empty { background: var(--warning-tint); }
    .matrix-cell--empty:hover { background: var(--warning-tint); }
    .cell-plus { width: 30px; height: 30px; border-radius: 50%; border: 1.5px dashed var(--warning); color: oklch(0.55 0.12 65); display: flex; align-items: center; justify-content: center; }
    .avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
    .avatar--lg { width: 36px; height: 36px; font-size: 13px; }

    .load-rail { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
    .load-card { padding: 11px 13px; }
    .bar-track { background: var(--muted); border-radius: 99px; height: 6px; overflow: hidden; width: 100%; }
    .bar-fill { height: 100%; border-radius: 99px; transition: width .5s cubic-bezier(0.22,1,0.36,1); }

    .modal-backdrop { position: fixed; inset: 0; z-index: 80; background: oklch(0.2 0.02 255 / 0.45); display: flex; align-items: flex-end; justify-content: center; }
    .modal-card { background: var(--card); border-radius: 20px 20px 0 0; width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-lg); }
    @media (min-width: 600px) { .modal-backdrop { align-items: center; } .modal-card { border-radius: 20px; } }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card); z-index: 2; }
    .modal-body { padding: 20px; }
    .teacher-list { display: flex; flex-direction: column; gap: 7px; max-height: 46vh; overflow-y: auto; }
    .teacher-opt { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: var(--radius-md); text-align: left; border: 1px solid var(--border); background: var(--card); transition: all .12s; }
    .teacher-opt:hover { border-color: var(--border-strong); }
    .teacher-opt--sel { border-color: var(--primary); background: var(--primary-tint); }
  `],
})
export class StepAssignmentsComponent {
  private readonly device = inject(DeviceService);
  protected readonly Math = Math;

  readonly teachers = input<Teacher[]>([]);
  readonly groups = input<CourseGroup[]>([]);
  readonly subjects = input<SubjectAllocation[]>([]);
  readonly assignments = model<AssignmentMap>({});

  protected readonly cell = signal<CellRef | null>(null);

  protected readonly subW = computed(() => this.device.isMobile() ? 140 : 176);
  protected readonly gridCols = computed(() => `${this.subW()}px repeat(${this.groups().length}, 96px)`);

  protected readonly loads = computed<Record<string, number>>(() => {
    const a = this.assignments();
    const loads: Record<string, number> = {};
    for (const t of this.teachers()) loads[t.id] = 0;
    for (const s of this.subjects()) {
      for (const g of this.groups()) {
        const tid = a[asgKey(s.id, g.id)];
        if (tid && loads[tid] != null) loads[tid] += s.weeklyHoursDefault;
      }
    }
    return loads;
  });

  protected readonly completion = computed(() => {
    const a = this.assignments();
    const total = this.subjects().length * this.groups().length;
    let filled = 0;
    for (const s of this.subjects()) for (const g of this.groups()) if (a[asgKey(s.id, g.id)]) filled++;
    return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
  });

  protected readonly overloaded = computed(() => {
    const loads = this.loads();
    return this.teachers().filter(t => loads[t.id] > t.maxWeeklyHours).length;
  });

  protected key(c: CellRef): string { return asgKey(c.allocId, c.groupId); }
  protected loadOf(tid: string): number { return this.loads()[tid] ?? 0; }
  protected isOver(tid: string): boolean {
    const t = this.teachers().find(x => x.id === tid);
    return !!t && this.loadOf(tid) > t.maxWeeklyHours;
  }
  protected loadPct(t: Teacher): number { return Math.min(100, (this.loadOf(t.id) / t.maxWeeklyHours) * 100); }

  protected alloc(id: string): SubjectAllocation | undefined { return this.subjects().find(s => s.id === id); }
  protected groupName(id: string): string { return this.groups().find(g => g.id === id)?.displayName ?? ''; }

  protected teacherFor(allocId: string, groupId: string): Teacher | undefined {
    const tid = this.assignments()[asgKey(allocId, groupId)];
    return tid ? this.teachers().find(t => t.id === tid) : undefined;
  }

  protected initials(t: Teacher): string {
    return t.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  protected firstName(t: Teacher): string { return t.fullName.split(/\s+/)[0]; }
  protected roleOf(t: Teacher): string {
    return t.specialties?.length ? t.specialties[0] : 'Docente';
  }

  /** Heurística de capacidad: generalistas dan troncales; especialistas, su materia. */
  protected canTeach(t: Teacher, alloc: SubjectAllocation): boolean {
    const sp = (t.specialties ?? []).map(s => s.toLowerCase());
    const generalist = sp.some(s => s.includes('general') || s.includes('primaria') || s.includes('infantil'));
    const core = ['mat', 'len', 'soc', 'cie', 'tut'];
    if (generalist && core.includes(alloc.subjectKey)) return true;
    const name = alloc.subjectName.toLowerCase();
    const shortFirst = alloc.subjectShort.toLowerCase().split(/\s+/)[0];
    return sp.some(s => name.includes(s) || s.includes(shortFirst));
  }

  protected loadStatus(t: Teacher): { c: string; l: string } {
    const load = this.loadOf(t.id);
    const ratio = load / t.maxWeeklyHours;
    if (load > t.maxWeeklyHours) return { c: 'var(--destructive)', l: 'Sobrecargado' };
    if (ratio >= 1) return { c: 'var(--success)', l: 'Completo' };
    if (ratio >= 0.84) return { c: 'oklch(0.45 0.11 65)', l: 'Casi completo' };
    return { c: 'var(--muted-foreground)', l: 'Con margen' };
  }

  protected ranked(c: CellRef): Teacher[] {
    const alloc = this.alloc(c.allocId);
    if (!alloc) return this.teachers();
    const loads = this.loads();
    return [...this.teachers()].sort((a, b) => {
      const ra = this.canTeach(a, alloc) ? 0 : 1;
      const rb = this.canTeach(b, alloc) ? 0 : 1;
      return ra - rb || (loads[a.id] ?? 0) - (loads[b.id] ?? 0);
    });
  }

  protected wouldOver(c: CellRef, t: Teacher): boolean {
    const alloc = this.alloc(c.allocId);
    if (!alloc) return false;
    const sel = this.assignments()[this.key(c)] === t.id;
    return this.loadOf(t.id) + (sel ? 0 : alloc.weeklyHoursDefault) > t.maxWeeklyHours;
  }

  protected open(allocId: string, groupId: string): void { this.cell.set({ allocId, groupId }); }
  protected close(): void { this.cell.set(null); }
  protected pick(c: CellRef, tid: string | null): void {
    this.assignments.update(a => ({ ...a, [this.key(c)]: tid }));
    this.close();
  }

  protected autocomplete(): void {
    this.assignments.update(a => {
      const next = { ...a };
      const live: Record<string, number> = {};
      for (const t of this.teachers()) live[t.id] = 0;
      // recompute live loads from current map
      for (const s of this.subjects()) for (const g of this.groups()) {
        const tid = next[asgKey(s.id, g.id)];
        if (tid && live[tid] != null) live[tid] += s.weeklyHoursDefault;
      }
      for (const s of this.subjects()) {
        for (const g of this.groups()) {
          const k = asgKey(s.id, g.id);
          if (next[k]) continue;
          const eligible = this.teachers().filter(t => this.canTeach(t, s));
          const pool = eligible.length ? eligible : this.teachers();
          const fits = pool.filter(t => live[t.id] + s.weeklyHoursDefault <= t.maxWeeklyHours);
          const pick = (fits.length ? fits : pool).sort((x, y) => live[x.id] - live[y.id])[0];
          if (pick) { next[k] = pick.id; live[pick.id] += s.weeklyHoursDefault; }
        }
      }
      return next;
    });
  }
}
