function table(rows, heads) {
  const h = heads.map((x) => `<th>${x}</th>`).join('');
  const b = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${heads.length}" class="muted">Sin datos</td></tr>`;
  return `<div class="card table-wrap"><table><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table></div>`;
}
function money(n) { return Number(n || 0).toFixed(2); }
function accOptions(eng, type) {
  return eng.listAccounts()
    .filter((a) => !type || a.type === type)
    .map((a) => `<option value="${a.id}">${a.code} — ${a.name}</option>`).join('');
}

export function renderIngresos(el, eng, redraw) {
  const rows = eng.listEntries({ type: 'income' }).slice(0, 100)
    .map((x) => [x.description || x.concept, money(x.amount), x.accountCode, (x.date || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar ingreso</h3>
      <div class="form-row"><label>Cuenta</label><select id="acc">${accOptions(eng, 'income')}</select></div>
      <div class="form-row"><label>Importe</label><input id="m" type="number" step="0.01" min="0"/></div>
      <div class="form-row"><label>Descripción</label><input id="d" required placeholder="Concepto"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Descripción', 'Importe', 'Cuenta', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createIncomeEntry({
        accountId: el.querySelector('#acc').value,
        amount: el.querySelector('#m').value,
        description: el.querySelector('#d').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderGastos(el, eng, redraw) {
  const rows = eng.listEntries({ type: 'expense' }).slice(0, 100)
    .map((x) => [x.description || x.concept, money(x.amount), x.accountCode, (x.date || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Registrar gasto</h3>
      <div class="form-row"><label>Cuenta</label><select id="acc">${accOptions(eng, 'expense')}</select></div>
      <div class="form-row"><label>Importe</label><input id="m" type="number" step="0.01" min="0"/></div>
      <div class="form-row"><label>Descripción</label><input id="d" placeholder="Concepto"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Descripción', 'Importe', 'Cuenta', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createExpenseEntry({
        accountId: el.querySelector('#acc').value,
        amount: el.querySelector('#m').value,
        description: el.querySelector('#d').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderCuentas(el, eng, redraw) {
  const rows = eng.listAccounts().map((a) => [a.code, a.name, a.type, money(a.balance)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nueva cuenta</h3>
      <div class="form-row"><label>Código</label><input id="code"/></div>
      <div class="form-row"><label>Nombre</label><input id="name"/></div>
      <div class="form-row"><label>Tipo</label>
        <select id="type">
          <option value="asset">Activo</option><option value="liability">Pasivo</option>
          <option value="income">Ingreso</option><option value="expense">Gasto</option>
          <option value="equity">Patrimonio</option>
        </select>
      </div>
      <button type="button" class="btn" id="ok">Crear</button>
    </div>${table(rows, ['Código', 'Nombre', 'Tipo', 'Saldo'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createAccount({
        code: el.querySelector('#code').value,
        name: el.querySelector('#name').value,
        type: el.querySelector('#type').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderReportes(el, eng) {
  const s = eng.getSummary();
  const tb = eng.getTrialBalance();
  const is = eng.getIncomeStatement();
  const journal = eng.getJournal().slice(0, 30);
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${money(s.ingresos)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${money(s.gastos)}</div></div>
      <div class="kpi"><div class="label">Resultado</div><div class="value">${money(s.balance)}</div></div>
      <div class="kpi"><div class="label">Ventas/pedidos</div><div class="value">${s.pedidos}</div></div>
    </div>
    <div class="card"><h3>Estado de resultados</h3>
      <p>Ingresos ${money(is.totalIncome)} − Gastos ${money(is.totalExpense)} = <b>${money(is.net)}</b></p></div>
    <div class="card"><h3>Balance de comprobación</h3>
      ${table(tb.map((a) => [a.code, a.name, a.type, money(a.balance)]), ['Código', 'Cuenta', 'Tipo', 'Saldo'])}</div>
    <div class="card"><h3>Diario (últimos)</h3>
      ${table(journal.map((e) => [(e.date || '').slice(0, 19), e.type, e.description, money(e.amount)]), ['Fecha', 'Tipo', 'Desc.', 'Monto'])}</div>`;
}

export function renderCatalog(el, eng, redraw) {
  const units = eng.state.measureUnits.map((m) => `<option value="${m.id}">${m.code} — ${m.name}</option>`).join('');
  const rows = eng.state.products.slice(0, 100).map((p) => [
    p.name, money(p.price), money(p.cost), p.stock, p.unit,
    `<button type="button" class="btn-ghost" data-edit="${p.id}">Stock+</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Producto (nomenclador)</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Precio</label><input id="p" type="number" step="0.01"/></div>
      <div class="form-row"><label>Costo</label><input id="c" type="number" step="0.01"/></div>
      <div class="form-row"><label>Stock</label><input id="s" type="number" value="0"/></div>
      <div class="form-row"><label>UM</label><select id="u">${units}</select></div>
      <div class="form-row"><label>SKU</label><input id="sku"/></div>
      <button type="button" class="btn" id="ok">Crear producto</button>
    </div>
    <div class="card form-card">
      <h3>Unidad de medida</h3>
      <div class="form-row"><label>Código</label><input id="mc"/></div>
      <div class="form-row"><label>Nombre</label><input id="mn"/></div>
      <button type="button" class="btn" id="mu">Añadir UM</button>
    </div>
    ${table(rows, ['Nombre', 'Precio', 'Costo', 'Stock', 'UM', ''])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createProduct({
        name: el.querySelector('#n').value, price: el.querySelector('#p').value,
        cost: el.querySelector('#c').value, stock: el.querySelector('#s').value,
        unitId: el.querySelector('#u').value, sku: el.querySelector('#sku').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelector('#mu').onclick = async () => {
    await eng.createMeasureUnit({ code: el.querySelector('#mc').value, name: el.querySelector('#mn').value });
    redraw();
  };
  el.querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = async () => {
      const p = eng.state.products.find((x) => x.id === b.dataset.edit);
      if (!p) return;
      await eng.updateProduct(p.id, { stock: Number(p.stock || 0) + 1 });
      redraw();
    };
  });
}

export function renderPos(el, eng, redraw) {
  const products = eng.state.products.filter((p) => p.active !== false);
  const units = eng.state.salesUnits.filter((u) => u.active !== false)
    .map((u) => `<option value="${u.id}">${u.code} — ${u.name}</option>`).join('');
  let cart = [];
  const paint = () => {
    const total = cart.reduce((s, l) => s + l.qty * l.unitPrice * (1 - (l.discountPct || 0) / 100), 0);
    el.innerHTML = `
      <div class="pos-grid">
        <div class="card">
          <h3>Carta</h3>
          <div class="pos-products">
            ${products.map((p) => `<button type="button" class="pos-item" data-id="${p.id}">
              <strong>${p.name}</strong><span>${money(p.price)} · stock ${p.stock}</span></button>`).join('')
              || '<p class="muted">Sin productos — cree en Nomenclador</p>'}
          </div>
        </div>
        <div class="card form-card">
          <h3>Ticket POS</h3>
          <div class="form-row"><label>Cliente</label><input id="cust" value="Mostrador"/></div>
          <div class="form-row"><label>Unidad de venta</label><select id="unit">${units}</select></div>
          <div class="form-row"><label>Pago</label>
            <select id="pay"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select>
          </div>
          <ul class="cart-list">${cart.map((l, i) => `<li>${l.name} ×${l.qty} @${money(l.unitPrice)}
            <span><input type="number" min="0" max="100" value="${l.discountPct || 0}" data-disc="${i}" style="width:48px" title="% rebaja"/>%
            <button type="button" data-rm="${i}" class="btn-ghost">×</button></span></li>`).join('')}</ul>
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
        else cart.push({ productId: p.id, name: p.name, unitPrice: p.price, qty: 1, discountPct: 0 });
        paint();
      };
    });
    el.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = () => { cart.splice(+b.dataset.rm, 1); paint(); };
    });
    el.querySelectorAll('[data-disc]').forEach((inp) => {
      inp.onchange = () => { cart[+inp.dataset.disc].discountPct = +inp.value || 0; paint(); };
    });
    const cobrar = el.querySelector('#cobrar');
    if (cobrar) cobrar.onclick = async () => {
      try {
        await eng.registerSale({
          lines: cart,
          customer: el.querySelector('#cust').value,
          unitId: el.querySelector('#unit').value,
          paymentMethod: el.querySelector('#pay').value,
        });
        cart = [];
        redraw();
      } catch (e) { alert(e.message); }
    };
  };
  paint();
}

export function renderPedidos(el, eng, redraw) {
  // ventas POS historial + pedidos online (main: pedidos = online)
  const online = eng.state.onlineOrders.slice(0, 50).map((o) => [
    o.id.slice(0, 8), o.customer, money(o.total), o.status,
    `<button class="btn-ghost" data-id="${o.id}" data-st="preparando">Prep.</button>
     <button class="btn-ghost" data-id="${o.id}" data-st="entregado">Entregado</button>
     <button class="btn-ghost" data-id="${o.id}" data-st="cancelado">Cancelar</button>`,
  ]);
  const sales = eng.listSales().slice(0, 30).map((s) => [
    s.id.slice(0, 8), s.customer, money(s.total), s.status, (s.at || '').slice(0, 19),
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Pedido online</h3>
      <div class="form-row"><label>Cliente</label><input id="c"/></div>
      <div class="form-row"><label>Teléfono</label><input id="ph"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Crear pedido</button>
    </div>
    <div class="card"><h3>Pedidos online</h3>${table(online, ['Id', 'Cliente', 'Total', 'Estado', 'Acciones'])}</div>
    <div class="card"><h3>Ventas POS recientes</h3>${table(sales, ['Id', 'Cliente', 'Total', 'Estado', 'Fecha'])}</div>`;
  el.querySelector('#ok').onclick = async () => {
    await eng.createOnlineOrder({
      customer: el.querySelector('#c').value, phone: el.querySelector('#ph').value, total: el.querySelector('#t').value,
    });
    redraw();
  };
  el.querySelectorAll('[data-st]').forEach((b) => {
    b.onclick = async () => {
      try { await eng.updateOrderStatus(b.dataset.id, b.dataset.st); redraw(); }
      catch (e) { alert(e.message); }
    };
  });
}

export function renderAlmacen(el, eng) {
  const stock = eng.getStock();
  const rows = (stock.items || []).map((i) => [i.name, i.sku, i.quantity, i.unit]);
  el.innerHTML = `<div class="card"><p class="muted">Snapshot de almacén (getStock)</p></div>
    ${table(rows, ['Producto', 'SKU', 'Cant.', 'UM'])}`;
}

export function renderRecepcion(el, eng, redraw) {
  const prods = eng.state.products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  const rows = eng.state.receptions.slice(0, 40).map((r) => [
    r.code, r.supplier, r.status, (r.at || '').slice(0, 19),
    r.status === 'pendiente'
      ? `<button class="btn-ghost" data-enter="${r.id}">Entrar</button>
         <button class="btn-ghost" data-prob="${r.id}">Problema</button>`
      : '—',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Crear recepción</h3>
      <div class="form-row"><label>Proveedor</label><input id="sup"/></div>
      <div class="form-row"><label>Producto</label><select id="pid"><option value="">— nuevo —</option>${prods}</select></div>
      <div class="form-row"><label>Nombre (si nuevo)</label><input id="pn"/></div>
      <div class="form-row"><label>Cantidad</label><input id="q" type="number" value="1"/></div>
      <div class="form-row"><label>Notas</label><input id="notes"/></div>
      <button type="button" class="btn" id="ok">Crear (pendiente)</button>
    </div>
    <div class="card"><p class="muted">EnterReception: confirmar entrada física o marcar problema sin mover stock</p>
      ${table(rows, ['Código', 'Proveedor', 'Estado', 'Fecha', 'Acciones'])}</div>`;
  el.querySelector('#ok').onclick = async () => {
    const pid = el.querySelector('#pid').value;
    const line = pid
      ? { productId: pid, qty: +el.querySelector('#q').value }
      : { name: el.querySelector('#pn').value || 'insumo', qty: +el.querySelector('#q').value };
    await eng.createReception({
      supplier: el.querySelector('#sup').value,
      lines: [line],
      notes: el.querySelector('#notes').value,
    });
    redraw();
  };
  el.querySelectorAll('[data-enter]').forEach((b) => {
    b.onclick = async () => { await eng.enterReception({ receptionId: b.dataset.enter, ok: true }); redraw(); };
  });
  el.querySelectorAll('[data-prob]').forEach((b) => {
    b.onclick = async () => {
      const problem = prompt('Descripción del problema') || 'Incidencia';
      await eng.enterReception({ receptionId: b.dataset.prob, ok: false, problem });
      redraw();
    };
  });
}

export function renderTransferencias(el, eng, redraw) {
  const units = eng.state.salesUnits.map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
  const prods = eng.state.products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  const rows = eng.state.transfers.slice(0, 40).map((t) => [t.from, t.to, t.qty, (t.at || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Transferencia entre unidades</h3>
      <div class="form-row"><label>Desde</label><select id="from">${units}</select></div>
      <div class="form-row"><label>Hacia</label><select id="to">${units}</select></div>
      <div class="form-row"><label>Producto</label><select id="p">${prods}</select></div>
      <div class="form-row"><label>Cantidad</label><input id="q" type="number" value="1"/></div>
      <button type="button" class="btn" id="ok">Registrar</button>
    </div>${table(rows, ['Desde', 'Hacia', 'Cant.', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createTransfer({
        fromUnitId: el.querySelector('#from').value,
        toUnitId: el.querySelector('#to').value,
        productId: el.querySelector('#p').value,
        qty: el.querySelector('#q').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderFichasCosto(el, eng, redraw) {
  const rows = eng.state.costSheets.map((c) => [
    c.name, money(c.cost), money(c.price),
    `<button class="btn-ghost" data-del="${c.id}">Eliminar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Ficha de costo</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Costo</label><input id="c" type="number" step="0.01"/></div>
      <div class="form-row"><label>Precio</label><input id="p" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Nombre', 'Costo', 'Precio', ''])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.saveCostSheet({
      name: el.querySelector('#n').value, cost: el.querySelector('#c').value, price: el.querySelector('#p').value,
    });
    redraw();
  };
  el.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => { await eng.deleteCostSheet(b.dataset.del); redraw(); };
  });
}

export function renderFichasPrecio(el, eng, redraw) {
  const rows = eng.state.priceSheets.map((c) => [
    c.name, money(c.price),
    `<button class="btn-ghost" data-del="${c.id}">Eliminar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Ficha de precio</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Precio</label><input id="p" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Nombre', 'Precio', ''])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.savePriceSheet({ name: el.querySelector('#n').value, price: el.querySelector('#p').value });
    redraw();
  };
  el.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => { await eng.deletePriceSheet(b.dataset.del); redraw(); };
  });
}

export function renderEmpleados(el, eng, redraw) {
  const pos = eng.state.jobPositions.map((j) => `<option value="${j.id}">${j.name}</option>`).join('');
  const rows = eng.state.employees.map((e) => [e.name, e.role, money(e.salary), e.active === false ? 'no' : 'sí']);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Alta empleado</h3>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Rol</label><input id="r" placeholder="caja / cocina"/></div>
      <div class="form-row"><label>Cargo</label><select id="jp">${pos}</select></div>
      <div class="form-row"><label>Salario</label><input id="s" type="number" step="0.01"/></div>
      <button type="button" class="btn" id="ok">Guardar</button>
    </div>${table(rows, ['Nombre', 'Rol', 'Salario', 'Activo'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createEmployee({
        name: el.querySelector('#n').value, role: el.querySelector('#r').value,
        positionId: el.querySelector('#jp').value, salary: el.querySelector('#s').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderLiquidaciones(el, eng, redraw) {
  const opts = eng.state.employees.filter((e) => e.active !== false)
    .map((e) => `<option value="${e.id}">${e.name} (${money(e.salary)})</option>`).join('');
  const rows = eng.state.payslips.slice(0, 50).map((p) => [p.employeeName, p.period, money(p.amount), p.status, (p.at || '').slice(0, 10)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Liquidación de nómina</h3>
      <div class="form-row"><label>Empleado</label><select id="e">${opts || '<option value="">—</option>'}</select></div>
      <div class="form-row"><label>Periodo</label><input id="per" value="${new Date().toISOString().slice(0, 7)}"/></div>
      <div class="form-row"><label>Monto</label><input id="m" type="number" step="0.01" placeholder="vacío = salario"/></div>
      <button type="button" class="btn" id="ok">Liquidar</button>
    </div>${table(rows, ['Empleado', 'Periodo', 'Monto', 'Estado', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createPayslip({
        employeeId: el.querySelector('#e').value,
        amount: el.querySelector('#m').value,
        period: el.querySelector('#per').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderFacturas(el, eng, redraw) {
  const rows = eng.state.invoices.slice(0, 50).map((i) => [i.number, i.customer, money(i.total), i.status, (i.at || '').slice(0, 19)]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Emitir factura</h3>
      <div class="form-row"><label>Cliente</label><input id="c"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01"/></div>
      <div class="form-row"><label>Notas</label><input id="n"/></div>
      <button type="button" class="btn" id="ok">Emitir</button>
    </div>${table(rows, ['Nº', 'Cliente', 'Total', 'Estado', 'Fecha'])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.emitInvoice({
        customer: el.querySelector('#c').value, total: el.querySelector('#t').value, notes: el.querySelector('#n').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderTenant(el, eng, redraw) {
  const t = eng.state.tenant;
  el.innerHTML = `
    <div class="card form-card">
      <h3>Negocio (tenant)</h3>
      <div class="form-row"><label>Nombre</label><input id="n" value="${t.name || ''}"/></div>
      <div class="form-row"><label>Eslogan</label><input id="s" value="${t.slogan || ''}"/></div>
      <div class="form-row"><label>Moneda</label><input id="c" value="${t.currency || 'CUP'}"/></div>
      <div class="form-row"><label>Teléfono</label><input id="p" value="${t.phone || ''}"/></div>
      <div class="form-row"><label>Email</label><input id="e" value="${t.email || ''}"/></div>
      <div class="form-row"><label>Dirección</label><input id="a" value="${t.address || ''}"/></div>
      <button type="button" class="btn" id="ok">Actualizar tenant</button>
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    await eng.updateTenant({
      name: el.querySelector('#n').value, slogan: el.querySelector('#s').value,
      currency: el.querySelector('#c').value, phone: el.querySelector('#p').value,
      email: el.querySelector('#e').value, address: el.querySelector('#a').value,
    });
    redraw();
  };
}

export function renderTraza(el, eng) {
  const trail = eng.listAuditTrail().slice(0, 80).map((a) => [
    (a.at || '').slice(0, 19), a.event, a.detail,
  ]);
  el.innerHTML = `<div class="card"><h3>Traza de auditoría</h3>
    ${table(trail, ['Fecha', 'Evento', 'Detalle'])}</div>`;
}

export function renderSalvas(el, eng, redraw) {
  const rows = eng.state.backups.map((b) => [
    b.label, (b.cid || '').slice(0, 16), (b.at || '').slice(0, 19), b.size,
    `<button class="btn-ghost" data-rest="${b.cid}">Restaurar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Salvas / backups IPFS</h3>
      <div class="form-row"><label>Etiqueta</label><input id="lab" value="salva manual"/></div>
      <button type="button" class="btn" id="ok">Crear salva</button>
      <button type="button" class="btn-ghost" id="exp">Exportar snapshot</button>
      <button type="button" class="btn-ghost" id="imp">Importar snapshot</button>
      <input type="file" id="file" accept="application/json,.json" style="display:none"/>
    </div>${table(rows, ['Label', 'CID', 'Fecha', 'Bytes', ''])}`;
  el.querySelector('#ok').onclick = async () => {
    await eng.createBackup(el.querySelector('#lab').value);
    redraw();
  };
  el.querySelector('#exp').onclick = async () => {
    const raw = await eng.exportBackup();
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'delicias-backup.json';
    a.click();
  };
  el.querySelector('#imp').onclick = () => el.querySelector('#file').click();
  el.querySelector('#file').onchange = async () => {
    const f = el.querySelector('#file').files?.[0];
    if (!f) return;
    const text = await f.text();
    await eng.importBackup(text);
    redraw();
  };
  el.querySelectorAll('[data-rest]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Restaurar esta salva? Se reemplaza el estado actual.')) return;
      try { await eng.restoreBackup(b.dataset.rest); redraw(); }
      catch (e) { alert(e.message); }
    };
  });
}

export function renderUsuarios(el, eng, redraw) {
  const rows = eng.state.users.map((u) => [
    u.username, u.displayName || u.name, u.role, u.active === false ? 'no' : 'sí',
    u.active !== false
      ? `<button class="btn-ghost" data-off="${u.id}">Desactivar</button>`
      : '—',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Crear usuario</h3>
      <div class="form-row"><label>Usuario</label><input id="u"/></div>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Clave</label><input id="p" type="password"/></div>
      <div class="form-row"><label>Rol</label>
        <select id="r">
          <option value="cashier">cashier</option><option value="almacenero">almacenero</option>
          <option value="admin">admin</option><option value="master">master</option>
        </select>
      </div>
      <button type="button" class="btn" id="ok">Crear</button>
    </div>${table(rows, ['Usuario', 'Nombre', 'Rol', 'Activo', ''])}`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createUser({
        username: el.querySelector('#u').value, displayName: el.querySelector('#n').value,
        password: el.querySelector('#p').value, role: el.querySelector('#r').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-off]').forEach((b) => {
    b.onclick = async () => { await eng.deactivateUser(b.dataset.off); redraw(); };
  });
}

export function renderPermisos(el, eng, redraw) {
  const roles = Object.keys(eng.state.rolePermissions);
  const screens = [
    'dashboard', 'ingresos', 'gastos', 'cuentas', 'reportes', 'facturas',
    'empleados', 'liquidaciones', 'catalog', 'tenant', 'almacen', 'recepcion',
    'transferencias', 'pos', 'fichas-costo', 'fichas-precio', 'pedidos',
    'traza', 'salvas', 'usuarios', 'permisos', 'master',
  ];
  let role = roles[0] || 'admin';
  const paint = () => {
    const perms = eng.state.rolePermissions[role] || {};
    el.innerHTML = `
      <div class="card form-card">
        <h3>Permisos UI por rol</h3>
        <div class="form-row"><label>Rol</label>
          <select id="role">${roles.map((r) => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select>
        </div>
        <div class="perm-grid">
          ${screens.map((s) => `<label><input type="checkbox" data-s="${s}" ${perms[s] || perms['*'] ? 'checked' : ''}/> ${s}</label>`).join('')}
        </div>
        <button type="button" class="btn" id="ok">Guardar permisos</button>
      </div>`;
    el.querySelector('#role').onchange = (e) => { role = e.target.value; paint(); };
    el.querySelector('#ok').onclick = async () => {
      const permissions = {};
      el.querySelectorAll('[data-s]').forEach((c) => { permissions[c.dataset.s] = c.checked; });
      await eng.updateRolePermissions(role, permissions);
      redraw();
    };
  };
  paint();
}

export function renderMaster(el, eng, redraw) {
  const mods = eng.state.modules || {};
  const tenants = eng.state.tenants.map((t) => [t.name, t.active ? 'sí' : 'no']);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Master · módulos de plataforma</h3>
      ${Object.keys(mods).map((k) => `<label><input type="checkbox" data-m="${k}" ${mods[k] ? 'checked' : ''}/> ${k}</label>`).join('<br/>')}
      <button type="button" class="btn" id="mods" style="margin-top:12px">Guardar módulos</button>
    </div>
    <div class="card form-card">
      <h3>Tenants</h3>
      <div class="form-row"><label>Nombre</label><input id="tn"/></div>
      <button type="button" class="btn" id="tenant">Crear tenant</button>
      ${table(tenants, ['Nombre', 'Activo'])}
    </div>
    <div class="card form-card">
      <h3>Reset plataforma</h3>
      <p class="muted">Escriba RESET para confirmar. Borra datos locales de Delicias.</p>
      <input id="conf" placeholder="RESET"/>
      <button type="button" class="btn" id="reset">Reset</button>
    </div>`;
  el.querySelector('#mods').onclick = async () => {
    const modules = {};
    el.querySelectorAll('[data-m]').forEach((c) => { modules[c.dataset.m] = c.checked; });
    await eng.updateModules(modules);
    redraw();
  };
  el.querySelector('#tenant').onclick = async () => {
    await eng.createTenant({ name: el.querySelector('#tn').value });
    redraw();
  };
  el.querySelector('#reset').onclick = async () => {
    try {
      await eng.resetPlatform(el.querySelector('#conf').value);
      alert('Plataforma reiniciada');
      redraw();
    } catch (e) { alert(e.message); }
  };
}

// aliases used by main switch
export const renderRecepciones = renderRecepcion;
export const renderCostos = renderFichasCosto;
export const renderNominas = renderLiquidaciones;
export const renderOnline = renderPedidos;
export const renderUnidades = renderTransferencias;
