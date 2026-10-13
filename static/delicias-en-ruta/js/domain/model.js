/** Estado offline — plan de cuentas y entidades alineados a main (bootstrap.go) */
export function defaultAccounts() {
  const defs = [
    ["1000", "Caja", "asset", "deudora", "Activo circulante"],
    ["1100", "Banco en moneda nacional", "asset", "deudora", "Activo circulante"],
    ["1110", "Banco en divisas", "asset", "deudora", "Activo circulante"],
    ["1200", "Cuentas por cobrar", "asset", "deudora", "Activo circulante"],
    ["1300", "Inventarios", "asset", "deudora", "Activo circulante"],
    ["1400", "Anticipos a proveedores", "asset", "deudora", "Activo circulante"],
    ["1500", "Activos fijos tangibles", "asset", "deudora", "Activo fijo"],
    ["1510", "Depreciación acumulada", "asset", "acreedora", "Activo fijo"],
    ["2000", "Cuentas por pagar", "liability", "acreedora", "Pasivo circulante"],
    ["2100", "Nómina por pagar", "liability", "acreedora", "Pasivo circulante"],
    ["2200", "Obligaciones con la seguridad social", "liability", "acreedora", "Pasivo circulante"],
    ["2300", "Provisión para vacaciones", "liability", "acreedora", "Pasivo circulante"],
    ["2400", "Impuestos por pagar", "liability", "acreedora", "Pasivo circulante"],
    ["3000", "Capital social", "equity", "acreedora", "Patrimonio"],
    ["3100", "Reservas", "equity", "acreedora", "Patrimonio"],
    ["3200", "Resultados acumulados", "equity", "acreedora", "Patrimonio"],
    ["4000", "Ingresos por ventas", "income", "acreedora", "Ingresos"],
    ["4100", "Otros ingresos", "income", "acreedora", "Ingresos"],
    ["5000", "Costo de ventas", "expense", "deudora", "Gastos"],
    ["5100", "Gastos de personal (salarios)", "expense", "deudora", "Gastos"],
    ["5110", "Seguridad social a cargo de la entidad", "expense", "deudora", "Gastos"],
    ["5120", "Provisión de vacaciones (gasto)", "expense", "deudora", "Gastos"],
    ["5200", "Gastos operativos", "expense", "deudora", "Gastos"],
    ["5300", "Gastos de impuestos", "expense", "deudora", "Gastos"],
  ];
  return defs.map(([code, name, type, nature, group]) => ({
    id: "acc-" + code, code, name, type, nature, group, balance: 0, active: true, currency: "CUP",
  }));
}

export function defaultRoles() {
  return [
    { id: "role-master", code: "master", name: "Master", system: true, description: "Control total de plataforma" },
    { id: "role-admin", code: "admin", name: "Administrador", system: true, description: "Administración del negocio" },
    { id: "role-contador", code: "contador", name: "Contador", system: false, description: "Contabilidad e informes" },
    { id: "role-economico", code: "economico", name: "Económico", system: false, description: "Finanzas y costos" },
    { id: "role-almacenero", code: "almacenero", name: "Almacenero", system: false, description: "Almacén y recepciones" },
    { id: "role-cashier", code: "cashier", name: "Cajero / Vendedor", system: false, description: "Punto de venta" },
  ];
}

