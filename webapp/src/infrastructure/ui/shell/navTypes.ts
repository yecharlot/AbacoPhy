/** Nav items filtered by session.views (ACL del backend). */

export type NavItem = {
  id: string;
  label: string;
  /**
   * Clave ViewACL del backend (o varias alternativas).
   * Si es string[], basta con una.
   * Sin view = visible si hay sesión (evitar).
   */
  view?: string | string[];
};

export function filterNavByViews(
  items: NavItem[],
  views: string[] | null | undefined,
): NavItem[] {
  if (!views || views.length === 0) {
    // Sin lista de vistas: no mostrar ítems con ACL (seguridad por defecto)
    return items.filter((i) => !i.view);
  }
  const set = new Set(views);
  return items.filter((i) => {
    if (!i.view) return true;
    const keys = Array.isArray(i.view) ? i.view : [i.view];
    return keys.some((k) => set.has(k));
  });
}

/**
 * ids = ramas de App.svelte.
 * view = claves exactas de internal/auth ViewACL.
 */
export const PLACEHOLDER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Resumen', view: ['dashboard', 'reportes'] },
  { id: 'ingresos', label: 'Ingresos', view: 'ingresos' },
  { id: 'gastos', label: 'Gastos', view: 'gastos' },
  { id: 'cuentas', label: 'Cuentas', view: ['cuentas', 'cuentas_t'] },
  { id: 'reportes', label: 'Reportes', view: 'reportes' },
  { id: 'facturas', label: 'Facturación', view: 'facturas' },
  { id: 'empleados', label: 'Empleados', view: 'nomina' },
  { id: 'liquidaciones', label: 'Nómina', view: 'nomina' },
  { id: 'catalog', label: 'Catálogo', view: ['nomencladores', 'productos'] },
  { id: 'tenant', label: 'Negocio', view: 'tenant' },
  { id: 'almacen', label: 'Almacén', view: ['almacen', 'inventario'] },
  { id: 'recepcion', label: 'Recepción', view: ['recepcion', 'almacen'] },
  { id: 'transferencias', label: 'Transferencias', view: ['almacen', 'unidades'] },
  { id: 'pos', label: 'Punto de venta', view: 'vendedor' },
  { id: 'fichas-costo', label: 'Fichas de costo', view: 'fichas_costo' },
  { id: 'fichas-precio', label: 'Fichas de precio', view: 'fichas_precio' },
  { id: 'pedidos', label: 'Pedidos online', view: ['pedidos_online', 'tienda'] },
  { id: 'traza', label: 'Traza', view: 'traza' },
  { id: 'salvas', label: 'Salvas', view: 'salvas' },
  { id: 'usuarios', label: 'Usuarios', view: 'usuarios' },
  { id: 'master', label: 'Master', view: 'master' },
];
