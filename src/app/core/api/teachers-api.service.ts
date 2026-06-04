import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Teacher } from '../models';

@Injectable({ providedIn: 'root' })
export class TeachersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getTeachers = () => firstValueFrom(this.http.get<Teacher[]>(`${this.base}/teachers`));
  createTeacher = (data: Partial<Teacher>) => firstValueFrom(this.http.post<Teacher>(`${this.base}/teachers`, data));
  updateTeacher = (id: string, data: Partial<Teacher>) => firstValueFrom(this.http.put<Teacher>(`${this.base}/teachers/${id}`, data));
  deleteTeacher = (id: string) => firstValueFrom(this.http.delete(`${this.base}/teachers/${id}`));
}
