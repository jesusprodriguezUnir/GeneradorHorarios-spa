import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubjectsApiService } from './subjects-api.service';
import { SubjectAllocation } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('SubjectsApiService', () => {
  let service: SubjectsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SubjectsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(SubjectsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get subjects', async () => {
    const mockSubjects = [{ id: 's1', subjectName: 'Maths' }] as SubjectAllocation[];
    const promise = service.getSubjects();
    const req = httpMock.expectOne(`${baseUrl}/subjects`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSubjects);
    const result = await promise;
    expect(result).toEqual(mockSubjects);
  });

  it('should clone official template', async () => {
    const mockSubjects = [{ id: 's1', subjectName: 'Maths' }] as SubjectAllocation[];
    const promise = service.cloneOfficialTemplate();
    const req = httpMock.expectOne(`${baseUrl}/subjects/clone-official`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockSubjects);
    const result = await promise;
    expect(result).toEqual(mockSubjects);
  });

  it('should create subject', async () => {
    const mockSubject = { id: 's1', subjectName: 'Maths' } as SubjectAllocation;
    const promise = service.createSubject({ subjectName: 'Maths' });
    const req = httpMock.expectOne(`${baseUrl}/subjects`);
    expect(req.request.method).toBe('POST');
    req.flush(mockSubject);
    const result = await promise;
    expect(result).toEqual(mockSubject);
  });

  it('should update subject', async () => {
    const mockSubject = { id: 's1', subjectName: 'Maths' } as SubjectAllocation;
    const promise = service.updateSubject('s1', { subjectName: 'Maths 2' });
    const req = httpMock.expectOne(`${baseUrl}/subjects/s1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockSubject);
    const result = await promise;
    expect(result).toEqual(mockSubject);
  });

  it('should delete subject', async () => {
    const promise = service.deleteSubject('s1');
    const req = httpMock.expectOne(`${baseUrl}/subjects/s1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await promise;
  });

  it('should update subject hours', async () => {
    const mockSubject = { id: 's1', subjectName: 'Maths', weeklyHoursDefault: 5 } as SubjectAllocation;
    const promise = service.updateSubjectHours('s1', 5);
    const req = httpMock.expectOne(`${baseUrl}/subjects/s1/hours`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ weeklyHoursDefault: 5 });
    req.flush(mockSubject);
    const result = await promise;
    expect(result).toEqual(mockSubject);
  });
});