export function emptyState() {
  const accounts = defaultAccounts();
  const roles = defaultRoles();
  const allScreens = [
    "dashboard","ingresos","gastos","cuentas","reportes","facturas",
    "empleados","liquidaciones","catalog","tenant","almacen","recepcion",
    "transferencias","pos","fichas-costo","fichas-precio","pedidos",
    "traza","salvas","usuarios","permisos","master","roles",
  ];
  const full = Object.fromEntries(allScreens.map((s) => [s, true]));
  return {
    version: 4,
    tenant: {
      name: "Delicias en Ruta",
      slogan: "Gastronomía · Calidad · Sostenibilidad",
      currency: "CUP",
      address: "",
      phone: "",
      email: "",
    },
    accounts,
    entries: [],
    journalLines: [],
    products: [],
    measureUnits: [
      { id: "mu-u", code: "U", name: "Unidad" },
      { id: "mu-kg", code: "KG", name: "Kilogramo" },
      { id: "mu-l", code: "L", name: "Litro" },
    ],
    currencies: [{ code: "CUP", name: "Peso cubano" }, { code: "USD", name: "Dólar" }],
    inventory: [],
    sales: [],
    onlineOrders: [],
    employees: [],
    payslips: [],
    jobPositions: [
      { id: "jp-caja", name: "Cajero" },
      { id: "jp-cocina", name: "Cocina" },
      { id: "jp-ruta", name: "Ruta" },
      { id: "jp-admin", name: "Administración" },
    ],
    invoices: [],
    receptions: [],
    transfers: [],
    costSheets: [],
    priceSheets: [],
    salesUnits: [
      { id: "su-1", code: "MOSTRADOR", name: "Mostrador principal", active: true },
      { id: "su-2", code: "RUTA", name: "Unidad de ruta", active: true },
    ],
    roles,
    users: [
      { id: "u-admin", username: "admin", password: "admin123", role: "admin", displayName: "Administrador", active: true, modules: {} },
      { id: "u-master", username: "master", password: "AbacoPhy#Master1", role: "master", displayName: "Master", active: true, modules: {} },
      { id: "u-caja", username: "caja", password: "caja123", role: "cashier", displayName: "Cajero", active: true, modules: {} },
      { id: "u-alm", username: "almacen", password: "almacen123", role: "almacenero", displayName: "Almacenero", active: true, modules: {} },
    ],
    rolePermissions: {
      master: { "*": true },
      admin: full, // full incluye roles/permisos/master si full map los tiene
      contador: Object.fromEntries(["dashboard","ingresos","gastos","cuentas","reportes","facturas","traza"].map((s) => [s, true])),
      economico: Object.fromEntries(["dashboard","reportes","fichas-costo","fichas-precio","catalog","cuentas"].map((s) => [s, true])),
      almacenero: Object.fromEntries(["dashboard","almacen","recepcion","transferencias","catalog"].map((s) => [s, true])),
      cashier: Object.fromEntries(["dashboard","pos","catalog","pedidos"].map((s) => [s, true])),
    },
    modules: {
      accounting: true, pos: true, warehouse: true, payroll: true, invoicing: true,
      catalog: true, costing: true, commerce: true, audit: true, master: true,
    },
    tenants: [{ id: "t-delicias", name: "Delicias en Ruta", active: true }],
    backups: [],
    audit: [],
    systemErrors: [],
    kpis: { ingresos: 0, gastos: 0, pedidos: 0, stock: 0 },
  };
}

export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || ("id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9));
}
export function now() { return new Date().toISOString(); }

export function recomputeKpis(s) {
  const eq = equationFromAccounts(s.accounts);
  s.kpis = {
    ingresos: eq.ingresos,
    gastos: eq.gastos,
    pedidos: (s.sales || []).length + (s.onlineOrders || []).length,
    stock: (s.inventory || []).reduce((a, i) => a + Number(i.quantity || 0), 0) || (s.products || []).length,
  };
  return s;
}

/** Ecuación ampliada — mirror domain.EquationSnapshot */
export function equationFromAccounts(accounts) {
  let activo = 0, pasivo = 0, patrimonio = 0, ingresos = 0, gastos = 0;
  for (const a of accounts || []) {
    if (!a || a.active === false) continue;
    const b = Number(a.balance || 0);
    switch (a.type) {
      case "asset": case "activo": activo += b; break;
      case "liability": case "pasivo": pasivo += b; break;
      case "equity": case "patrimonio": patrimonio += b; break;
      case "income": case "ingreso": ingresos += b; break;
      case "expense": case "gasto": gastos += b; break;
    }
  }
  const neto = ingresos - gastos;
  return {
    activo, pasivo, patrimonio, ingresos, gastos, neto,
    pasivo_patrimonio_neto: pasivo + patrimonio + neto,
    assets: activo, liabilities: pasivo, equity: patrimonio,
    income: ingresos, expenses: gastos, netProfit: neto,
  };
}
