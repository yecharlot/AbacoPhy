export interface InvoiceLine {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}
