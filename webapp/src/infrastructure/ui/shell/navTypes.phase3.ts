/**
 * Sustituye el contenido de navTypes.ts (o fusiona PLACEHOLDER_NAV).
 * Fase 3 — accounting views.
 */

export type NavItem = {
  id: string;
  label: string;
  view?: string;
};

export function filterNavByViews(items: NavItem[], views: string[] | null | undefined): NavItem[] {
  if (!views || views.length === 0) {
    return items.filter((i) => !i.view);
  }
  const set = new Set(views);
  return items.filter((i) => !i.view || set.has(i.view));
}

export const PLACEHOLDER_NAV: NavItem[] = [
  { id: 'home', label: 'Inicio', view: 'dashboard' },
  { id: 'dashboard', label: 'Dashboard', view: 'dashboard' },
  { id: 'ingresos', label: 'Ingresos', view: 'ingresos' },
  { id: 'gastos', label: 'Gastos', view: 'gastos' },
  { id: 'cuentas', label: 'Cuentas', view: 'cuentas' },
  { id: 'reportes', label: 'Reportes', view: 'reportes' },
  { id: 'tenant', label: 'Negocio', view: 'tenant' },
];
