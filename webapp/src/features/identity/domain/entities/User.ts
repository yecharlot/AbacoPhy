export type User = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  tenantId: string;
  mustChangePassword?: boolean;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
