/** Estado offline completo — espejo de entidades ÁbacoPhy main */
export function emptyState() {
  return {
    version: 3,
    tenant: {
      name: 'Delicias en Ruta',
      slogan: 'Gastronomía · Calidad · Sostenibilidad',
      currency: 'CUP',
      address: '',
      phone: '',
      email: '',
    },
    accounts: [
      { id: 'acc-100', code: '100', name: 'Caja', type: 'asset', balance: 0, active: true },
      { id: 'acc-110', code: '110', name: 'Banco', type: 'asset', balance: 0, active: true },
      { id: 'acc-200', code: '200', name: 'Proveedores', type: 'liability', balance: 0, active: true },
      { id: 'acc-400', code: '400', name: 'Ingresos por ventas', type: 'income', balance: 0, active: true },
      { id: 'acc-500', code: '500', name: 'Gastos operativos', type: 'expense', balance: 0, active: true },
      { id: 'acc-510', code: '510', name: 'Costo de ventas', type: 'expense', balance: 0, active: true },
      { id: 'acc-520', code: '520', name: 'Nómina', type: 'expense', balance: 0, active: true },
    ],
    entries: [],
    products: [],
    measureUnits: [
      { id: 'mu-u', code: 'U', name: 'Unidad' },
      { id: 'mu-kg', code: 'KG', name: 'Kilogramo' },
      { id: 'mu-l', code: 'L', name: 'Litro' },
    ],
    currencies: [{ code: 'CUP', name: 'Peso cubano' }, { code: 'USD', name: 'Dólar' }],
    inventory: [],
    sales: [],
    onlineOrders: [],
    employees: [],
    payslips: [],
    jobPositions: [
      { id: 'jp-caja', name: 'Cajero' },
      { id: 'jp-cocina', name: 'Cocina' },
      { id: 'jp-ruta', name: 'Ruta' },
      { id: 'jp-admin', name: 'Administración' },
    ],
    invoices: [],
    receptions: [],
    transfers: [],
    costSheets: [],
    priceSheets: [],
    salesUnits: [
      { id: 'su-1', code: 'MOSTRADOR', name: 'Mostrador principal', active: true },
      { id: 'su-2', code: 'RUTA', name: 'Unidad de ruta', active: true },
    ],
    users: [
      { id: 'u-admin', username: 'admin', password: 'admin123', role: 'admin', displayName: 'Administrador', active: true },
      { id: 'u-master', username: 'master', password: 'AbacoPhy#Master1', role: 'master', displayName: 'Master', active: true },
      { id: 'u-caja', username: 'caja', password: 'caja123', role: 'cashier', displayName: 'Cajero', active: true },
      { id: 'u-alm', username: 'almacen', password: 'almacen123', role: 'almacenero', displayName: 'Almacenero', active: true },
    ],
    rolePermissions: {
      master: { '*': true },
      admin: {
        dashboard: true, ingresos: true, gastos: true, cuentas: true, reportes: true,
        facturas: true, empleados: true, liquidaciones: true, catalog: true, tenant: true,
        almacen: true, recepcion: true, transferencias: true, pos: true,
        'fichas-costo': true, 'fichas-precio': true, pedidos: true, traza: true, salvas: true,
        usuarios: true, permisos: true,
      },
      cashier: { dashboard: true, pos: true, catalog: true, pedidos: true },
      almacenero: { dashboard: true, almacen: true, recepcion: true, transferencias: true, catalog: true },
    },
    modules: {
      accounting: true, pos: true, warehouse: true, payroll: true, invoicing: true,
      catalog: true, costing: true, commerce: true, audit: true, master: true,
    },
    tenants: [{ id: 't-delicias', name: 'Delicias en Ruta', active: true }],
    backups: [],
    audit: [],
    systemErrors: [],
    kpis: { ingresos: 0, gastos: 0, pedidos: 0, stock: 0 },
  };
}

export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));
}
export function now() { return new Date().toISOString(); }

export function recomputeKpis(s) {
  const incomes = s.entries.filter((e) => e.type === 'income');
  const expenses = s.entries.filter((e) => e.type === 'expense');
  s.kpis = {
    ingresos: incomes.reduce((a, e) => a + Number(e.amount || 0), 0),
    gastos: expenses.reduce((a, e) => a + Number(e.amount || 0), 0),
    pedidos: (s.sales || []).length + (s.onlineOrders || []).length,
    stock: (s.inventory || []).reduce((a, i) => a + Number(i.quantity || 0), 0) || (s.products || []).length,
  };
  return s;
}
