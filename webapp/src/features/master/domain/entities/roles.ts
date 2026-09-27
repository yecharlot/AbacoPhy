export const ASSIGNABLE_ROLES = [
  'admin',
  'contador',
  'economico',
  'vendedor',
  'almacenero',
  'operador',
  'readonly',
] as const;

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
