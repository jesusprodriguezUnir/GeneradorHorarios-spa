import { Injectable, signal } from '@angular/core';
import {
  PeriodId, PeriodScheduleState, ScheduleStateByPeriod,
} from './periods.model';

@Injectable({ providedIn: 'root' })
export class PeriodStateService {
  private readonly _activePeriod = signal<PeriodId>(
    (localStorage.getItem('lectivo-period') as PeriodId) ?? 'completa',
  );
  readonly activePeriod = this._activePeriod.asReadonly();

  private readonly _schedByPeriod = signal<ScheduleStateByPeriod>({
    completa: 'none',
    reducida: 'none',
  });
  readonly schedByPeriod = this._schedByPeriod.asReadonly();

  setActivePeriod(id: PeriodId): void {
    localStorage.setItem('lectivo-period', id);
    this._activePeriod.set(id);
  }

  setPeriodState(id: PeriodId, state: PeriodScheduleState): void {
    this._schedByPeriod.update(prev => ({ ...prev, [id]: state }));
  }
}
