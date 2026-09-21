/** Negocio visible desde el rol master. */
export type TenantSummary = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  active: boolean;
  createdAt: string;
};

export type CreateTenantInput = {
  name: string;
  slug?: string;
  currency?: string;
  adminUser?: string;
  adminPass?: string;
};
