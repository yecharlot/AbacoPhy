/** API shapes — do not leak into domain or UI. */

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type LoginResponseDto = {
  token: string;
  expires_at?: string;
  user: {
    id: string;
    username: string;
    display_name?: string;
    role: string;
    tenant_id: string;
  };
  views?: string[];
  modules?: Record<string, boolean>;
};

export type MeResponseDto = {
  user: {
    id: string;
    username: string;
    display_name?: string;
    role: string;
    tenant_id: string;
  };
  tenant?: {
    id?: string;
    name?: string;
  };
  rev?: number;
  root_cid?: string;
  views?: string[];
  modules?: Record<string, boolean>;
};

export type ChangePasswordRequestDto = {
  current_password: string;
  new_password: string;
  username?: string;
};
