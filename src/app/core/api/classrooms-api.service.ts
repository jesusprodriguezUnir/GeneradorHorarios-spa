import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Classroom } from '../models';

@Injectable({ providedIn: 'root' })
export class ClassroomsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getClassrooms = () => firstValueFrom(this.http.get<Classroom[]>(`${this.base}/classrooms`));
  createClassroom = (data: Partial<Classroom>) => firstValueFrom(this.http.post<Classroom>(`${this.base}/classrooms`, data));
  updateClassroom = (id: string, data: Partial<Classroom>) => firstValueFrom(this.http.put<Classroom>(`${this.base}/classrooms/${id}`, data));
  deleteClassroom = (id: string) => firstValueFrom(this.http.delete(`${this.base}/classrooms/${id}`));
}
