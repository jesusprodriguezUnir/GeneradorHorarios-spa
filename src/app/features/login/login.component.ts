import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, DemoUser } from '../../core/auth/auth.service';
import { LogoMarkComponent } from '../../shared/ui/logo-mark.component';
import { LecIconComponent } from '../../shared/ui/lec-icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LogoMarkComponent, LecIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page" data-testid="login-page">
      <!-- Columna izquierda: acceso -->
      <div class="login-panel">
        <div class="panel-inner lec-fade-up">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:26px">
            <app-logo-mark [size]="40" />
            <span class="brand-name">Lectivo</span>
          </div>

          <h1 class="hero">
            Los horarios de tu colegio,<br />
            <span style="color:var(--primary)">resueltos en minutos.</span>
          </h1>
          <p class="hero-sub">
            Genera horarios sin conflictos, respeta la disponibilidad del claustro y publícalos
            para que cada docente vea el suyo.
          </p>

          <div class="access">
            <div class="access-label">Accede con tu cuenta del centro</div>

            @if (loading()) {
              <div style="text-align:center;padding:20px;color:var(--muted-foreground)">Cargando usuarios…</div>
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
                <lec-icon name="arrowRight" [size]="16" style="flex-shrink:0;opacity:0.4"></lec-icon>
              </button>
            }

            @if (error()) {
              <div style="color:var(--destructive);font-size:var(--text-xs);margin-top:8px;background:var(--destructive-tint);padding:10px 14px;border-radius:var(--radius-md)">
                {{ error() }}
              </div>
            }
          </div>

          <p class="footer-note">
            Demo con datos de prueba · gestión automática de horarios para primaria (LOMLOE Madrid).<br />
            Cumple RGPD · Datos alojados en la UE.
          </p>
        </div>
      </div>

      <!-- Columna derecha: showcase de marca (escritorio) -->
      <div class="showcase">
        <span class="orb orb--1"></span>
        <span class="orb orb--2"></span>
        <div class="showcase-inner">
          <span class="lec-badge" style="background:var(--accent-tint);color:var(--accent-foreground);margin-bottom:18px">
            <lec-icon name="sparkles" [size]="12"></lec-icon> Generación automática
          </span>
          <h2 class="showcase-title">De una hoja de cálculo imposible a un horario perfecto.</h2>
          <p class="showcase-sub">
            Lectivo cruza disponibilidad, carga docente y aulas especiales para encajar todas las
            piezas sin solapamientos.
          </p>

          <div class="preview-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <span style="font-weight:700;font-size:var(--text-sm)">Horario generado · sin conflictos</span>
              <span class="lec-badge" style="background:rgba(255,255,255,0.9);color:var(--success)">
                <lec-icon name="check" [size]="12" [stroke]="2.5"></lec-icon> Listo
              </span>
            </div>
            <div class="preview-grid">
              @for (s of preview; track s.g) {
                <div class="preview-cell" [style.background]="'var(--subj-' + s.k + ')'" [style.color]="'var(--subj-' + s.k + '-fg)'">
                  <span class="preview-strip" [style.background]="'var(--subj-' + s.k + '-fg)'"></span>
                  <div style="font-weight:700;font-size:var(--text-xs);padding-left:6px">{{ s.n }}</div>
                  <div style="font-size:11px;opacity:0.8;padding-left:6px">{{ s.g }} · Aula {{ s.g }}</div>
                </div>
              }
            </div>
          </div>

          <div style="display:flex;gap:24px;margin-top:28px">
            @for (stat of stats; track stat[1]) {
              <div>
                <div style="font-size:var(--text-2xl);font-weight:800">{{ stat[0] }}</div>
                <div style="opacity:0.75;font-size:var(--text-xs)">{{ stat[1] }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100dvh; display: grid; grid-template-columns: 1fr; background: var(--background); }
    @media (min-width: 900px) { .login-page { grid-template-columns: 1fr 1.05fr; } }

    .login-panel { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
    @media (min-width: 900px) { .login-panel { padding: 40px 56px; } }
    .panel-inner { width: 100%; max-width: 420px; }
    .brand-name { font-weight: 800; font-size: var(--text-2xl); letter-spacing: -0.02em; color: var(--foreground); }
    .hero { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
    @media (min-width: 900px) { .hero { font-size: var(--text-3xl); } }
    .hero-sub { color: var(--muted-foreground); margin-top: 12px; font-size: var(--text-base); line-height: 1.5; }

    .access { margin-top: 28px; }
    .access-label { font-size: var(--text-sm); font-weight: 600; margin-bottom: 12px; }
    .user-option { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--card); cursor: pointer; transition: all .15s; margin-bottom: 8px; text-align: left; }
    .user-option:hover { border-color: var(--primary); background: var(--primary-tint); box-shadow: var(--shadow-sm); }
    .user-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
    .user-name { font-weight: 700; font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-email { font-size: var(--text-xs); color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .role-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: var(--radius-full); white-space: nowrap; background: var(--secondary); color: var(--secondary-foreground); flex-shrink: 0; }
    .badge--admin { background: var(--primary-tint); color: var(--primary-strong); }
    .footer-note { font-size: 11px; color: var(--muted-foreground); margin-top: 22px; text-align: center; line-height: 1.5; }

    /* Showcase de marca */
    .showcase { display: none; position: relative; overflow: hidden; color: #fff;
      background: linear-gradient(150deg, var(--primary-strong), var(--primary) 60%, oklch(0.52 0.135 272));
      flex-direction: column; justify-content: center; padding: 48px 56px; }
    @media (min-width: 900px) { .showcase { display: flex; } }
    .orb { position: absolute; border-radius: 50%; }
    .orb--1 { top: -80px; right: -80px; width: 320px; height: 320px; background: rgba(255,255,255,0.06); }
    .orb--2 { bottom: -120px; left: -60px; width: 280px; height: 280px; background: rgba(255,255,255,0.05); }
    .showcase-inner { position: relative; z-index: 2; max-width: 440px; }
    .showcase-title { font-size: var(--text-2xl); font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
    .showcase-sub { opacity: 0.85; margin-top: 12px; line-height: 1.55; }
    .preview-card { margin-top: 28px; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border-radius: var(--radius-xl); padding: 16px; border: 1px solid rgba(255,255,255,0.16); }
    .preview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .preview-cell { border-radius: var(--radius-sm); padding: 9px 11px; position: relative; overflow: hidden; }
    .preview-strip { position: absolute; left: 0; top: 6px; bottom: 6px; width: 3.5px; border-radius: 99px; opacity: 0.6; }
  `],
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly demoUsers = signal<DemoUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  protected readonly preview = [
    { n: 'Matemáticas', g: '3ºA', k: 'mat' }, { n: 'Inglés', g: '5ºB', k: 'ing' },
    { n: 'E. Física', g: '1ºA', k: 'ef' }, { n: 'Lengua', g: '3ºB', k: 'len' },
    { n: 'Música', g: '5ºA', k: 'mus' }, { n: 'Naturales', g: '1ºB', k: 'cie' },
  ];
  protected readonly stats: [string, string][] = [['8', 'docentes'], ['6', 'grupos'], ['0', 'conflictos']];

  async ngOnInit(): Promise<void> {
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
