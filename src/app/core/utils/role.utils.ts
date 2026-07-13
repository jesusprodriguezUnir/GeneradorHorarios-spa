import { AppUserRole, ROLE_KIND } from '../models';

export function getRoleLabel(role: AppUserRole): string {
  return role.name;
}

export function getRoleBadgeClass(role: AppUserRole): string {
  return role.kind === ROLE_KIND.Admin ? 'badge--admin' : '';
}

export function getRoleAvatarColors(role: AppUserRole): { bg: string; fg: string } {
  return role.kind === ROLE_KIND.Admin
    ? { bg: 'var(--primary-tint)', fg: 'var(--primary-strong)' }
    : { bg: 'var(--accent-tint)', fg: 'var(--accent-foreground)' };
}