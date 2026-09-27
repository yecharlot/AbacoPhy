export type ProductDto = {
  id: string;
  code: string;
  name: string;
  unit?: string;
  category?: string;
  cost_std?: number;
  price_sale?: number;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type ProductsResponseDto = {
  products?: ProductDto[];
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type MeasureUnitDto = {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  active?: boolean;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type MeasureUnitsResponseDto = {
  units?: MeasureUnitDto[];
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type CurrencyDto = {
  code: string;
  name: string;
  rate: number;
  active?: boolean;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type CurrenciesResponseDto = {
  currencies?: CurrencyDto[];
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};
