import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchedulesApiService } from './schedules-api.service';
import { ScheduleList, ScheduleGrid, MySchedule } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('SchedulesApiService', () => {
  let service: SchedulesApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SchedulesApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(SchedulesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get schedules list', async () => {
    const mockSchedules = [{ id: 's1', academicYear: '2025/2026', status: 'draft' }] as ScheduleList[];
    const promise = service.getSchedules();
    const req = httpMock.expectOne(`${baseUrl}/schedules`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSchedules);
    const result = await promise;
    expect(result).toEqual(mockSchedules);
  });

  it('should get schedule grid by id', async () => {
    const mockGrid = { id: 's1', status: 'draft', entries: [], conflicts: [] } as any as ScheduleGrid;
    const promise = service.getSchedule('s1');
    const req = httpMock.expectOne(`${baseUrl}/schedules/s1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGrid);
    const result = await promise;
    expect(result).toEqual(mockGrid);
  });

  it('should get my schedule', async () => {
    const mockMySchedule = { schoolName: 'CEIP Test', entries: [] } as any as MySchedule;
    const promise = service.getMySchedule();
    const req = httpMock.expectOne(`${baseUrl}/schedules/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMySchedule);
    const result = await promise;
    expect(result).toEqual(mockMySchedule);
  });

  it('should generate schedule', async () => {
    const mockResponse = { scheduleId: 's1', status: 'generated', totalAssigned: 10, totalRequired: 10, totalConflicts: 0 };
    const promise = service.generateSchedule('2025/2026', 30);
    const req = httpMock.expectOne(`${baseUrl}/schedules/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ academicYear: '2025/2026', timeoutSeconds: 30 });
    req.flush(mockResponse);
    const result = await promise;
    expect(result).toEqual(mockResponse);
  });

  it('should publish schedule', async () => {
    const mockResponse = { message: 'Published' };
    const promise = service.publishSchedule('s1');
    const req = httpMock.expectOne(`${baseUrl}/schedules/s1/publish`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
    const result = await promise;
    expect(result).toEqual(mockResponse);
  });

  it('should update schedule entry', async () => {
    const mockResponse = { success: true };
    const promise = service.updateScheduleEntry('s1', 'e1', 't1', 'c1');
    const req = httpMock.expectOne(`${baseUrl}/schedules/s1/entries/e1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ teacherId: 't1', classroomId: 'c1' });
    req.flush(mockResponse);
    await promise;
  });
});
