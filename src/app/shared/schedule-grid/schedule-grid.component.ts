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
        [style.background]="isConflict() ? 'var(--destructive-tint)' : cellBg()"
        [style.border-color]="isConflict() ? 'var(--destructive)' : 'transparent'"
        [style.color]="cellFg()"
        (click)="editable() && cellClick.emit(entry())">
        <span class="cell-bar" [style.background]="isConflict() ? 'var(--destructive)' : cellBg()"></span>
        <div class="cell-subject">{{ entry()!.subjectShort }}</div>
        <div class="cell-meta">
          <span class="cell-group">{{ entry()!.groupDisplay }}</span>
          @if (entry()!.classroomName) {
            <span class="cell-dot">·</span>
            <span class="cell-classroom">{{ entry()!.classroomName }}</span>
          }
        </div>
        @if (isConflict()) {
          <span class="cell-conflict-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </span>
        }
      </div>
    } @else {
      <div class="cell cell--empty" [class.cell--editable]="editable()"
        (click)="editable() && cellClick.emit(null)">
        @if (editable()) {
          <svg class="cell-plus-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        }
      </div>
    }
  `,
  styles: [`
    .cell {
      position: relative;
      border-radius: 12px;
      border: 1px solid transparent;
      min-height: 64px;
      padding: 10px 10px 8px 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cell--conflict {
      border-color: var(--destructive) !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.12) !important;
    }
    .cell--editable {
      cursor: pointer;
    }
    .cell--editable:hover {
      transform: translateY(-3px) scale(1.01);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
      filter: brightness(1.02);
    }
    .cell-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      opacity: 0.9;
    }
    .cell-subject {
      font-weight: 700;
      font-size: var(--text-sm);
      line-height: 1.15;
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cell-meta {
      font-size: 11px;
      opacity: 0.85;
      margin-top: 4px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .cell-classroom {
      font-weight: 600;
      opacity: 0.75;
    }
    .cell-dot {
      opacity: 0.5;
    }
    .cell-conflict-icon {
      position: absolute;
      top: 6px;
      right: 6px;
    }
    .cell--empty {
      border: 1.5px dashed var(--border);
      background: rgba(15, 23, 42, 0.01);
      color: var(--muted-foreground);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 64px;
      border-radius: 12px;
      transition: all 0.2s ease;
    }
    .cell--empty.cell--editable:hover {
      border-color: var(--primary);
      background: var(--primary-tint);
      color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px oklch(0.45 0.135 272 / 0.10);
    }
    .cell-plus-icon {
      opacity: 0.4;
      transition: opacity 0.2s, transform 0.2s;
    }
    .cell--empty.cell--editable:hover .cell-plus-icon {
      opacity: 1;
      transform: scale(1.15) rotate(90deg);
    }
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
        <!-- Tabs de días (Móvil) -->
        <div class="mobile-days-bar">
          @for (day of days; track $index) {
            <button (click)="selectedDay.set($index)"
              class="mobile-day-btn"
              [class.mobile-day-btn--active]="selectedDay() === $index">
              {{ daysShort[$index] }}
            </button>
          }
        </div>

        <!-- Slots del día seleccionado -->
        <div style="display:flex;flex-direction:column;gap:10px">
          @for (slot of lectiveSlots(); track slot.index) {
            @if (slot.index === breakAfterIndex()) {
              <div style="display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:stretch">
                <div class="time-slot-card" style="border-right-style: dashed;height:38px">
                  <span class="time-start" style="color:var(--muted-foreground);font-size:var(--text-xs)">{{ breakSlot()?.startTime }}</span>
                </div>
                <div class="recreo-band-premium" style="font-size:10px">
                  <svg class="recreo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                  <span>RECREO · {{ breakSlot()?.startTime }} – {{ breakSlot()?.endTime }}</span>
                </div>
              </div>
            }
            <div style="display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:stretch">
              <div class="time-slot-card">
                <span class="time-start">{{ slot.startTime }}</span>
                <span class="time-end">{{ slot.endTime }}</span>
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
        <div style="min-width:720px; padding: 4px 0">
          <div style="display:grid;grid-template-columns:80px repeat(5, 1fr);gap:10px;margin-bottom:12px">
            <div></div>
            @for (day of days; track $index) {
              <div class="day-header-pill">
                <span class="day-header-short">{{ daysShort[$index] }}</span>
                <span class="day-header-full">{{ day }}</span>
              </div>
            }
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            @for (slot of lectiveSlots(); track slot.index) {
              @if (slot.index === breakAfterIndex()) {
                <div style="display:grid;grid-template-columns:80px repeat(5, 1fr);gap:10px">
                  <div class="time-slot-card" style="border-right-style: dashed;">
                    <span class="time-start" style="color:var(--muted-foreground)">{{ breakSlot()?.startTime }}</span>
                    <span class="time-end">{{ breakSlot()?.endTime }}</span>
                  </div>
                  <div class="recreo-band-premium" style="grid-column:span 5">
                    <svg class="recreo-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                    <span>RECREO ESCOLAR</span>
                    <span style="opacity:0.6;font-weight:500">•</span>
                    <span style="font-weight:700">{{ breakSlot()?.startTime }} – {{ breakSlot()?.endTime }}</span>
                  </div>
                </div>
              }
              <div style="display:grid;grid-template-columns:80px repeat(5, 1fr);gap:10px">
                <div class="time-slot-card">
                  <span class="time-start">{{ slot.startTime }}</span>
                  <span class="time-end">{{ slot.endTime }}</span>
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
    .recreo-band-premium {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(90deg, oklch(0.45 0.135 272 / 0.04) 0%, oklch(0.45 0.135 272 / 0.01) 50%, oklch(0.45 0.135 272 / 0.04) 100%);
      border: 1.5px dashed var(--border-strong);
      border-radius: 12px;
      color: var(--muted-foreground);
      font-weight: 800;
      font-size: 11px;
      padding: 10px 0;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.01);
    }
    .recreo-icon {
      color: var(--primary);
      animation: nudge 2.5s ease-in-out infinite;
    }
    @keyframes nudge {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    .day-header-pill {
      text-align: center;
      font-weight: 800;
      font-size: var(--text-xs);
      padding: 12px 4px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--foreground);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-xs);
    }
    .day-header-short {
      display: none;
    }
    .day-header-full {
      display: inline;
    }
    @media (max-width: 900px) {
      .day-header-short { display: inline; }
      .day-header-full { display: none; }
    }
    .time-slot-card {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      padding-right: 12px;
      border-right: 2px solid var(--border);
      position: relative;
    }
    .time-slot-card::after {
      content: '';
      position: absolute;
      right: -5px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: var(--border-strong);
      border: 2px solid var(--card);
      border-radius: 50%;
      z-index: 10;
    }
    .time-start {
      font-weight: 800;
      font-size: var(--text-sm);
      color: var(--foreground);
      font-variant-numeric: tabular-nums;
    }
    .time-end {
      font-size: 11px;
      color: var(--muted-foreground);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      margin-top: 1px;
    }
    .mobile-days-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      background: var(--secondary);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .mobile-day-btn {
      flex: 1;
      min-width: 0;
      padding: 10px 4px;
      border-radius: 8px;
      font-weight: 800;
      font-size: var(--text-xs);
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mobile-day-btn--active {
      background: var(--card);
      color: var(--primary);
      box-shadow: var(--shadow-sm);
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
