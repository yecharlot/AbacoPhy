export type Tenant = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  phone: string;
  address: string;
  email: string;
  taxId: string;
  settings: Record<string, unknown>;
};

export type UpdateTenantInput = {
  name?: string;
  currency?: string;
  phone?: string;
  address?: string;
  email?: string;
  taxId?: string;
  settings?: Record<string, unknown>;
};
