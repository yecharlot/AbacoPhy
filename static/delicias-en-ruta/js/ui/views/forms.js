export function renderIngresos(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Registrar ingreso</h3>
      <label>Monto</label><input id="m" type="number" step="0.01" placeholder="0.00" />
      <label>Concepto</label><input id="c" placeholder="Venta mostrador / ruta" />
      <button class="btn btn-primary" id="ok">Guardar en IPFS</button>
    </div>
    <div class="card"><h3>Historial</h3>
      <table><thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
      <tbody>${(state.ingresos||[]).map(i=>`<tr><td>${i.concepto}</td><td>${i.monto}</td><td class="muted">${(i.at||'').slice(0,19)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin registros</td></tr>'}</tbody></table>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addIngreso(el.querySelector('#m').value, el.querySelector('#c').value || 'ingreso');
    redraw();
  };
}

export function renderGastos(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Registrar gasto</h3>
      <label>Monto</label><input id="m" type="number" step="0.01" />
      <label>Concepto</label><input id="c" placeholder="Insumos / combustible ruta" />
      <button class="btn btn-primary" id="ok">Guardar en IPFS</button>
    </div>
    <div class="card"><h3>Historial</h3>
      <table><thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
      <tbody>${(state.gastos||[]).map(i=>`<tr><td>${i.concepto}</td><td>${i.monto}</td><td class="muted">${(i.at||'').slice(0,19)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin registros</td></tr>'}</tbody></table>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addGasto(el.querySelector('#m').value, el.querySelector('#c').value || 'gasto');
    redraw();
  };
}

export function renderCatalog(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Producto de carta</h3>
      <label>Nombre</label><input id="n" placeholder="Pan, jugo, plato del día…" />
      <label>Precio</label><input id="p" type="number" step="0.01" />
      <button class="btn btn-primary" id="ok">Añadir</button>
    </div>
    <div class="card"><h3>Carta</h3>
      <table><thead><tr><th>Producto</th><th>Precio</th></tr></thead>
      <tbody>${(state.productos||[]).map(i=>`<tr><td>${i.nombre}</td><td>${i.precio}</td></tr>`).join('')||'<tr><td colspan="2" class="muted">Carta vacía</td></tr>'}</tbody></table>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addProducto(el.querySelector('#n').value || 'ítem', el.querySelector('#p').value || 0);
    redraw();
  };
}

export function renderPedidos(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Nuevo pedido</h3>
      <label>Cliente</label><input id="c" placeholder="Nombre o mesa / ruta" />
      <label>Total</label><input id="t" type="number" step="0.01" />
      <button class="btn btn-primary" id="ok">Registrar</button>
    </div>
    <div class="card"><h3>Pedidos</h3>
      <table><thead><tr><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
      <tbody>${(state.pedidos||[]).map(i=>`<tr><td>${i.cliente}</td><td>${i.total}</td><td>${i.estado}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin pedidos</td></tr>'}</tbody></table>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await svc.addPedido(el.querySelector('#c').value || 'cliente', el.querySelector('#t').value || 0);
    redraw();
  };
}

export function renderEmpleados(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Equipo</h3>
      <label>Nombre</label><input id="n" />
      <label>Rol</label><input id="r" placeholder="Cocina, ruta, caja…" />
      <button class="btn btn-primary" id="ok">Añadir</button>
    </div>
    <div class="card">
      <table><thead><tr><th>Nombre</th><th>Rol</th></tr></thead>
      <tbody>${(state.empleados||[]).map(i=>`<tr><td>${i.nombre}</td><td>${i.rol}</td></tr>`).join('')||'<tr><td colspan="2" class="muted">Sin personal cargado</td></tr>'}</tbody></table>
    </div>`;
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
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${(state.kpis?.ingresos||0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${(state.kpis?.gastos||0).toFixed(2)}</div></div>
    </div>
    <div class="card"><p class="muted">Reportes orientados a la operación gastronómica de Delicias en Ruta (mostrador y ruta).</p></div>`;
}

export function renderTenant(el, state) {
  el.innerHTML = `
    <div class="card">
      <h3>Identidad del negocio</h3>
      <p><strong>${state.tenant?.name}</strong></p>
      <p class="muted">${state.tenant?.slogan}</p>
      <p>${state.tenant?.activity}</p>
      <p class="muted">Sociedad Unipersonal de Responsabilidad Limitada · Guantánamo</p>
    </div>`;
}

export function renderTraza(el, hist, state) {
  el.innerHTML = `
    <div class="card">
      <h3>Traza de persistencia (CID)</h3>
      <p class="muted">Cada guardado genera un identificador de contenido (IPFS o análogo local).</p>
      <p class="cid">Actual: ${state.meta?.lastCid || '—'}</p>
      <table><thead><tr><th>CID</th><th>Fecha</th></tr></thead>
      <tbody>${(hist||[]).map(h=>`<tr><td class="cid">${h.cid}</td><td class="muted">${h.at||''}</td></tr>`).join('')||'<tr><td colspan="2" class="muted">Sin historial</td></tr>'}</tbody></table>
    </div>`;
}

export function renderPos(el, state, svc, redraw) {
  el.innerHTML = `
    <div class="card">
      <h3>Punto de venta rápido</h3>
      <p class="muted">Registra una venta de mostrador o ruta como ingreso + pedido.</p>
      <label>Descripción</label><input id="d" placeholder="Combo ruta / café" />
      <label>Total</label><input id="t" type="number" step="0.01" />
      <button class="btn btn-primary" id="ok">Cobrar y persistir</button>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    const t = el.querySelector('#t').value || 0;
    const d = el.querySelector('#d').value || 'venta POS';
    await svc.addIngreso(t, d);
    await svc.addPedido('POS', t);
    redraw();
  };
}

export function renderAlmacen(el, state) {
  el.innerHTML = `
    <div class="card">
      <h3>Almacén</h3>
      <p class="muted">Productos en carta: <strong>${(state.productos||[]).length}</strong></p>
      <p class="muted">En esta rama el inventario se refleja desde la carta. La API Go de almacén de AbacoPhy sigue disponible en main sin cambios.</p>
    </div>`;
}


export function renderUsuarios(el, state, svc, redraw) {
  if (!svc.isMaster()) {
    el.innerHTML = `<div class="card"><p class="muted">Solo la cuenta Master gestiona usuarios.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="card">
      <h3>Nuevo usuario</h3>
      <label>Usuario</label><input id="nu" />
      <label>Clave</label><input id="np" type="password" />
      <label>Rol</label>
      <select id="nr">
        <option value="cajero">cajero</option>
        <option value="cocina">cocina</option>
        <option value="contable">contable</option>
        <option value="admin">admin</option>
        <option value="consulta">consulta</option>
      </select>
      <button class="btn btn-primary" id="ok">Crear</button>
    </div>
    <div class="card"><h3>Usuarios</h3>
      <table><thead><tr><th>Usuario</th><th>Rol</th></tr></thead>
      <tbody>${(state.usuarios||[]).map(u=>`<tr><td>${u.username}</td><td>${u.role}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await svc.upsertUser({
      username: el.querySelector('#nu').value,
      password: el.querySelector('#np').value,
      role: el.querySelector('#nr').value,
    });
    redraw();
  };
}

export function renderPermisos(el, state, svc, redraw) {
  if (!svc.isMaster()) {
    el.innerHTML = `<div class="card"><p class="muted">Solo Master configura qué ve cada usuario en el menú.</p></div>`;
    return;
  }
  const roleDefaults = {
    admin: ['dashboard','pos','pedidos','ingresos','gastos','reportes','catalog','almacen','empleados','tenant','traza'],
    cajero: ['dashboard','pos','pedidos','ingresos'],
    cocina: ['dashboard','pedidos','catalog','almacen'],
    contable: ['dashboard','ingresos','gastos','reportes','traza'],
    consulta: ['dashboard','reportes'],
  };
  const users = (state.usuarios || []).filter((u) => u.role !== 'master');
  const labels = {
    dashboard: 'Resumen', pos: 'POS', pedidos: 'Pedidos', ingresos: 'Ingresos', gastos: 'Gastos',
    reportes: 'Reportes', catalog: 'Carta', almacen: 'Almacén', empleados: 'Equipo',
    tenant: 'Negocio', traza: 'Traza', usuarios: 'Usuarios', permisos: 'Menú por rol',
  };
  const all = Object.keys(labels);
  el.innerHTML = `
    <div class="card">
      <h3>Menú lateral por usuario</h3>
      <p class="muted">Solo aparecen en el menú izquierdo las opciones marcadas. Master ve siempre todo.</p>
      <label>Usuario</label>
      <select id="uid">${users.map((u) => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('') || '<option value="">—</option>'}</select>
      <div id="checks" class="checks"></div>
      <button class="btn btn-primary" id="save" ${users.length ? '' : 'disabled'}>Guardar permisos de menú</button>
    </div>`;
  const checks = el.querySelector('#checks');
  const uidEl = el.querySelector('#uid');
  function paintChecks() {
    const u = users.find((x) => x.id === uidEl.value);
    if (!u) { checks.innerHTML = '<p class="muted">Crea un usuario (no Master) primero.</p>'; return; }
    const eff = (Array.isArray(u.screens) && u.screens.length) ? u.screens : (roleDefaults[u.role] || ['dashboard']);
    const set = new Set(eff);
    checks.innerHTML = all.map((id) =>
      `<label class="check-row"><input type="checkbox" data-s="${id}" ${set.has(id) ? 'checked' : ''}/> ${labels[id]}</label>`
    ).join('');
  }
  paintChecks();
  uidEl.onchange = paintChecks;
  const saveBtn = el.querySelector('#save');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const screens = [...checks.querySelectorAll('input:checked')].map((i) => i.dataset.s);
      await svc.setUserScreens(uidEl.value, screens);
      redraw();
    };
  }
}
