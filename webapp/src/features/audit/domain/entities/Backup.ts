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
