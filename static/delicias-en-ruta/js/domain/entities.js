/** Domain entities — Delicias en Ruta */

export const ALL_SCREENS = [
  'dashboard', 'pos', 'pedidos', 'ingresos', 'gastos', 'reportes',
  'catalog', 'almacen', 'empleados', 'tenant', 'traza', 'permisos', 'usuarios',
];

/** Plantillas de rol: pantallas visibles por defecto */
export const ROLE_TEMPLATES = {
  master: [...ALL_SCREENS],
  admin: ['dashboard', 'pos', 'pedidos', 'ingresos', 'gastos', 'reportes', 'catalog', 'almacen', 'empleados', 'tenant', 'traza'],
  cajero: ['dashboard', 'pos', 'pedidos', 'ingresos'],
  cocina: ['dashboard', 'pedidos', 'catalog', 'almacen'],
  contable: ['dashboard', 'ingresos', 'gastos', 'reportes', 'traza'],
  consulta: ['dashboard', 'reportes'],
};

export function createEmptyState() {
  return {
    tenant: {
      name: 'Delicias en Ruta Pp',
      slogan: 'Gastronomía · Calidad · Sostenibilidad',
      activity: 'Servicios gastronómicos, cafetería y servicio móvil de comidas',
    },
    kpis: { ingresos: 0, gastos: 0, pedidos: 0, stock: 0 },
    ingresos: [],
    gastos: [],
    productos: [],
    pedidos: [],
    empleados: [],
    /** usuarios del sistema (Master gestiona menú) */
    usuarios: [
      {
        id: 'u-master',
        username: 'Master',
        password: 'Master',
        role: 'master',
        /** pantallas permitidas; si null → plantilla del rol */
        screens: null,
      },
      {
        id: 'u-cajero',
        username: 'Cajero',
        password: 'cajero',
        role: 'cajero',
        screens: null,
      },
    ],
    /** sesión actual (no se persiste de forma sensible en prod real) */
    session: null,
    meta: { lastCid: null, updatedAt: null },
  };
}

/** Resuelve pantallas efectivas de un usuario */
export function effectiveScreens(user) {
  if (!user) return [];
  if (user.role === 'master') return [...ALL_SCREENS];
  if (Array.isArray(user.screens) && user.screens.length) return [...user.screens];
  return [...(ROLE_TEMPLATES[user.role] || ROLE_TEMPLATES.consulta)];
}

export function canAccess(user, screenId) {
  return effectiveScreens(user).includes(screenId);
}
