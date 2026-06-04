import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeacherConstraint } from '../models';

@Injectable({ providedIn: 'root' })
export class ConstraintsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getConstraints = () => firstValueFrom(this.http.get<TeacherConstraint[]>(`${this.base}/constraints`));
  getTeacherConstraints = (teacherId: string) =>
    firstValueFrom(this.http.get<TeacherConstraint[]>(`${this.base}/constraints/teacher/${teacherId}`));
  createConstraint = (data: Partial<TeacherConstraint>) =>
    firstValueFrom(this.http.post<TeacherConstraint>(`${this.base}/constraints`, data));
  deleteConstraint = (id: string) => firstValueFrom(this.http.delete(`${this.base}/constraints/${id}`));
}
