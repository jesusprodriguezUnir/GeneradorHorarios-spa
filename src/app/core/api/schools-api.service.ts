import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { School, CycleSchedule, SchoolStage, CycleBreak } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMySchool = () => firstValueFrom(this.http.get<School>(`${this.base}/schools/me`));
  updateMySchool = (data: Partial<School>) => firstValueFrom(this.http.put<School>(`${this.base}/schools/me`, data));
  getCycleSchedule = (cycle: number, periodId?: string | null) => {
    const url = periodId
      ? `${this.base}/schools/me/periods/${periodId}/cycles/${cycle}`
      : `${this.base}/schools/me/cycles/${cycle}`;
    return firstValueFrom(this.http.get<CycleSchedule>(url));
  };

  updateCycleSchedule = (cycle: number, data: {
    morningStart: string;
    morningEnd: string;
    afternoonStart?: string | null;
    afternoonEnd?: string | null;
    breaks?: CycleBreak[];
  }, periodId?: string | null) => {
    const url = periodId
      ? `${this.base}/schools/me/periods/${periodId}/cycles/${cycle}`
      : `${this.base}/schools/me/cycles/${cycle}`;
    return firstValueFrom(this.http.put<CycleSchedule>(url, data));
  };

  getStages = () => firstValueFrom(this.http.get<SchoolStage[]>(`${this.base}/schools/me/stages`));
}
