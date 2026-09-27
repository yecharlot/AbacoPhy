/** API shapes — do not leak into domain or UI. */

export type LoginRequestDto = {
  username: string;
  password: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía.*/
  metadata?: string | null;

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
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type ChangePasswordRequestDto = {
  current_password: string;
  new_password: string;
  username?: string;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
