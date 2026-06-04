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
    const mockCycle = { cycle: 1, morningStart: '09:00', endTime: '14:00' } as CycleSchedule;
    const promise = service.updateCycleSchedule(1, { morningStart: '09:00', endTime: '14:00' });
    const req = httpMock.expectOne(`${baseUrl}/schools/me/cycles/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockCycle);
    const result = await promise;
    expect(result).toEqual(mockCycle);
  });
});
