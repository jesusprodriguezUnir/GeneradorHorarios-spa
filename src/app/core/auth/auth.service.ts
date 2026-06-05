import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppUser } from '../models';
import { BlockStateService } from '../block-state.service';
import { environment } from '../../../environments/environment';

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly blockState = inject(BlockStateService);

  // ── Estado reactivo con signals ───────────────────────────────────────────
  private readonly _currentUser = signal<AppUser | null>(null);
  private readonly _currentEmail = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('lectivo_email') : null
  );

  readonly currentUser = this._currentUser.asReadonly();
  readonly currentEmail = this._currentEmail.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.role === 'school_admin');
  readonly isTeacher = computed(() => this._currentUser()?.role === 'teacher');
  readonly schoolName = computed(() => this._currentUser()?.school?.name ?? '');

  get emailHeader(): string | null {
    return this._currentEmail();
  }

  // ── Login demo (seleccionar usuario) ─────────────────────────────────────
  async loginAs(email: string): Promise<void> {
    this._currentEmail.set(email);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lectivo_email', email);
    }
    await this.loadCurrentUser();
    const user = this._currentUser();
    if (user) {
      const target = user.role === 'teacher' ? '/horario' : '/dashboard';
      await this.router.navigate([target]);
    }
  }

  async loadCurrentUser(): Promise<void> {
    if (!this._currentEmail()) return;
    try {
      const user = await firstValueFrom(
        this.http.get<AppUser>(`${environment.apiUrl}/auth/me`)
      );
      this._currentUser.set(user);
      if (user) {
        this.blockState.initializeForUser(user.role, user.teacher?.assignedStageTypes);
      }
    } catch {
      this._currentUser.set(null);
    }
  }

  async getDemoUsers(): Promise<DemoUser[]> {
    return firstValueFrom(
      this.http.get<DemoUser[]>(`${environment.apiUrl}/auth/demo-users`)
    );
  }

  logout(): void {
    this._currentUser.set(null);
    this._currentEmail.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('lectivo_email');
    }
    this.router.navigate(['/login']);
  }
}
