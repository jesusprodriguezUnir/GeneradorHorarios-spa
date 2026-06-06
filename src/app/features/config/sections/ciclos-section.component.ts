import {
  Component, inject, signal, input, output, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School, TimeSlot } from '../../../core/models';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';
import { BlockStateService } from '../../../core/block-state.service';
import { BLOCKS, EtapaBlockId } from '../../../core/blocks.model';

export interface CycleRecreo {
  after: number;
  min: number;
}

export interface LocalCycleConfig {
  id: string;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string | null;
  afternoonEnd: string | null;
  morningSlots: number;
  afternoonSlots: number;
  recreos: CycleRecreo[];
  /** Slots calculados por el backend (computedSlots). Si existen, la timeline los usa. */
  backendSlots?: TimeSlot[];
}

export interface DayBlock {
  type: 'lectiva' | 'recreo';
  n?: number;
  start: number;
  end: number;
  min: number;
}

const STORAGE_PREFIX = 'lectivo-cycles-';
const RECREO_OPTIONS = [15, 20, 30];

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function etapaKey(id: EtapaBlockId): string {
  return `${STORAGE_PREFIX}${id}-v2`;
}

function cycleNumFromId(cycleId: string): number | null {
  // Primaria
  if (cycleId === 'pri1') return 1;
  if (cycleId === 'pri2') return 2;
  if (cycleId === 'pri3') return 3;
  // Secundaria (ESO)
  if (cycleId === 'eso1') return 1;
  if (cycleId === 'eso2') return 2;
  // Infantil
  if (cycleId === 'inf2') return 2; // 2.º ciclo
  return null;
}

