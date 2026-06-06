import { AppUserRole } from '../models';

export function getRoleLabel(role: AppUserRole): string {
  return role.name;
}

export function getRoleBadgeClass(role: AppUserRole): string {
  return role.kind === 'Admin' ? 'badge--admin' : '';
}

export function getRoleAvatarColors(role: AppUserRole): { bg: string; fg: string } {
  return role.kind === 'Admin'
    ? { bg: 'var(--primary-tint)', fg: 'var(--primary-strong)' }
    : { bg: 'var(--accent-tint)', fg: 'var(--accent-foreground)' };
}