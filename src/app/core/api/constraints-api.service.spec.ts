import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConstraintsApiService } from './constraints-api.service';
import { TeacherConstraint } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('ConstraintsApiService', () => {
  let service: ConstraintsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConstraintsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(ConstraintsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get constraints', async () => {
    const mockConstraints = [{ id: 'c1', teacherId: 't1' }] as TeacherConstraint[];
    const promise = service.getConstraints();
    const req = httpMock.expectOne(`${baseUrl}/constraints`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConstraints);
    const result = await promise;
    expect(result).toEqual(mockConstraints);
  });

  it('should get teacher constraints', async () => {
    const mockConstraints = [{ id: 'c1', teacherId: 't1' }] as TeacherConstraint[];
    const promise = service.getTeacherConstraints('t1');
    const req = httpMock.expectOne(`${baseUrl}/constraints/teacher/t1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockConstraints);
    const result = await promise;
    expect(result).toEqual(mockConstraints);
  });

  it('should create constraint', async () => {
    const mockConstraint = { id: 'c1', teacherId: 't1' } as TeacherConstraint;
    const promise = service.createConstraint({ teacherId: 't1' });
    const req = httpMock.expectOne(`${baseUrl}/constraints`);
    expect(req.request.method).toBe('POST');
    req.flush(mockConstraint);
    const result = await promise;
    expect(result).toEqual(mockConstraint);
  });

  it('should delete constraint', async () => {
    const promise = service.deleteConstraint('c1');
    const req = httpMock.expectOne(`${baseUrl}/constraints/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await promise;
  });
});
