/** Salva CID del snapshot del negocio. */
export type BackupMeta = {
  cid: string;
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
