import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseGroup } from '../models';

@Injectable({ providedIn: 'root' })
export class GroupsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getGroups = () => firstValueFrom(this.http.get<CourseGroup[]>(`${this.base}/groups`));
  createGroup = (data: Partial<CourseGroup>) => firstValueFrom(this.http.post<CourseGroup>(`${this.base}/groups`, data));
  updateGroup = (id: string, data: Partial<CourseGroup>) => firstValueFrom(this.http.put<CourseGroup>(`${this.base}/groups/${id}`, data));
  deleteGroup = (id: string) => firstValueFrom(this.http.delete(`${this.base}/groups/${id}`));
}
