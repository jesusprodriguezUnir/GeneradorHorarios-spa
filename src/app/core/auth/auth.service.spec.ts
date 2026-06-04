import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppUser } from '../models';
import { provideZonelessChangeDetection } from '@angular/core';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Limpiar localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with logged out state', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.currentEmail()).toBeNull();
  });

  it('should handle login and load user correctly', async () => {
    const mockUser: AppUser = {
      userId: '1',
      schoolId: 's1',
      role: 'school_admin',
      school: { id: 's1', name: 'Test School', slug: 'test-school' },
      teacher: null,
    };

    const loginPromise = service.loginAs('test@school.com');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);

    await loginPromise;

    expect(service.isLoggedIn()).toBe(true);
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.isAdmin()).toBe(true);
    expect(service.isTeacher()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to schedule if user is a teacher', async () => {
    const mockUser: AppUser = {
      userId: '2',
      schoolId: 's1',
      role: 'teacher',
      school: { id: 's1', name: 'Test School', slug: 'test-school' },
      teacher: { id: 't2', fullName: 'Teacher User', colorKey: 'mat' },
    };

    const loginPromise = service.loginAs('teacher@school.com');

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush(mockUser);

    await loginPromise;

    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(false);
    expect(service.isTeacher()).toBe(true);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/horario']);
  });

  it('should handle logout', () => {
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.currentEmail()).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
