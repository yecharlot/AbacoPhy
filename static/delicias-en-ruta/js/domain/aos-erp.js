/**
 * AOS-ERP — nodos firmados con DOBLE señal visual:
 * 1) Flujo económico (relleno): entra dinero / sale dinero / neutro
 * 2) Zyrion operativo (borde): éxito / fallo / pendiente
 * Cadena SHA-256 append-only.
 */

const CHAIN_KEY = 'delicias.aos-erp.chain';

export const ZYRION = {
  FAILURE: 0,
  SUCCESS: 1,
  INDETERMINATE: 2,
};

/** Naturaleza de caja para el dueño (no confundir con Zyrion). */
export const FLOW = {
  IN: 'in',       // entra efectivo / mejora resultado
  OUT: 'out',     // sale efectivo (compra, gasto, impuesto, nómina)
  LOSS: 'loss',   // pérdida / merma / castigo (rojo intenso)
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
  { id: 'otro', label: 'Otros' },
];

export const FLOW_FILTERS = [
  { id: 'all', label: 'Todo flujo' },
  { id: 'in', label: 'Entra dinero' },
  { id: 'out', label: 'Sale dinero' },
  { id: 'loss', label: 'Pérdidas' },
];

/** Color de RELLENO = impacto económico */
export function flowColor(flow) {
  if (flow === FLOW.IN) return '#22c55e';
  if (flow === FLOW.OUT) return '#f97316';      // naranja-rojo: salida legítima
  if (flow === FLOW.LOSS) return '#dc2626';     // rojo fuerte: pérdida
  return '#64748b';
}

export function flowLabel(flow) {
  if (flow === FLOW.IN) return 'Entra dinero (+)';
  if (flow === FLOW.OUT) return 'Sale dinero (−)';
  if (flow === FLOW.LOSS) return 'Pérdida / merma';
  return 'Neutro';
}

/** Color de BORDE = estado operativo Zyrion */
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

/**
 * Color principal del nodo para el dueño:
 * - Fallo operativo → rojo borde dominante (ya falló el proceso)
 * - Si no: relleno por flujo (entra verde / sale naranja / pérdida rojo)
 * - Pendiente → atenúa hacia gris
 */
export function nodeDisplayColor(node) {
  if (node.isNucleus) return '#f4b400';
  if (node.isActor) return '#64748b';
  if (node.zyrion === ZYRION.FAILURE) return '#ef4444';
  if (node.zyrion === ZYRION.INDETERMINATE) {
    // pendiente: tinte del flujo pero apagado
    if (node.flow === FLOW.IN) return '#4ade80aa';
    if (node.flow === FLOW.OUT || node.flow === FLOW.LOSS) return '#fb923c99';
    return '#94a3b8';
  }
  return flowColor(node.flow || FLOW.NEUTRAL);
}

