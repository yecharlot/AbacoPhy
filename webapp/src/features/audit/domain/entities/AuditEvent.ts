/** Evento de traza del negocio (auditoría generada por el backend). */
export type AuditEvent = {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  detail: string;
  ref: string;
  cid: string;
  createdAt: string;
};

export type AuditTrail = {
  events: AuditEvent[];
  rootCid: string;
  total: number;
  limit: number;
  offset: number;
  actions: string[];
};

export type AuditListQuery = {
  action?: string;
  userId?: string;
  username?: string;
  ref?: string;
  q?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
};
