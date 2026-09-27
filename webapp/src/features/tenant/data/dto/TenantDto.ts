/** API shapes for GET/PUT /tenant */

export type TenantDto = {
  id?: string;
  name?: string;
  slug?: string;
  currency?: string;
  phone?: string;
  address?: string;
  email?: string;
  tax_id?: string;
  taxId?: string;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type TenantResponseDto = {
  tenant?: TenantDto;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

} & TenantDto;
