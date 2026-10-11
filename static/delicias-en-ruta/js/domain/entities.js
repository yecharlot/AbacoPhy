/** Domain entities — Delicias en Ruta / AbacoPhy modules */
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
    meta: { lastCid: null, updatedAt: null },
  };
}
