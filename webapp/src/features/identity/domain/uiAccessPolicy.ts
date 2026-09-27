/**
 * Política FE de pantallas por rol.
 * No depende del ViewACL del backend; convive con él sin modificarlo.
 * @see webapp/.policies/ui-access-por-rol.md
 */

export type UiScreenDef = {
  id: string;
  label: string;
};

/** Catálogo de pantallas = ids de nav / App.svelte */
export const UI_SCREEN_CATALOG: UiScreenDef[] = [
  { id: 'dashboard', label: 'Resumen' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'cuentas', label: 'Cuentas' },
  { id: 'reportes', label: 'Informes / Reportes' },
  { id: 'facturas', label: 'Facturación' },
  { id: 'empleados', label: 'Empleados' },
  { id: 'liquidaciones', label: 'Nómina' },
  { id: 'catalog', label: 'Nomenclador' },
  { id: 'tenant', label: 'Negocio' },
  { id: 'almacen', label: 'Almacén' },
  { id: 'recepcion', label: 'Recepción' },
  { id: 'transferencias', label: 'Transferencias' },
  { id: 'pos', label: 'Punto de venta' },
  { id: 'fichas-costo', label: 'Fichas de costo' },
  { id: 'fichas-precio', label: 'Fichas de precio' },
  { id: 'pedidos', label: 'Pedidos online' },
  { id: 'traza', label: 'Traza' },
  { id: 'salvas', label: 'Salvas' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'permisos', label: 'Permisos UI' },
  { id: 'master', label: 'Master' },
];

export const ALL_SCREEN_IDS: string[] = UI_SCREEN_CATALOG.map((s) => s.id);

const ALL_EXCEPT_MASTER = ALL_SCREEN_IDS.filter((id) => id !== 'master');

/**
 * Defaults de producto (cliente).
 * Fuente de verdad inicial; puede sobreescribirse por rol en el panel Permisos.
 */
export const ROLE_DEFAULT_SCREENS: Record<string, string[]> = {
  vendedor: ['pos'],
  contador: ['dashboard', 'reportes', 'almacen', 'transferencias'],
  almacenero: ['almacen', 'catalog'],
  economico: [
    'dashboard',
    'gastos',
    'ingresos',
    'reportes',
    'recepcion',
    'fichas-costo',
    'fichas-precio',
  ],
  admin: [...ALL_EXCEPT_MASTER],
  master: [...ALL_SCREEN_IDS],
  // Residuales: mínimos hasta que master asigne
  operador: ['dashboard', 'pos'],
  readonly: ['dashboard', 'reportes'],
};

export type UiAccessMode = 'replace' | 'extra';

export type UserUiAccess = {
  mode: UiAccessMode;
  screens: string[];
};

export type UiAccessConfig = {
  version: 1;
  /** Overrides globales por rol (si falta la clave, se usa ROLE_DEFAULT_SCREENS). */
  roleScreens: Record<string, string[]>;
  /** Overrides por userId. */
  userAccess: Record<string, UserUiAccess>;
};

export function emptyUiAccessConfig(): UiAccessConfig {
  return { version: 1, roleScreens: {}, userAccess: {} };
}

export function defaultScreensForRole(role: string): string[] {
  const key = (role || '').trim().toLowerCase();
  const list = ROLE_DEFAULT_SCREENS[key];
  return list ? [...list] : [];
}
