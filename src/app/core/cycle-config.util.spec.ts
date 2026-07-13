import { buildEtapaCycles, computeEndRaw, cycleNumFromId, formatTime, parseTime } from './cycle-config.util';
import { CycleSchedule, School } from './models';

function makeSchool(overrides: Partial<School> = {}): School {
  return {
    id: 's1', name: 'CEIP Test', slug: 'ceip-test',
    centerCode: null, locality: null, community: 'Madrid', stage: 'primaria',
    minCourseLevel: 1, maxCourseLevel: 6, academicYear: '2025-2026',
    scheduleType: 'continua', morningStart: '09:00', afternoonStart: null,
    slotMinutes: 60, breakAfterSlot: 2, breakMinutes: 30,
    slotsPerDay: 5, afternoonSlots: 0,
    daysPerWeek: 5, workingDays: [1, 2, 3, 4, 5],
    computedSlots: [], cycles: [],
    ...overrides,
  } as School;
}

function makeCycle(cycle: number, overrides: Partial<CycleSchedule> = {}): CycleSchedule {
  return {
    cycle,
    morningStart: '09:30', morningEnd: '13:30', endTime: '13:30',
    afternoonStart: null, afternoonEnd: null,
    computedSlots: [], breaks: [{ afterSlot: 2, minutes: 20 }],
    ...overrides,
  } as CycleSchedule;
}

describe('parseTime / formatTime', () => {
  it('convierte ida y vuelta', () => {
    expect(parseTime('09:30')).toBe(570);
    expect(formatTime(570)).toBe('09:30');
    expect(formatTime(0)).toBe('00:00');
  });
});

describe('cycleNumFromId', () => {
  it('mapea los ids de la UI al número de ciclo del backend', () => {
    expect(cycleNumFromId('pri1')).toBe(1);
    expect(cycleNumFromId('pri3')).toBe(3);
    expect(cycleNumFromId('eso2')).toBe(2);
    expect(cycleNumFromId('inf2')).toBe(2);
    expect(cycleNumFromId('desconocido')).toBeNull();
  });
});

describe('computeEndRaw', () => {
  it('suma sesiones sin recreos', () => {
    expect(computeEndRaw('09:00', 5, [], 60)).toBe('14:00');
  });

  it('inserta los recreos tras la sesión indicada', () => {
    expect(computeEndRaw('09:00', 5, [{ after: 2, min: 30 }], 60)).toBe('14:30');
    expect(computeEndRaw('09:00', 4, [{ after: 1, min: 15 }, { after: 3, min: 15 }], 45)).toBe('12:30');
  });
});

describe('buildEtapaCycles', () => {
  it('usa los datos del backend como fuente de verdad cuando existen', () => {
    const school = makeSchool({ cycles: [makeCycle(1), makeCycle(2), makeCycle(3)] });
    const cycles = buildEtapaCycles('pri', school);

    expect(cycles).toHaveLength(3);
    expect(cycles[0].id).toBe('pri1');
    expect(cycles[0].morningStart).toBe('09:30');
    expect(cycles[0].morningEnd).toBe('13:30');
    expect(cycles[0].recreos).toEqual([{ after: 2, min: 20 }]);
  });

  it('aplica fallbacks razonables cuando el backend no tiene el ciclo', () => {
    const school = makeSchool({ cycles: [] });
    const cycles = buildEtapaCycles('pri', school);

    expect(cycles).toHaveLength(3);
    // Entrada por defecto de la etapa y fin computado con el recreo por defecto
    expect(cycles[0].morningStart).toBe('09:00');
    expect(cycles[0].recreos).toEqual([{ after: 2, min: 30 }]);
    expect(cycles[0].morningEnd).toBe(computeEndRaw('09:00', cycles[0].morningSlots, cycles[0].recreos, 60));
    // Los ciclos siguientes usan el recreo alternativo
    expect(cycles[1].recreos).toEqual([{ after: 3, min: 20 }]);
  });

  it('en jornada continua no genera turno de tarde', () => {
    const school = makeSchool({ scheduleType: 'continua' });
    for (const c of buildEtapaCycles('pri', school)) {
      expect(c.afternoonStart).toBeNull();
      expect(c.afternoonEnd).toBeNull();
      expect(c.afternoonSlots).toBe(0);
    }
  });

  it('en jornada partida calcula el turno de tarde', () => {
    const school = makeSchool({
      scheduleType: 'partida', afternoonStart: '15:00', afternoonSlots: 2,
    });
    const cycles = buildEtapaCycles('pri', school);
    expect(cycles[0].afternoonStart).toBe('15:00');
    expect(cycles[0].afternoonEnd).toBe('17:00');
    expect(cycles[0].afternoonSlots).toBe(2);
  });
});
