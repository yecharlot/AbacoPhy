export type BackupMeta = {
  cid: string;
  contentSha: string;
  label: string;
  rev: number;
  userId: string;
  username: string;
  createdAt: string;
};

export type BackupsSnapshot = {
  backups: BackupMeta[];
  currentCid: string;
  rev: number;
};

/** Resultado de importar una salva desde disco. */
export type ImportBackupResult = {
  ok: boolean;
  rev: number;
  rootCid: string;
  contentSha: string;
};