/** Clasifica flujo económico a partir de tipo/categoría/texto */
export function classifyFlow({ type, category, label, amount, loss }) {
  if (loss) return FLOW.LOSS;
  const blob = `${type || ''} ${category || ''} ${label || ''}`.toLowerCase();
  if (/merma|perdida|pérdida|castigo|robo|siniestro|write.?off/.test(blob)) return FLOW.LOSS;
  if (/impuesto|tax|tribut|fiscal|onat|iva/.test(blob)) return FLOW.OUT;
  if (/compra|proveedor|suministro|gasto|egreso|nomina|nómina|salario|combustible|pago/.test(blob)) return FLOW.OUT;
  if (/venta|ingreso|cobro|recaud|catering|cliente/.test(blob)) return FLOW.IN;
  if (type === 'expense' || category === 'gasto' || category === 'compra' || category === 'nomina' || category === 'impuesto') return FLOW.OUT;
  if (type === 'income' || category === 'ingreso' || category === 'venta') return FLOW.IN;
  if (typeof amount === 'number' && amount < 0) return FLOW.OUT;
  return FLOW.NEUTRAL;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // fallback simple (no crypto) — no usar en producción crítica
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

/** Firma un nodo y lo anexa a la cadena inmutable local. */
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
    at: node.at,
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

/**
 * Construye grafo a partir del estado AbacoPhy / Delicias.
 * edges: dependencias from→to y parent→child.
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

  // Asientos (ingresos / gastos)
  (state.entries || []).forEach((e, i) => {
    const isIncome = e.type === 'income' || e.nature === 'ingreso' || (e.amount > 0 && e.kind === 'income');
    const isExpense = e.type === 'expense' || e.nature === 'gasto' || e.kind === 'expense';
    let zyrion = ZYRION.SUCCESS;
    if (e.status === 'pending' || e.pending) zyrion = ZYRION.INDETERMINATE;
    if (e.status === 'failed' || e.status === 'cancelled' || e.failed) zyrion = ZYRION.FAILURE;
    if (e.loss || e.category === 'perdida' || e.category === 'pérdida') zyrion = ZYRION.FAILURE;

    let cat = isIncome ? 'ingreso' : isExpense ? 'gasto' : 'otro';
    const label = e.memo || e.description || e.concept || (isIncome ? 'Ingreso' : 'Gasto');
    if (/impuesto|tax|tribut|onat|iva/i.test(label)) cat = 'impuesto';
    if (/nomina|nómina|salario/i.test(label)) cat = 'nomina';
    const flow = classifyFlow({
      type: isIncome ? 'income' : isExpense ? 'expense' : 'otro',
      category: cat,
      label,
      amount: e.amount,
      loss: e.loss || e.category === 'perdida' || e.category === 'pérdida',
    });
    const id = e.id || `entry-${i}`;
    push({
      id,
      label,
      type: isIncome ? 'ingreso' : 'gasto',
      category: cat,
      amount: Math.abs(Number(e.amount) || 0),
      currency: e.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow,
      from: isExpense ? (e.accountName || tenant) : (e.counterparty || e.from || 'Cliente'),
      to: isIncome ? (e.accountName || tenant) : (e.counterparty || e.to || 'Proveedor'),
      at: e.at || e.date || e.createdAt || Date.now(),
      source: 'entries',
      raw: e,
    });
    edges.push({ from: `actor:${isExpense ? tenant : (e.counterparty || 'Cliente')}`, to: id });
    edges.push({ from: id, to: `actor:${isIncome ? tenant : (e.counterparty || 'Proveedor')}` });
  });

  // Ventas POS
  (state.sales || []).forEach((s, i) => {
    const id = s.id || `sale-${i}`;
    let zyrion = ZYRION.SUCCESS;
    if (s.status === 'pending') zyrion = ZYRION.INDETERMINATE;
    if (s.status === 'cancelled' || s.status === 'void') zyrion = ZYRION.FAILURE;
    push({
      id,
      label: s.memo || `Venta #${s.number || i + 1}`,
      type: 'venta',
      category: 'venta',
      amount: Number(s.total || s.amount || 0),
      currency: s.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow: classifyFlow({ type: 'venta', category: 'venta', label: s.memo || 'venta' }),
      from: 'Cliente',
      to: tenant,
      at: s.at || s.createdAt || Date.now(),
      source: 'sales',
      raw: s,
    });
    edges.push({ from: 'actor:Cliente', to: id });
    edges.push({ from: id, to: `actor:${tenant}` });
  });

  // Pedidos online
  (state.onlineOrders || []).forEach((o, i) => {
    const id = o.id || `order-${i}`;
    let zyrion = ZYRION.INDETERMINATE;
    if (o.status === 'delivered' || o.status === 'paid' || o.status === 'completed') zyrion = ZYRION.SUCCESS;
    if (o.status === 'cancelled' || o.status === 'rejected') zyrion = ZYRION.FAILURE;
    push({
      id,
      label: o.memo || `Pedido ${o.code || i + 1}`,
      type: 'pedido',
      category: 'venta',
      amount: Number(o.total || o.amount || 0),
      currency: o.currency || state.tenant?.currency || 'CUP',
      zyrion,
      flow: classifyFlow({ type: 'pedido', category: 'venta', label: o.memo || 'pedido' }),
      from: o.customer || 'Cliente online',
      to: tenant,
      at: o.at || o.createdAt || Date.now(),
      source: 'orders',
      raw: o,
    });
  });

  // Actores como nodos grises de contexto (solo si hay aristas)
  const actors = new Set();
  edges.forEach((e) => {
    if (String(e.from).startsWith('actor:')) actors.add(e.from);
    if (String(e.to).startsWith('actor:')) actors.add(e.to);
  });
  actors.forEach((aid) => {
    const name = aid.replace(/^actor:/, '');
    push({
      id: aid,
      label: name,
      type: 'actor',
      category: 'caja',
      amount: 0,
      currency: '',
      zyrion: ZYRION.INDETERMINATE,
      flow: FLOW.NEUTRAL,
      from: '',
      to: '',
      at: 0,
      source: 'actor',
      isActor: true,
    });
  });

  return { nodes, edges };
}

/** Demo si no hay datos reales (para que el directivo vea el panel de inmediato). */
export function demoGraph(tenantName = 'Delicias en Ruta') {
  const nodes = [
    { id: 'op-1', label: 'Venta mostrador #101', type: 'venta', category: 'venta', amount: 850, currency: 'CUP', zyrion: 1, flow: 'in', from: 'Cliente', to: tenantName, at: Date.now() - 86400000 * 2 },
    { id: 'op-2', label: 'Compra suministros', type: 'compra', category: 'compra', amount: 12000, currency: 'USD', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Vendor-Beta', at: Date.now() - 86400000 },
    { id: 'op-3', label: 'Gasto combustible', type: 'gasto', category: 'gasto', amount: 420, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Gasolinera', at: Date.now() - 3600000 * 20 },
    { id: 'op-3b', label: 'Pago impuestos ONAT', type: 'gasto', category: 'impuesto', amount: 2100, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'ONAT', at: Date.now() - 86400000 * 5 },
    { id: 'op-3c', label: 'Nómina quincena', type: 'gasto', category: 'nomina', amount: 8000, currency: 'CUP', zyrion: 1, flow: 'out', from: 'Caja Central', to: 'Personal', at: Date.now() - 86400000 * 1 },
    { id: 'op-4', label: 'Pedido online pendiente', type: 'pedido', category: 'venta', amount: 1500, currency: 'CUP', zyrion: 2, flow: 'in', from: 'Cliente Web', to: tenantName, at: Date.now() - 3600000 },
    { id: 'op-5', label: 'Cobro rechazado POS', type: 'venta', category: 'venta', amount: 300, currency: 'CUP', zyrion: 0, flow: 'in', from: 'Cliente', to: tenantName, at: Date.now() - 7200000 },
    { id: 'op-6', label: 'Pérdida merma cocina', type: 'gasto', category: 'gasto', amount: 200, currency: 'CUP', zyrion: 1, flow: 'loss', from: 'Almacén', to: 'Merma', at: Date.now() - 86400000 * 3 },
    { id: 'op-7', label: 'Ingreso catering', type: 'ingreso', category: 'ingreso', amount: 5000, currency: 'CUP', zyrion: 1, flow: 'in', from: 'Empresa XYZ', to: tenantName, at: Date.now() - 86400000 * 4 },
    { id: 'actor:Caja Central', label: 'Caja Central', type: 'actor', category: 'caja', amount: 0, zyrion: 2, flow: 'neutral', isActor: true },
    { id: 'actor:Vendor-Beta', label: 'Vendor-Beta', type: 'actor', category: 'compra', amount: 0, zyrion: 2, flow: 'neutral', isActor: true },
  ];
  const edges = [
    { from: 'actor:Caja Central', to: 'op-2' },
    { from: 'op-2', to: 'actor:Vendor-Beta' },
    { from: 'op-1', to: 'actor:Caja Central' },
    { from: 'op-7', to: 'actor:Caja Central' },
    { from: 'op-3', to: 'actor:Caja Central' },
    { from: 'op-5', to: 'op-1' },
  ];
  return { nodes, edges };
}

export function filterGraph(graph, category, zyrionFilter, flowFilter) {
  let nodes = graph.nodes.slice();
  if (category && category !== 'all') {
    nodes = nodes.filter((n) => n.category === category || n.isActor || n.isNucleus);
  }
  if (zyrionFilter !== null && zyrionFilter !== undefined && zyrionFilter !== 'all') {
    const z = Number(zyrionFilter);
    nodes = nodes.filter((n) => n.isActor || n.isNucleus || n.zyrion === z);
  }
  if (flowFilter && flowFilter !== 'all') {
    nodes = nodes.filter((n) => n.isActor || n.isNucleus || n.flow === flowFilter);
  }
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return { nodes, edges };
}

/** Nodos conectados (1 salto) al seleccionado. */
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
    if (n.isActor) {
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
