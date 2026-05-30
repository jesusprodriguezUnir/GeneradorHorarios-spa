import {
  Component, inject, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth/auth.service';
import { DeviceService } from '../core/device.service';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Panel',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'generador', path: '/generador', label: 'Generador',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { id: 'horarios', path: '/horarios', label: 'Horarios',
    icon: 'M3 10h18M3 6h18M3 14h18M3 18h18M8 2v4M16 2v4' },
  { id: 'config', path: '/config', label: 'Colegio',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const TEACHER_NAV: NavItem[] = [
  { id: 'horario', path: '/horario', label: 'Mi horario',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'perfil', path: '/perfil', label: 'Mi perfil',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isMobile()) {
      <!-- MOVIL -->
      <div style="min-height:100dvh;display:flex;flex-direction:column;background:var(--background)">
        <header style="background:var(--primary);color:#fff;padding:12px 16px;display:flex;
          align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="logo-mark" style="width:28px;height:28px"></div>
            <span style="font-weight:800;font-size:var(--text-lg);letter-spacing:-0.02em">Lectivo</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:var(--text-xs);opacity:0.85">{{ schoolName() }}</span>
            <button (click)="logout()"
              style="background:rgba(255,255,255,0.15);border-radius:var(--radius-full);
                padding:6px 12px;color:#fff;font-size:var(--text-xs);font-weight:600;cursor:pointer;">
              Salir
            </button>
          </div>
        </header>

        <main style="flex:1;padding:16px 16px 88px;max-width:640px;width:100%;margin:0 auto">
          <router-outlet />
        </main>

        <nav style="position:fixed;bottom:0;left:0;right:0;background:var(--card);
          border-top:1px solid var(--border);display:flex;padding:8px 8px 16px;
          z-index:30;box-shadow:0 -2px 12px oklch(0.2 0.02 255 / 0.06)">
          @for (item of nav(); track item.id) {
            <a [routerLink]="item.path" routerLinkActive #rla="routerLinkActive"
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
                padding:6px 0;text-decoration:none;font-weight:600;font-size:11px;"
              [style.color]="rla.isActive ? 'var(--primary)' : 'var(--muted-foreground)'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                [attr.stroke]="rla.isActive ? 'var(--primary)' : 'var(--muted-foreground)'"
                [attr.stroke-width]="rla.isActive ? 2.25 : 1.75"
                stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="item.icon" />
              </svg>
              {{ item.label }}
            </a>
          }
        </nav>
      </div>
    } @else {
      <!-- ESCRITORIO -->
      <div style="min-height:100dvh;display:flex;background:var(--background)">
        <aside style="width:248px;background:var(--card);border-right:1px solid var(--border);
          display:flex;flex-direction:column;position:sticky;top:0;height:100dvh;flex-shrink:0;">
          <div style="padding:20px 18px;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="logo-mark" style="width:32px;height:32px;border-radius:9px"></div>
              <span style="font-weight:800;font-size:var(--text-xl);letter-spacing:-0.02em">Lectivo</span>
            </div>
          </div>

          <nav style="padding:12px;flex:1">
            <div style="font-size:11px;font-weight:700;color:var(--muted-foreground);
              text-transform:uppercase;letter-spacing:0.06em;padding:8px 10px;margin-bottom:4px">
              {{ isAdmin() ? 'Gestion' : 'Mi cuenta' }}
            </div>
            @for (item of nav(); track item.id) {
              <a [routerLink]="item.path" routerLinkActive #rla="routerLinkActive"
                style="display:flex;align-items:center;gap:11px;width:100%;padding:10px 11px;
                  border-radius:var(--radius-md);font-weight:600;font-size:var(--text-sm);
                  margin-bottom:2px;text-decoration:none;transition:all .15s;"
                [style.background]="rla.isActive ? 'var(--primary-tint)' : 'transparent'"
                [style.color]="rla.isActive ? 'var(--primary-strong)' : 'var(--secondary-foreground)'">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
                  [attr.stroke]="rla.isActive ? 'var(--primary-strong)' : 'currentColor'"
                  [attr.stroke-width]="rla.isActive ? 2.1 : 1.75"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path [attr.d]="item.icon" />
                </svg>
                {{ item.label }}
              </a>
            }
          </nav>

          <div style="padding:12px;border-top:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:10px;padding:8px">
              <div class="user-avatar">{{ userInitials() }}</div>
              <div style="min-width:0;flex:1">
                <div style="font-weight:700;font-size:var(--text-sm);overflow:hidden;
                  text-overflow:ellipsis;white-space:nowrap">{{ userName() }}</div>
                <div style="color:var(--muted-foreground);font-size:11px">{{ schoolName() }}</div>
              </div>
              <button (click)="logout()" title="Cerrar sesion"
                style="color:var(--muted-foreground);padding:6px;border-radius:8px;display:flex;cursor:pointer;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <div style="flex:1;min-width:0;display:flex;flex-direction:column">
          <header style="background:var(--primary);color:#fff;padding:0 24px;height:56px;
            display:flex;align-items:center;justify-content:space-between;
            position:sticky;top:0;z-index:20;">
            <div style="display:flex;align-items:center;gap:10px;font-size:var(--text-sm);font-weight:600">
              {{ schoolName() }}
            </div>
            <div style="font-size:var(--text-xs);opacity:0.75">{{ roleLabel() }}</div>
          </header>

          <main style="flex:1;padding:28px 32px;max-width:1280px;width:100%;margin:0 auto">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
  styles: [`
    .logo-mark {
      background: rgba(255,255,255,0.25);
      border-radius: 8px;
      width: 28px; height: 28px;
      flex-shrink: 0;
    }
    .user-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: var(--primary-tint); color: var(--primary-strong);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
  `],
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly device = inject(DeviceService);

  readonly isMobile = this.device.isMobile;
  readonly isAdmin = this.auth.isAdmin;
  readonly schoolName = this.auth.schoolName;

  readonly nav = computed(() => this.auth.isAdmin() ? ADMIN_NAV : TEACHER_NAV);

  readonly userName = computed(() => {
    const u = this.auth.currentUser();
    return u?.teacher?.fullName ?? (u?.role === 'school_admin' ? 'Director/a' : 'Usuario');
  });

  readonly userInitials = computed(() =>
    this.userName().split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  );

  readonly roleLabel = computed(() =>
    this.auth.isAdmin() ? 'Jefatura de estudios' : 'Profesor/a'
  );

  logout(): void { this.auth.logout(); }
}
