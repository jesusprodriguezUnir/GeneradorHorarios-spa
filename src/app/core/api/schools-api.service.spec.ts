import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchoolsApiService } from './schools-api.service';
import { School, CycleSchedule } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('SchoolsApiService', () => {
  let service: SchoolsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SchoolsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(SchoolsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get my school', async () => {
    const mockSchool = { id: '1', name: 'CEIP Test' } as School;
    const promise = service.getMySchool();
    const req = httpMock.expectOne(`${baseUrl}/schools/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSchool);
    const result = await promise;
    expect(result).toEqual(mockSchool);
  });

  it('should update my school', async () => {
    const mockSchool = { id: '1', name: 'CEIP Test' } as School;
    const promise = service.updateMySchool({ name: 'CEIP New Name' });
    const req = httpMock.expectOne(`${baseUrl}/schools/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'CEIP New Name' });
    req.flush(mockSchool);
    const result = await promise;
    expect(result).toEqual(mockSchool);
  });

  it('should update cycle schedule', async () => {
    const mockCycle = {
      cycle: 1, morningStart: '09:00', morningEnd: '14:00',
      endTime: '14:00', afternoonStart: null, afternoonEnd: null,
      computedSlots: [], breaks: [],
    } as CycleSchedule;
    const promise = service.updateCycleSchedule(1, {
      morningStart: '09:00', morningEnd: '14:00',
      afternoonStart: null, afternoonEnd: null,
    });
    const req = httpMock.expectOne(`${baseUrl}/schools/me/cycles/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockCycle);
    const result = await promise;
    expect(result).toEqual(mockCycle);
  });

  it('should get cycle schedule', async () => {
    const mockCycle = {
      cycle: 1, morningStart: '09:00', morningEnd: '14:00',
      endTime: '14:00', afternoonStart: null, afternoonEnd: null,
      computedSlots: [], breaks: [],
    } as CycleSchedule;
    const promise = service.getCycleSchedule(1);
    const req = httpMock.expectOne(`${baseUrl}/schools/me/cycles/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCycle);
    const result = await promise;
    expect(result).toEqual(mockCycle);
  });

  it('should update cycle schedule with periodId', async () => {
    const mockCycle = {
      cycle: 1, morningStart: '09:00', morningEnd: '14:00',
      endTime: '14:00', afternoonStart: null, afternoonEnd: null,
      computedSlots: [], breaks: [{ afterSlot: 2, minutes: 30 }],
    } as CycleSchedule;
    const promise = service.updateCycleSchedule(1, {
      morningStart: '09:00', morningEnd: '14:00',
      afternoonStart: null, afternoonEnd: null,
      breaks: [{ afterSlot: 2, minutes: 30 }],
    }, 'period-123');
    const req = httpMock.expectOne(`${baseUrl}/schools/me/periods/period-123/cycles/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockCycle);
    const result = await promise;
    expect(result).toEqual(mockCycle);
  });
});
