import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubjectAllocation } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getSubjects = () => firstValueFrom(this.http.get<SubjectAllocation[]>(`${this.base}/subjects`));
  cloneOfficialTemplate = () => firstValueFrom(this.http.post<SubjectAllocation[]>(`${this.base}/subjects/clone-official`, {}));
  createSubject = (data: Partial<SubjectAllocation>) => firstValueFrom(this.http.post<SubjectAllocation>(`${this.base}/subjects`, data));
  updateSubject = (id: string, data: Partial<SubjectAllocation>) => firstValueFrom(this.http.put<SubjectAllocation>(`${this.base}/subjects/${id}`, data));
  deleteSubject = (id: string) => firstValueFrom(this.http.delete(`${this.base}/subjects/${id}`));
  updateSubjectHours = (id: string, hours: number) =>
    firstValueFrom(this.http.put<SubjectAllocation>(`${this.base}/subjects/${id}/hours`, { weeklyHoursDefault: hours }));
}
