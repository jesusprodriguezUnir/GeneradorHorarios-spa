import {
  Component, inject, signal, computed, input, output,
  ChangeDetectionStrategy, untracked, afterNextRender,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { GroupsApiService } from '../../../core/api/groups-api.service';
import {
  CourseGroup, Teacher, Classroom, SubjectAllocation,
  School, SchoolStage,
} from '../../../core/models';

export const GROUP_PALETTE = [
  { key: 'indigo', dot: 'oklch(0.45 0.135 272)', bg: 'oklch(0.95 0.035 272)', fg: 'oklch(0.39 0.14 275)' },
  { key: 'coral',  dot: 'oklch(0.64 0.15 40)',   bg: 'oklch(0.95 0.05 40)',   fg: 'oklch(0.42 0.13 38)'  },
  { key: 'teal',   dot: 'oklch(0.55 0.11 205)',  bg: 'oklch(0.93 0.055 200)', fg: 'oklch(0.36 0.10 205)' },
  { key: 'green',  dot: 'oklch(0.58 0.13 155)',  bg: 'oklch(0.93 0.06 155)',  fg: 'oklch(0.34 0.10 160)' },
  { key: 'amber',  dot: 'oklch(0.70 0.13 65)',   bg: 'oklch(0.93 0.055 65)',  fg: 'oklch(0.40 0.10 60)'  },
  { key: 'violet', dot: 'oklch(0.55 0.14 300)',  bg: 'oklch(0.92 0.06 300)',  fg: 'oklch(0.42 0.12 300)' },
];

@Component({
  selector: 'app-groups-section',
  standalone: true,
  imports: [FormsModule, Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './groups-section.component.html',
  styleUrls: ['./groups-section.component.scss'],
})
export class GroupsSectionComponent {
  private readonly api = inject(GroupsApiService);
  private readonly msg = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  readonly school = input.required<School | null>();
  readonly groups = input.required<CourseGroup[]>();
  readonly groupsChange = output<CourseGroup[]>();
  readonly teachers = input.required<Teacher[]>();
  readonly classrooms = input.required<Classroom[]>();
  readonly subjects = input.required<SubjectAllocation[]>();
  readonly stages = input<SchoolStage[]>([]);

  readonly isGroupModalOpen = signal(false);
  readonly editingGroup = signal<CourseGroup | null>(null);
  readonly searchQuery = signal('');
  readonly stageCycleFilters = signal<Record<string, number | null>>({});
  readonly openAccordions = signal<Set<string>>(new Set<string>());
  readonly isTutorDropdownOpen = signal(false);

  readonly palette = GROUP_PALETTE;
  readonly Math = Math;

  groupForm = signal({
    groupLabel: '',
    stageId: '',
    courseLevel: 1,
    colorKey: 'indigo',
    studentCount: 25,
    tutorId: '',
    homeClassroomId: '',
    subjectHours: {} as Record<string, number>,
    selectedCiclo: 1,
  });

  // ── Maps computed once per groups/search change ───────────────────────────

  readonly groupsMap = computed(() => {
    const map: Record<string, CourseGroup[]> = {};
    for (const g of this.groups()) {
      if (g.stageId) {
        (map[g.stageId] ??= []).push(g);
      }
    }
    return map;
  });

  readonly filteredGroupsMap = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filters = this.stageCycleFilters();
    const map = this.groupsMap();
    const out: Record<string, CourseGroup[]> = {};
    for (const [sid, gs] of Object.entries(map)) {
      const cycle = filters[sid] ?? null;
      out[sid] = gs.filter(g => {
        if (cycle !== null) {
          const cNum = this.cycleNumberForGroup(g);
          if (cNum !== cycle) return false;
        }
        if (q) {
          return (g.displayName + ' ' + (g.tutorName ?? '')).toLowerCase().includes(q);
        }
        return true;
      });
    }
    return out;
  });

  // ── Ciclo / curso options for modal ──────────────────────────────────────

  readonly cicloOptionsForStage = computed(() => {
    const stageId = this.groupForm().stageId;
    const stage = this.stages().find(s => s.id === stageId);
    if (!stage) return [];
    const seen = new Set<number>();
    for (let l = stage.minLevel; l <= stage.maxLevel; l++) {
      seen.add(this.cicloForLevel(l, stage));
    }
    return [...seen].map(c => ({ value: c, label: this.cicloLabel(c) }));
  });

  readonly courseOptionsForStage = computed(() => {
    const { stageId, selectedCiclo } = this.groupForm();
    const stage = this.stages().find(s => s.id === stageId);
    if (!stage) return [];
    const opts: { value: number; label: string }[] = [];
    for (let l = stage.minLevel; l <= stage.maxLevel; l++) {
      if (this.cicloForLevel(l, stage) === selectedCiclo) {
        opts.push({ value: l, label: `${l}º` });
      }
    }
    return opts;
  });

  // ── Subjects in / out of form carga ──────────────────────────────────────

  readonly activeSubjects = computed(() => {
    const sh = this.groupForm().subjectHours;
    return this.subjects().filter(s => s.subjectKey in sh);
  });

  readonly inactiveSubjects = computed(() => {
    const f = this.groupForm();
    const sh = f.subjectHours;
    return this.subjects().filter(s => {
      if (s.subjectKey in sh) return false;
      if (s.courseLevel && s.courseLevel !== f.courseLevel) return false;
      if (s.cycle && !s.courseLevel && s.cycle !== f.selectedCiclo) return false;
      return true;
    });
  });

  // ── Init: open first accordion ────────────────────────────────────────────

  constructor() {
    afterNextRender(() => {
      const first = this.stages()[0];
      if (first && this.openAccordions().size === 0) {
        this.openAccordions.set(new Set([first.id]));
      }
    });
  }

  // ── Accordion helpers ─────────────────────────────────────────────────────

  isStageOpen(stageId: string): boolean {
    return this.openAccordions().has(stageId);
  }

  toggleStage(stageId: string): void {
    this.openAccordions.update(set => {
      const next = new Set(set);
      if (next.has(stageId)) { next.delete(stageId); } else { next.add(stageId); }
      return next;
    });
  }

  filteredForStage(stageId: string): CourseGroup[] {
    return this.filteredGroupsMap()[stageId] ?? [];
  }

  allForStage(stageId: string): CourseGroup[] {
    return this.groupsMap()[stageId] ?? [];
  }

  stageTotalStudents(stageId: string): number {
    return this.allForStage(stageId).reduce((s, g) => s + g.studentCount, 0);
  }

  stageGroupsConfigured(stageId: string): number {
    return this.allForStage(stageId).filter(g => this.getCarga(g)).length;
  }

  // ── Visual helpers ────────────────────────────────────────────────────────

  getCarga(g: CourseGroup): { totalH: number; nSubjects: number } | null {
    if (!g.subjectHours) return null;
    const entries = Object.entries(g.subjectHours).filter(([, h]) => h > 0);
    if (!entries.length) return null;
    return { totalH: entries.reduce((s, [, h]) => s + h, 0), nSubjects: entries.length };
  }

  getGroupPal(g: CourseGroup): { bg: string; fg: string; dot: string } {
    const key = g.colorKey
      || this.defaultColorForStage(this.stages().find(s => s.id === g.stageId)?.stageType ?? '');
    return GROUP_PALETTE.find(p => p.key === key) ?? GROUP_PALETTE[0];
  }

  getStageColor(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return 'oklch(0.64 0.15 40)';
    if (t.includes('sec') || t.includes('eso')) return 'oklch(0.55 0.11 205)';
    return 'var(--primary)';
  }

  getStageColorTint(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return 'oklch(0.95 0.05 40)';
    if (t.includes('sec') || t.includes('eso')) return 'oklch(0.93 0.055 200)';
    return 'var(--primary-tint)';
  }

  getStageAgeRange(stage: SchoolStage): string {
    const t = stage.stageType.toLowerCase();
    if (t.includes('inf')) return '3 – 6 años';
    if (t.includes('sec') || t.includes('eso')) return '12 – 16 años';
    return '6 – 12 años';
  }

  defaultColorForStage(stageType: string): string {
    const t = stageType.toLowerCase();
    if (t.includes('inf')) return 'coral';
    if (t.includes('sec') || t.includes('eso')) return 'teal';
    return 'indigo';
  }

  // ── Tutor helpers ─────────────────────────────────────────────────────────

  tutorInitials(tutorId: string | null): string {
    if (!tutorId) return '';
    const t = this.teachers().find(x => x.id === tutorId);
    if (!t) return '';
    const p = t.fullName.trim().split(' ');
    return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase();
  }

  tutorColorKey(tutorId: string | null): string {
    if (!tutorId) return 'mat';
    return this.teachers().find(x => x.id === tutorId)?.colorKey ?? 'mat';
  }

  tutorName(tutorId: string | null): string {
    return this.teachers().find(x => x.id === tutorId)?.fullName ?? '';
  }

  getClassroomName(id: string | null): string {
    if (!id) return '—';
    return this.classrooms().find(c => c.id === id)?.name ?? '—';
  }

  // ── Ciclo helpers ─────────────────────────────────────────────────────────

  cicloForLevel(level: number, stage: SchoolStage): number {
    return Math.ceil((level - stage.minLevel + 1) / 2);
  }

  cicloLabel(n: number): string {
    return n === 1 ? '1.er ciclo' : n === 2 ? '2.º ciclo' : '3.er ciclo';
  }

  cicloForGroup(g: CourseGroup): string {
    const stage = this.stages().find(s => s.id === g.stageId);
    if (!stage) return '';
    return this.cicloLabel(this.cicloForLevel(g.courseLevel, stage));
  }

  cycleNumberForGroup(g: CourseGroup): number | null {
    const stage = this.stages().find(s => s.id === g.stageId);
    if (!stage) return null;
    return this.cicloForLevel(g.courseLevel, stage);
  }

  cyclesForStage(stage: SchoolStage): number[] {
    const minCycle = 1;
    const maxCycle = Math.ceil((stage.maxLevel - stage.minLevel + 1) / 2);
    const out = [];
    for(let i = minCycle; i <= maxCycle; i++) out.push(i);
    return out;
  }

  cycleFilterFor(stageId: string): number | null {
    return this.stageCycleFilters()[stageId] ?? null;
  }

  setCycleFilter(stageId: string, cycle: number | null): void {
    this.stageCycleFilters.update(prev => ({ ...prev, [stageId]: cycle }));
  }

  // ── Carga lectiva ─────────────────────────────────────────────────────────

  totalHours(): number {
    return Object.values(this.groupForm().subjectHours).reduce((s, h) => s + (h || 0), 0);
  }

  targetHours(): number {
    const stage = this.stages().find(s => s.id === this.groupForm().stageId);
    return (stage?.stageType.toLowerCase().includes('sec') || stage?.stageType.toLowerCase().includes('eso'))
      ? 30 : 25;
  }

  loadTemplate(): void {
    const hours: Record<string, number> = {};
    const f = untracked(this.groupForm);
    for (const s of this.subjects()) {
      if (s.courseLevel && s.courseLevel !== f.courseLevel) continue;
      if (s.cycle && !s.courseLevel && s.cycle !== f.selectedCiclo) continue;
      hours[s.subjectKey] = s.weeklyHoursDefault;
    }
    this.groupForm.update(prev => ({ ...prev, subjectHours: hours }));
  }

  adjustSubjectHours(key: string, delta: number): void {
    this.groupForm.update(f => {
      const s = this.subjects().find(x => x.subjectKey === key);
      const min = s?.weeklyHoursMin ?? 0;
      const max = s?.weeklyHoursMax ?? 12;
      const next = Math.max(min, Math.min(max, (f.subjectHours[key] ?? 0) + delta));
      return { ...f, subjectHours: { ...f.subjectHours, [key]: next } };
    });
  }

  removeSubject(key: string): void {
    this.groupForm.update(f => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = f.subjectHours;
      return { ...f, subjectHours: rest };
    });
  }

  addSubject(event: Event): void {
    const sel = event.target as HTMLSelectElement;
    const key = sel.value;
    sel.value = '';
    if (!key) return;
    const s = this.subjects().find(x => x.subjectKey === key);
    if (!s) return;
    this.groupForm.update(f => ({
      ...f,
      subjectHours: { ...f.subjectHours, [key]: s.weeklyHoursDefault },
    }));
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openAddModal(stageId?: string): void {
    this.editingGroup.set(null);
    const sid = stageId ?? this.stages()[0]?.id ?? '';
    const stage = this.stages().find(s => s.id === sid);
    const defaultColor = this.defaultColorForStage(stage?.stageType ?? '');
    const defaultLevel = stage?.minLevel ?? 1;
    const defaultCiclo = stage ? this.cicloForLevel(defaultLevel, stage) : 1;
    this.groupForm.set({
      groupLabel: '',
      stageId: sid,
      courseLevel: defaultLevel,
      colorKey: defaultColor,
      studentCount: 25,
      tutorId: '',
      homeClassroomId: '',
      subjectHours: {},
      selectedCiclo: defaultCiclo,
    });
    this.isTutorDropdownOpen.set(false);
    this.isGroupModalOpen.set(true);
  }

  editGroup(g: CourseGroup): void {
    this.editingGroup.set(g);
    const stage = this.stages().find(s => s.id === g.stageId);
    const sh: Record<string, number> = g.subjectHours ? { ...g.subjectHours } : {};
    const ciclo = stage ? this.cicloForLevel(g.courseLevel, stage) : 1;
    this.groupForm.set({
      groupLabel: g.groupLabel,
      stageId: g.stageId ?? '',
      courseLevel: g.courseLevel,
      colorKey: g.colorKey ?? this.defaultColorForStage(stage?.stageType ?? ''),
      studentCount: g.studentCount,
      tutorId: g.tutorId ?? '',
      homeClassroomId: g.homeClassroomId ?? '',
      subjectHours: sh,
      selectedCiclo: ciclo,
    });
    this.isTutorDropdownOpen.set(false);
    this.isGroupModalOpen.set(true);
  }

  onStageChange(stageId: string): void {
    const stage = this.stages().find(s => s.id === stageId);
    if (!stage) return;
    const level = stage.minLevel;
    this.groupForm.update(f => ({
      ...f,
      stageId,
      courseLevel: level,
      colorKey: this.defaultColorForStage(stage.stageType),
      selectedCiclo: this.cicloForLevel(level, stage),
    }));
  }

  onCicloChange(ciclo: number): void {
    const stage = this.stages().find(s => s.id === this.groupForm().stageId);
    if (!stage) return;
    for (let l = stage.minLevel; l <= stage.maxLevel; l++) {
      if (this.cicloForLevel(l, stage) === +ciclo) {
        this.groupForm.update(f => ({ ...f, selectedCiclo: +ciclo, courseLevel: l }));
        return;
      }
    }
  }

  onCourseLevelChange(level: number): void {
    const stage = this.stages().find(s => s.id === this.groupForm().stageId);
    const ciclo = stage ? this.cicloForLevel(+level, stage) : 1;
    this.groupForm.update(f => ({ ...f, courseLevel: +level, selectedCiclo: ciclo }));
  }

  adjustStudentCount(delta: number): void {
    this.groupForm.update(f => ({
      ...f,
      studentCount: Math.max(1, Math.min(100, f.studentCount + delta)),
    }));
  }

  async saveGroup(): Promise<void> {
    const form = this.groupForm();
    if (!form.groupLabel.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre del grupo es obligatorio.' });
      return;
    }
    const editing = this.editingGroup();
    const payload: Partial<CourseGroup> = {
      courseLevel: Number(form.courseLevel),
      groupLabel: form.groupLabel.trim(),
      studentCount: Number(form.studentCount),
      stageId: form.stageId || undefined,
      tutorId: form.tutorId || null,
      homeClassroomId: form.homeClassroomId || null,
      subjectHours: form.subjectHours,
      ...(form.colorKey ? { colorKey: form.colorKey } : {}),
    };
    try {
      if (editing) {
        await this.api.updateGroup(editing.id, payload);
      } else {
        await this.api.createGroup(payload);
      }
      const updated = await this.api.getGroups();
      this.groupsChange.emit(updated);
      this.isGroupModalOpen.set(false);
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error al guardar', detail: 'No se pudo guardar el grupo.' });
    }
  }

  deleteGroup(g: CourseGroup): void {
    this.confirmation.confirm({
      message: `¿Eliminar el grupo ${g.displayName}? Esta acción no se puede deshacer.`,
      header: 'Eliminar grupo',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.api.deleteGroup(g.id).catch(() => {});
        const updated = await this.api.getGroups();
        this.groupsChange.emit(updated);
        this.msg.add({ severity: 'success', summary: 'Grupo eliminado', detail: `${g.displayName} eliminado correctamente.` });
      },
    });
  }
}
