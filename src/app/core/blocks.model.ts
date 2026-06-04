import { PeriodId, PeriodScheduleState } from './periods.model';

export type BlockId = 'all' | 'inf' | 'pri' | 'sec';
export type EtapaBlockId = Exclude<BlockId, 'all'>;

export interface EtapaCiclo {
  id: string;
  name: string;
  cursos: string[];
  lineas: number;
  grupos: number;
}

export interface EtapaBlock {
  id: EtapaBlockId;
  name: string;
  short: string;
  ages: string;
  /** Nombre del path SVG para el icono (inline en componentes) */
  iconKey: 'sun' | 'bookOpen' | 'graduation';
  color: string;
  strong: string;
  tint: string;
  tint2: string;
  fg: string;
  ciclos: EtapaCiclo[];
  areasLabel: string;
  nGroups: number;
  nLineas: number;
  nTeachers: number;
  nRooms: number;
  nSubjects: number;
  jornada: { tipo: string; entrada: string; salida: string; slots: number };
  sched: Partial<Record<PeriodId, PeriodScheduleState>>;
}

export const BLOCKS: EtapaBlock[] = [
  {
    id: 'inf',
    name: 'Educación Infantil', short: 'Infantil',
    ages: '3 – 6 años', iconKey: 'sun',
    color: 'oklch(0.64 0.15 40)', strong: 'oklch(0.5 0.14 38)',
    tint: 'oklch(0.95 0.05 40)', tint2: 'oklch(0.90 0.07 40)', fg: 'oklch(0.42 0.13 38)',
    ciclos: [
      { id: 'inf2', name: '2.º ciclo', cursos: ['3 años', '4 años', '5 años'], lineas: 1, grupos: 3 },
    ],
    areasLabel: 'áreas globalizadas',
    nGroups: 3, nLineas: 1, nTeachers: 5, nRooms: 4, nSubjects: 3,
    jornada: { tipo: 'partida', entrada: '09:00', salida: '14:00', slots: 5 },
    sched: { completa: 'ok', reducida: 'none' },
  },
  {
    id: 'pri',
    name: 'Educación Primaria', short: 'Primaria',
    ages: '6 – 12 años', iconKey: 'bookOpen',
    color: 'var(--primary)', strong: 'var(--primary-strong)',
    tint: 'var(--primary-tint)', tint2: 'var(--primary-tint-2)', fg: 'var(--primary-strong)',
    ciclos: [
      { id: 'pri1', name: '1.er ciclo', cursos: ['1º', '2º'], lineas: 2, grupos: 4 },
      { id: 'pri2', name: '2.º ciclo',  cursos: ['3º', '4º'], lineas: 2, grupos: 4 },
      { id: 'pri3', name: '3.er ciclo', cursos: ['5º', '6º'], lineas: 2, grupos: 4 },
    ],
    areasLabel: 'asignaturas',
    nGroups: 12, nLineas: 2, nTeachers: 8, nRooms: 10, nSubjects: 10,
    jornada: { tipo: 'partida', entrada: '09:00', salida: '17:00', slots: 6 },
    sched: { completa: 'conflicts', reducida: 'none' },
  },
  {
    id: 'sec',
    name: 'Educación Secundaria (ESO)', short: 'Secundaria',
    ages: '12 – 16 años', iconKey: 'graduation',
    color: 'oklch(0.55 0.11 205)', strong: 'oklch(0.44 0.11 207)',
    tint: 'oklch(0.93 0.055 200)', tint2: 'oklch(0.88 0.07 200)', fg: 'oklch(0.36 0.10 205)',
    ciclos: [
      { id: 'eso1', name: '1.er ciclo', cursos: ['1º', '2º', '3º'], lineas: 2, grupos: 6 },
      { id: 'eso2', name: '2.º ciclo',  cursos: ['4º'],             lineas: 2, grupos: 2 },
    ],
    areasLabel: 'materias por departamento',
    nGroups: 8, nLineas: 2, nTeachers: 14, nRooms: 12, nSubjects: 13,
    jornada: { tipo: 'continua', entrada: '08:30', salida: '14:30', slots: 6 },
    sched: { completa: 'none', reducida: 'none' },
  },
];

export function blockById(id: EtapaBlockId): EtapaBlock {
  return BLOCKS.find(b => b.id === id) ?? BLOCKS[0];
}

/** Estado agregado para un periodo: el peor de todos los bloques manda */
export function blockAggState(periodId: PeriodId): PeriodScheduleState {
  const states = BLOCKS.map(b => b.sched[periodId] ?? 'none');
  if (states.includes('conflicts')) return 'conflicts';
  if (states.every(s => s === 'published')) return 'published';
  if (states.every(s => s === 'none')) return 'none';
  return 'conflicts';
}

export const BLOCK_STATE_LABELS: Record<PeriodScheduleState, string> = {
  none: 'Sin generar',
  generating: 'Generando…',
  conflicts: 'Con conflictos',
  ok: 'Sin conflictos',
  published: 'Publicado',
};

export const BLOCK_STATE_COLORS: Record<PeriodScheduleState, string> = {
  none: 'var(--muted-foreground)',
  generating: 'var(--warning)',
  conflicts: 'var(--warning)',
  ok: 'var(--success)',
  published: 'var(--success)',
};
