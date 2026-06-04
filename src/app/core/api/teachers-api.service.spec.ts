import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TeachersApiService } from './teachers-api.service';
import { Teacher } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('TeachersApiService', () => {
  let service: TeachersApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TeachersApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(TeachersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get teachers', async () => {
    const mockTeachers = [{ id: 't1', fullName: 'Teacher 1' }] as Teacher[];
    const promise = service.getTeachers();
    const req = httpMock.expectOne(`${baseUrl}/teachers`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTeachers);
    const result = await promise;
    expect(result).toEqual(mockTeachers);
  });

  it('should create teacher', async () => {
    const mockTeacher = { id: 't1', fullName: 'Teacher 1' } as Teacher;
    const promise = service.createTeacher({ fullName: 'Teacher 1' });
    const req = httpMock.expectOne(`${baseUrl}/teachers`);
    expect(req.request.method).toBe('POST');
    req.flush(mockTeacher);
    const result = await promise;
    expect(result).toEqual(mockTeacher);
  });

  it('should update teacher', async () => {
    const mockTeacher = { id: 't1', fullName: 'Teacher 1' } as Teacher;
    const promise = service.updateTeacher('t1', { fullName: 'Teacher New' });
    const req = httpMock.expectOne(`${baseUrl}/teachers/t1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockTeacher);
    const result = await promise;
    expect(result).toEqual(mockTeacher);
  });

  it('should delete teacher', async () => {
    const promise = service.deleteTeacher('t1');
    const req = httpMock.expectOne(`${baseUrl}/teachers/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await promise;
  });
});
