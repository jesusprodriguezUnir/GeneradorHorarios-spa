import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClassroomsApiService } from './classrooms-api.service';
import { Classroom } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('ClassroomsApiService', () => {
  let service: ClassroomsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ClassroomsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(ClassroomsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get classrooms', async () => {
    const mockClassrooms = [{ id: 'c1', name: 'Aula 101' }] as Classroom[];
    const promise = service.getClassrooms();
    const req = httpMock.expectOne(`${baseUrl}/classrooms`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClassrooms);
    const result = await promise;
    expect(result).toEqual(mockClassrooms);
  });

  it('should create classroom', async () => {
    const mockClassroom = { id: 'c1', name: 'Aula 101' } as Classroom;
    const promise = service.createClassroom({ name: 'Aula 101' });
    const req = httpMock.expectOne(`${baseUrl}/classrooms`);
    expect(req.request.method).toBe('POST');
    req.flush(mockClassroom);
    const result = await promise;
    expect(result).toEqual(mockClassroom);
  });

  it('should update classroom', async () => {
    const mockClassroom = { id: 'c1', name: 'Aula 101' } as Classroom;
    const promise = service.updateClassroom('c1', { name: 'Aula 102' });
    const req = httpMock.expectOne(`${baseUrl}/classrooms/c1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockClassroom);
    const result = await promise;
    expect(result).toEqual(mockClassroom);
  });

  it('should delete classroom', async () => {
    const promise = service.deleteClassroom('c1');
    const req = httpMock.expectOne(`${baseUrl}/classrooms/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await promise;
  });
});
