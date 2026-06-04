import { Component, inject, signal, input, output, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School } from '../../../core/models';
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
  readonly schoolChange = output<School>();
  readonly goCiclos = output<void>();

  readonly savingSchool = signal(false);
  readonly savedSchool = signal(false);

  readonly communities = COMMUNITIES;
  readonly stages = STAGES;
  readonly courseLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
    stage: 'primaria',
    minCourseLevel: 1,
    maxCourseLevel: 6,
    academicYear: '2025/2026',
    scheduleType: 'continua' as 'continua' | 'partida',
    morningStart: '09:00',
    afternoonStart: '15:00',
    slotMinutes: 60,
    breakAfterSlot: 2,
    breakMinutes: 30,
    slotsPerDay: 5,
    afternoonSlots: 0,
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
    const val = this.schoolForm.stage;
    return this.stages.find(s => s.value === val)?.label ?? val;
  });

  readonly hoursPerWeek = computed(() => {
    const mins = this.schoolForm.slotsPerDay * this.schoolForm.slotMinutes * this.schoolForm.workingDays.length;
    const h = mins / 60;
    return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
  });

  readonly journeyLabel = computed(() =>
    this.schoolForm.scheduleType === 'continua' ? 'Continua' : 'Partida'
  );

  readonly courseRange = computed(() =>
    `${this.schoolForm.minCourseLevel}º – ${this.schoolForm.maxCourseLevel}º`
  );

  constructor() {
    effect(() => {
      const s = this.school();
      if (s) this.syncFormFromSchool(s);
    });
  }

  private syncFormFromSchool(s: School): void {
    this.schoolForm = {
      name: s.name,
      centerCode: s.centerCode ?? '',
      locality: s.locality ?? '',
      community: s.community,
      stage: s.stage,
      minCourseLevel: s.minCourseLevel,
      maxCourseLevel: s.maxCourseLevel,
      academicYear: s.academicYear,
      scheduleType: s.scheduleType,
      morningStart: s.morningStart,
      afternoonStart: s.afternoonStart ?? '15:00',
      slotMinutes: s.slotMinutes,
      breakAfterSlot: s.breakAfterSlot,
      breakMinutes: s.breakMinutes,
      slotsPerDay: s.slotsPerDay,
      afternoonSlots: s.afternoonSlots,
      workingDays: [...s.workingDays],
    };
  }

  toggleDay(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.schoolForm.workingDays = [...this.schoolForm.workingDays, day].sort((a, b) => a - b);
    } else {
      this.schoolForm.workingDays = this.schoolForm.workingDays.filter(d => d !== day);
    }
  }

  adjustSlotsPerDay(delta: number): void {
    const v = Math.max(3, Math.min(9, this.schoolForm.slotsPerDay + delta));
    this.schoolForm.slotsPerDay = v;
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
      stage: this.schoolForm.stage,
      minCourseLevel: this.schoolForm.minCourseLevel,
      maxCourseLevel: this.schoolForm.maxCourseLevel,
      academicYear: this.schoolForm.academicYear,
      scheduleType: this.schoolForm.scheduleType,
      morningStart: this.schoolForm.morningStart,
      afternoonStart: this.schoolForm.scheduleType === 'partida' ? this.schoolForm.afternoonStart : '',
      slotMinutes: this.schoolForm.slotMinutes,
      breakAfterSlot: this.schoolForm.breakAfterSlot,
      breakMinutes: this.schoolForm.breakMinutes,
      slotsPerDay: this.schoolForm.slotsPerDay,
      afternoonSlots: this.schoolForm.scheduleType === 'partida' ? this.schoolForm.afternoonSlots : 0,
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
