import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignmentSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class AssignmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getAssignments = () => firstValueFrom(this.http.get<AssignmentSummary[]>(`${this.base}/assignments`));
}
