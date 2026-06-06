import { Component, inject, signal, input, output, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School, SchoolStage } from '../../../core/models';
import { COMMUNITIES, STAGES } from '../config.constants';
import { LecIconComponent } from '../../../shared/ui/lec-icon.component';

@Component({
  selector: 'app-school-section',
  standalone: true,
  imports: [CommonModule, FormsModule, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './school-section.component.html',
  styleUrls: ['./school-section.component.scss']
})
export class SchoolSectionComponent {
  private readonly api = inject(SchoolsApiService);

  readonly school = input.required<School | null>();
  readonly schoolStages = input<SchoolStage[]>([]);
  readonly schoolChange = output<School>();
  readonly goCiclos = output<void>();

  readonly savingSchool = signal(false);
  readonly savedSchool = signal(false);

  readonly communities = COMMUNITIES;
  readonly stages = STAGES;
  readonly courseLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  readonly selectedStages = signal<string[]>([]);

  readonly daysConfig = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
  ];

  schoolForm = {
    name: '',
    centerCode: '',
    locality: '',
    community: 'madrid',
    minCourseLevel: 1,
    maxCourseLevel: 6,
    academicYear: '2025/2026',
    scheduleType: 'continua' as 'continua' | 'partida',
    morningStart: '09:00',
    afternoonStart: '15:00',
    slotMinutes: 60,
    breakAfterSlot: 2,
    breakMinutes: 30,
    workingDays: [1, 2, 3, 4, 5],
  };

  readonly schoolInitials = computed(() => {
    const name = this.school()?.name || this.schoolForm.name || '';
    return name.split(/\s+/)
      .filter(w => w.length > 1)
      .slice(0, 3)
      .map(w => w[0].toUpperCase())
      .join('') || '?';
  });

  readonly communityLabel = computed(() => {
    const val = this.schoolForm.community;
    return this.communities.find(c => c.value === val)?.label ?? val;
  });

  readonly stageLabel = computed(() => {
    const current = this.selectedStages();
    if (!current || current.length === 0) return 'Sin etapas';
    return current
      .map(val => this.stages.find(s => s.value === val)?.label ?? val)
      .join(' · ');
  });

  readonly journeyLabel = computed(() =>
    this.schoolForm.scheduleType === 'continua' ? 'Continua' : 'Partida'
  );

  readonly courseRange = computed(() => {
    const current = this.selectedStages();
    if (!current || current.length === 0) return '—';

    const parts: string[] = [];
    if (current.includes('infantil')) {
      parts.push('Infantil (3-5 años)');
    }
    if (current.includes('primaria')) {
      parts.push('1º – 6º Primaria');
    }
    if (current.includes('secundaria')) {
      parts.push('1º – 4º ESO');
    }
    if (current.includes('bachillerato')) {
      parts.push('1º – 2º Bachillerato');
    }
    return parts.join(' · ');
  });

  constructor() {
    effect(() => {
      const s = this.school();
      const stages = this.schoolStages();
      if (s) this.syncFormFromSchool(s, stages);
    });
  }

  private syncFormFromSchool(s: School, stages: SchoolStage[]): void {
    if (stages && stages.length > 0) {
      this.selectedStages.set(stages.map(st => st.stageType.toLowerCase()));
    } else if (s.stage) {
      this.selectedStages.set(s.stage.split(',').map(t => t.trim().toLowerCase()));
    } else {
      this.selectedStages.set([]);
    }
    this.schoolForm = {
      name: s.name,
      centerCode: s.centerCode ?? '',
      locality: s.locality ?? '',
      community: s.community,
      minCourseLevel: s.minCourseLevel,
      maxCourseLevel: s.maxCourseLevel,
      academicYear: s.academicYear,
      scheduleType: s.scheduleType,
      morningStart: s.morningStart,
      afternoonStart: s.afternoonStart ?? '15:00',
      slotMinutes: s.slotMinutes,
      breakAfterSlot: s.breakAfterSlot,
      breakMinutes: s.breakMinutes,
      workingDays: [...s.workingDays],
    };
  }

  toggleStageSelection(val: string): void {
    this.selectedStages.update(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  }

  toggleDay(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.schoolForm.workingDays = [...this.schoolForm.workingDays, day].sort((a, b) => a - b);
    } else {
      this.schoolForm.workingDays = this.schoolForm.workingDays.filter(d => d !== day);
    }
  }

  selectSlotMinutes(min: number): void {
    this.schoolForm.slotMinutes = min;
  }

  async saveSchool(): Promise<void> {
    if (this.savingSchool()) return;
    this.savingSchool.set(true);
    this.savedSchool.set(false);

    const updated = await this.api.updateMySchool({
      name: this.schoolForm.name,
      centerCode: this.schoolForm.centerCode || null,
      locality: this.schoolForm.locality || null,
      community: this.schoolForm.community,
      stage: this.selectedStages().join(','),
      minCourseLevel: this.schoolForm.minCourseLevel,
      maxCourseLevel: this.schoolForm.maxCourseLevel,
      academicYear: this.schoolForm.academicYear,
      scheduleType: this.schoolForm.scheduleType,
      morningStart: this.schoolForm.morningStart,
      afternoonStart: this.schoolForm.scheduleType === 'partida' ? this.schoolForm.afternoonStart : '',
      slotMinutes: this.schoolForm.slotMinutes,
      breakAfterSlot: this.schoolForm.breakAfterSlot,
      breakMinutes: this.schoolForm.breakMinutes,
      workingDays: this.schoolForm.workingDays,
    } as any).catch(() => null);

    this.savingSchool.set(false);
    if (updated) {
      this.schoolChange.emit(updated);
      this.savedSchool.set(true);
      setTimeout(() => this.savedSchool.set(false), 3000);
    }
  }
}
