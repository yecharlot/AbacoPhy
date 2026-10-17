/**
 * AOS-ERP — operaciones como nodos firmados (Zyrion 0/1/2).
 * Verde=éxito, Rojo=fallo/pérdida, Gris=pendiente/dudoso.
 * Cadena append-only con SHA-256 (Web Crypto).
 */

const CHAIN_KEY = 'delicias.aos-erp.chain';

export const ZYRION = {
  FAILURE: 0,
  SUCCESS: 1,
  INDETERMINATE: 2,
};

export const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'compra', label: 'Compras' },
  { id: 'venta', label: 'Ventas' },
  { id: 'ingreso', label: 'Ingresos' },
  { id: 'gasto', label: 'Gastos' },
  { id: 'caja', label: 'Caja' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'nomina', label: 'Nómina' },
  { id: 'otro', label: 'Otros' },
];

export function zyrionColor(z) {
  if (z === ZYRION.SUCCESS) return '#22c55e';
  if (z === ZYRION.FAILURE) return '#ef4444';
  return '#94a3b8';
}

export function zyrionLabel(z) {
  if (z === ZYRION.SUCCESS) return 'Éxito (Zyrion 1)';
  if (z === ZYRION.FAILURE) return 'Fallo / pérdida (Zyrion 0)';
  return 'Pendiente / dudoso (Zyrion 2)';
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

    const cat = isIncome ? 'ingreso' : isExpense ? 'gasto' : 'otro';
    const id = e.id || `entry-${i}`;
    push({
      id,
      label: e.memo || e.description || e.concept || (isIncome ? 'Ingreso' : 'Gasto'),
      type: isIncome ? 'ingreso' : 'gasto',
      category: cat,
      amount: Math.abs(Number(e.amount) || 0),
      currency: e.currency || state.tenant?.currency || 'CUP',
      zyrion,
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
    { id: 'op-1', label: 'Venta mostrador #101', type: 'venta', category: 'venta', amount: 850, currency: 'CUP', zyrion: 1, from: 'Cliente', to: tenantName, at: Date.now() - 86400000 * 2 },
    { id: 'op-2', label: 'Compra suministros', type: 'compra', category: 'compra', amount: 12000, currency: 'USD', zyrion: 1, from: 'Caja Central', to: 'Vendor-Beta', at: Date.now() - 86400000 },
    { id: 'op-3', label: 'Gasto combustible', type: 'gasto', category: 'gasto', amount: 420, currency: 'CUP', zyrion: 1, from: 'Caja Central', to: 'Gasolinera', at: Date.now() - 3600000 * 20 },
    { id: 'op-4', label: 'Pedido online pendiente', type: 'pedido', category: 'venta', amount: 1500, currency: 'CUP', zyrion: 2, from: 'Cliente Web', to: tenantName, at: Date.now() - 3600000 },
    { id: 'op-5', label: 'Cobro rechazado POS', type: 'venta', category: 'venta', amount: 300, currency: 'CUP', zyrion: 0, from: 'Cliente', to: tenantName, at: Date.now() - 7200000 },
    { id: 'op-6', label: 'Pérdida merma cocina', type: 'gasto', category: 'gasto', amount: 200, currency: 'CUP', zyrion: 0, from: 'Almacén', to: 'Merma', at: Date.now() - 86400000 * 3 },
    { id: 'op-7', label: 'Ingreso catering', type: 'ingreso', category: 'ingreso', amount: 5000, currency: 'CUP', zyrion: 1, from: 'Empresa XYZ', to: tenantName, at: Date.now() - 86400000 * 4 },
    { id: 'actor:Caja Central', label: 'Caja Central', type: 'actor', category: 'caja', amount: 0, zyrion: 2, isActor: true },
    { id: 'actor:Vendor-Beta', label: 'Vendor-Beta', type: 'actor', category: 'compra', amount: 0, zyrion: 2, isActor: true },
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

export function filterGraph(graph, category, zyrionFilter) {
  let nodes = graph.nodes.slice();
  if (category && category !== 'all') {
    nodes = nodes.filter((n) => n.category === category || n.isActor);
  }
  if (zyrionFilter !== null && zyrionFilter !== undefined && zyrionFilter !== 'all') {
    const z = Number(zyrionFilter);
    nodes = nodes.filter((n) => n.isActor || n.zyrion === z);
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
