// ── Modelos de dominio compartidos ────────────────────────────────────────────

export interface CycleBreak {
  afterSlot: number;
  minutes: number;
}

export interface CycleSchedule {
  /** Número de ciclo: 1 (1º-2º), 2 (3º-4º), 3 (5º-6º). */
  cycle: number;
  morningStart: string;
  morningEnd: string;
  /** Solo lectura. Igual a `afternoonEnd ?? morningEnd`. */
  endTime: string;
  afternoonStart: string | null;
  afternoonEnd: string | null;
  /** @deprecated Se deriva automáticamente del backend a partir de breaks + slotMinutes. */
  morningSlots?: number;
  /** @deprecated Se deriva automáticamente del backend a partir de breaks + slotMinutes. */
  afternoonSlots?: number;
  /** Solo lectura. Franjas calculadas por el backend. */
  computedSlots: TimeSlot[];
  /** Recreos configurados para este ciclo. */
  breaks: CycleBreak[];
}

export interface School {
  id: string;
  name: string;
  slug: string;
  // Identificación
  centerCode: string | null;
  locality: string | null;
  community: string;
  stage: string;
  minCourseLevel: number;
  maxCourseLevel: number;
  academicYear: string;
  // Jornada
  scheduleType: 'continua' | 'partida';
  morningStart: string;
  afternoonStart: string | null;
  slotMinutes: number;
  breakAfterSlot: number;
  breakMinutes: number;
  /** @deprecated Se configura por ciclo en `CycleSchedule.morningSlots/afternoonSlots` */
  slotsPerDay?: number;
  /** @deprecated Se configura por ciclo en `CycleSchedule.morningSlots/afternoonSlots` */
  afternoonSlots?: number;
  daysPerWeek: number;
  workingDays: number[];
  computedSlots: TimeSlot[];
  // Ciclos
  cycles: CycleSchedule[];
}

