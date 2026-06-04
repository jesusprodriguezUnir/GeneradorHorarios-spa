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
  /** Hora de salida oficial (editada por el usuario). Se envía al backend como endTime. */
  salida: string;
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
        // Retrocompatibilidad: configs antiguas (v2 sin campo salida) la calculamos aquí
        const migrated = stored.map(c => ({
          ...c,
          salida: c.salida ?? this.computeSalida(c, s),
        }));
        this.cycles.set(migrated);
        return;
      }
    } catch { /* localStorage no disponible o JSON inválido — se generan los defaults */ }

    const defaultCycles: LocalCycleConfig[] = [1, 2, 3].map(id => {
      const backend = s.cycles?.find(c => c.cycle === id);
      const entrada = backend?.morningStart || '09:00';
      const recreosPorDefecto: CycleRecreo[] = id === 1
        ? [{ after: 2, min: 30 }]
        : id === 2
          ? [{ after: 3, min: 30 }]
          : [{ after: 3, min: 20 }];
      const salidaCalculada = this.computeSalidaRaw(entrada, recreosPorDefecto, s);
      return {
        id,
        entrada,
        salida: backend?.endTime || salidaCalculada,
        recreos: recreosPorDefecto,
      };
    });
    this.cycles.set(defaultCycles);
    this.saveLocal(defaultCycles);
  }

  private saveLocal(cycles: LocalCycleConfig[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles)); } catch { /* localStorage no disponible */ }
  }

  setCycleEntrada(cycleId: number, entrada: string): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId ? { ...c, entrada } : c);
      this.saveLocal(updated);
      return updated;
    });
  }

  setCycleSalida(cycleId: number, salida: string): void {
    this.cycles.update(ccs => {
      const updated = ccs.map(c => c.id === cycleId ? { ...c, salida } : c);
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

    // Validación: la salida debe ser posterior a la entrada
    if (parseTime(localCycle.salida) <= parseTime(localCycle.entrada)) {
      this.errorCycleId.set(cycleId);
      return;
    }

    this.savingCycleId.set(cycleId);
    this.errorCycleId.set(null);

    try {
      const updated = await this.api.updateCycleSchedule(cycleId, {
        morningStart: localCycle.entrada,
        endTime: localCycle.salida,
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

  /** Calcula la salida a partir de parámetros directos (usado en initCycles y en la sugerencia). */
  private computeSalidaRaw(entrada: string, recreos: CycleRecreo[], school: School): string {
    let mins = parseTime(entrada);
    const recreoMap = new Map(recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= school.slotsPerDay; i++) {
      mins += school.slotMinutes;
      if (recreoMap.has(i)) mins += recreoMap.get(i)!;
    }
    return formatTime(mins);
  }

  /** Calcula la salida teórica a partir del ciclo local (entrada + sesiones + recreos). Solo como sugerencia. */
  computeSalida(cycle: LocalCycleConfig, school: School): string {
    return this.computeSalidaRaw(cycle.entrada, cycle.recreos, school);
  }

  /** Devuelve la salida sugerida (calculada) para mostrar como referencia. */
  getSalidaSugerida(cycleId: number): string {
    const school = this.school();
    const cycle = this.cycles().find(c => c.id === cycleId);
    if (!school || !cycle) return '';
    return this.computeSalida(cycle, school);
  }

  /** True si la salida oficial difiere de la salida calculada (sugerida). */
  salidaDifiereDeCalculo(cycleId: number): boolean {
    const cycle = this.cycles().find(c => c.id === cycleId);
    if (!cycle) return false;
    return cycle.salida !== this.getSalidaSugerida(cycleId);
  }

  /** Aplica la salida calculada como salida oficial del ciclo. */
  usarSalidaSugerida(cycleId: number): void {
    const sugerida = this.getSalidaSugerida(cycleId);
    if (sugerida) this.setCycleSalida(cycleId, sugerida);
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
