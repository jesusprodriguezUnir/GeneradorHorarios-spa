import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  School, CycleSchedule, Teacher, CourseGroup, Classroom, SubjectAllocation,
  AssignmentSummary, ScheduleList, ScheduleGrid, MySchedule,
  TeacherConstraint
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── School ────────────────────────────────────────────────────────────────
  getMySchool = () => firstValueFrom(this.http.get<School>(`${this.base}/schools/me`));
  updateMySchool = (data: Partial<School>) => firstValueFrom(this.http.put<School>(`${this.base}/schools/me`, data));
  updateCycleSchedule = (cycle: number, data: { morningStart: string; endTime: string; afternoonStart?: string | null }) =>
    firstValueFrom(this.http.put<CycleSchedule>(`${this.base}/schools/me/cycles/${cycle}`, data));

  // ── Teachers ──────────────────────────────────────────────────────────────
  getTeachers = () => firstValueFrom(this.http.get<Teacher[]>(`${this.base}/teachers`));
  createTeacher = (data: Partial<Teacher>) => firstValueFrom(this.http.post<Teacher>(`${this.base}/teachers`, data));
  updateTeacher = (id: string, data: Partial<Teacher>) => firstValueFrom(this.http.put<Teacher>(`${this.base}/teachers/${id}`, data));
  deleteTeacher = (id: string) => firstValueFrom(this.http.delete(`${this.base}/teachers/${id}`));

  // ── Groups ────────────────────────────────────────────────────────────────
  getGroups = () => firstValueFrom(this.http.get<CourseGroup[]>(`${this.base}/groups`));
  createGroup = (data: Partial<CourseGroup>) => firstValueFrom(this.http.post<CourseGroup>(`${this.base}/groups`, data));
  updateGroup = (id: string, data: Partial<CourseGroup>) => firstValueFrom(this.http.put<CourseGroup>(`${this.base}/groups/${id}`, data));
  deleteGroup = (id: string) => firstValueFrom(this.http.delete(`${this.base}/groups/${id}`));

  // ── Classrooms ────────────────────────────────────────────────────────────
  getClassrooms = () => firstValueFrom(this.http.get<Classroom[]>(`${this.base}/classrooms`));
  createClassroom = (data: Partial<Classroom>) => firstValueFrom(this.http.post<Classroom>(`${this.base}/classrooms`, data));
  updateClassroom = (id: string, data: Partial<Classroom>) => firstValueFrom(this.http.put<Classroom>(`${this.base}/classrooms/${id}`, data));
  deleteClassroom = (id: string) => firstValueFrom(this.http.delete(`${this.base}/classrooms/${id}`));

  // ── Subjects ──────────────────────────────────────────────────────────────
  getSubjects = () => firstValueFrom(this.http.get<SubjectAllocation[]>(`${this.base}/subjects`));
  updateSubjectHours = (id: string, hours: number) =>
    firstValueFrom(this.http.put<SubjectAllocation>(`${this.base}/subjects/${id}/hours`, { weeklyHoursDefault: hours }));

  // ── Assignments ───────────────────────────────────────────────────────────
  getAssignments = () => firstValueFrom(this.http.get<AssignmentSummary[]>(`${this.base}/assignments`));

  // ── Constraints ───────────────────────────────────────────────────────────
  getConstraints = () => firstValueFrom(this.http.get<TeacherConstraint[]>(`${this.base}/constraints`));
  getTeacherConstraints = (teacherId: string) =>
    firstValueFrom(this.http.get<TeacherConstraint[]>(`${this.base}/constraints/teacher/${teacherId}`));
  createConstraint = (data: Partial<TeacherConstraint>) =>
    firstValueFrom(this.http.post<TeacherConstraint>(`${this.base}/constraints`, data));
  deleteConstraint = (id: string) => firstValueFrom(this.http.delete(`${this.base}/constraints/${id}`));

  // ── Schedules ─────────────────────────────────────────────────────────────
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
