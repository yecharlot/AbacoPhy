import type { User } from './User';

export type Session = {
  token: string;
  expiresAt: string | null;
  user: User;
  views: string[];
  modules: Record<string, boolean>;
  tenantName?: string;
  rev?: number;
  rootCid?: string;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  /** Admin/master only: change another user */
  username?: string;
};
