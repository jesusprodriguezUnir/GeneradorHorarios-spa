// ── Modelos del Generador PRO ─────────────────────────────────────────────────
// Tipos y constantes que dan forma a la experiencia "potente" del generador:
// objetivos de optimización, biblioteca rica de restricciones y soluciones
// candidatas. Parte de esto excede lo que el backend soporta hoy (ver
// doc/horarios-escolares/docs/generador-pro-backend.md); donde no llega, el
// front-end lo simula de forma determinista como en el prototipo Lectivo.

export interface GenObjective {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export const GEN_OBJECTIVES: GenObjective[] = [
  { id: 'huecos',     label: 'Minimizar huecos del profesorado',     icon: 'clock',    desc: 'Sin horas libres sueltas entre clases' },
  { id: 'mananas',    label: 'Asignaturas difíciles a primera hora', icon: 'sun',      desc: 'Mates y Lengua en los primeros tramos' },
  { id: 'agrupacion', label: 'Agrupar la jornada de cada docente',    icon: 'users',    desc: 'Concentrar sus clases, no dispersarlas' },
  { id: 'equilibrio', label: 'Equilibrar la carga diaria por grupo',  icon: 'scale',    desc: 'Repartir lo difícil entre los días' },
  { id: 'aulas',      label: 'Minimizar cambios de aula',             icon: 'doorOpen', desc: 'Menos desplazamientos para los grupos' },
];

export const GEN_WEIGHTS = ['Ignorar', 'Bajo', 'Medio', 'Alto'];

export type ObjectiveWeights = Record<string, number>;

export const GEN_PRESETS: Record<string, ObjectiveWeights> = {
  equilibrado: { huecos: 2, mananas: 2, agrupacion: 2, equilibrio: 2, aulas: 1 },
  profesorado: { huecos: 3, mananas: 1, agrupacion: 3, equilibrio: 1, aulas: 2 },
  pedagogico:  { huecos: 1, mananas: 3, agrupacion: 1, equilibrio: 3, aulas: 1 },
};

export interface ConstraintTypeDef {
  id: string;
  cat: string;
  icon: string;
  label: string;
  kind: 'hard' | 'soft';
}

export const GEN_CTYPES: ConstraintTypeDef[] = [
  { id: 'no-disp',  cat: 'Profesorado',  icon: 'user',     label: 'No disponible',               kind: 'hard' },
  { id: 'turno',    cat: 'Profesorado',  icon: 'sun',      label: 'Prefiere mañana/tarde',       kind: 'soft' },
  { id: 'media',    cat: 'Profesorado',  icon: 'clock',    label: 'Media jornada / día libre',   kind: 'hard' },
  { id: 'dificil',  cat: 'Pedagógicas',  icon: 'sun',      label: 'Asignatura difícil temprano', kind: 'soft' },
  { id: 'seguidas', cat: 'Pedagógicas',  icon: 'layers',   label: 'Máx. sesiones seguidas',      kind: 'hard' },
  { id: 'no-tramo', cat: 'Pedagógicas',  icon: 'ban',      label: 'No en cierto tramo',          kind: 'soft' },
  { id: 'aula',     cat: 'Espacios',     icon: 'doorOpen', label: 'Aula obligatoria',            kind: 'hard' },
  { id: 'recreo',   cat: 'Coordinación', icon: 'coffee',   label: 'Recreos sincronizados',       kind: 'hard' },
  { id: 'codoc',    cat: 'Coordinación', icon: 'users',    label: 'Co-docencia / desdoble',      kind: 'soft' },
];

export const GEN_CAT_ORDER = ['Profesorado', 'Pedagógicas', 'Espacios', 'Coordinación'];

/** Instancia de una restricción rica creada en el paso 3. */
export interface ProConstraint {
  id: number;
  type: string;
  kind: 'hard' | 'soft';
  priority?: number;
  // parámetros según el tipo
  teacherId?: string;
  day?: number;
  slot?: string | null;
  turno?: 'manana' | 'tarde';
  subjectKey?: string;
  n?: number;
  pos?: string;
  roomId?: string;
  groupId?: string;
  scope?: 'centro' | 'nivel';
}

export interface GenCandidate {
  id: string;
  name: string;
  tag: string;
  str: Record<string, number>;
  score?: number;
  recommended?: boolean;
}

export const GEN_CANDIDATES: GenCandidate[] = [
  { id: 'A', name: 'Equilibrada',                tag: 'Compensa profesorado y pedagogía',   str: { huecos: 90, mananas: 88, agrupacion: 86, equilibrio: 95, aulas: 90, prefs: 92 } },
  { id: 'B', name: 'Centrada en profesorado',    tag: 'Jornadas compactas, cero huecos',     str: { huecos: 99, mananas: 82, agrupacion: 96, equilibrio: 84, aulas: 93, prefs: 88 } },
  { id: 'C', name: 'Centrada en lo pedagógico',  tag: 'Lo difícil, siempre por la mañana',   str: { huecos: 84, mananas: 98, agrupacion: 82, equilibrio: 96, aulas: 86, prefs: 90 } },
];

export const GEN_METRIC_LABELS: Record<string, string> = {
  huecos: 'Huecos docentes',
  mananas: 'Difíciles por la mañana',
  agrupacion: 'Jornadas agrupadas',
  equilibrio: 'Equilibrio diario',
  aulas: 'Cambios de aula',
  prefs: 'Preferencias satisfechas',
};

/** Puntuación ponderada de una candidata según los objetivos elegidos. */
export function genScore(str: Record<string, number>, objectives: ObjectiveWeights): number {
  let wsum = 0;
  let acc = 0;
  for (const o of GEN_OBJECTIVES) {
    const w = objectives[o.id] || 0;
    wsum += w;
    acc += w * str[o.id];
  }
  if (wsum === 0) {
    return Math.round(GEN_OBJECTIVES.reduce((a, o) => a + str[o.id], 0) / GEN_OBJECTIVES.length);
  }
  return Math.round(acc / wsum);
}

export interface MetricTone {
  c: string;
  t: string;
  l: string;
}

export function genMetricTone(v: number): MetricTone {
  if (v >= 92) return { c: 'var(--success)', t: 'var(--success-tint)', l: 'Excelente' };
  if (v >= 85) return { c: 'var(--primary)', t: 'var(--primary-tint)', l: 'Bien' };
  if (v >= 78) return { c: 'oklch(0.45 0.11 65)', t: 'var(--warning-tint)', l: 'Mejorable' };
  return { c: 'var(--destructive)', t: 'var(--destructive-tint)', l: 'Bajo' };
}
