export type MeasureUnit = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  active: boolean;
};

export type CreateMeasureUnitInput = {
  code: string;
  name: string;
  symbol?: string;
};
