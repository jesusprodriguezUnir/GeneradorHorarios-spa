import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { School, CycleSchedule, SchoolStage } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getMySchool = () => firstValueFrom(this.http.get<School>(`${this.base}/schools/me`));
  updateMySchool = (data: Partial<School>) => firstValueFrom(this.http.put<School>(`${this.base}/schools/me`, data));
  updateCycleSchedule = (cycle: number, data: { morningStart: string; endTime: string; afternoonStart?: string | null }) =>
    firstValueFrom(this.http.put<CycleSchedule>(`${this.base}/schools/me/cycles/${cycle}`, data));
  getStages = () => firstValueFrom(this.http.get<SchoolStage[]>(`${this.base}/schools/me/stages`));
}
