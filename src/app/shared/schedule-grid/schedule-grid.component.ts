import {
  Component, input, output, computed, signal, ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ScheduleGridEntry, TimeSlot, ScheduleConflict,
  DAYS, DAYS_SHORT, SUBJECT_COLORS
} from '../../core/models';
import { DeviceService } from '../../core/device.service';

export interface CellClickEvent {
  dayOfWeek: number;
  slotIndex: number;
  entry: ScheduleGridEntry | null;
}

// ── ScheduleCell — debe declararse ANTES de ScheduleGrid que lo importa ───────

@Component({
  selector: 'app-schedule-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry()) {
      <div class="cell"
        [class.cell--conflict]="isConflict()"
        [class.cell--editable]="editable()"
        [style.background]="cellBg()"
        [style.color]="cellFg()"
        (click)="editable() && cellClick.emit(entry())">
        <span class="cell-bar" [style.background]="isConflict() ? 'var(--destructive)' : cellFg()"></span>
        <div class="cell-subject">{{ entry()!.subjectShort }}</div>
        <div class="cell-meta">
          <span>{{ entry()!.groupDisplay }}</span>
          @if (entry()!.classroomName) {
            <span style="opacity:0.5">·</span>
            <span>{{ entry()!.classroomName }}</span>
          }
        </div>
        @if (isConflict()) {
          <span class="cell-conflict-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" stroke-width="2.25">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </span>
        }
      </div>
    } @else {
      <div class="cell cell--empty" [class.cell--editable]="editable()"
        (click)="editable() && cellClick.emit(null)">
        @if (editable()) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        }
      </div>
    }
  `,
  styles: [`
    .cell {
      position: relative; border-radius: var(--radius-sm);
      min-height: 62px; padding: 8px 10px 8px 13px;
      overflow: hidden; transition: transform .12s, box-shadow .15s;
    }
    .cell--empty {
      border: 1.5px dashed var(--border-strong); background: var(--surface-2);
      color: var(--muted-foreground); display: flex; align-items: center; justify-content: center;
      min-height: 62px; border-radius: var(--radius-sm);
    }
    .cell--editable { cursor: pointer; }
    .cell--editable:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .cell--conflict { box-shadow: inset 0 0 0 1.5px var(--destructive); }
    .cell-bar { position: absolute; left: 0; top: 6px; bottom: 6px; width: 4px; border-radius: 99px; opacity: 0.65; }
    .cell--conflict .cell-bar { opacity: 1; }
    .cell-subject { font-weight: 700; font-size: var(--text-sm); line-height: 1.15; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cell-meta { font-size: var(--text-xs); opacity: 0.82; margin-top: 2px; font-weight: 500; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .cell-conflict-icon { position: absolute; top: 6px; right: 6px; }
  `],
})
export class ScheduleCellComponent {
  readonly entry = input<ScheduleGridEntry | null>(null);
  readonly isConflict = input(false);
  readonly editable = input(false);
  readonly dense = input(false);
  readonly cellClick = output<ScheduleGridEntry | null>();

  readonly cellBg = computed(() => {
    if (!this.entry()) return 'var(--surface-2)';
    if (this.isConflict()) return 'var(--destructive-tint)';
    const key = this.entry()!.subjectKey;
    return SUBJECT_COLORS[key]?.bg ?? SUBJECT_COLORS['tut'].bg;
  });

  readonly cellFg = computed(() => {
    if (!this.entry()) return 'var(--muted-foreground)';
    if (this.isConflict()) return 'var(--destructive)';
    const key = this.entry()!.subjectKey;
    return SUBJECT_COLORS[key]?.fg ?? SUBJECT_COLORS['tut'].fg;
  });
}

// ── ScheduleGrid ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-schedule-grid',
  standalone: true,
  imports: [CommonModule, ScheduleCellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isMobile()) {
      <!-- ── MÓVIL: un día a la vez ─────────────────────────────────────────── -->
      <div>
        <!-- Tabs de días -->
        <div style="display:flex;gap:6px;margin-bottom:12px">
          @for (day of days; track $index) {
            <button (click)="selectedDay.set($index)"
              style="flex:1;min-width:0;padding:9px 4px;border-radius:var(--radius-md);
                font-weight:700;font-size:var(--text-sm);transition:all .15s;cursor:pointer;"
              [style.background]="selectedDay() === $index ? 'var(--primary)' : 'var(--card)'"
              [style.color]="selectedDay() === $index ? '#fff' : 'var(--muted-foreground)'"
              [style.border]="'1px solid ' + (selectedDay() === $index ? 'var(--primary)' : 'var(--border)')">
              {{ daysShort[$index] }}
            </button>
          }
        </div>

        <!-- Slots del día seleccionado -->
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (slot of lectiveSlots(); track slot.index) {
            @if (slot.index === breakAfterIndex()) {
              <div class="recreo-band">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                </svg>
                RECREO · {{ breakSlot()?.startTime }} – {{ breakSlot()?.endTime }}
              </div>
            }
            <div style="display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:stretch">
              <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;line-height:1.2">
                <span style="font-weight:700;font-size:var(--text-sm);font-variant-numeric:tabular-nums">{{ slot.startTime }}</span>
                <span style="font-size:11px;color:var(--muted-foreground);font-variant-numeric:tabular-nums">{{ slot.endTime }}</span>
              </div>
              <app-schedule-cell
                [entry]="getCellEntry(selectedDay(), slot.index)"
                [isConflict]="isConflict(selectedDay(), slot.index)"
                [editable]="editable()"
                (cellClick)="onCellClick(selectedDay(), slot.index, $event)" />
            </div>
          }
        </div>
      </div>
    } @else {
      <!-- ── ESCRITORIO: semana completa ────────────────────────────────────── -->
      <div class="thin-scroll" style="overflow-x:auto">
        <div style="min-width:720px">
          <div style="display:grid;grid-template-columns:64px repeat(5, 1fr);gap:8px;margin-bottom:8px">
            <div></div>
            @for (day of days; track $index) {
              <div style="text-align:center;font-weight:700;font-size:var(--text-sm);padding:4px 0">{{ day }}</div>
            }
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            @for (slot of lectiveSlots(); track slot.index) {
              @if (slot.index === breakAfterIndex()) {
                <div style="display:grid;grid-template-columns:64px repeat(5, 1fr);gap:8px">
                  <div></div>
                  <div class="recreo-band" style="grid-column:span 5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                    RECREO · {{ breakSlot()?.startTime }} – {{ breakSlot()?.endTime }}
                  </div>
                </div>
              }
              <div style="display:grid;grid-template-columns:64px repeat(5, 1fr);gap:8px">
                <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;line-height:1.2">
                  <span style="font-weight:700;font-size:var(--text-sm);font-variant-numeric:tabular-nums">{{ slot.startTime }}</span>
                  <span style="font-size:11px;color:var(--muted-foreground);font-variant-numeric:tabular-nums">{{ slot.endTime }}</span>
                </div>
                @for (day of days; track $index) {
                  <app-schedule-cell
                    [entry]="getCellEntry($index, slot.index)"
                    [isConflict]="isConflict($index, slot.index)"
                    [editable]="editable()"
                    [dense]="true"
                    (cellClick)="onCellClick($index, slot.index, $event)" />
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .recreo-band {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--secondary); border-radius: var(--radius-sm);
      color: var(--muted-foreground); font-weight: 600; font-size: var(--text-xs);
      padding: 7px 0; letter-spacing: 0.03em;
    }
  `],
})
export class ScheduleGridComponent {
  readonly entries = input<ScheduleGridEntry[]>([]);
  readonly slots = input<TimeSlot[]>([]);
  readonly conflicts = input<ScheduleConflict[]>([]);
  readonly editable = input(false);
  readonly cellClick = output<CellClickEvent>();

