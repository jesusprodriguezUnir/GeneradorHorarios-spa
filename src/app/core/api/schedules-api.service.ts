import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScheduleList, ScheduleGrid, MySchedule } from '../models';

@Injectable({ providedIn: 'root' })
export class SchedulesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getSchedules = () => firstValueFrom(this.http.get<ScheduleList[]>(`${this.base}/schedules`));
  getSchedule = (id: string) => firstValueFrom(this.http.get<ScheduleGrid>(`${this.base}/schedules/${id}`));
  getMySchedule = () => firstValueFrom(this.http.get<MySchedule>(`${this.base}/schedules/me`));
  generateSchedule = (academicYear: string, timeoutSeconds = 30) =>
    firstValueFrom(this.http.post<{ scheduleId: string; status: string; totalAssigned: number; totalRequired: number; totalConflicts: number }>(
      `${this.base}/schedules/generate`,
      { academicYear, timeoutSeconds }
    ));
  publishSchedule = (id: string) =>
    firstValueFrom(this.http.post<{ message: string }>(`${this.base}/schedules/${id}/publish`, {}));
  updateScheduleEntry = (scheduleId: string, entryId: string, teacherId: string, classroomId: string) =>
    firstValueFrom(this.http.put(`${this.base}/schedules/${scheduleId}/entries/${entryId}`, { teacherId, classroomId }));
}
