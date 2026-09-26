export type MeasureUnit = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  active: boolean;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};

export type CreateMeasureUnitInput = {
  code: string;
  name: string;
  symbol?: string;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};
