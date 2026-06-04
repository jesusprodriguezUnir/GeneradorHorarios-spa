import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GroupsApiService } from './groups-api.service';
import { CourseGroup } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('GroupsApiService', () => {
  let service: GroupsApiService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GroupsApiService,
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(GroupsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get groups', async () => {
    const mockGroups = [{ id: 'g1', groupLabel: 'A' }] as CourseGroup[];
    const promise = service.getGroups();
    const req = httpMock.expectOne(`${baseUrl}/groups`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGroups);
    const result = await promise;
    expect(result).toEqual(mockGroups);
  });

  it('should create group', async () => {
    const mockGroup = { id: 'g1', groupLabel: 'A' } as CourseGroup;
    const promise = service.createGroup({ groupLabel: 'A' });
    const req = httpMock.expectOne(`${baseUrl}/groups`);
    expect(req.request.method).toBe('POST');
    req.flush(mockGroup);
    const result = await promise;
    expect(result).toEqual(mockGroup);
  });

  it('should update group', async () => {
    const mockGroup = { id: 'g1', groupLabel: 'A' } as CourseGroup;
    const promise = service.updateGroup('g1', { groupLabel: 'B' });
    const req = httpMock.expectOne(`${baseUrl}/groups/g1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockGroup);
    const result = await promise;
    expect(result).toEqual(mockGroup);
  });

  it('should delete group', async () => {
    const promise = service.deleteGroup('g1');
    const req = httpMock.expectOne(`${baseUrl}/groups/g1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await promise;
  });
});