export interface TimeSlot {
  index: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface AppUserRole {
  id: string;
  code: string;
  name: string;
  kind: 'Admin' | 'Teacher' | 'Other';
}

export interface AppUser {
  userId: string;
  schoolId: string;
  role: AppUserRole;
  school: { id: string; name: string; slug: string } | null;
  teacher: { id: string; fullName: string; colorKey: string; assignedStageTypes?: string[] } | null;
}

export interface StageAssignment {
  stageId: string;
  stageName?: string;
  stageType?: string;
  cycle: number | null;
}

export interface SchoolStage {
  id: string;
  stageType: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  sortOrder: number;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  teacherType: string;
  maxWeeklyHours: number;
  /** Derivado del backend sumando assignments por asignatura. Se mantiene para compatibilidad con listados. */
  subjectHours: { subjectKey: string; weeklyHours: number }[];
  colorKey: string;
  assignedHours: number;
  stageAssignments?: StageAssignment[];
  /** Distribución real por grupo: la fuente de verdad para el motor de generación. */
  assignments?: Assignment[];
}

/** Payload de entrada para crear/reemplazar una línea de distribución docente. */
export interface TeacherAssignmentInput {
  /** SubjectAllocation.id */
  allocationId: string;
  /** CourseGroup.id */
  groupId: string;
  weeklyHours: number;
}

export interface CourseGroup {
  id: string;
  stageId?: string;
  courseLevel: number;
  groupLabel: string;
  displayName: string;
  studentCount: number;
  tutorId: string | null;
  tutorName: string | null;
  homeClassroomId: string | null;
  subjectHours?: Record<string, number>;
}

export interface Classroom {
  id: string;
  name: string;
  classroomType: string;
  capacity: number;
  isShared: boolean;
}

export interface SubjectAllocation {
  id: string;
  subjectName: string;
  subjectShort: string;
  subjectKey: string;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  weeklyHoursDefault: number;
  requiresSpecialist: boolean;
  requiredClassroomType: string | null;
  maxConsecutiveSlots: number;
  splittableAcrossDays: boolean;
  isOfficial: boolean;
  cycle?: number | null;
  courseLevel?: number | null;
}

export interface AssignmentSummary {
  subjectName: string;
  subjectKey: string;
  requiredHours: number;
  assignedHours: number;
  completionPct: number;
  assignments: Assignment[];
}

export interface Assignment {
  id: string;
  teacherId: string;
  teacherName: string;
  groupId: string;
  groupDisplay: string;
  allocationId: string;
  subjectName: string;
  weeklyHours: number;
}

export interface ScheduleList {
  id: string;
  academicYear: string;
  status: 'draft' | 'generated' | 'published' | 'archived';
  generatedAt: string | null;
  publishedAt: string | null;
  totalConflicts: number;
  generationSeconds: number | null;
}

export interface ScheduleGrid {
  scheduleId: string;
  status: string;
  academicYear: string;
  entries: ScheduleGridEntry[];
  conflicts: ScheduleConflict[];
  slots: TimeSlot[];
  /** Slots calculados para cada ciclo (clave = número de ciclo: 1, 2 o 3). */
  slotsByCycle: Record<number, TimeSlot[]>;
}

/** Retorna el número de ciclo (1, 2 o 3) a partir del nivel de curso (1-6). */
export function cycleFromLevel(courseLevel: number): number {
  return Math.ceil(courseLevel / 2);
}

export interface ScheduleGridEntry {
  id: string;
  dayOfWeek: number;
  slotIndex: number;
  groupId: string;
  groupDisplay: string;
  teacherId: string;
  teacherName: string;
  teacherColorKey: string;
  allocationId: string;
  subjectName: string;
  subjectKey: string;
  subjectShort: string;
  classroomId: string;
  classroomName: string;
  isManualOverride: boolean;
}

export interface ScheduleConflict {
  type: string;
  severity: 'error' | 'warning';
  description: string;
  suggestions: string[];
  groupId: string | null;
  teacherId: string | null;
  dayOfWeek: number | null;
  slotIndex: number | null;
}

export interface MySchedule {
  teacherName: string;
  schoolName: string;
  academicYear: string;
  entries: MyScheduleEntry[];
  slots: TimeSlot[];
}

export interface MyScheduleEntry {
  dayOfWeek: number;
  slotIndex: number;
  slotTime: string;
  subjectName: string;
  subjectKey: string;
  subjectShort: string;
  groupLabel: string;
  teacherId: string;
  teacherName: string;
  classroomName: string;
}

export interface TeacherConstraint {
  id: string;
  teacherId: string;
  teacherName: string;
  constraintType: 'unavailable' | 'preference';
  dayOfWeek: number;
  slotIndex: number;
  weight: number;
  reason: string | null;
}

// ── Constantes de UI ──────────────────────────────────────────────────────────

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;
export const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'] as const;

export const SUBJECT_COLORS: Record<string, { bg: string; fg: string }> = {
  mat: { bg: 'var(--subj-mat)',  fg: 'var(--subj-mat-fg)' },
  len: { bg: 'var(--subj-len)',  fg: 'var(--subj-len-fg)' },
  cie: { bg: 'var(--subj-cie)',  fg: 'var(--subj-cie-fg)' },
  soc: { bg: 'var(--subj-soc)',  fg: 'var(--subj-soc-fg)' },
  ing: { bg: 'var(--subj-ing)',  fg: 'var(--subj-ing-fg)' },
  ef:  { bg: 'var(--subj-ef)',   fg: 'var(--subj-ef-fg)'  },
  art: { bg: 'var(--subj-art)',  fg: 'var(--subj-art-fg)' },
  mus: { bg: 'var(--subj-mus)',  fg: 'var(--subj-mus-fg)' },
  rel: { bg: 'var(--subj-rel)',  fg: 'var(--subj-rel-fg)' },
  tut: { bg: 'var(--subj-tut)',  fg: 'var(--subj-tut-fg)' },
};
