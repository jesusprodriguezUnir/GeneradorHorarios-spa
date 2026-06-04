import { Component, inject, signal, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { School, CycleSchedule } from '../../../core/models';
import { COMMUNITIES, STAGES } from '../config.constants';

@Component({
  selector: 'app-school-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './school-section.component.html',
  styleUrls: ['./school-section.component.scss']
})
export class SchoolSectionComponent {
  private readonly api = inject(SchoolsApiService);

  readonly school = input.required<School | null>();
  readonly schoolChange = output<School>();

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

  cycleForms: {
    cycle: number;
    morningStart: string;
    endTime: string;
    afternoonStart: string;
    saving: boolean;
    saved: boolean;
    error: string | null;
  }[] = [1, 2, 3].map(c => ({
    cycle: c,
    morningStart: '09:00',
    endTime: '14:30',
    afternoonStart: '15:00',
    saving: false,
    saved: false,
    error: null,
  }));

  constructor() {
    effect(() => {
      const s = this.school();
      if (s) {
        this.syncFormFromSchool(s);
      }
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

    for (const cf of this.cycleForms) {
      const serverCycle = s.cycles?.find((c: CycleSchedule) => c.cycle === cf.cycle);
      if (serverCycle) {
        cf.morningStart = serverCycle.morningStart;
        cf.endTime = serverCycle.endTime;
        cf.afternoonStart = serverCycle.afternoonStart ?? '15:00';
      } else {
        cf.morningStart = s.morningStart;
        cf.endTime = this.computedEndTime(s.morningStart);
        cf.afternoonStart = s.afternoonStart ?? '15:00';
      }
    }
  }

  toggleDay(day: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.schoolForm.workingDays = [...this.schoolForm.workingDays, day].sort((a, b) => a - b);
    } else {
      this.schoolForm.workingDays = this.schoolForm.workingDays.filter(d => d !== day);
    }
  }

  computedMorningEndTime(morningStart: string): string {
    const s = this.school();
    if (!s || !morningStart) return '';
    const [h, m] = morningStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    let totalMinutes = h * 60 + m;
    const isPartida = this.schoolForm.scheduleType === 'partida';
    const morningSlots = isPartida ? s.slotsPerDay - s.afternoonSlots : s.slotsPerDay;

    for (let i = 0; i < morningSlots; i++) {
      if (i === s.breakAfterSlot) totalMinutes += s.breakMinutes;
      totalMinutes += s.slotMinutes;
    }

    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  computedAfternoonEndTime(afternoonStart: string): string {
    const s = this.school();
    if (!s || !afternoonStart) return '';
    const [h, m] = afternoonStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    let totalMinutes = h * 60 + m;
    const isPartida = this.schoolForm.scheduleType === 'partida';
    if (!isPartida) return '';

    for (let i = 0; i < s.afternoonSlots; i++) {
      totalMinutes += s.slotMinutes;
    }

    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  }

  computedEndTime(morningStart: string): string {
    return this.computedMorningEndTime(morningStart);
  }

  cycleLabel(cycle: number): string {
    const labels: Record<number, string> = {
      1: '1er ciclo · 1º y 2º',
      2: '2.º ciclo · 3º y 4º',
      3: '3er ciclo · 5º y 6º',
    };
    return labels[cycle] ?? `Ciclo ${cycle}`;
  }

  async saveCycle(cycle: number): Promise<void> {
    const form = this.cycleForms.find(c => c.cycle === cycle);
    if (!form || form.saving) return;
    form.saving = true;
    form.saved = false;
    form.error = null;

    const isPartida = this.schoolForm.scheduleType === 'partida';
    form.endTime = isPartida
      ? this.computedAfternoonEndTime(form.afternoonStart)
      : this.computedMorningEndTime(form.morningStart);

    try {
      const updated = await this.api.updateCycleSchedule(cycle, {
        morningStart: form.morningStart,
        endTime: form.endTime,
        afternoonStart: isPartida ? form.afternoonStart : null,
      });
      form.morningStart = updated.morningStart;
      form.endTime = updated.endTime;
      form.saved = true;
      
      // Update parent school
      const currentSchool = this.school();
      if (currentSchool) {
        const updatedCycles = currentSchool.cycles.map(c => c.cycle === cycle ? updated : c);
        this.schoolChange.emit({
          ...currentSchool,
          cycles: updatedCycles
        });
      }
      
      setTimeout(() => { form.saved = false; }, 3000);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      form.error = e?.error?.message ?? 'Error al guardar el ciclo.';
    } finally {
      form.saving = false;
    }
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