  protected readonly selectedDay = signal(0);
  protected readonly device = inject(DeviceService);
  protected readonly isMobile = this.device.isMobile;
  protected readonly days = DAYS;
  protected readonly daysShort = DAYS_SHORT;

  protected readonly lectiveSlots = computed(() =>
    this.slots().filter(s => !s.isBreak)
  );
  protected readonly breakSlot = computed(() =>
    this.slots().find(s => s.isBreak)
  );
  protected readonly breakAfterIndex = computed(() => {
    const allSlots = this.slots();
    let lectiveCount = 0;
    for (const s of allSlots) {
      if (s.isBreak) return lectiveCount;
      lectiveCount++;
    }
    return 2;
  });
  protected readonly entryMap = computed(() => {
    const map = new Map<string, ScheduleGridEntry>();
    for (const e of this.entries()) {
      map.set(`${e.dayOfWeek - 1}-${e.slotIndex}`, e);
    }
    return map;
  });
  protected readonly conflictSet = computed(() => {
    const set = new Set<string>();
    for (const c of this.conflicts()) {
      if (c.dayOfWeek !== null && c.slotIndex !== null) {
        set.add(`${c.dayOfWeek - 1}-${c.slotIndex}`);
      }
    }
    return set;
  });

  protected getCellEntry(dayIndex: number, slotIndex: number): ScheduleGridEntry | null {
    return this.entryMap().get(`${dayIndex}-${slotIndex}`) ?? null;
  }
  protected isConflict(dayIndex: number, slotIndex: number): boolean {
    return this.conflictSet().has(`${dayIndex}-${slotIndex}`);
  }
  protected onCellClick(dayIndex: number, slotIndex: number, entry: ScheduleGridEntry | null): void {
    if (!this.editable()) return;
    this.cellClick.emit({ dayOfWeek: dayIndex + 1, slotIndex, entry });
  }
}
