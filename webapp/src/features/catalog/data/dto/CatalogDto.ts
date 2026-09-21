export type ProductDto = {
  id: string;
  code: string;
  name: string;
  unit?: string;
  category?: string;
  cost_std?: number;
  price_sale?: number;
};

export type ProductsResponseDto = {
  products?: ProductDto[];
};

export type MeasureUnitDto = {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  active?: boolean;
};

export type MeasureUnitsResponseDto = {
  units?: MeasureUnitDto[];
};

export type CurrencyDto = {
  code: string;
  name: string;
  rate: number;
  active?: boolean;
};

export type CurrenciesResponseDto = {
  currencies?: CurrencyDto[];
};
