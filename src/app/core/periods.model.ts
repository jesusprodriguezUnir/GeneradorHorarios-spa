export type PeriodId = 'completa' | 'reducida';
export type PeriodScheduleState = 'none' | 'generating' | 'conflicts' | 'ok' | 'published';

export interface CoursePeriod {
  id: PeriodId;
  name: string;
  short: string;
  jornada: 'partida' | 'continua';
  tarde: boolean;
  months: string;
  rangeLabel: string;
  range: { from: string; to: string };
  lec: number;
  horas: number;
}

export const COURSE_PERIODS: CoursePeriod[] = [
  {
    id: 'completa',
    name: 'Jornada completa', short: 'Completa',
    jornada: 'partida', tarde: true,
    months: 'Oct – May', rangeLabel: '1 oct – 31 may',
    range: { from: '2025-10-01', to: '2026-05-31' },
    lec: 6, horas: 30,
  },
  {
    id: 'reducida',
    name: 'Jornada reducida', short: 'Reducida',
    jornada: 'continua', tarde: false,
    months: 'Jun + Sep', rangeLabel: 'jun + sep',
    range: { from: '2026-06-01', to: '2026-09-30' },
    lec: 4, horas: 20,
  },
];

export type ScheduleStateByPeriod = Partial<Record<PeriodId, PeriodScheduleState>>;

export const PERIOD_STATE_COLORS: Record<PeriodScheduleState, string> = {
  none: 'var(--muted-foreground)',
  generating: 'var(--warning)',
  conflicts: 'var(--warning)',
  ok: 'var(--success)',
  published: 'var(--success)',
};

export const PERIOD_STATE_LABELS: Record<PeriodScheduleState, string> = {
  none: 'Sin generar',
  generating: 'Generando…',
  conflicts: 'Con conflictos',
  ok: 'Sin conflictos',
  published: 'Publicado',
};
