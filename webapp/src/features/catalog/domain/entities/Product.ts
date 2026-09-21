export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  costStd: number;
  priceSale: number;
};

export type CreateProductInput = {
  code?: string;
  name: string;
  unit?: string;
  category?: string;
  costStd?: number;
  priceSale?: number;
};

export type UpdateProductInput = {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  category?: string;
  costStd?: number;
  priceSale?: number;
};
