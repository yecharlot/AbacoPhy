/** Formas de API para /online-orders. */

export type OnlineOrderLineDto = {
  product_id: string;
  product_code?: string;
  product_name?: string;
  qty?: number;
  unit_price?: number;
  line_total?: number;
};

export type OnlineOrderDto = {
  id: string;
  number?: string;
  customer?: string;
  phone?: string;
  address?: string;
  status?: string;
  lines?: OnlineOrderLineDto[] | null;
  total?: number;
  currency?: string;
  notes?: string;
};

export type OnlineOrdersResponseDto = {
  orders?: OnlineOrderDto[] | null;
};

export type OnlineOrderResponseDto = {
  ok?: boolean;
  order?: OnlineOrderDto;
};
