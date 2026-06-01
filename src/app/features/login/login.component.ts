import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, DemoUser } from '../../core/auth/auth.service';
import { LogoMarkComponent } from '../../shared/ui/logo-mark.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LogoMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page" data-testid="login-page">
      <div class="login-card lec-scale-in">
        <!-- Logo -->
        <div class="logo-section">
          <app-logo-mark [size]="56" />
          <div>
            <h1 class="logo-name">Lectivo</h1>
            <p class="tagline">Los horarios de tu colegio, resueltos en minutos.</p>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Selector de usuario demo -->
        <div>
          <h2 class="section-title">Accede a tu cuenta</h2>
          <p class="section-sub">Selecciona tu usuario para esta sesión de demostración:</p>

          @if (loading()) {
            <div style="text-align:center;padding:20px;color:var(--muted-foreground)">
              Cargando usuarios...
            </div>
          }

          @for (user of demoUsers(); track user.id) {
            <button class="user-option" (click)="loginAs(user.email)" [attr.data-testid]="'user-option-' + user.email">
              <div class="user-avatar" [style.background]="user.role === 'school_admin' ? 'var(--primary-tint)' : 'var(--accent-tint)'"
                [style.color]="user.role === 'school_admin' ? 'var(--primary-strong)' : 'var(--accent-foreground)'">
                {{ initials(user.fullName) }}
              </div>
              <div style="flex:1;min-width:0">
                <div class="user-name">{{ user.fullName }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
              <span class="role-badge" [class.badge--admin]="user.role === 'school_admin'">
                {{ user.role === 'school_admin' ? 'Dirección' : 'Profesor/a' }}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.4">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          }

          @if (error()) {
            <div style="color:var(--destructive);font-size:var(--text-xs);margin-top:8px;
              background:var(--destructive-tint);padding:10px 14px;border-radius:var(--radius-md)">
              {{ error() }}
            </div>
          }
        </div>

        <div class="divider"></div>

        <!-- Nota legal / info -->
        <p class="footer-note">
          Esta es una demo de <strong>Lectivo</strong> — gestión automática de horarios escolares
          para primaria (LOMLOE Madrid). Los datos son de prueba.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100dvh;
      background: var(--background);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .login-card {
      background: var(--card);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border);
      padding: 32px 28px;
      width: 100%;
      max-width: 440px;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .logo-name {
      font-size: var(--text-3xl);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--foreground);
    }
    .tagline {
      font-size: var(--text-sm);
      color: var(--muted-foreground);
      margin-top: 4px;
    }
    .divider {
      height: 1px;
      background: var(--border);
      margin: 20px 0;
    }
    .section-title {
      font-size: var(--text-lg);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .section-sub {
      font-size: var(--text-sm);
      color: var(--muted-foreground);
      margin-bottom: 16px;
    }
    .user-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--card);
      cursor: pointer;
      transition: all .15s;
      margin-bottom: 8px;
      text-align: left;
    }
    .user-option:hover {
      border-color: var(--primary);
      background: var(--primary-tint);
      box-shadow: var(--shadow-sm);
    }
    .user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }
    .user-name {
      font-weight: 700;
      font-size: var(--text-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-email {
      font-size: var(--text-xs);
      color: var(--muted-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .role-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      white-space: nowrap;
      background: var(--secondary);
      color: var(--secondary-foreground);
      flex-shrink: 0;
    }
    .badge--admin {
      background: var(--primary-tint);
      color: var(--primary-strong);
    }
    .footer-note {
      font-size: var(--text-xs);
      color: var(--muted-foreground);
      line-height: 1.6;
      text-align: center;
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly demoUsers = signal<DemoUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    // Si ya está logado, redirigir
    if (this.auth.isLoggedIn()) {
      const target = this.auth.isAdmin() ? '/dashboard' : '/horario';
      await this.router.navigate([target]);
      return;
    }
    try {
      const users = await this.auth.getDemoUsers();
      this.demoUsers.set(users);
    } catch {
      this.error.set('No se puede conectar con el servidor. Asegúrate de que la API está en marcha.');
    } finally {
      this.loading.set(false);
    }
  }

  async loginAs(email: string): Promise<void> {
    this.error.set(null);
    try {
      await this.auth.loginAs(email);
    } catch {
      this.error.set('Error al iniciar sesión. Inténtalo de nuevo.');
    }
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
