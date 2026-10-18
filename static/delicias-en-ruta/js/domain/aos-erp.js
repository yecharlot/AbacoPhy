/**
 * AOS-ERP — nodos firmados con doble señal:
 * 1) Flujo económico (relleno): entra / sale / pérdida
 * 2) Zyrion operativo (borde): éxito / fallo / pendiente
 * Filtros combinables: categoría, flujo, zyrion, rango de fechas, últimas N.
 * Cadena SHA-256 append-only.
 */

const CHAIN_KEY = 'delicias.aos-erp.chain';

export const ZYRION = {
  FAILURE: 0,
  SUCCESS: 1,
  INDETERMINATE: 2,
};

export const FLOW = {
  IN: 'in',
  OUT: 'out',
  LOSS: 'loss',
  NEUTRAL: 'neutral',
};

export const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'compra', label: 'Compras' },
  { id: 'venta', label: 'Ventas' },
  { id: 'ingreso', label: 'Ingresos' },
  { id: 'gasto', label: 'Gastos' },
  { id: 'impuesto', label: 'Impuestos' },
  { id: 'caja', label: 'Caja' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'nomina', label: 'Nómina' },
  { id: 'factura', label: 'Facturas' },
  { id: 'otro', label: 'Otros' },
];

export const FLOW_FILTERS = [
  { id: 'all', label: 'Todo flujo' },
  { id: 'in', label: 'Entra dinero' },
  { id: 'out', label: 'Sale dinero' },
  { id: 'loss', label: 'Pérdidas' },
];

export const DATE_PRESETS = [
  { id: 'all', label: 'Todo el tiempo' },
  { id: 'last10', label: 'Últimas 10' },
  { id: 'last30', label: 'Últimas 30' },
  { id: 'today', label: 'Hoy' },
  { id: 'month', label: 'Mes actual' },
  { id: 'prev_month', label: 'Mes anterior' },
  { id: 'range', label: 'Rango personalizado' },
];

export function flowColor(flow) {
  if (flow === FLOW.IN) return '#22c55e';
  if (flow === FLOW.OUT) return '#f97316';
  if (flow === FLOW.LOSS) return '#dc2626';
  return '#64748b';
}

export function flowLabel(flow) {
  if (flow === FLOW.IN) return 'Entra dinero (+)';
  if (flow === FLOW.OUT) return 'Sale dinero (−)';
  if (flow === FLOW.LOSS) return 'Pérdida / merma';
  return 'Neutro';
}

export function zyrionColor(z) {
  if (z === ZYRION.SUCCESS) return '#86efac';
  if (z === ZYRION.FAILURE) return '#fca5a5';
  return '#cbd5e1';
}

export function zyrionLabel(z) {
  if (z === ZYRION.SUCCESS) return 'Operación OK (Zyrion 1)';
  if (z === ZYRION.FAILURE) return 'Operación fallida (Zyrion 0)';
  return 'Pendiente / dudoso (Zyrion 2)';
}

export function nodeDisplayColor(node) {
  if (node.isNucleus) return '#f4b400';
  if (node.isActor) return '#64748b';
  if (node.zyrion === ZYRION.FAILURE) return '#ef4444';
  if (node.zyrion === ZYRION.INDETERMINATE) {
    if (node.flow === FLOW.IN) return '#4ade80aa';
    if (node.flow === FLOW.OUT || node.flow === FLOW.LOSS) return '#fb923c99';
    return '#94a3b8';
  }
  return flowColor(node.flow || FLOW.NEUTRAL);
}

export function classifyFlow({ type, category, label, amount, loss }) {
  if (loss) return FLOW.LOSS;
  const blob = `${type || ''} ${category || ''} ${label || ''}`.toLowerCase();
  if (/merma|perdida|pérdida|castigo|robo|siniestro|write.?off/.test(blob)) return FLOW.LOSS;
  if (/impuesto|tax|tribut|fiscal|onat|\biva\b/.test(blob)) return FLOW.OUT;
  if (/compra|proveedor|suministro|gasto|egreso|nomina|nómina|salario|combustible|\bpago\b/.test(blob)) return FLOW.OUT;
  if (/venta|ingreso|cobro|recaud|catering|factura|cliente/.test(blob)) return FLOW.IN;
  if (type === 'expense' || category === 'gasto' || category === 'compra' || category === 'nomina' || category === 'impuesto') return FLOW.OUT;
  if (type === 'income' || category === 'ingreso' || category === 'venta' || category === 'factura') return FLOW.IN;
  if (typeof amount === 'number' && amount < 0) return FLOW.OUT;
  return FLOW.NEUTRAL;
}

