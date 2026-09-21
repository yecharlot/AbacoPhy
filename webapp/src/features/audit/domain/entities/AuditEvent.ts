/** Evento de traza del negocio (auditoría en español, generada por el backend). */
export type AuditEvent = {
  id: string;
  userId: string;
  username: string;
  action: string;
  detail: string;
  ref: string;
  cid: string;
  createdAt: string;
};

export type AuditTrail = {
  events: AuditEvent[];
  rootCid: string;
};
