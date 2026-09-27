export type Currency = {
  code: string;
  name: string;
  rate: number;
  active: boolean;
  /** JSON string opaco; opcional (API puede omitirlo). */
  metadata?: string | null;

};
