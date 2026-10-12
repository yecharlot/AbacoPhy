function table(rows, heads) {
  const h = heads.map((x) => `<th>${x}</th>`).join('');
  const b = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${heads.length}" class="muted">Sin datos</td></tr>`;
  return `<div class="card table-wrap"><table><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table></div>`;
}

export function renderIngresos(el, state, svc, redraw) {
  const rows = (state.ingresos || []).slice(0, 50).map((x) => [x.concepto || x.concept || x.description || '—', Number(x.monto ?? x.amount ?? 0).toFixed(2), (x.at || x.date || '').toString().slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar ingreso</h3>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Concepto</label><input id="c" placeholder="Venta mostrador"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>
    ${table(rows, ['Concepto', 'Monto', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addIngreso(el.querySelector('#m').value, el.querySelector('#c').value || 'ingreso');
    redraw();
  };
}

export function renderGastos(el, state, svc, redraw) {
  const rows = (state.gastos || []).slice(0, 50).map((x) => [x.concepto || x.concept || x.description || '—', Number(x.monto ?? x.amount ?? 0).toFixed(2), (x.at || x.date || '').toString().slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar gasto</h3>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Concepto</label><input id="c" placeholder="Insumos"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>
    ${table(rows, ['Concepto', 'Monto', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addGasto(el.querySelector('#m').value, el.querySelector('#c').value || 'gasto');
    redraw();
  };
}

export function renderCatalog(el, state, svc, redraw) {
  const src = (state.productos && state.productos.length) ? state.productos : (state.inventory || []);
  const rows = src.slice(0, 80).map((x) => [x.nombre || x.name || '—', Number(x.precio ?? x.price ?? 0).toFixed(2), x.unit || x.unidad || 'u']);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Producto / carta</h3>
      <div class="form-row"><label>Nombre</label><input id="n" placeholder="Plato del día"/></div>
      <div class="form-row"><label>Precio</label><input id="p" type="number" step="0.01" value="0"/></div>
      <button type="button" class="btn" id="ok">Añadir</button>
    </div>
    ${table(rows, ['Nombre', 'Precio', 'Ud.'])}`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addProducto(el.querySelector('#n').value || 'producto', el.querySelector('#p').value);
    redraw();
  };
}

export function renderPedidos(el, state, svc, redraw) {
  const rows = (state.pedidos || []).slice(0, 80).map((x) => [
    x.cliente || x.customer || x.id || '—',
    Number(x.total ?? x.amount ?? 0).toFixed(2),
    x.estado || x.status || '—',
    (x.at || x.date || '').toString().slice(0, 19),
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nueva venta / pedido</h3>
      <div class="form-row"><label>Cliente</label><input id="c" placeholder="Cliente"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01" value="0"/></div>
      <button type="button" class="btn" id="ok">Registrar</button>
    </div>
    ${table(rows, ['Cliente', 'Total', 'Estado', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addPedido(el.querySelector('#c').value || 'mostrador', el.querySelector('#t').value);
    redraw();
  };
}

export function renderEmpleados(el, state, svc, redraw) {
  const rows = (state.empleados || []).slice(0, 80).map((x) => [x.nombre || x.name || '—', x.rol || x.role || '—']);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Alta de colaborador</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Rol</label><input id="r" placeholder="cocina / ruta / caja"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>
    ${table(rows, ['Nombre', 'Rol'])}`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addEmpleado(el.querySelector('#n').value || 'colaborador', el.querySelector('#r').value || 'general');
    redraw();
  };
}

export function renderReportes(el, state) {
  const bal = (state.kpis?.ingresos || 0) - (state.kpis?.gastos || 0);
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Balance operativo</div><div class="value">${bal.toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${(state.kpis?.ingresos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${(state.kpis?.gastos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Pedidos</div><div class="value">${state.kpis?.pedidos || 0}</div></div>
    </div>
    <div class="card"><p class="muted">Reportes alineados a la operación gastronómica de Delicias en Ruta. Modo: <b>${state.mode}</b>.</p>
    <pre class="muted" style="white-space:pre-wrap;font-size:12px">${JSON.stringify(state.meta || {}, null, 2)}</pre></div>`;
}

export function renderTenant(el, state) {
  const t = state.tenant || {};
  el.innerHTML = `
    <div class="card">
      <h3>${t.name || t.nombre || 'Delicias en Ruta'}</h3>
      <p class="muted">${t.slogan || t.description || 'Gastronomía · Calidad · Sostenibilidad'}</p>
      <p>Modo datos: <b>${state.mode}</b> ${state.online ? '(API ÁbacoPhy)' : '(local / IPFS)'}</p>
      <pre class="muted" style="font-size:12px;white-space:pre-wrap">${JSON.stringify(t, null, 2)}</pre>
    </div>`;
}

export function renderTraza(el, history, state) {
  const rows = (history || []).slice(0, 40).map((h) => [h.at || h.ts || '—', h.note || h.event || JSON.stringify(h).slice(0, 80)]);
  el.innerHTML = `
    <div class="card"><p class="muted">Traza de sincronización · modo ${state.mode}</p></div>
    ${table(rows, ['Cuándo', 'Detalle'])}`;
}

export function renderPos(el, state, svc, redraw) {
  renderPedidos(el, state, svc, redraw);
}

export function renderAlmacen(el, state) {
  const src = state.warehouse?.length ? state.warehouse : (state.inventory || []);
  const rows = src.slice(0, 100).map((x) => [
    x.name || x.nombre || x.sku || '—',
    x.qty ?? x.quantity ?? x.stock ?? '—',
    x.unit || x.unidad || 'u',
  ]);
  el.innerHTML = `
    <div class="card"><p class="muted">Inventario / almacén (gemelo warehouse de main)</p></div>
    ${table(rows, ['Ítem', 'Cant.', 'Ud.'])}`;
}

export function renderCuentas(el, state) {
  const rows = (state.accounts || []).slice(0, 100).map((x) => [x.code || x.codigo || '—', x.name || x.nombre || '—', x.type || x.tipo || '—']);
  el.innerHTML = `<div class="card"><p class="muted">Plan de cuentas (API /api/v1/accounts)</p></div>${table(rows, ['Código', 'Nombre', 'Tipo'])}`;
}

export function renderAsientos(el, state) {
  const rows = (state.entries || []).slice(0, 100).map((x) => [
    (x.date || x.at || '').toString().slice(0, 19),
    x.description || x.concept || x.concepto || '—',
    Number(x.amount ?? x.monto ?? 0).toFixed(2),
    x.type || x.tipo || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Asientos / movimientos (API /api/v1/entries)</p></div>${table(rows, ['Fecha', 'Descripción', 'Monto', 'Tipo'])}`;
}

export function renderFacturas(el, state) {
  const rows = (state.invoices || []).slice(0, 100).map((x) => [
    x.number || x.id || '—',
    x.customer || x.cliente || '—',
    Number(x.total ?? 0).toFixed(2),
    x.status || x.estado || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Facturación (API /api/v1/invoices)</p></div>${table(rows, ['Nº', 'Cliente', 'Total', 'Estado'])}`;
}

export function renderRecepciones(el, state) {
  const rows = (state.receptions || []).slice(0, 100).map((x) => [
    x.id || x.code || '—',
    x.supplier || x.proveedor || '—',
    x.status || x.estado || '—',
    (x.date || x.at || '').toString().slice(0, 19),
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Recepciones de mercancía (API /api/v1/receptions)</p></div>${table(rows, ['Código', 'Proveedor', 'Estado', 'Fecha'])}`;
}

export function renderCostos(el, state) {
  const rows = (state.costSheets || []).slice(0, 100).map((x) => [
    x.name || x.product || x.nombre || '—',
    Number(x.cost ?? x.precio_costo ?? 0).toFixed(2),
    Number(x.price ?? x.precio ?? 0).toFixed(2),
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Fichas de costo (API /api/v1/cost-sheets)</p></div>${table(rows, ['Producto', 'Costo', 'Precio'])}`;
}

export function renderOnline(el, state) {
  const rows = (state.onlineOrders || []).slice(0, 100).map((x) => [
    x.id || '—',
    x.customer || x.cliente || '—',
    Number(x.total ?? 0).toFixed(2),
    x.status || x.estado || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Pedidos online (API /api/v1/online-orders)</p></div>${table(rows, ['Id', 'Cliente', 'Total', 'Estado'])}`;
}

export function renderUsuarios(el, state) {
  const rows = (state.users || []).slice(0, 100).map((x) => [
    x.username || x.name || '—',
    x.role || x.rol || '—',
    x.email || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Usuarios y roles (API /api/v1/users)</p></div>${table(rows, ['Usuario', 'Rol', 'Email'])}`;
}

export function renderUnidades(el, state) {
  const rows = (state.salesUnits || []).slice(0, 100).map((x) => [
    x.code || x.id || '—',
    x.name || x.nombre || '—',
    x.active === false ? 'no' : 'sí',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Unidades de venta (API /api/v1/units)</p></div>${table(rows, ['Código', 'Nombre', 'Activa'])}`;
}
