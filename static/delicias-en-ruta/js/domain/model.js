/** Estado completo offline — espejo de capacidades main ÁbacoPhy */
export function emptyState() {
  return {
    version: 2,
    tenant: {
      name: 'Delicias en Ruta',
      slogan: 'Gastronomía · Calidad · Sostenibilidad',
      currency: 'CUP',
      address: '',
      phone: '',
    },
    accounts: [
      { id: 'a1', code: '100', name: 'Caja', type: 'asset', balance: 0 },
      { id: 'a2', code: '110', name: 'Banco', type: 'asset', balance: 0 },
      { id: 'a3', code: '400', name: 'Ingresos ventas', type: 'income', balance: 0 },
      { id: 'a4', code: '500', name: 'Gastos operativos', type: 'expense', balance: 0 },
      { id: 'a5', code: '200', name: 'Proveedores', type: 'liability', balance: 0 },
    ],
    entries: [],
    products: [],
    inventory: [],
    sales: [],
    onlineOrders: [],
    employees: [],
    payslips: [],
    invoices: [],
    receptions: [],
    transfers: [],
    costSheets: [],
    priceSheets: [],
    salesUnits: [{ id: 'u1', code: 'MOSTRADOR', name: 'Mostrador principal', active: true }],
    users: [
      { id: 'u-admin', username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
      { id: 'u-master', username: 'master', password: 'AbacoPhy#Master1', role: 'master', name: 'Master' },
      { id: 'u-caja', username: 'caja', password: 'caja123', role: 'cashier', name: 'Cajero' },
    ],
    rolePermissions: {
      master: ['*'],
      admin: ['pos', 'accounting', 'warehouse', 'catalog', 'payroll', 'invoicing', 'reports', 'users'],
      cashier: ['pos', 'catalog'],
    },
    audit: [],
    kpis: { ingresos: 0, gastos: 0, pedidos: 0, stock: 0 },
  };
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

export function now() {
  return new Date().toISOString();
}

export function recomputeKpis(s) {
  s.kpis = {
    ingresos: s.entries.filter((e) => e.type === 'income').reduce((a, e) => a + Number(e.amount || 0), 0),
    gastos: s.entries.filter((e) => e.type === 'expense').reduce((a, e) => a + Number(e.amount || 0), 0),
    pedidos: (s.sales || []).length + (s.onlineOrders || []).length,
    stock: (s.inventory || []).length || (s.products || []).length,
  };
  return s;
}
