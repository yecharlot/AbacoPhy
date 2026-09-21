/** Nav items filtered by views (ACL). No feature imports. */

export type NavItem = {
  id: string;
  label: string;
  /** View key required (from session.views). Empty = always visible when authenticated. */
  view?: string;
};

export function filterNavByViews(items: NavItem[], views: string[] | null | undefined): NavItem[] {
  if (!views || views.length === 0) {
    return items.filter((i) => !i.view);
  }
  const set = new Set(views);
  return items.filter((i) => !i.view || set.has(i.view));
}

/** Nav items phase 1–5 (MVPs). UI definitiva más adelante. */
export const PLACEHOLDER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Resumen', view: 'dashboard' },
  { id: 'ingresos', label: 'Ingresos', view: 'accounting' },
  { id: 'gastos', label: 'Gastos', view: 'accounting' },
  { id: 'facturas', label: 'Facturación', view: 'invoicing' },
  { id: 'empleados', label: 'Empleados', view: 'payroll' },
  { id: 'liquidaciones', label: 'Nómina', view: 'payroll' },
  { id: 'catalog', label: 'Catálogo', view: 'nomencladores' },
  { id: 'cuentas', label: 'Cuentas', view: 'accounting' },
  { id: 'reportes', label: 'Reportes', view: 'accounting' },
  { id: 'tenant', label: 'Negocio', view: 'tenant' },
  // Fase 8 — operaciones comerciales, comercio y gobernanza
  { id: 'almacen', label: 'Almacén', view: 'almacen' },
  { id: 'recepcion', label: 'Recepción', view: 'recepcion' },
  { id: 'transferencias', label: 'Transferencias', view: 'almacen' },
  { id: 'pos', label: 'Punto de venta', view: 'vendedor' },
  { id: 'fichas-costo', label: 'Fichas de costo', view: 'fichas_costo' },
  { id: 'fichas-precio', label: 'Fichas de precio', view: 'fichas_precio' },
  { id: 'pedidos', label: 'Pedidos online', view: 'pedidos_online' },
  { id: 'traza', label: 'Traza', view: 'traza' },
  { id: 'salvas', label: 'Salvas', view: 'salvas' },
  { id: 'usuarios', label: 'Usuarios', view: 'usuarios' },
  { id: 'master', label: 'Master', view: 'master' },
];
