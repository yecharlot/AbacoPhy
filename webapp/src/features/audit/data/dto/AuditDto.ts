/** Formas de API para /audit, /backups y /errors. */

export type AuditEntryDto = {
  id: string;
  user_id?: string;
  username?: string;
  role?: string;
  action?: string;
  detail?: string;
  ref?: string;
  cid?: string;
  created_at?: string;
};

export type AuditQueryParams = {
  action?: string;
  user_id?: string;
  username?: string;
  ref?: string;
  q?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
};

export type AuditResponseDto = {
  audit?: AuditEntryDto[] | null;
  count?: number;
  total?: number;
  limit?: number;
  offset?: number;
  root_cid?: string;
  actions?: string[] | null;
  filters?: Record<string, string> | null;
};

export type BackupMetaDto = {
  cid?: string;
  /** Hash de contenido cuando el backend lo expone. */
  content_sha?: string;
  label?: string;
  rev?: number;
  user_id?: string;
  username?: string;
  created_at?: string;
};

export type BackupsResponseDto = {
  backups?: BackupMetaDto[] | null;
  current_cid?: string;
  rev?: number;
};

export type ErrorsResponseDto = {
  errors?: AuditEntryDto[] | null;
};

export type RestoreBackupResponseDto = {
  ok?: boolean;
  rev?: number;
  root_cid?: string;
  content_sha?: string;
  integrity?: string;
};
