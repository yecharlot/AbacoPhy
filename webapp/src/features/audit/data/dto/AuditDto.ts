/** Formas de API para /audit, /backups y /errors. */

export type AuditEntryDto = {
  id: string;
  user_id?: string;
  username?: string;
  action?: string;
  detail?: string;
  ref?: string;
  cid?: string;
  created_at?: string;
};

export type AuditResponseDto = {
  audit?: AuditEntryDto[] | null;
  count?: number;
  root_cid?: string;
};

export type BackupMetaDto = {
  cid?: string;
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
