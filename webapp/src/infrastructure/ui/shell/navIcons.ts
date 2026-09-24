/**
 * Iconos por id de pantalla. Solo infrastructure + lucide.
 * Añadir aquí cuando se registre un nuevo ítem en PLACEHOLDER_NAV.
 */
import type { Component } from 'svelte';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Wallet,
  Package,
  BookOpen,
  BarChart3,
  Building2,
  Warehouse,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  Calculator,
  Tags,
  ShoppingBag,
  ScrollText,
  Archive,
  UserCog,
  Shield,
  Circle,
} from '@lucide/svelte';

export type NavIcon = typeof LayoutDashboard;

const MAP: Record<string, NavIcon> = {
  dashboard: LayoutDashboard,
  ingresos: TrendingUp,
  gastos: TrendingDown,
  facturas: FileText,
  empleados: Users,
  liquidaciones: Wallet,
  catalog: Package,
  cuentas: BookOpen,
  reportes: BarChart3,
  tenant: Building2,
  almacen: Warehouse,
  recepcion: ClipboardList,
  transferencias: ArrowLeftRight,
  pos: ShoppingCart,
  'fichas-costo': Calculator,
  'fichas-precio': Tags,
  pedidos: ShoppingBag,
  traza: ScrollText,
  salvas: Archive,
  usuarios: UserCog,
  master: Shield,
};

export function iconForNav(id: string): NavIcon {
  return MAP[id] ?? Circle;
}
