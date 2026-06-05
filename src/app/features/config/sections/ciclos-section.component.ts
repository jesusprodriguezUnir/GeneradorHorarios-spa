import {
  Component, inject, signal, input, output, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School } from '../../../core/models';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';
import { BlockStateService } from '../../../core/block-state.service';
import { BLOCKS, EtapaBlock, EtapaBlockId } from '../../../core/blocks.model';

export interface CycleRecreo {
  after: number;
  min: number;
}

export interface LocalCycleConfig {
  id: string;   // EtapaCiclo.id — 'inf2', 'pri1', 'pri2', 'pri3', 'eso1', 'eso2'
  entrada: string;
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

const LEGACY_KEY = 'lectivo-cycles-v2';
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
  return `${STORAGE_PREFIX}${id}-v1`;
}

function priCycleNum(cycleId: string): number | null {
  if (cycleId === 'pri1') return 1;
  if (cycleId === 'pri2') return 2;
  if (cycleId === 'pri3') return 3;
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

  readonly etapas = BLOCKS;
  readonly recreoOptions = RECREO_OPTIONS;

  readonly expandedEtapas = signal<Set<EtapaBlockId>>(new Set<EtapaBlockId>());
  readonly cyclesByEtapa = signal<CyclesByEtapa>({ inf: [], pri: [], sec: [] });

  // State key format: `${etapaId}:${cycleId}`
  readonly savingKey = signal<string | null>(null);
  readonly savedKey = signal<string | null>(null);
  readonly errorKey = signal<string | null>(null);

  readonly slotAfterOptions = computed(() => {
    const s = this.school();
    if (!s) return [];
    return Array.from({ length: s.slotsPerDay - 1 }, (_, i) => i + 1);
  });

  constructor() {
    const initial = this.blockState.activeBlock();
    this.expandedEtapas.set(
      new Set(initial !== 'all' ? [initial as EtapaBlockId] : ['pri'])
    );

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
    const earliest = cs.reduce((a, b) => parseTime(a.entrada) <= parseTime(b.entrada) ? a : b);
    const latest   = cs.reduce((a, b) => parseTime(a.salida)  >= parseTime(b.salida)  ? a : b);
    return `${earliest.entrada} – ${latest.salida}`;
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

    // Migrate legacy primaria data (lectivo-cycles-v2 with numeric ids)
    if (etapaId === 'pri') {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null') as
          | { id: number; entrada: string; salida: string; recreos: CycleRecreo[] }[]
          | null;
        if (legacy?.length === 3) {
          const migrated: LocalCycleConfig[] = legacy.map((c, i) => ({
            id: etapa.ciclos[i].id,
            entrada: c.entrada,
            salida: c.salida,
            recreos: c.recreos,
          }));
          this.saveEtapa(etapaId, migrated);
          return migrated;
        }
      } catch { /* fall through */ }
    }

    return this.buildDefaults(etapaId, s);
  }

  private buildDefaults(etapaId: EtapaBlockId, s: School): LocalCycleConfig[] {
    const etapa = BLOCKS.find(b => b.id === etapaId)!;

    const defaults = etapa.ciclos.map((ciclo, idx) => {
      let entrada = etapa.jornada.entrada;
      if (etapaId === 'pri') {
        entrada = s.cycles?.find(c => c.cycle === idx + 1)?.morningStart ?? entrada;
      }

      const defaultRecreos: CycleRecreo[] = etapaId === 'inf'
        ? [{ after: 2, min: 20 }]
        : idx === 0
          ? [{ after: 2, min: 30 }]
          : [{ after: 3, min: 20 }];

      const salidaCalc = this.computeSalidaRaw(entrada, defaultRecreos, s);
      let salida = salidaCalc;
      if (etapaId === 'pri') {
        salida = s.cycles?.find(c => c.cycle === idx + 1)?.endTime ?? salidaCalc;
      }

      return { id: ciclo.id, entrada, salida, recreos: defaultRecreos };
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
    this.cyclesByEtapa.update(all => {
      const updated = all[etapaId].map(c => c.id === cycleId ? fn(c) : c);
      this.saveEtapa(etapaId, updated);
      return { ...all, [etapaId]: updated };
    });
  }

  setCycleEntrada(etapaId: EtapaBlockId, cycleId: string, entrada: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, entrada }));
  }

  setCycleSalida(etapaId: EtapaBlockId, cycleId: string, salida: string): void {
    this.updateCycle(etapaId, cycleId, c => ({ ...c, salida }));
  }

  addRecreo(etapaId: EtapaBlockId, cycleId: string): void {
    const school = this.school();
    if (!school) return;
    this.updateCycle(etapaId, cycleId, c => {
      const used = new Set(c.recreos.map(r => r.after));
      let after = 1;
      for (let i = 1; i < school.slotsPerDay; i++) {
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
    const s = this.school();
    const cycle = this.cycles(etapaId).find(c => c.id === cycleId);
    return !!s && !!cycle && cycle.recreos.length < s.slotsPerDay - 1;
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async saveCycle(etapaId: EtapaBlockId, cycleId: string): Promise<void> {
    const school = this.school();
    if (!school || this.savingKey() !== null) return;

    const localCycle = this.cycles(etapaId).find(c => c.id === cycleId);
    if (!localCycle) return;

    if (parseTime(localCycle.salida) <= parseTime(localCycle.entrada)) {
      this.errorKey.set(`${etapaId}:${cycleId}`);
      return;
    }

    const key = `${etapaId}:${cycleId}`;
    this.savingKey.set(key);
    this.errorKey.set(null);

    try {
      if (etapaId === 'pri') {
        const num = priCycleNum(cycleId);
        if (num !== null) {
          const updated = await this.api.updateCycleSchedule(num, {
            morningStart: localCycle.entrada,
            endTime: localCycle.salida,
            afternoonStart: null,
          });
          const current = this.school();
          if (current) {
            this.schoolChange.emit({
              ...current,
              cycles: current.cycles.map(c => c.cycle === num ? updated : c),
            });
          }
        }
      }
      // Para inf/sec: ya guardado en localStorage, confirmar éxito visual
      this.savedKey.set(key);
      setTimeout(() => this.savedKey.set(null), 3000);
    } catch {
      this.errorKey.set(key);
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
    return this.errorKey() === `${etapaId}:${cycleId}`;
  }

  // ── Day plan ─────────────────────────────────────────────────────────────────

  private computeSalidaRaw(entrada: string, recreos: CycleRecreo[], school: School): string {
    let mins = parseTime(entrada);
    const rMap = new Map(recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= school.slotsPerDay; i++) {
      mins += school.slotMinutes;
      if (rMap.has(i)) mins += rMap.get(i)!;
    }
    return formatTime(mins);
  }

  computeSalida(cycle: LocalCycleConfig, school: School): string {
    return this.computeSalidaRaw(cycle.entrada, cycle.recreos, school);
  }

  getSalidaSugerida(etapaId: EtapaBlockId, cycleId: string): string {
    const s = this.school();
    const c = this.cycles(etapaId).find(x => x.id === cycleId);
    return s && c ? this.computeSalida(c, s) : '';
  }

  salidaDifiereDeCalculo(etapaId: EtapaBlockId, cycleId: string): boolean {
    const c = this.cycles(etapaId).find(x => x.id === cycleId);
    return !!c && c.salida !== this.getSalidaSugerida(etapaId, cycleId);
  }

  usarSalidaSugerida(etapaId: EtapaBlockId, cycleId: string): void {
    const s = this.getSalidaSugerida(etapaId, cycleId);
    if (s) this.setCycleSalida(etapaId, cycleId, s);
  }

  getDayPlan(cycle: LocalCycleConfig, school: School): DayBlock[] {
    const blocks: DayBlock[] = [];
    let mins = parseTime(cycle.entrada);
    const rMap = new Map(cycle.recreos.map(r => [r.after, r.min]));
    for (let i = 1; i <= school.slotsPerDay; i++) {
      blocks.push({ type: 'lectiva', n: i, start: mins, end: mins + school.slotMinutes, min: school.slotMinutes });
      mins += school.slotMinutes;
      if (rMap.has(i)) {
        const rm = rMap.get(i)!;
        blocks.push({ type: 'recreo', start: mins, end: mins + rm, min: rm });
        mins += rm;
      }
    }
    return blocks;
  }

  totalLectiveMin(school: School): number {
    return school.slotsPerDay * school.slotMinutes;
  }

  totalRecreoMin(etapaId: EtapaBlockId, cycleId: string): number {
    return this.cycles(etapaId).find(c => c.id === cycleId)
      ?.recreos.reduce((a, r) => a + r.min, 0) ?? 0;
  }

  lecHrs(mins: number): string {
    const h = mins / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
  }

  formatTime = formatTime;
}