/** Normaliza cualquier fecha del dominio a Date + etiqueta legible */
export function parseOpDate(raw) {
  if (raw == null || raw === '') return { ts: 0, iso: '', label: '—' };
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return { ts: d.getTime(), iso: d.toISOString(), label: formatDateLabel(d) };
  }
  const s = String(raw).trim();
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return { ts: d.getTime(), iso: d.toISOString(), label: formatDateLabel(d) };
  }
  // YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d2 = new Date(+m[1], +m[2] - 1, +m[3]);
    return { ts: d2.getTime(), iso: d2.toISOString(), label: formatDateLabel(d2) };
  }
  return { ts: 0, iso: s, label: s.slice(0, 19) };
}

function formatDateLabel(d) {
  try {
    return d.toLocaleString('es', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return ('00000000' + (h >>> 0).toString(16)).slice(-8).padStart(64, '0');
}

function loadChain() {
  try {
    return JSON.parse(localStorage.getItem(CHAIN_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveChain(chain) {
  localStorage.setItem(CHAIN_KEY, JSON.stringify(chain.slice(-2000)));
}

export async function sealNode(node) {
  const chain = loadChain();
  const prev = chain.length ? chain[chain.length - 1].hash : 'genesis';
  const payload = {
    id: node.id,
    type: node.type,
    category: node.category,
    amount: node.amount,
    currency: node.currency,
    zyrion: node.zyrion,
    flow: node.flow,
    from: node.from,
    to: node.to,
    label: node.label,
    detail: node.detail,
    date: node.dateIso || node.at,
    prev,
  };
  const hash = await sha256Hex(JSON.stringify(payload));
  const sealed = { ...node, prev, hash, sealedAt: Date.now() };
  chain.push({ id: sealed.id, hash, prev, at: sealed.sealedAt, category: sealed.category });
  saveChain(chain);
  return sealed;
}

export function getChainTip() {
  const chain = loadChain();
  return chain.length ? chain[chain.length - 1] : null;
}

export function getChain() {
  return loadChain();
}

function enrichDate(node, rawDate) {
  const p = parseOpDate(rawDate);
  node.at = p.ts || node.at || 0;
  node.dateIso = p.iso;
  node.dateLabel = p.label;
  return node;
}

/**
 * Grafo desde estado Delicias (misma fuente que engine offline / mirror main).
 */
export function buildGraphFromState(state) {
  const nodes = [];
  const edges = [];
  const byId = new Map();
  const push = (n) => {
    if (byId.has(n.id)) return;
    byId.set(n.id, n);
    nodes.push(n);
  };
  const tenant = state.tenant?.name || 'Caja Central';

  // —— Asientos (ingresos / gastos) — equivalente CreateIncome/Expense + ListEntries ——
  (state.entries || []).forEach((e, i) => {
    const isIncome = e.type === 'income' || e.nature === 'ingreso' || e.kind === 'income';
    const isExpense = e.type === 'expense' || e.nature === 'gasto' || e.kind === 'expense';
    let zyrion = ZYRION.SUCCESS;
    if (e.status === 'pending' || e.pending) zyrion = ZYRION.INDETERMINATE;
    if (e.status === 'failed' || e.status === 'cancelled' || e.failed) zyrion = ZYRION.FAILURE;
    if (e.loss || e.category === 'perdida' || e.category === 'pérdida') zyrion = ZYRION.FAILURE;

    const label = e.memo || e.description || e.concept || (isIncome ? 'Ingreso' : 'Gasto');
    let cat = isIncome ? 'ingreso' : isExpense ? 'gasto' : 'otro';
    if (/impuesto|tax|tribut|onat|\biva\b/i.test(label)) cat = 'impuesto';
    if (/nomina|nómina|salario/i.test(label)) cat = 'nomina';

    const detail = [e.description || e.concept || e.memo, e.notes, e.counterpart || e.counterparty]
      .filter(Boolean)
      .filter((x, idx, arr) => arr.indexOf(x) === idx)
      .join(' · ');

    const flow = classifyFlow({
      type: isIncome ? 'income' : isExpense ? 'expense' : 'otro',
      category: cat,
      label,
      amount: e.amount,
      loss: e.loss || cat === 'perdida',
    });

    const id = e.id || `entry-${i}`;
    const node = enrichDate({
      id,
      label,
      detail: detail || label,
      type: isIncome ? 'ingreso' : 'gasto',
      category: cat,
      amount: Math.abs(Number(e.amount) || 0),
      currency: e.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow,
      from: isExpense ? (e.accountName || e.accountCode || tenant) : (e.counterpart || e.counterparty || e.from || 'Cliente'),
      to: isIncome ? (e.accountName || e.accountCode || tenant) : (e.counterpart || e.counterparty || e.to || 'Proveedor'),
      accountCode: e.accountCode || '',
      source: 'entries',
      raw: e,
    }, e.date || e.at || e.createdAt);

    push(node);
    // sin nodos de cuenta/contraparte en el grafo
  });

  // —— Ventas POS ——
  (state.sales || []).forEach((s, i) => {
    const id = s.id || `sale-${i}`;
    let zyrion = ZYRION.SUCCESS;
    if (s.status === 'pending') zyrion = ZYRION.INDETERMINATE;
    if (s.status === 'cancelled' || s.status === 'void') zyrion = ZYRION.FAILURE;
    const label = s.memo || `Venta #${s.number || i + 1}`;
    const detail = [
      label,
      s.paymentMethod ? `Pago: ${s.paymentMethod}` : '',
      Array.isArray(s.items) ? `${s.items.length} ítems` : '',
      s.notes || '',
    ].filter(Boolean).join(' · ');
    push(enrichDate({
      id,
      label,
      detail,
      type: 'venta',
      category: 'venta',
      amount: Number(s.total || s.amount || 0),
      currency: s.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow: FLOW.IN,
      from: 'Cliente',
      to: tenant,
      source: 'sales',
      raw: s,
    }, s.at || s.createdAt || s.date));
  });

  // —— Pedidos online ——
  (state.onlineOrders || []).forEach((o, i) => {
    const id = o.id || `order-${i}`;
    let zyrion = ZYRION.INDETERMINATE;
    if (o.status === 'delivered' || o.status === 'paid' || o.status === 'completed' || o.status === 'entregado') zyrion = ZYRION.SUCCESS;
    if (o.status === 'cancelled' || o.status === 'rejected' || o.status === 'cancelado') zyrion = ZYRION.FAILURE;
    const label = o.memo || `Pedido ${o.code || i + 1}`;
    const detail = [label, o.customer, o.status, o.notes].filter(Boolean).join(' · ');
    push(enrichDate({
      id,
      label,
      detail,
      type: 'pedido',
      category: 'venta',
      amount: Number(o.total || o.amount || 0),
      currency: o.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow: FLOW.IN,
      from: o.customer || 'Cliente online',
      to: tenant,
      source: 'orders',
      raw: o,
    }, o.at || o.createdAt || o.date));
  });

  // —— Facturas ——
  (state.invoices || []).forEach((inv, i) => {
    const id = inv.id || `inv-${i}`;
    let zyrion = ZYRION.SUCCESS;
    if (inv.status === 'borrador' || inv.status === 'draft') zyrion = ZYRION.INDETERMINATE;
    if (inv.status === 'anulada' || inv.status === 'cancelled') zyrion = ZYRION.FAILURE;
    const label = `Factura ${inv.number || inv.code || id.slice(0, 8)}`;
    const detail = [label, inv.client || inv.customer, inv.notes, inv.status].filter(Boolean).join(' · ');
    push(enrichDate({
      id,
      label,
      detail,
      type: 'factura',
      category: 'factura',
      amount: Number(inv.total || inv.amount || 0),
      currency: inv.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow: FLOW.IN,
      from: inv.client || inv.customer || 'Cliente',
      to: tenant,
      source: 'invoices',
      raw: inv,
    }, inv.at || inv.date || inv.createdAt));
  });

  // —— Nómina / liquidaciones ——
  (state.payslips || []).forEach((p, i) => {
    const id = p.id || `pay-${i}`;
    const label = `Nómina ${p.employeeName || p.period || i + 1}`;
    const detail = [label, p.period, p.notes, p.status].filter(Boolean).join(' · ');
    push(enrichDate({
      id,
      label,
      detail,
      type: 'nomina',
      category: 'nomina',
      amount: Number(p.amount || p.total || 0),
      currency: state.tenant?.currency || 'CUP',
      zyrion: p.status === 'anulado' ? ZYRION.FAILURE : ZYRION.SUCCESS,
      flow: FLOW.OUT,
      from: tenant,
      to: p.employeeName || 'Personal',
      source: 'payslips',
      raw: p,
    }, p.at || p.date || p.period));
  });

  // —— Recepciones de inventario ——
  (state.receptions || state.recepciones || []).forEach((r, i) => {
    const id = r.id || `rec-${i}`;
    const label = r.memo || `Recepción ${i + 1}`;
    const detail = [label, r.supplier, r.notes, r.status].filter(Boolean).join(' · ');
    push(enrichDate({
      id,
      label,
      detail,
      type: 'recepcion',
      category: 'inventario',
      amount: Number(r.total || r.amount || 0),
      currency: state.tenant?.currency || 'CUP',
      zyrion: r.status === 'cancelada' ? ZYRION.FAILURE : ZYRION.SUCCESS,
      flow: FLOW.OUT,
      from: r.supplier || 'Proveedor',
      to: 'Almacén',
      source: 'receptions',
      raw: r,
    }, r.at || r.date));
  });

  // Solo operaciones como nodos (no actores ni saldos/cuentas).
  // Contrapartes y montos viven en el detalle al hacer clic.
  const opNodes = nodes.filter((n) => !n.isActor && n.type !== 'actor');
  const opIds = new Set(opNodes.map((n) => n.id));
  // Aristas ligeras: cada operación se enlaza al núcleo (se añade en la vista)
  // y se conservan dependencias reales entre operaciones si ambas existen.
  const opEdges = edges.filter((e) => opIds.has(e.from) && opIds.has(e.to));

  return { nodes: opNodes, edges: opEdges };
}

export function demoGraph(tenantName = 'Delicias en Ruta') {
  const now = Date.now();
  const nodes = [
    enrichDate({ id: 'op-1', label: 'Venta mostrador #101', detail: 'Venta mostrador · efectivo · 3 ítems', type: 'venta', category: 'venta', amount: 850, currency: 'CUP', zyrion: 1, flow: 'in', from: 'Cliente', to: tenantName }, now - 86400000 * 2),
    enrichDate({ id: 'op-2', label: 'Compra suministros', detail: 'Compra a Vendor-Beta · insumos cocina', type: 'compra', category: 'compra', amount: 12000, currency: 'USD', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Vendor-Beta' }, now - 86400000),
    enrichDate({ id: 'op-3', label: 'Gasto combustible', detail: 'Ruta · tanque completo', type: 'gasto', category: 'gasto', amount: 420, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Gasolinera' }, now - 3600000 * 20),
    enrichDate({ id: 'op-3b', label: 'Pago impuestos ONAT', detail: 'Declaración mensual · ONAT', type: 'gasto', category: 'impuesto', amount: 2100, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'ONAT' }, now - 86400000 * 5),
    enrichDate({ id: 'op-3c', label: 'Nómina quincena', detail: 'Liquidación personal de ruta', type: 'gasto', category: 'nomina', amount: 8000, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Personal' }, now - 86400000),
    enrichDate({ id: 'op-4', label: 'Pedido online pendiente', detail: 'Cliente Web · esperando confirmación', type: 'pedido', category: 'venta', amount: 1500, currency: 'CUP', zyrion: 2, flow: 'in', from: 'Cliente Web', to: tenantName }, now - 3600000),
    enrichDate({ id: 'op-5', label: 'Cobro rechazado POS', detail: 'Tarjeta declinada · reintento pendiente', type: 'venta', category: 'venta', amount: 300, currency: 'CUP', zyrion: 0, flow: 'in', from: 'Cliente', to: tenantName }, now - 7200000),
    enrichDate({ id: 'op-6', label: 'Pérdida merma cocina', detail: 'Merma controlada · inventario', type: 'gasto', category: 'gasto', amount: 200, currency: 'CUP', zyrion: 1, flow: 'loss', from: 'Almacén', to: 'Merma' }, now - 86400000 * 3),
    enrichDate({ id: 'op-7', label: 'Ingreso catering', detail: 'Evento corporativo XYZ', type: 'ingreso', category: 'ingreso', amount: 5000, currency: 'CUP', zyrion: 1, flow: 'in', from: 'Empresa XYZ', to: tenantName }, now - 86400000 * 4),
  ];
  const edges = [
    { from: 'op-5', to: 'op-1' },
  ];
  return { nodes, edges };
}

/**
 * Filtros combinables.
 * opts: { category, zyrionFilter, flowFilter, datePreset, dateFrom, dateTo, lastN }
 */
export function filterGraph(graph, opts = {}) {
  const {
    category = 'all',
    zyrionFilter = 'all',
    flowFilter = 'all',
    datePreset = 'all',
    dateFrom = '',
    dateTo = '',
    lastN = 0,
  } = typeof opts === 'string'
    ? { category: opts, zyrionFilter: arguments[2], flowFilter: arguments[3] } // compat
    : opts;

  let nodes = graph.nodes.slice();
  const structural = (n) => n.isActor || n.isNucleus || n.isCluster;

  if (category && category !== 'all') {
    nodes = nodes.filter((n) => structural(n) || n.category === category);
  }
  if (zyrionFilter !== null && zyrionFilter !== undefined && zyrionFilter !== 'all') {
    const z = Number(zyrionFilter);
    nodes = nodes.filter((n) => structural(n) || n.zyrion === z);
  }
  if (flowFilter && flowFilter !== 'all') {
    nodes = nodes.filter((n) => structural(n) || n.flow === flowFilter);
  }

  // Fechas
  let fromTs = 0;
  let toTs = Infinity;
  const now = new Date();
  if (datePreset === 'today') {
    fromTs = startOfDay(now);
    toTs = endOfDay(now);
  } else if (datePreset === 'month') {
    fromTs = startOfMonth(now);
    toTs = endOfMonth(now);
  } else if (datePreset === 'prev_month') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    fromTs = startOfMonth(prev);
    toTs = endOfMonth(prev);
  } else if (datePreset === 'range' || dateFrom || dateTo) {
    if (dateFrom) fromTs = startOfDay(new Date(dateFrom));
    if (dateTo) toTs = endOfDay(new Date(dateTo));
  }

  if (datePreset === 'last10' || datePreset === 'last30' || lastN > 0) {
    const n = lastN > 0 ? lastN : (datePreset === 'last30' ? 30 : 10);
    const ops = nodes
      .filter((x) => !structural(x))
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, n);
    const keep = new Set(ops.map((x) => x.id));
    nodes = nodes.filter((x) => structural(x) || keep.has(x.id));
  } else if (fromTs > 0 || toTs < Infinity) {
    nodes = nodes.filter((x) => {
      if (structural(x)) return true;
      const t = x.at || 0;
      return t >= fromTs && t <= toTs;
    });
  }

  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return { nodes, edges };
}

/** Conteos cuantitativos para el panel del dueño */
export function quantStats(nodes) {
  const ops = (nodes || []).filter((n) => !n.isActor && !n.isNucleus && !n.isCluster);
  const byFlow = { in: 0, out: 0, loss: 0, neutral: 0 };
  const byZyrion = { ok: 0, fail: 0, pending: 0 };
  const byCategory = {};
  let sumIn = 0;
  let sumOut = 0;
  let sumLoss = 0;
  ops.forEach((n) => {
    const f = n.flow || 'neutral';
    byFlow[f] = (byFlow[f] || 0) + 1;
    if (n.zyrion === 1) byZyrion.ok++;
    else if (n.zyrion === 0) byZyrion.fail++;
    else byZyrion.pending++;
    const c = n.category || 'otro';
    byCategory[c] = (byCategory[c] || 0) + 1;
    const amt = Number(n.amount) || 0;
    if (f === 'in') sumIn += amt;
    else if (f === 'out') sumOut += amt;
    else if (f === 'loss') sumLoss += amt;
  });
  return {
    total: ops.length,
    byFlow,
    byZyrion,
    byCategory,
    sumIn,
    sumOut,
    sumLoss,
  };
}

export function neighborhood(graph, nodeId) {
  const linked = new Set([nodeId]);
  graph.edges.forEach((e) => {
    if (e.from === nodeId) linked.add(e.to);
    if (e.to === nodeId) linked.add(e.from);
  });
  return {
    nodes: graph.nodes.filter((n) => linked.has(n.id)),
    edges: graph.edges.filter((e) => linked.has(e.from) && linked.has(e.to)),
  };
}

export async function sealGraphOps(nodes) {
  const out = [];
  for (const n of nodes) {
    if (n.isActor || n.isNucleus) {
      out.push(n);
      continue;
    }
    if (n.hash) {
      out.push(n);
      continue;
    }
    out.push(await sealNode(n));
  }
  return out;
}
