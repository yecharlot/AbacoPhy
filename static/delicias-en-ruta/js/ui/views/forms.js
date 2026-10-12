function table(rows, heads) {
  const h = heads.map((x) => `<th>${x}</th>`).join('');
  const b = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${heads.length}" class="muted">Sin datos</td></tr>`;
  return `<div class="card table-wrap"><table><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table></div>`;
}
function money(n) { return Number(n || 0).toFixed(2); }

export function renderIngresos(el, eng, redraw) {
  const rows = eng.state.entries.filter((e) => e.type === 'income').slice(0, 80)
    .map((x) => [x.concept, money(x.amount), (x.date || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar ingreso</h3>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Concepto</label><input id="c" placeholder="Venta / cobro"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Concepto', 'Monto', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addEntry({ type: 'income', amount: el.querySelector('#m').value, concept: el.querySelector('#c').value || 'ingreso' });
    redraw();
  };
}

export function renderGastos(el, eng, redraw) {
  const rows = eng.state.entries.filter((e) => e.type === 'expense').slice(0, 80)
    .map((x) => [x.concept, money(x.amount), (x.date || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar gasto</h3>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Concepto</label><input id="c" placeholder="Insumos / servicios"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Concepto', 'Monto', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addEntry({ type: 'expense', amount: el.querySelector('#m').value, concept: el.querySelector('#c').value || 'gasto' });
    redraw();
  };
}

export function renderCuentas(el, eng, redraw) {
  const rows = eng.state.accounts.map((a) => [a.code, a.name, a.type, money(a.balance)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nueva cuenta</h3>
      <div class="form-row"><label>Código</label><input id="code"/></div>
      <div class="form-row"><label>Nombre</label><input id="name"/></div>
      <div class="form-row"><label>Tipo</label>
        <select id="type"><option value="asset">Activo</option><option value="liability">Pasivo</option>
        <option value="income">Ingreso</option><option value="expense">Gasto</option><option value="equity">Patrimonio</option></select>
      </div>
      <button type="button" class="btn" id="ok">Crear</button>
    </div>${table(rows, ['Código', 'Nombre', 'Tipo', 'Saldo'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.addAccount({ code: el.querySelector('#code').value, name: el.querySelector('#name').value, type: el.querySelector('#type').value });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderAsientos(el, eng) {
  const rows = eng.state.entries.slice(0, 100).map((x) => [
    (x.date || '').slice(0, 19), x.type, x.concept, money(x.amount), x.accountCode || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Libro de asientos (todos los movimientos)</p></div>
    ${table(rows, ['Fecha', 'Tipo', 'Concepto', 'Monto', 'Cuenta'])}`;
}

export function renderCatalog(el, eng, redraw) {
  const rows = eng.state.products.slice(0, 100).map((p) => [p.name, money(p.price), money(p.cost), p.stock, p.unit]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Producto / carta</h3>
      <div class="form-row"><label>Nombre</label><input id="n" placeholder="Plato del día"/></div>
      <div class="form-row"><label>Precio venta</label><input id="p" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Costo</label><input id="c" type="number" step="0.01" value="0"/></div>
      <div class="form-row"><label>Stock inicial</label><input id="s" type="number" value="0"/></div>
      <div class="form-row"><label>Unidad</label><input id="u" value="u"/></div>
      <button type="button" class="btn" id="ok">Añadir</button>
    </div>${table(rows, ['Nombre', 'Precio', 'Costo', 'Stock', 'Ud.'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addProduct({
      name: el.querySelector('#n').value || 'producto',
      price: el.querySelector('#p').value,
      cost: el.querySelector('#c').value,
      stock: el.querySelector('#s').value,
      unit: el.querySelector('#u').value,
    });
    redraw();
  };
}

export function renderPos(el, eng, redraw) {
  const products = eng.state.products.filter((p) => p.active !== false);
  let cart = [];
  const paint = () => {
    const total = cart.reduce((s, l) => s + l.qty * l.price, 0);
    el.innerHTML = `
      <div class="grid pos-grid">
        <div class="card">
          <h3>Carta</h3>
          <div class="pos-products">
            ${products.map((p) => `<button type="button" class="pos-item" data-id="${p.id}">
              <strong>${p.name}</strong><span>${money(p.price)} · stock ${p.stock}</span></button>`).join('') || '<p class="muted">Sin productos — crea en Carta</p>'}
          </div>
        </div>
        <div class="card form-card">
          <h3>Ticket</h3>
          <div class="form-row"><label>Cliente</label><input id="cust" value="Mostrador"/></div>
          <ul class="cart-list">${cart.map((l, i) => `<li>${l.name} ×${l.qty} = ${money(l.qty * l.price)}
            <button type="button" data-rm="${i}" class="btn-ghost">×</button></li>`).join('')}</ul>
          <p><strong>Total: ${money(total)}</strong></p>
          <button type="button" class="btn" id="cobrar" ${cart.length ? '' : 'disabled'}>Cobrar venta</button>
        </div>
      </div>`;
    el.querySelectorAll('.pos-item').forEach((b) => {
      b.onclick = () => {
        const p = products.find((x) => x.id === b.dataset.id);
        if (!p) return;
        const line = cart.find((c) => c.productId === p.id);
        if (line) line.qty += 1;
        else cart.push({ productId: p.id, name: p.name, price: p.price, qty: 1 });
        paint();
      };
    });
    el.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => { cart.splice(+b.dataset.rm, 1); paint(); };
    });
    const cobrar = el.querySelector('#cobrar');
    if (cobrar) cobrar.onclick = async () => {
      try {
        await eng.posSale({ customer: el.querySelector('#cust').value, lines: cart });
        cart = [];
        redraw();
      } catch (e) { alert(e.message); }
    };
  };
  paint();
}

export function renderPedidos(el, eng) {
  const rows = eng.state.sales.slice(0, 100).map((s) => [
    s.id.slice(0, 8), s.customer, money(s.total), s.status, (s.at || '').slice(0, 19),
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Historial de ventas POS</p></div>
    ${table(rows, ['Id', 'Cliente', 'Total', 'Estado', 'Fecha'])}`;
}

export function renderOnline(el, eng, redraw) {
  const rows = eng.state.onlineOrders.slice(0, 80).map((o) => [
    o.id.slice(0, 8), o.customer, money(o.total), o.status,
    `<button type="button" class="btn-ghost" data-id="${o.id}" data-st="preparando">Prep.</button>
     <button type="button" class="btn-ghost" data-id="${o.id}" data-st="entregado">Entregado</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Pedido online</h3>
      <div class="form-row"><label>Cliente</label><input id="c"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01" value="0"/></div>
      <button type="button" class="btn" id="ok">Registrar</button>
    </div>${table(rows, ['Id', 'Cliente', 'Total', 'Estado', 'Acciones'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addOnlineOrder({ customer: el.querySelector('#c').value || 'web', total: el.querySelector('#t').value });
    redraw();
  };
  el.querySelectorAll('[data-st]').forEach((b) => {
    b.onclick = async () => { await eng.setOnlineStatus(b.dataset.id, b.dataset.st); redraw(); };
  });
}

export function renderAlmacen(el, eng) {
  const rows = eng.state.inventory.slice(0, 100).map((i) => [i.name, i.sku, i.quantity, i.unit]);
  el.innerHTML = `<div class="card"><p class="muted">Existencias (sincronizadas con productos)</p></div>
    ${table(rows, ['Producto', 'SKU', 'Cant.', 'Ud.'])}`;
}

export function renderRecepciones(el, eng, redraw) {
  const rows = eng.state.receptions.slice(0, 50).map((r) => [r.code, r.supplier, r.status, (r.at || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Recepción de mercancía</h3>
      <div class="form-row"><label>Proveedor</label><input id="sup"/></div>
      <div class="form-row"><label>Producto nuevo</label><input id="pn" placeholder="Nombre"/></div>
      <div class="form-row"><label>Cantidad</label><input id="pq" type="number" value="1"/></div>
      <div class="form-row"><label>Precio ref.</label><input id="pp" type="number" step="0.01" value="0"/></div>
      <button type="button" class="btn" id="ok">Recibir</button>
    </div>${table(rows, ['Código', 'Proveedor', 'Estado', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addReception({
      supplier: el.querySelector('#sup').value,
      lines: [{ name: el.querySelector('#pn').value || 'insumo', qty: +el.querySelector('#pq').value, price: +el.querySelector('#pp').value }],
    });
    redraw();
  };
}

export function renderTransferencias(el, eng, redraw) {
  const rows = eng.state.transfers.slice(0, 50).map((t) => [t.from, t.to, t.qty, (t.at || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Transferencia</h3>
      <div class="form-row"><label>Desde</label><input id="f" value="Almacén"/></div>
      <div class="form-row"><label>Hacia</label><input id="t" value="Mostrador"/></div>
      <div class="form-row"><label>Cantidad</label><input id="q" type="number" value="1"/></div>
      <button type="button" class="btn" id="ok">Registrar</button>
    </div>${table(rows, ['Desde', 'Hacia', 'Cant.', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addTransfer({ from: el.querySelector('#f').value, to: el.querySelector('#t').value, qty: el.querySelector('#q').value });
    redraw();
  };
}

export function renderCostos(el, eng, redraw) {
  const rows = eng.state.costSheets.slice(0, 50).map((c) => [c.name, money(c.cost), money(c.price)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Ficha de costo</h3>
      <div class="form-row"><label>Producto</label><input id="n"/></div>
      <div class="form-row"><label>Costo</label><input id="c" type="number" step="0.01"/></div>
      <div class="form-row"><label>Precio</label><input id="p" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Producto', 'Costo', 'Precio'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addCostSheet({ name: el.querySelector('#n').value, cost: el.querySelector('#c').value, price: el.querySelector('#p').value });
    redraw();
  };
}

export function renderEmpleados(el, eng, redraw) {
  const rows = eng.state.employees.map((e) => [e.name, e.role, money(e.salary)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Alta colaborador</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Rol</label><input id="r" placeholder="cocina / ruta / caja"/></div>
      <div class="form-row"><label>Salario</label><input id="s" type="number" step="0.01" value="0"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Nombre', 'Rol', 'Salario'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addEmployee({ name: el.querySelector('#n').value, role: el.querySelector('#r').value, salary: el.querySelector('#s').value });
    redraw();
  };
}

export function renderNominas(el, eng, redraw) {
  const opts = eng.state.employees.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
  const rows = eng.state.payslips.slice(0, 50).map((p) => [p.employeeName, p.period, money(p.amount), (p.at || '').slice(0, 10)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Liquidación</h3>
      <div class="form-row"><label>Empleado</label><select id="e">${opts || '<option value="">—</option>'}</select></div>
      <div class="form-row"><label>Periodo</label><input id="per" value="${new Date().toISOString().slice(0, 7)}"/></div>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Liquidar</button>
    </div>${table(rows, ['Empleado', 'Periodo', 'Monto', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addPayslip({ employeeId: el.querySelector('#e').value, amount: el.querySelector('#m').value, period: el.querySelector('#per').value });
    redraw();
  };
}

export function renderFacturas(el, eng, redraw) {
  const rows = eng.state.invoices.slice(0, 50).map((i) => [i.number, i.customer, money(i.total), i.status]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Emitir factura</h3>
      <div class="form-row"><label>Cliente</label><input id="c"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Emitir</button>
    </div>${table(rows, ['Nº', 'Cliente', 'Total', 'Estado'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addInvoice({ customer: el.querySelector('#c').value || 'Cliente', total: el.querySelector('#t').value });
    redraw();
  };
}

export function renderUnidades(el, eng, redraw) {
  const rows = eng.state.salesUnits.map((u) => [u.code, u.name, u.active ? 'sí' : 'no']);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Unidad de venta</h3>
      <div class="form-row"><label>Código</label><input id="c"/></div>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <button type="button" class="btn" id="ok">Crear</button>
    </div>${table(rows, ['Código', 'Nombre', 'Activa'])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.addSalesUnit({ code: el.querySelector('#c').value, name: el.querySelector('#n').value });
    redraw();
  };
}

export function renderUsuarios(el, eng, redraw) {
  const rows = eng.state.users.map((u) => [u.username, u.name, u.role]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nuevo usuario</h3>
      <div class="form-row"><label>Usuario</label><input id="u"/></div>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Clave</label><input id="p" type="password"/></div>
      <div class="form-row"><label>Rol</label>
        <select id="r"><option value="cashier">cashier</option><option value="admin">admin</option><option value="master">master</option></select>
      </div>
      <button type="button" class="btn" id="ok">Crear</button>
    </div>${table(rows, ['Usuario', 'Nombre', 'Rol'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.addUser({
        username: el.querySelector('#u').value,
        name: el.querySelector('#n').value,
        password: el.querySelector('#p').value,
        role: el.querySelector('#r').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderTenant(el, eng, redraw) {
  const t = eng.state.tenant;
  el.innerHTML = `
    <div class="card form-card">
      <h3>Datos del negocio</h3>
      <div class="form-row"><label>Nombre</label><input id="n" value="${t.name || ''}"/></div>
      <div class="form-row"><label>Eslogan</label><input id="s" value="${t.slogan || ''}"/></div>
      <div class="form-row"><label>Moneda</label><input id="c" value="${t.currency || 'CUP'}"/></div>
      <div class="form-row"><label>Teléfono</label><input id="p" value="${t.phone || ''}"/></div>
      <div class="form-row"><label>Dirección</label><input id="a" value="${t.address || ''}"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await eng.updateTenant({
      name: el.querySelector('#n').value,
      slogan: el.querySelector('#s').value,
      currency: el.querySelector('#c').value,
      phone: el.querySelector('#p').value,
      address: el.querySelector('#a').value,
    });
    redraw();
  };
}

export function renderReportes(el, eng) {
  const k = eng.state.kpis;
  const bal = (k.ingresos || 0) - (k.gastos || 0);
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${money(k.ingresos)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${money(k.gastos)}</div></div>
      <div class="kpi"><div class="label">Balance</div><div class="value">${money(bal)}</div></div>
      <div class="kpi"><div class="label">Ventas</div><div class="value">${k.pedidos || 0}</div></div>
    </div>
    <div class="card"><p class="muted">Reportes operativos Delicias en Ruta · datos en cadena IPFS local.</p></div>`;
}

export function renderTraza(el, history) {
  const rows = (history || []).slice(0, 50).map((h) => [
    (h.ts || h.at || '').toString().slice(0, 19),
    (h.cid || '').toString().slice(0, 12) + '…',
    h.prevCid ? String(h.prevCid).slice(0, 8) + '…' : '—',
    h.size || '—',
  ]);
  el.innerHTML = `<div class="card"><p class="muted">Cadena de snapshots IPFS (CID local)</p></div>
    ${table(rows, ['Fecha', 'CID', 'Anterior', 'Bytes'])}`;
}
