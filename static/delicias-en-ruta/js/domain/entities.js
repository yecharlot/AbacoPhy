export function createEmptyState() {
  return {
    mode: 'local', // local | online
    online: false,
    tenant: { name: 'Delicias en Ruta', slogan: 'Gastronomía · Calidad · Sostenibilidad' },
    kpis: { ingresos: 0, gastos: 0, pedidos: 0, stock: 0 },
    ingresos: [],
    gastos: [],
    productos: [],
    pedidos: [],
    empleados: [],
    accounts: [],
    entries: [],
    inventory: [],
    invoices: [],
    payslips: [],
    receptions: [],
    warehouse: [],
    costSheets: [],
    onlineOrders: [],
    users: [],
    salesUnits: [],
    meta: {},
  };
}
