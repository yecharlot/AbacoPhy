export interface EntryDto {
  id: string;
  date: string;
  concept: string;
  type: string;
  amount: number;
  currency: string;
  account_id: string;
  account_name?: string;
  category?: string;
  tags?: string[];
}