type CyclesByEtapa = Record<EtapaBlockId, LocalCycleConfig[]>;

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
  private readonly blockState = inject(BlockStateService);

  readonly school = input.required<School | null>();
  readonly schoolChange = output<School>();

  readonly etapas = computed(() => {
    const active = this.blockState.activeBlock();
    if (active === 'all') return BLOCKS;
    return BLOCKS.filter(b => b.id === active);
  });
  readonly recreoOptions = RECREO_OPTIONS;

  readonly expandedEtapas = signal<Set<EtapaBlockId>>(new Set<EtapaBlockId>());
  readonly cyclesByEtapa = signal<CyclesByEtapa>({ inf: [], pri: [], sec: [] });

  readonly savingKey = signal<string | null>(null);
  readonly savedKey = signal<string | null>(null);
  readonly error = signal<{ key: string; message: string } | null>(null);

  readonly isPartida = computed(() => this.school()?.scheduleType === 'partida');

  constructor() {
    effect(() => {
      const active = this.blockState.activeBlock();
      if (active !== 'all') {
        this.expandedEtapas.set(new Set([active as EtapaBlockId]));
      } else {
        this.expandedEtapas.set(new Set(['inf', 'pri', 'sec']));
      }
    });

    effect(() => {
      const s = this.school();
      if (s) this.initAllCycles(s);
    });
  }

  // ── Accordion ────────────────────────────────────────────────────────────────

  toggleEtapa(id: EtapaBlockId): void {
    this.expandedEtapas.update(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  isExpanded(id: EtapaBlockId): boolean {
    return this.expandedEtapas().has(id);
  }

  // ── Data access ──────────────────────────────────────────────────────────────

  cycles(etapaId: EtapaBlockId): LocalCycleConfig[] {
    return this.cyclesByEtapa()[etapaId];
  }

  getCiclo(etapaId: EtapaBlockId, cycleId: string) {
    return BLOCKS.find(b => b.id === etapaId)?.ciclos.find(c => c.id === cycleId);
  }

  etapaTimeRange(etapaId: EtapaBlockId): string {
    const cs = this.cycles(etapaId);
    if (!cs.length) return '';
    const earliest = cs.reduce((a, b) => parseTime(a.morningStart) <= parseTime(b.morningStart) ? a : b);
    const latest = cs.reduce((a, b) => {
      const aEnd = a.afternoonEnd ?? a.morningEnd;
      const bEnd = b.afternoonEnd ?? b.morningEnd;
      return parseTime(aEnd) >= parseTime(bEnd) ? a : b;
    });
    const end = latest.afternoonEnd ?? latest.morningEnd;
    return `${earliest.morningStart} \u2013 ${end}`;
  }

  cycleBadge(cycle: LocalCycleConfig): string {
    if (cycle.afternoonStart && cycle.afternoonEnd) {
      return `${cycle.morningStart} \u2013 ${cycle.morningEnd} / ${cycle.afternoonStart} \u2013 ${cycle.afternoonEnd}`;
    }
    return `${cycle.morningStart} \u2013 ${cycle.morningEnd}`;
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  private initAllCycles(s: School): void {
    this.cyclesByEtapa.set({
      inf: this.loadEtapaCycles('inf', s),
      pri: this.loadEtapaCycles('pri', s),
      sec: this.loadEtapaCycles('sec', s),
    });
  }

  private loadEtapaCycles(etapaId: EtapaBlockId, s: School): LocalCycleConfig[] {
    const etapa = BLOCKS.find(b => b.id === etapaId)!;

    try {
      const raw = localStorage.getItem(etapaKey(etapaId));
      if (raw) {
        const stored = JSON.parse(raw) as LocalCycleConfig[];
        if (stored.length === etapa.ciclos.length) return stored;
      }
    } catch { /* fall through */ }

    return this.buildDefaults(etapaId, s);
  }

  private buildDefaults(etapaId: EtapaBlockId, s: School): LocalCycleConfig[] {
    const etapa = BLOCKS.find(b => b.id === etapaId)!;
    const partida = s.scheduleType === 'partida';
    const slotMin = s.slotMinutes;

    const defaults = etapa.ciclos.map((ciclo) => {
      const num = cycleNumFromId(ciclo.id);
      const backendCycle = num !== null ? s.cycles?.find(c => c.cycle === num) : undefined;

      let morningStart = backendCycle?.morningStart ?? etapa.jornada.entrada;

      const morningSlots = backendCycle?.morningSlots
        ?? s.slotsPerDay
        ?? etapa.jornada.slots;
      const afternoonSlots = partida
        ? (backendCycle?.afternoonSlots ?? s.afternoonSlots ?? 0)
        : 0;

      const backendRecreos: CycleRecreo[] = (backendCycle?.breaks ?? [])
        .map(b => ({ after: b.afterSlot, min: b.minutes }));

      const fallbackRecreos: CycleRecreo[] = etapaId === 'inf'
        ? [{ after: 2, min: 20 }]
        : etapa.ciclos.indexOf(ciclo) === 0
          ? [{ after: 2, min: 30 }]
          : [{ after: 3, min: 20 }];

      const recreos = backendRecreos.length > 0 ? backendRecreos : fallbackRecreos;

      let morningEnd = this.computeEndRaw(morningStart, morningSlots, recreos, slotMin);
      if (backendCycle) {
        morningEnd = backendCycle.morningEnd ?? morningEnd;
      }

      let afternoonStart: string | null = null;
      let afternoonEnd: string | null = null;
      if (partida) {
        afternoonStart = backendCycle?.afternoonStart ?? s.afternoonStart ?? '15:00';
        afternoonEnd = backendCycle?.afternoonEnd ?? this.computeEndRaw(afternoonStart, afternoonSlots, [], slotMin);
      }

      return {
        id: ciclo.id,
        morningStart,
        morningEnd,
        afternoonStart,
        afternoonEnd,
        morningSlots,
        afternoonSlots,
        recreos,
        backendSlots: backendCycle?.computedSlots,
      };
    });

    this.saveEtapa(etapaId, defaults);
    return defaults;
  }

  private saveEtapa(etapaId: EtapaBlockId, cycles: LocalCycleConfig[]): void {
    try { localStorage.setItem(etapaKey(etapaId), JSON.stringify(cycles)); } catch { /* ignore */ }
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  private updateCycle(
    etapaId: EtapaBlockId,
    cycleId: string,
    fn: (c: LocalCycleConfig) => LocalCycleConfig
  ): void {
    const key = `${etapaId}:${cycleId}`;
    if (this.error()?.key === key) {
      this.error.set(null);
    }
    this.cyclesByEtapa.update(all => {
      const updated = all[etapaId].map(c => c.id === cycleId ? fn(c) : c);
      this.saveEtapa(etapaId, updated);
      return { ...all, [etapaId]: updated };
    });
  }

  setMorningStart(etapaId: EtapaBlockId, cycleId: string, value: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, morningStart: value }));
  }

  setMorningEnd(etapaId: EtapaBlockId, cycleId: string, value: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, morningEnd: value }));
  }

  setAfternoonStart(etapaId: EtapaBlockId, cycleId: string, value: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, afternoonStart: value }));
  }

  setAfternoonEnd(etapaId: EtapaBlockId, cycleId: string, value: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, afternoonEnd: value }));
  }

  adjustMorningSlots(etapaId: EtapaBlockId, cycleId: string, delta: number): void {
    this.updateCycle(etapaId, cycleId, c => ({
      ...c,
      morningSlots: Math.max(1, Math.min(9, c.morningSlots + delta)),
    }));
  }

  adjustAfternoonSlots(etapaId: EtapaBlockId, cycleId: string, delta: number): void {
    this.updateCycle(etapaId, cycleId, c => ({
      ...c,
      afternoonSlots: Math.max(0, Math.min(9, c.afternoonSlots + delta)),
    }));
  }

  addRecreo(etapaId: EtapaBlockId, cycleId: string): void {
    const cycle = this.cycles(etapaId).find(c => c.id === cycleId);
    if (!cycle) return;
    this.updateCycle(etapaId, cycleId, c => {
      const used = new Set(c.recreos.map(r => r.after));
      let after = 1;
      for (let i = 1; i < c.morningSlots; i++) {
        if (!used.has(i)) { after = i; break; }
      }
      return {
        ...c,
        recreos: [...c.recreos, { after, min: 20 }].sort((a, b) => a.after - b.after),
      };
    });
  }

  setRecreoAfter(etapaId: EtapaBlockId, cycleId: string, idx: number, after: number): void {
    this.updateCycle(etapaId, cycleId, c => ({
      ...c,
      recreos: c.recreos
        .map((r, i) => i === idx ? { ...r, after } : r)
        .sort((a, b) => a.after - b.after),
    }));
  }

  setRecreoMin(etapaId: EtapaBlockId, cycleId: string, idx: number, min: number): void {
    this.updateCycle(etapaId, cycleId, c => ({
      ...c,
      recreos: c.recreos.map((r, i) => i === idx ? { ...r, min } : r),
    }));
  }

  delRecreo(etapaId: EtapaBlockId, cycleId: string, idx: number): void {
    this.updateCycle(etapaId, cycleId, c => ({
      ...c,
      recreos: c.recreos.filter((_, i) => i !== idx),
    }));
  }

  canAddRecreo(etapaId: EtapaBlockId, cycleId: string): boolean {
    const cycle = this.cycles(etapaId).find(c => c.id === cycleId);
    return !!cycle && cycle.recreos.length < cycle.morningSlots - 1;
  }

  slotAfterOptions(cycle: LocalCycleConfig): number[] {
    return Array.from({ length: cycle.morningSlots - 1 }, (_, i) => i + 1);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async saveCycle(etapaId: EtapaBlockId, cycleId: string): Promise<void> {
    const school = this.school();
    if (!school || this.savingKey() !== null) return;

    const localCycle = this.cycles(etapaId).find(c => c.id === cycleId);
    if (!localCycle) return;

    const key = `${etapaId}:${cycleId}`;
    this.savingKey.set(key);
    this.error.set(null);

    const validationMsg = 'Corrige los horarios. La salida debe ser posterior a la entrada'
      + (school.scheduleType === 'partida' ? ' y el turno de tarde debe empezar después del de mañana' : '')
      + '.';

    if (parseTime(localCycle.morningEnd) <= parseTime(localCycle.morningStart)) {
      this.error.set({ key, message: validationMsg });
      this.savingKey.set(null);
      return;
    }
    if (school.scheduleType === 'partida') {
      if (!localCycle.afternoonStart || !localCycle.afternoonEnd) {
        this.error.set({ key, message: validationMsg });
        this.savingKey.set(null);
        return;
      }
      if (parseTime(localCycle.afternoonEnd) <= parseTime(localCycle.afternoonStart)) {
        this.error.set({ key, message: validationMsg });
        this.savingKey.set(null);
        return;
      }
      if (parseTime(localCycle.afternoonStart) < parseTime(localCycle.morningEnd)) {
        this.error.set({ key, message: validationMsg });
        this.savingKey.set(null);
        return;
      }
    }

    try {
      const num = cycleNumFromId(cycleId);
      if (num !== null) {
        const updated = await this.api.updateCycleSchedule(num, {
          morningStart: localCycle.morningStart,
          morningEnd: localCycle.morningEnd,
          afternoonStart: localCycle.afternoonStart,
          afternoonEnd: localCycle.afternoonEnd,
          breaks: localCycle.recreos.map(r => ({ afterSlot: r.after, minutes: r.min })),
        });
        // Actualizar slots del backend en el estado local para reflejar la timeline real
        this.cyclesByEtapa.update(all => {
          const updatedLocal = all[etapaId].map(c =>
            c.id === cycleId ? { ...c, backendSlots: updated.computedSlots } : c
          );
          this.saveEtapa(etapaId, updatedLocal);
          return { ...all, [etapaId]: updatedLocal };
        });

        const current = this.school();
        if (current) {
          this.schoolChange.emit({
            ...current,
            cycles: current.cycles.map(c => c.cycle === num ? updated : c),
          });
        }
      }
      this.savedKey.set(key);
      setTimeout(() => this.savedKey.set(null), 3000);
    } catch (err) {
      this.error.set({ key, message: this.describeApiError(err) });
    } finally {
      this.savingKey.set(null);
    }
  }

  // ── State helpers ─────────────────────────────────────────────────────────────

  isSaving(etapaId: EtapaBlockId, cycleId: string): boolean {
    return this.savingKey() === `${etapaId}:${cycleId}`;
  }
  isSaved(etapaId: EtapaBlockId, cycleId: string): boolean {
    return this.savedKey() === `${etapaId}:${cycleId}`;
  }
  isError(etapaId: EtapaBlockId, cycleId: string): boolean {
    return this.error()?.key === `${etapaId}:${cycleId}`;
  }
  errorMessage(etapaId: EtapaBlockId, cycleId: string): string {
    const e = this.error();
    return e?.key === `${etapaId}:${cycleId}` ? e.message : '';
  }

  private describeApiError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
      }
      const serverMsg = (err.error as { message?: string } | null)?.message;
      if (serverMsg) return serverMsg;
      return `No se pudo guardar el ciclo (error ${err.status}). Inténtalo de nuevo.`;
    }
    return 'Se produjo un error inesperado al guardar. Inténtalo de nuevo.';
  }

  // ── Day plan ─────────────────────────────────────────────────────────────────

  private computeEndRaw(start: string, slots: number, recreos: CycleRecreo[], slotMin: number): string {
    let mins = parseTime(start);
    const rMap = new Map(recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= slots; i++) {
      mins += slotMin;
      if (rMap.has(i)) mins += rMap.get(i)!;
    }
    return formatTime(mins);
  }

  /** Convierte los computedSlots del backend en bloques visuales separados por turno. */
  private blocksFromBackend(cycle: LocalCycleConfig): { morning: DayBlock[]; afternoon: DayBlock[] } | null {
    if (!cycle.backendSlots?.length) return null;

    const pivot = cycle.afternoonStart ? parseTime(cycle.afternoonStart) : Infinity;
    const morning: DayBlock[] = [];
    const afternoon: DayBlock[] = [];
    let morningLectiveCount = 0;

    for (const slot of cycle.backendSlots) {
      const start = parseTime(slot.startTime);
      const end = parseTime(slot.endTime);
      const min = end - start;
      const isAfternoon = start >= pivot;

      if (slot.isBreak) {
        (isAfternoon ? afternoon : morning).push({ type: 'recreo', start, end, min });
      } else {
        if (!isAfternoon) {
          morningLectiveCount++;
          morning.push({ type: 'lectiva', n: morningLectiveCount, start, end, min });
        } else {
          const afternoonIndex = slot.index >= 0 ? (slot.index + 1) - morningLectiveCount : undefined;
          afternoon.push({ type: 'lectiva', n: afternoonIndex, start, end, min });
        }
      }
    }

    return { morning, afternoon };
  }

  getMorningDayPlan(cycle: LocalCycleConfig, slotMin: number): DayBlock[] {
    const backend = this.blocksFromBackend(cycle);
    if (backend) return backend.morning;

    const blocks: DayBlock[] = [];
    let mins = parseTime(cycle.morningStart);
    const rMap = new Map(cycle.recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= cycle.morningSlots; i++) {
      blocks.push({ type: 'lectiva', n: i, start: mins, end: mins + slotMin, min: slotMin });
      mins += slotMin;
      if (rMap.has(i)) {
        const rm = rMap.get(i)!;
        blocks.push({ type: 'recreo', start: mins, end: mins + rm, min: rm });
        mins += rm;
      }
    }
    return blocks;
  }

  getAfternoonDayPlan(cycle: LocalCycleConfig, slotMin: number): DayBlock[] {
    const backend = this.blocksFromBackend(cycle);
    if (backend) return backend.afternoon;

    if (!cycle.afternoonStart || cycle.afternoonSlots <= 0) return [];
    const blocks: DayBlock[] = [];
    let mins = parseTime(cycle.afternoonStart);
    for (let i = 1; i <= cycle.afternoonSlots; i++) {
      blocks.push({ type: 'lectiva', n: i, start: mins, end: mins + slotMin, min: slotMin });
      mins += slotMin;
    }
    return blocks;
  }

  totalLectiveMin(cycle: LocalCycleConfig, slotMin: number): number {
    if (cycle.backendSlots?.length) {
      return cycle.backendSlots
        .filter(s => !s.isBreak)
        .reduce((sum, s) => sum + (parseTime(s.endTime) - parseTime(s.startTime)), 0);
    }
    return (cycle.morningSlots + cycle.afternoonSlots) * slotMin;
  }

  totalRecreoMin(etapaId: EtapaBlockId, cycleId: string): number {
    const cycle = this.cycles(etapaId).find(c => c.id === cycleId);
    if (!cycle) return 0;
    if (cycle.backendSlots?.length) {
      return cycle.backendSlots
        .filter(s => s.isBreak)
        .reduce((sum, s) => sum + (parseTime(s.endTime) - parseTime(s.startTime)), 0);
    }
    return cycle.recreos.reduce((a, r) => a + r.min, 0);
  }

  morningSlotCount(cycle: LocalCycleConfig): number {
    if (cycle.backendSlots?.length) {
      const pivot = cycle.afternoonStart ? parseTime(cycle.afternoonStart) : Infinity;
      return cycle.backendSlots.filter(s => !s.isBreak && parseTime(s.startTime) < pivot).length;
    }
    return cycle.morningSlots;
  }

  afternoonSlotCount(cycle: LocalCycleConfig): number {
    if (cycle.backendSlots?.length) {
      const pivot = cycle.afternoonStart ? parseTime(cycle.afternoonStart) : Infinity;
      return cycle.backendSlots.filter(s => !s.isBreak && parseTime(s.startTime) >= pivot).length;
    }
    return cycle.afternoonSlots;
  }

  lecHrs(mins: number): string {
    const h = mins / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
  }

  formatTime = formatTime;
}
