import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('authGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthService = {
      emailHeader: null,
      isLoggedIn: vi.fn(() => false),
      loadCurrentUser: vi.fn(),
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

  it('should redirect to login if not logged in and no emailHeader', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load current user if emailHeader present but not logged in', async () => {
    mockAuthService.emailHeader = 'test@school.com';
    mockAuthService.isLoggedIn = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(mockAuthService.loadCurrentUser).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return true if logged in', async () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
