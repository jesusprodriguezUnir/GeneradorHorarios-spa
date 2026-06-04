import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AssignmentsApiService } from './assignments-api.service';
import { AssignmentSummary } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('AssignmentsApiService', () => {
  let service: AssignmentsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AssignmentsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(AssignmentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get assignments', async () => {
    const mockAssignments = [{
      subjectName: 'Matemáticas',
      subjectKey: 'mat',
      requiredHours: 4,
      assignedHours: 4,
      completionPct: 100,
      assignments: []
    }] as AssignmentSummary[];

    const promise = service.getAssignments();
    const req = httpMock.expectOne(`${baseUrl}/assignments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAssignments);
    const result = await promise;
    expect(result).toEqual(mockAssignments);
  });
});
