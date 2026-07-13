import { SCHEDULE_TYPE, School, TimeSlot } from './models';
import { BLOCKS, EtapaBlockId } from './blocks.model';

/** Recreo local de un ciclo: tras qué sesión y cuántos minutos. */
export interface CycleRecreo {
  after: number;
  min: number;
}

/** Configuración editable de un ciclo, derivada del backend (`School.cycles`). */
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

export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Mapea el id de ciclo de la UI al número de ciclo del backend. */
export function cycleNumFromId(cycleId: string): number | null {
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

/** Hora de fin resultante de encadenar `slots` sesiones más los recreos indicados. */
export function computeEndRaw(start: string, slots: number, recreos: CycleRecreo[], slotMin: number): string {
  let mins = parseTime(start);
  const rMap = new Map(recreos.map(r => [r.after, r.min]));
  for (let i = 1; i <= slots; i++) {
    mins += slotMin;
    if (rMap.has(i)) mins += rMap.get(i)!;
  }
  return formatTime(mins);
}

/**
 * Construye la configuración de ciclos de una etapa a partir del backend
 * (`School.cycles` es la fuente de verdad), con fallbacks razonables cuando
 * el servidor aún no tiene datos para un ciclo.
 */
export function buildEtapaCycles(etapaId: EtapaBlockId, s: School): LocalCycleConfig[] {
  const etapa = BLOCKS.find(b => b.id === etapaId)!;
  const partida = s.scheduleType === SCHEDULE_TYPE.Partida;
  const slotMin = s.slotMinutes;

  return etapa.ciclos.map((ciclo) => {
    const num = cycleNumFromId(ciclo.id);
    const backendCycle = num !== null ? s.cycles?.find(c => c.cycle === num) : undefined;

    const morningStart = backendCycle?.morningStart ?? etapa.jornada.entrada;

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

    let morningEnd = computeEndRaw(morningStart, morningSlots, recreos, slotMin);
    if (backendCycle) {
      morningEnd = backendCycle.morningEnd ?? morningEnd;
    }

    let afternoonStart: string | null = null;
    let afternoonEnd: string | null = null;
    if (partida) {
      afternoonStart = backendCycle?.afternoonStart ?? s.afternoonStart ?? '15:00';
      afternoonEnd = backendCycle?.afternoonEnd ?? computeEndRaw(afternoonStart, afternoonSlots, [], slotMin);
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
}
