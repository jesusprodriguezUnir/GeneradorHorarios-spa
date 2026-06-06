export type UserRole = 'school_admin' | 'teacher';

export function getRoleLabel(role: UserRole): string {
  return role === 'school_admin' ? 'Jefatura de estudios' : 'Profesor/a';
}

export function getRoleBadgeClass(role: UserRole): string {
  return role === 'school_admin' ? 'badge--admin' : '';
}

export function getRoleAvatarColors(role: UserRole): { bg: string; fg: string } {
  return role === 'school_admin'
    ? { bg: 'var(--primary-tint)', fg: 'var(--primary-strong)' }
    : { bg: 'var(--accent-tint)', fg: 'var(--accent-foreground)' };
}