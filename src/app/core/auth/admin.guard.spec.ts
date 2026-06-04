import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('adminGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      isAdmin: vi.fn(() => false),
      isTeacher: vi.fn(() => false),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        provideZonelessChangeDetection(),
      ],
    });
  });

  it('should allow access if user is admin', () => {
    mockAuthService.isAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to /horario if user is teacher', () => {
    mockAuthService.isTeacher.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, {} as any)
    );

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/horario']);
  });

  it('should redirect to /login if user is neither admin nor teacher', () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, {} as any)
    );

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
