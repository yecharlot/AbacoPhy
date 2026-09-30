import type { AssignableRole } from '../../../master/domain/entities/roles';
import { isAssignableRole, normalizeRole } from '../../../master/domain/entities/roles';

/**
 * Cargo del nomenclador (fuente controlada Cargo → Rol).
 * Persistencia FE: localStorage por tenant (sin cambiar schema API).
 */
export type JobPosition = {
  id: string;
  name: string;
  /** Rol de sistema asociado (vendedor, almacenero, …). */
  role: string;
  active: boolean;
};

export type CreateJobPositionInput = {
  name: string;
  role: string;
  active?: boolean;
};

export type UpdateJobPositionInput = {
  id: string;
  name?: string;
  role?: string;
  active?: boolean;
};

/** Semilla inicial alineada con roles asignables del negocio. */
export const DEFAULT_JOB_POSITIONS: Omit<JobPosition, 'id'>[] = [
  { name: 'Administrador', role: 'admin', active: true },
  { name: 'Contador', role: 'contador', active: true },
  { name: 'Económico', role: 'economico', active: true },
  { name: 'Vendedor', role: 'vendedor', active: true },
  { name: 'Almacenero', role: 'almacenero', active: true },
  { name: 'Operador', role: 'operador', active: true },
];

export function normalizePositionName(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ');
}

export function validateJobPositionRole(role: string): string {
  const r = normalizeRole(role);
  if (!isAssignableRole(r)) {
    throw new Error(`Rol no permitido para cargo: «${role}»`);
  }
  return r;
}
