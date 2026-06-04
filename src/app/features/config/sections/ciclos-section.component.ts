import {
  Component, inject, signal, input, output, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School } from '../../../core/models';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';

export interface CycleRecreo {
  after: number;
  min: number;
}

export interface LocalCycleConfig {
  id: number;
  entrada: string;
  recreos: CycleRecreo[];
}

export interface DayBlock {
  type: 'lectiva' | 'recreo';
  n?: number;
  start: number;
  end: number;
  min: number;
}

const STORAGE_KEY = 'lectivo-cycles-v2';
const ENTRADA_OPTIONS = ['08:30', '09:00', '09:30'];
const RECREO_OPTIONS = [15, 20, 30];

const CYCLE_LABELS: Record<number, { name: string; courses: string }> = {
  1: { name: '1.er ciclo', courses: '1º y 2º' },
  2: { name: '2.º ciclo',  courses: '3º y 4º' },
  3: { name: '3.er ciclo', courses: '5º y 6º' },
};

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'app-ciclos-section',
  standalone: true,
  imports: [CommonModule, FormsModule, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ciclos-section.component.html',
  styleUrls: ['./ciclos-section.component.scss']
})
export class CiclosSectionComponent {
  private readonly api = inject(SchoolsApiService);

  readonly school = input.required<School | null>();
  readonly schoolChange = output<School>();

  readonly cycles = signal<LocalCycleConfig[]>([]);
  readonly savingCycleId = signal<number | null>(null);
  readonly savedCycleId = signal<number | null>(null);
  readonly errorCycleId = signal<number | null>(null);

  readonly entradaOptions = ENTRADA_OPTIONS;
  readonly recreoOptions = RECREO_OPTIONS;

  readonly slotAfterOptions = computed(() => {
    const s = this.school();
    if (!s) return [];
    return Array.from({ length: s.slotsPerDay - 1 }, (_, i) => i + 1);
  });

  constructor() {
    effect(() => {
      const s = this.school();
      if (s) this.initCycles(s);
    });
  }

  private initCycles(s: School): void {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as LocalCycleConfig[] | null;
      if (stored?.length === 3) {
        this.cycles.set(stored);
        return;
      }
    } catch {}

    const defaultCycles: LocalCycleConfig[] = [
      { id: 1, entrada: s.cycles?.find(c => c.cycle === 1)?.morningStart || '09:00', recreos: [{ after: 2, min: 30 }] },
      { id: 2, entrada: s.cycles?.find(c => c.cycle === 2)?.morningStart || '09:00', recreos: [{ after: 3, min: 30 }] },
      { id: 3, entrada: s.cycles?.find(c => c.cycle === 3)?.morningStart || '09:00', recreos: [{ after: 3, min: 20 }] },
    ];
    this.cycles.set(defaultCycles);
    this.saveLocal(defaultCycles);
  }

  private saveLocal(cycles: LocalCycleConfig[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles)); } catch {}
  }

  setCycleEntrada(cycleId: number, entrada: string): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId ? { ...c, entrada } : c);
      this.saveLocal(updated);
      return updated;
    });
  }

  addRecreo(cycleId: number): void {
    const school = this.school();
    if (!school) return;
    this.cycles.update(ccs => {
      const cycle = ccs.find(c => c.id === cycleId);
      if (!cycle) return ccs;
      const usedAfters = new Set(cycle.recreos.map(r => r.after));
      let after = 1;
      for (let i = 1; i < school.slotsPerDay; i++) {
        if (!usedAfters.has(i)) { after = i; break; }
      }
      const updated = ccs.map(c => c.id === cycleId
        ? { ...c, recreos: [...c.recreos, { after, min: 20 }].sort((a, b) => a.after - b.after) }
        : c
      );
      this.saveLocal(updated);
      return updated;
    });
  }

  setRecreoAfter(cycleId: number, idx: number, after: number): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId
        ? { ...c, recreos: c.recreos.map((r, i) => i === idx ? { ...r, after } : r).sort((a, b) => a.after - b.after) }
        : c
      );
      this.saveLocal(updated);
      return updated;
    });
  }

  setRecreoMin(cycleId: number, idx: number, min: number): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId
        ? { ...c, recreos: c.recreos.map((r, i) => i === idx ? { ...r, min } : r) }
        : c
      );
      this.saveLocal(updated);
      return updated;
    });
  }

  delRecreo(cycleId: number, idx: number): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId
        ? { ...c, recreos: c.recreos.filter((_, i) => i !== idx) }
        : c
      );
      this.saveLocal(updated);
      return updated;
    });
  }

  canAddRecreo(cycle: LocalCycleConfig): boolean {
    const s = this.school();
    return !!s && cycle.recreos.length < s.slotsPerDay - 1;
  }

  async saveCycle(cycleId: number): Promise<void> {
    const school = this.school();
    if (!school || this.savingCycleId() !== null) return;

    const localCycle = this.cycles().find(c => c.id === cycleId);
    if (!localCycle) return;

    this.savingCycleId.set(cycleId);
    this.errorCycleId.set(null);
    const endTime = this.computeSalida(localCycle, school);

    try {
      const updated = await this.api.updateCycleSchedule(cycleId, {
        morningStart: localCycle.entrada,
        endTime,
        afternoonStart: null,
      });
      const currentSchool = this.school();
      if (currentSchool) {
        const updatedCycles = currentSchool.cycles.map(c => c.cycle === cycleId ? updated : c);
        this.schoolChange.emit({ ...currentSchool, cycles: updatedCycles });
      }
      this.savedCycleId.set(cycleId);
      setTimeout(() => this.savedCycleId.set(null), 3000);
    } catch {
      this.errorCycleId.set(cycleId);
    } finally {
      this.savingCycleId.set(null);
    }
  }

  // ── Helpers para el template ───────────────────────────────────────────────

  cycleLabel(id: number): string { return CYCLE_LABELS[id]?.name ?? `Ciclo ${id}`; }
  cycleCourses(id: number): string { return CYCLE_LABELS[id]?.courses ?? ''; }

  computeSalida(cycle: LocalCycleConfig, school: School): string {
    let mins = parseTime(cycle.entrada);
    const recreoMap = new Map(cycle.recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= school.slotsPerDay; i++) {
      mins += school.slotMinutes;
      if (recreoMap.has(i)) mins += recreoMap.get(i)!;
    }
    return formatTime(mins);
  }

  getSalidaForCycle(cycleId: number): string {
    const school = this.school();
    const cycle = this.cycles().find(c => c.id === cycleId);
    if (!school || !cycle) return '';
    return this.computeSalida(cycle, school);
  }

  getDayPlan(cycle: LocalCycleConfig, school: School): DayBlock[] {
    const blocks: DayBlock[] = [];
    let mins = parseTime(cycle.entrada);
    const recreoMap = new Map(cycle.recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= school.slotsPerDay; i++) {
      blocks.push({ type: 'lectiva', n: i, start: mins, end: mins + school.slotMinutes, min: school.slotMinutes });
      mins += school.slotMinutes;
      if (recreoMap.has(i)) {
        const rMin = recreoMap.get(i)!;
        blocks.push({ type: 'recreo', start: mins, end: mins + rMin, min: rMin });
        mins += rMin;
      }
    }
    return blocks;
  }

  totalLectiveMin(school: School): number {
    return school.slotsPerDay * school.slotMinutes;
  }

  totalRecreoMin(cycle: LocalCycleConfig): number {
    return cycle.recreos.reduce((a, r) => a + r.min, 0);
  }

  lecHrs(mins: number): string {
    const h = mins / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
  }

  formatTime = formatTime;
}
