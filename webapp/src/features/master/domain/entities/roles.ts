/**
 * Roles asignables (alineado con auth.ValidRoles del backend, sin master).
 */
export const ASSIGNABLE_ROLES = [
  'admin',
  'contador',
  'economico',
  'vendedor',
  'almacenero',
  'operador',
  'readonly',
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  master: 'Master',
  admin: 'Administrador',
  contador: 'Contador',
  economico: 'Económico',
  vendedor: 'Vendedor',
  almacenero: 'Almacenero',
  operador: 'Operador',
  readonly: 'Solo lectura',
};

export function roleLabel(role: string): string {
  const key = (role || '').trim().toLowerCase();
  return ROLE_LABELS[key] || role || '—';
}

/** Normaliza rol para API (trim + minúsculas). */
export function normalizeRole(role: string): string {
  return (role || '').trim().toLowerCase();
}

/** true si el rol puede asignarse a un usuario de negocio (no master). */
export function isAssignableRole(role: string): role is AssignableRole {
  const key = normalizeRole(role);
  return (ASSIGNABLE_ROLES as readonly string[]).includes(key);
}
