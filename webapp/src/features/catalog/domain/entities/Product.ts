/**
 * Definición de producto (nomenclador).
 * Sin datos económicos editables — política cliente.
 * @see webapp/.policies/catalog-nomenclador-productos.md
 */
export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  /** Solo lectura legacy API; no UI nomenclador */
  costStd?: number;
  priceSale?: number;
  metadata?: string | null;
};

export type CreateProductInput = {
  code?: string;
  name: string;
  unit?: string;
  category?: string;
  metadata?: string | null;
};

export type UpdateProductInput = {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  category?: string;
  metadata?: string | null;
};
