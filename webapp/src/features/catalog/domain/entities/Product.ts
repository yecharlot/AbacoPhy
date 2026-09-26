export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  costStd: number;
  priceSale: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type CreateProductInput = {
  code?: string;
  name: string;
  unit?: string;
  category?: string;
  costStd?: number;
  priceSale?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};

export type UpdateProductInput = {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  category?: string;
  costStd?: number;
  priceSale?: number;
  /** JSON string opaco; ausente si el API no lo envía. */
  metadata?: string | null;

};
