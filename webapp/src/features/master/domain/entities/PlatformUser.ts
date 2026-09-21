/** Usuario del negocio administrado desde master / usuarios. */
export type PlatformUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  active: boolean;
  modules: Record<string, boolean>;
};

export type UsersSnapshot = {
  users: PlatformUser[];
  roles: string[];
};

export type CreateUserInput = {
  username: string;
  displayName?: string;
  password: string;
  role: string;
};

export type UpdateUserInput = {
  id: string;
  displayName?: string;
  role?: string;
  password?: string;
  active?: boolean;
  modules?: Record<string, boolean>;
};
