import { SchoolStage, Teacher, CourseGroup } from './models';
import { BlockId, EtapaBlockId, EtapaBlock, BLOCKS } from './blocks.model';

/** Devuelve las etapas que pertenecen al bloque educativo activo. */
export function stagesForBlock(block: BlockId, stages: SchoolStage[]): SchoolStage[] {
  if (block === 'all') return stages;
  return stages.filter(s => {
    const type = s.stageType.toLowerCase();
    if (block === 'inf') return type.includes('inf');
    if (block === 'pri') return type.includes('pri');
    if (block === 'sec') return type.includes('sec') || type.includes('eso');
    return false;
  });
}

/** Devuelve los grupos filtrados por el bloque educativo activo. */
export function groupsByBlock(block: BlockId, stages: SchoolStage[], groups: CourseGroup[]): CourseGroup[] {
  if (block === 'all') return groups;
  const matched = stagesForBlock(block, stages);
  if (matched.length === 0) return [];
  return groups.filter(g => matched.some(s => g.courseLevel >= s.minLevel && g.courseLevel <= s.maxLevel));
}

/** Devuelve los profesores filtrados por el bloque educativo activo. */
export function teachersByBlock(block: BlockId, stages: SchoolStage[], teachers: Teacher[]): Teacher[] {
  if (block === 'all') return teachers;
  const matched = stagesForBlock(block, stages);
  if (matched.length === 0) return [];
  const stageIds = new Set(matched.map(s => s.id));
  return teachers.filter(t => t.stageAssignments?.some(sa => stageIds.has(sa.stageId)));
}

/** Convierte un stageType (string del backend) a un EtapaBlockId. */
export function getEtapaId(stageType: string): EtapaBlockId {
  const type = stageType.toLowerCase();
  if (type.includes('inf')) return 'inf';
  if (type.includes('pri')) return 'pri';
  if (type.includes('sec') || type.includes('eso')) return 'sec';
  return type as EtapaBlockId;
}

/** Devuelve el bloque EtapaBlock completo a partir de un stageType. */
export function getEtapaBlock(stageType: string): EtapaBlock | undefined {
  return BLOCKS.find(b => b.id === getEtapaId(stageType));
}
