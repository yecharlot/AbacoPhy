export interface InvoiceLineDto {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  date: string;
  customer_id: string;
  customer_name: string;
  lines: InvoiceLineDto[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
}
