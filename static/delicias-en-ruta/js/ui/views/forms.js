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
      <div class="form-row"><label>Cuenta de ingreso</label><select id="acc">${accOptions(eng, 'income')}</select></div>
      <div class="form-row"><label>Contrapartida (activo)</label><select id="cp">${accOptions(eng, 'asset')}</select></div>
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
        counterpart: el.querySelector('#cp')?.value,
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
      <div class="form-row"><label>Cuenta de gasto</label><select id="acc">${accOptions(eng, 'expense')}</select></div>
      <div class="form-row"><label>Contrapartida (activo)</label><select id="cp">${accOptions(eng, 'asset')}</select></div>
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
        counterpart: el.querySelector('#cp')?.value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderCuentas(el, eng, redraw) {
  let q = '';
  let typeFilter = 'all';
  const paint = () => {
    let list = eng.listAccounts();
    if (typeFilter !== 'all') list = list.filter((a) => a.type === typeFilter);
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter((a) => (`${a.code} ${a.name} ${a.type}`).toLowerCase().includes(qq));
    }
    const byType = {
      asset: eng.state.accounts.filter((a) => a.type === 'asset').length,
      liability: eng.state.accounts.filter((a) => a.type === 'liability').length,
      equity: eng.state.accounts.filter((a) => a.type === 'equity').length,
      income: eng.state.accounts.filter((a) => a.type === 'income').length,
      expense: eng.state.accounts.filter((a) => a.type === 'expense').length,
    };
    const rows = list.map((a) => [a.code, a.name, a.type, a.nature || '—', a.group || '—', money(a.balance)]);
    el.innerHTML = `
      <div class="grid">
        <div class="kpi"><div class="label">Activo</div><div class="value">${byType.asset}</div></div>
        <div class="kpi"><div class="label">Pasivo</div><div class="value">${byType.liability}</div></div>
        <div class="kpi"><div class="label">Patrimonio</div><div class="value">${byType.equity}</div></div>
        <div class="kpi"><div class="label">Ingreso / Gasto</div><div class="value">${byType.income} / ${byType.expense}</div></div>
      </div>
      <div class="card form-card">
        <h3>Nueva cuenta</h3>
        <div class="form-row"><label>Código</label><input id="code"/></div>
        <div class="form-row"><label>Nombre</label><input id="name"/></div>
        <div class="form-row"><label>Tipo</label>
          <select id="type">
            <option value="asset">Activo</option><option value="liability">Pasivo</option>
            <option value="equity">Patrimonio</option>
            <option value="income">Ingreso</option><option value="expense">Gasto</option>
          </select>
        </div>
        <button type="button" class="btn" id="ok">Crear</button>
      </div>
      <div class="card">
        <div class="form-row" style="flex-direction:row;gap:8px;align-items:center">
          <input id="search" placeholder="Buscar código o nombre" value="${q}" style="flex:1"/>
          <select id="tf">
            <option value="all">Todos</option>
            <option value="asset">Activo</option><option value="liability">Pasivo</option>
            <option value="equity">Patrimonio</option>
            <option value="income">Ingreso</option><option value="expense">Gasto</option>
          </select>
        </div>
        ${table(rows, ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Grupo', 'Saldo'])}
      </div>`;
    el.querySelector('#tf').value = typeFilter;
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
    el.querySelector('#search').oninput = (e) => { q = e.target.value; paint(); };
    el.querySelector('#tf').onchange = (e) => { typeFilter = e.target.value; paint(); };
  };
  paint();
}

export function renderReportes(el, eng) {
  const eq = eng.equationSnapshot();
  const situacion = eng.getSituacionFinanciera();
  const resultados = eng.getEstadoResultados();
  const ecuacion = eng.getEcuacionAmpliada();
  const tb = eng.getTrialBalance();
  const journal = eng.getJournalLines().slice(0, 40);
  const tAccounts = eng.getAllTAccounts().filter((t) => t.debe.length || t.haber.length || t.saldo);

  el.innerHTML = `
    <div class="tabs-bar" id="rep-tabs">
      <button type="button" class="tab active" data-tab="ecuacion">Ecuación ampliada</button>
      <button type="button" class="tab" data-tab="situacion">Estado de situación</button>
      <button type="button" class="tab" data-tab="rendimiento">Estado de resultados</button>
      <button type="button" class="tab" data-tab="cuenta_t">Cuentas T</button>
      <button type="button" class="tab" data-tab="diario">Diario / balance</button>
    </div>
    <div id="rep-panel"></div>`;

  const panel = el.querySelector('#rep-panel');
  const show = (tab) => {
    el.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'ecuacion') {
      panel.innerHTML = `
        <div class="card equation-card">
          <h3>Ecuación contable ampliada</h3>
          <p class="muted">Activo = Pasivo + Patrimonio + (Ingresos − Gastos)</p>
          <div class="equation-row">
            <div class="eq-side">
              <div class="kpi"><div class="label">Activo</div><div class="value">${money(eq.activo)}</div></div>
            </div>
            <div class="eq-eq">=</div>
            <div class="eq-side eq-right">
              <div class="kpi"><div class="label">Pasivo</div><div class="value">${money(eq.pasivo)}</div></div>
              <div class="kpi"><div class="label">Patrimonio</div><div class="value">${money(eq.patrimonio)}</div></div>
              <div class="kpi"><div class="label">Neto (Ing − Gas)</div><div class="value">${money(eq.neto)}</div></div>
              <div class="kpi"><div class="label">Suma derecha</div><div class="value">${money(eq.pasivo_patrimonio_neto)}</div></div>
            </div>
          </div>
          <p><b>${ecuacion.equilibrada ? '✓ Ecuación equilibrada' : '✗ Desbalance: revisar asientos'}</b>
            · Δ ${money(Math.abs(eq.activo - eq.pasivo_patrimonio_neto))}</p>
        </div>`;
    } else if (tab === 'situacion') {
      panel.innerHTML = `
        <div class="grid">
          <div class="kpi"><div class="label">Activo</div><div class="value">${money(situacion.activo)}</div></div>
          <div class="kpi"><div class="label">Pasivo</div><div class="value">${money(situacion.pasivo)}</div></div>
          <div class="kpi"><div class="label">Patrimonio</div><div class="value">${money(situacion.patrimonio)}</div></div>
          <div class="kpi"><div class="label">Patrimonio neto (A−P)</div><div class="value">${money(situacion.patrimonioNeto)}</div></div>
        </div>
        <div class="card"><h3>Cuentas de activo / pasivo / patrimonio</h3>
          ${table(
            tb.filter((a) => ['asset','liability','equity'].includes(a.type)).map((a) => [a.code, a.name, a.type, a.group || '', money(a.balance)]),
            ['Código', 'Nombre', 'Tipo', 'Grupo', 'Saldo']
          )}
        </div>`;
    } else if (tab === 'rendimiento') {
      panel.innerHTML = `
        <div class="grid">
          <div class="kpi"><div class="label">Ingresos</div><div class="value">${money(resultados.ingresos)}</div></div>
          <div class="kpi"><div class="label">Gastos</div><div class="value">${money(resultados.gastos)}</div></div>
          <div class="kpi"><div class="label">Resultado neto</div><div class="value">${money(resultados.neto)}</div></div>
        </div>
        <div class="card"><h3>Cuentas de resultado</h3>
          ${table(
            tb.filter((a) => ['income','expense'].includes(a.type)).map((a) => [a.code, a.name, a.type, money(a.balance)]),
            ['Código', 'Nombre', 'Tipo', 'Saldo']
          )}
        </div>`;
    } else if (tab === 'cuenta_t') {
      panel.innerHTML = `<div class="card"><p class="muted">Cuentas T (debe / haber) generadas por partida doble</p></div>
        <div class="t-grid">
          ${tAccounts.map((t) => `
            <div class="card t-account">
              <h4>${t.account.code} — ${t.account.name}</h4>
              <div class="t-cols">
                <div><b>Debe</b>
                  <ul>${t.debe.map((l) => `<li>${money(l.amount)} <span class="muted">${(l.description||'').slice(0,40)}</span></li>`).join('') || '<li class="muted">—</li>'}
                  <p><b>${money(t.sumDebe)}</b></p></div>
                <div><b>Haber</b>
                  <ul>${t.haber.map((l) => `<li>${money(l.amount)} <span class="muted">${(l.description||'').slice(0,40)}</span></li>`).join('') || '<li class="muted">—</li>'}
                  <p><b>${money(t.sumHaber)}</b></p></div>
              </div>
              <p class="muted">Saldo cuenta: <b>${money(t.saldo)}</b></p>
            </div>`).join('') || '<p class="muted">Sin movimientos aún — registre ingresos/gastos/POS</p>'}
        </div>`;
    } else {
      panel.innerHTML = `
        <div class="card"><h3>Balance de comprobación</h3>
          ${table(tb.map((a) => [a.code, a.name, a.type, a.nature || '', money(a.balance)]), ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Saldo'])}
        </div>
        <div class="card"><h3>Líneas de diario (debe/haber)</h3>
          ${table(journal.map((l) => [(l.date||'').slice(0,19), l.side, l.accountCode, l.accountName, money(l.amount), (l.description||'').slice(0,40)]),
            ['Fecha', 'Lado', 'Cuenta', 'Nombre', 'Monto', 'Desc.'])}
        </div>`;
    }
  };
  show('ecuacion');
  el.querySelectorAll('.tab').forEach((b) => { b.onclick = () => show(b.dataset.tab); });
}

export function renderCatalog(el, eng, redraw) {
  const units = eng.state.measureUnits.map((m) => `<option value="${m.id}">${m.code} — ${m.name}</option>`).join('');
  const rows = eng.state.products.slice(0, 200).map((p) => [
    p.sku || '—',
    p.name,
    money(p.price),
    money(p.cost),
    p.stock,
    p.unit || 'U',
    p.active === false ? 'no' : 'sí',
    `<button type="button" class="btn-ghost" data-stock="${p.id}">Ajustar</button>
     <button type="button" class="btn-ghost" data-off="${p.id}">${p.active === false ? 'Activar' : 'Baja'}</button>`,
  ]);
  const muRows = eng.state.measureUnits.map((m) => [
    m.code, m.name,
    `<button type="button" class="btn-ghost" data-delmu="${m.id}">Eliminar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nomenclador · Producto</h3>
      <p class="muted">Catálogo de productos (equivalente main: CreateProduct / UpdateProduct).</p>
      <div class="form-row"><label>Nombre</label><input id="n" placeholder="Nombre del producto"/></div>
      <div class="form-row"><label>SKU</label><input id="sku" placeholder="Código interno"/></div>
      <div class="form-row"><label>Precio venta</label><input id="p" type="number" step="0.01" min="0"/></div>
      <div class="form-row"><label>Costo</label><input id="c" type="number" step="0.01" min="0"/></div>
      <div class="form-row"><label>Stock inicial</label><input id="s" type="number" value="0" min="0"/></div>
      <div class="form-row"><label>Unidad de medida</label><select id="u">${units}</select></div>
      <button type="button" class="btn" id="ok">Crear producto</button>
    </div>
    <div class="card form-card">
      <h3>Unidades de medida</h3>
      <div class="form-row"><label>Código</label><input id="mc" placeholder="KG, L, U…"/></div>
      <div class="form-row"><label>Nombre</label><input id="mn"/></div>
      <button type="button" class="btn" id="mu">Añadir UM</button>
      ${table(muRows, ['Código', 'Nombre', ''])}
    </div>
    <div class="card"><h3>Productos (${eng.state.products.length})</h3>
      ${table(rows, ['SKU', 'Nombre', 'Precio', 'Costo', 'Stock', 'UM', 'Activo', ''])}
    </div>`;
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
    try {
      await eng.createMeasureUnit({ code: el.querySelector('#mc').value, name: el.querySelector('#mn').value });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-delmu]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Eliminar unidad de medida?')) return;
      await eng.deleteMeasureUnit(b.dataset.delmu);
      redraw();
    };
  });
  el.querySelectorAll('[data-stock]').forEach((b) => {
    b.onclick = async () => {
      const delta = prompt('Ajuste de stock (+/- cantidad):', '1');
      if (delta == null || delta === '') return;
      const note = prompt('Motivo del ajuste:', 'Ajuste manual nomenclador') || 'Ajuste manual';
      try {
        await eng.adjustStock({ productId: b.dataset.stock, deltaQty: Number(delta), note });
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
  el.querySelectorAll('[data-off]').forEach((b) => {
    b.onclick = async () => {
      const p = eng.state.products.find((x) => x.id === b.dataset.off);
      if (!p) return;
      await eng.updateProduct(p.id, { active: p.active === false });
      redraw();
    };
  });
}

export function renderPos(el, eng, redraw) {
  const products = eng.state.products.filter((p) => p.active !== false);
  const units = eng.state.salesUnits.filter((u) => u.active !== false)
    .map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
  const opts = products.map((p) => `<option value="${p.id}">${p.name} · ${money(p.price)} · stock ${p.stock}</option>`).join('');
  const recent = eng.listSales().slice(0, 15).map((s) => [
    (s.at || '').slice(0, 19), money(s.total), s.paymentMethod || 'cash', s.status || 'ok',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Punto de venta</h3>
      <div class="form-row"><label>Producto</label><select id="pid">${opts || '<option value="">Sin productos</option>'}</select></div>
      <div class="form-row"><label>Cantidad</label><input id="qty" type="number" min="1" value="1"/></div>
      <div class="form-row"><label>Unidad de venta</label><select id="su">${units}</select></div>
      <div class="form-row"><label>Cliente</label><input id="cust" placeholder="Opcional"/></div>
      <div class="form-row"><label>Pago</label>
        <select id="pay"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select>
      </div>
      <button type="button" class="btn" id="ok">Registrar venta</button>
    </div>
    <div class="card"><h3>Ventas recientes</h3>${table(recent, ['Fecha', 'Total', 'Pago', 'Estado'])}</div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      const pid = el.querySelector('#pid').value;
      if (!pid) throw new Error('Seleccione un producto');
      await eng.registerSale({
        lines: [{ productId: pid, qty: Number(el.querySelector('#qty').value || 1) }],
        customer: el.querySelector('#cust').value,
        unitId: el.querySelector('#su').value,
        paymentMethod: el.querySelector('#pay').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
}

export function renderPedidos(el, eng, redraw) {
  const rows = eng.state.onlineOrders.slice(0, 50).map((o) => [
    (o.at || '').slice(0, 19), o.customer || '—', money(o.total), o.status || 'nuevo',
    `<select data-st="${o.id}">
      <option value="nuevo">nuevo</option>
      <option value="preparando">preparando</option>
      <option value="entregado">entregado</option>
      <option value="cancelado">cancelado</option>
    </select>
    <button type="button" class="btn-ghost" data-apply="${o.id}">Aplicar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Pedido online</h3>
      <div class="form-row"><label>Cliente</label><input id="c"/></div>
      <div class="form-row"><label>Total</label><input id="t" type="number" step="0.01"/></div>
      <div class="form-row"><label>Notas</label><input id="n"/></div>
      <button type="button" class="btn" id="ok">Crear pedido</button>
    </div>
    <div class="card"><h3>Pedidos</h3>${table(rows, ['Fecha', 'Cliente', 'Total', 'Estado', ''])}</div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createOnlineOrder({
        customer: el.querySelector('#c').value,
        total: el.querySelector('#t').value,
        notes: el.querySelector('#n').value,
        items: [],
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-apply]').forEach((b) => {
    b.onclick = async () => {
      const sel = el.querySelector(`select[data-st="${b.dataset.apply}"]`);
      try {
        await eng.updateOrderStatus(b.dataset.apply, sel.value);
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
  el.querySelectorAll('select[data-st]').forEach((sel) => {
    const o = eng.state.onlineOrders.find((x) => x.id === sel.dataset.st);
    if (o?.status) sel.value = o.status;
  });
}

export function renderAlmacen(el, eng, redraw) {
  const stock = eng.getStock();
  const items = stock.items || [];
  const rows = items.map((i) => [
    i.name, i.sku || '—', i.quantity, i.unit || 'U',
    `<button type="button" class="btn-ghost" data-adj="${i.productId}">Ajustar</button>`,
  ]);
  const prods = eng.state.products.filter((p) => p.active !== false)
    .map((p) => `<option value="${p.id}">${p.name} (stock ${p.stock})</option>`).join('');
  const kardex = (eng.getKardex ? eng.getKardex() : (eng.state.kardex || [])).slice(0, 40).map((k) => [
    (k.at || '').slice(0, 19), k.productName || k.productId, k.delta, k.reason || k.type, k.balance ?? '—',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Almacén · stock</h3>
      <p class="muted">Inventario físico y kardex (equivalente main: GetWarehouseStock / AdjustStock / GetKardex).</p>
      <div class="form-row"><label>Producto</label><select id="pid">${prods}</select></div>
      <div class="form-row"><label>Ajuste (+/-)</label><input id="d" type="number" step="1" value="1"/></div>
      <div class="form-row"><label>Motivo</label><input id="note" placeholder="Conteo, merma, corrección…"/></div>
      <button type="button" class="btn" id="ok">Aplicar ajuste</button>
    </div>
    <div class="card"><h3>Existencias (${items.length})</h3>
      ${table(rows, ['Producto', 'SKU', 'Cant.', 'UM', '']) || '<p class="muted">Sin stock registrado. Cree productos o recepciones.</p>'}
    </div>
    <div class="card"><h3>Kardex reciente</h3>
      ${table(kardex, ['Fecha', 'Producto', 'Δ', 'Motivo', 'Saldo'])}
    </div>`;
  const doAdj = async (productId, delta, note) => {
    try {
      await eng.adjustStock({ productId, deltaQty: delta, note: note || 'Ajuste almacén' });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelector('#ok').onclick = () => doAdj(
    el.querySelector('#pid').value,
    Number(el.querySelector('#d').value),
    el.querySelector('#note').value,
  );
  el.querySelectorAll('[data-adj]').forEach((b) => {
    b.onclick = async () => {
      const delta = prompt('Cantidad (+/-):', '1');
      if (delta == null) return;
      const note = prompt('Motivo:', 'Ajuste desde listado') || 'Ajuste';
      await doAdj(b.dataset.adj, Number(delta), note);
    };
  });
}

export function renderRecepcion(el, eng, redraw) {
  const prods = eng.state.products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  const rows = eng.state.receptions.slice(0, 50).map((r) => {
    const actions = r.status === 'pendiente' || r.status === 'problema'
      ? `<button type="button" class="btn-ghost" data-enter="${r.id}">Confirmar entrada</button>
         <button type="button" class="btn-ghost" data-prob="${r.id}">Problema</button>
         <button type="button" class="btn-ghost" data-ab="${r.id}">Abandonar</button>`
      : (r.problem || r.status);
    return [
      r.code,
      r.supplier,
      r.receiver || '—',
      (r.lines || []).length,
      money(r.totalCost || 0),
      r.status,
      (r.at || '').slice(0, 19),
      actions,
    ];
  });
  el.innerHTML = `
    <div class="card form-card">
      <h3>Recepción de mercancía</h3>
      <p class="muted">Flujo main: crear IR → entrada física en almacén (o problema / abandono).</p>
      <div class="form-row"><label>Proveedor</label><input id="sup" placeholder="Nombre del proveedor"/></div>
      <div class="form-row"><label>Quién recibe</label><input id="recv" placeholder="Almacenero / responsable"/></div>
      <div class="form-row"><label>¿Con factura?</label>
        <select id="inv"><option value="no">No</option><option value="si">Sí</option></select>
      </div>
      <div class="form-row"><label>Nº factura / doc</label><input id="doc" placeholder="Opcional o obligatorio si hay factura"/></div>
      <div class="form-row"><label>Producto</label><select id="pid"><option value="">— elegir —</option>${prods}</select></div>
      <div class="form-row"><label>Nombre (si producto nuevo)</label><input id="pname"/></div>
      <div class="form-row"><label>Cantidad</label><input id="qty" type="number" min="0.01" step="0.01" value="1"/></div>
      <div class="form-row"><label>Costo unitario</label><input id="cost" type="number" min="0" step="0.01" value="0"/></div>
      <div class="form-row"><label>Notas</label><input id="notes"/></div>
      <button type="button" class="btn" id="ok">Registrar recepción (pendiente de entrada)</button>
    </div>
    <div class="card"><h3>Recepciones</h3>
      ${table(rows, ['Código', 'Proveedor', 'Recibe', 'Líneas', 'Costo', 'Estado', 'Fecha', ''])}
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      const pid = el.querySelector('#pid').value;
      const lines = [{
        productId: pid,
        name: el.querySelector('#pname').value,
        qty: Number(el.querySelector('#qty').value),
        unitCost: Number(el.querySelector('#cost').value),
      }];
      await eng.createReception({
        supplier: el.querySelector('#sup').value,
        receiver: el.querySelector('#recv').value,
        hasInvoice: el.querySelector('#inv').value === 'si',
        invoiceRef: el.querySelector('#doc').value,
        docRef: el.querySelector('#doc').value,
        notes: el.querySelector('#notes').value,
        lines,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-enter]').forEach((b) => {
    b.onclick = async () => {
      try {
        await eng.enterReception({ receptionId: b.dataset.enter, ok: true });
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
  el.querySelectorAll('[data-prob]').forEach((b) => {
    b.onclick = async () => {
      const problem = prompt('Describa el problema de entrada:');
      if (problem == null) return;
      try {
        await eng.enterReception({ receptionId: b.dataset.prob, ok: false, problem });
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
  el.querySelectorAll('[data-ab]').forEach((b) => {
    b.onclick = async () => {
      const reason = prompt('Motivo del abandono definitivo:');
      if (!reason) return;
      try {
        await eng.enterReception({ receptionId: b.dataset.ab, abandon: true, reason });
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
}

export function renderTransferencias(el, eng, redraw) {
  const units = eng.state.salesUnits.filter((u) => u.active !== false);
  const uOpts = units.map((u) => `<option value="${u.id}">${u.code} — ${u.name}</option>`).join('');
  const prods = eng.state.products.filter((p) => p.active !== false)
    .map((p) => `<option value="${p.id}">${p.name} (stock ${p.stock})</option>`).join('');
  const rows = (eng.state.transfers || []).slice(0, 50).map((t) => [
    (t.at || '').slice(0, 19), t.from, t.to, t.productName || t.productId, t.qty, t.status || 'ok', t.notes || '—',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Transferencia entre unidades</h3>
      <p class="muted">Mueve stock lógico entre puntos de venta / ruta (main: CreateTransfer).</p>
      <div class="form-row"><label>Origen</label><select id="from">${uOpts}</select></div>
      <div class="form-row"><label>Destino</label><select id="to">${uOpts}</select></div>
      <div class="form-row"><label>Producto</label><select id="pid">${prods}</select></div>
      <div class="form-row"><label>Cantidad</label><input id="qty" type="number" min="0.01" step="0.01" value="1"/></div>
      <div class="form-row"><label>Notas</label><input id="n"/></div>
      <button type="button" class="btn" id="ok">Transferir</button>
    </div>
    <div class="card form-card">
      <h3>Unidad de venta</h3>
      <div class="form-row"><label>Código</label><input id="uc"/></div>
      <div class="form-row"><label>Nombre</label><input id="un"/></div>
      <button type="button" class="btn" id="su">Crear unidad</button>
      <p class="muted">Unidades: ${units.map((u) => u.name).join(', ') || '—'}</p>
    </div>
    <div class="card"><h3>Historial de transferencias</h3>
      ${table(rows, ['Fecha', 'Desde', 'Hacia', 'Producto', 'Cant.', 'Estado', 'Notas'])}
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createTransfer({
        fromUnitId: el.querySelector('#from').value,
        toUnitId: el.querySelector('#to').value,
        productId: el.querySelector('#pid').value,
        qty: el.querySelector('#qty').value,
        notes: el.querySelector('#n').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelector('#su').onclick = async () => {
    try {
      await eng.createSalesUnit({ code: el.querySelector('#uc').value, name: el.querySelector('#un').value });
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
      <div class="form-row"><label>Precio ref.</label><input id="p" type="number" step="0.01"/></div>
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
  const rows = eng.state.employees.map((e) => [
    e.name,
    e.role || '—',
    money(e.salary),
    e.phone || '—',
    e.hireDate || '—',
    e.active === false ? 'no' : 'sí',
    e.active === false
      ? '—'
      : `<button type="button" class="btn-ghost" data-deact="${e.id}">Dar de baja</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Empleados</h3>
      <p class="muted">Alta y baja (main: CreateEmployee / DeactivateEmployee).</p>
      <div class="form-row"><label>Nombre</label><input id="n"/></div>
      <div class="form-row"><label>Rol / área</label><input id="r" placeholder="caja, cocina, ruta…"/></div>
      <div class="form-row"><label>Cargo</label><select id="jp">${pos}</select></div>
      <div class="form-row"><label>Salario</label><input id="s" type="number" step="0.01"/></div>
      <div class="form-row"><label>Teléfono</label><input id="ph"/></div>
      <div class="form-row"><label>Fecha alta</label><input id="hd" type="date"/></div>
      <button type="button" class="btn" id="ok">Guardar empleado</button>
    </div>
    <div class="card"><h3>Plantilla (${eng.state.employees.length})</h3>
      ${table(rows, ['Nombre', 'Rol', 'Salario', 'Tel.', 'Alta', 'Activo', ''])}
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createEmployee({
        name: el.querySelector('#n').value,
        role: el.querySelector('#r').value,
        positionId: el.querySelector('#jp').value,
        salary: el.querySelector('#s').value,
        phone: el.querySelector('#ph').value,
        hireDate: el.querySelector('#hd').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-deact]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Dar de baja al empleado?')) return;
      try {
        await eng.deactivateEmployee(b.dataset.deact);
        redraw();
      } catch (e) { alert(e.message); }
    };
  });
}

export function renderLiquidaciones(el, eng, redraw) {
  const emps = eng.state.employees.filter((e) => e.active !== false)
    .map((e) => `<option value="${e.id}">${e.name} · ${money(e.salary)}</option>`).join('');
  const rows = eng.state.payslips.slice(0, 50).map((p) => [
    (p.at || '').slice(0, 19), p.employeeName, p.period, money(p.amount), p.status || 'pagado',
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nómina / liquidación</h3>
      <p class="muted">Genera asiento de gasto automáticamente (main: CreatePayslip).</p>
      <div class="form-row"><label>Empleado</label><select id="e">${emps || '<option value="">Sin empleados activos</option>'}</select></div>
      <div class="form-row"><label>Periodo</label><input id="per" placeholder="2026-10" value="${new Date().toISOString().slice(0, 7)}"/></div>
      <div class="form-row"><label>Importe (vacío = salario)</label><input id="amt" type="number" step="0.01" placeholder="Auto"/></div>
      <button type="button" class="btn" id="ok">Liquidar y registrar gasto</button>
    </div>
    <div class="card"><h3>Liquidaciones</h3>
      ${table(rows, ['Fecha', 'Empleado', 'Periodo', 'Importe', 'Estado'])}
    </div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      const id = el.querySelector('#e').value;
      if (!id) throw new Error('Seleccione un empleado');
      const amt = el.querySelector('#amt').value;
      await eng.createPayslip({
        employeeId: id,
        period: el.querySelector('#per').value,
        amount: amt === '' ? undefined : amt,
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
        <select id="r">${(eng.state.roles||[]).map((r)=>`<option value="${r.code}">${r.code}</option>`).join('') || '<option value="cashier">cashier</option>'}</select>
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
  const roles = Object.keys(eng.state.rolePermissions || {});
  const screens = [
    'dashboard', 'ingresos', 'gastos', 'cuentas', 'reportes', 'facturas',
    'empleados', 'liquidaciones', 'catalog', 'tenant', 'almacen', 'recepcion',
    'transferencias', 'pos', 'fichas-costo', 'fichas-precio', 'pedidos',
    'traza', 'salvas', 'usuarios', 'roles', 'permisos', 'master',
  ];
  const users = (eng.state.users || []).filter((u) => u.active !== false);
  let role = roles.includes('admin') ? 'admin' : (roles[0] || 'admin');
  let userId = users[0]?.id || '';

  const paint = () => {
    const perms = eng.state.rolePermissions[role] || {};
    const selUser = users.find((u) => u.id === userId);
    const uscreens = (selUser && selUser.screens) || {};

    el.innerHTML = `
      <div class="card form-card">
        <h3>Permisos UI por rol</h3>
        <p class="muted">Define qué ve cada rol en el menú lateral. Los overrides por usuario (abajo) tienen prioridad.</p>
        <div class="form-row"><label>Rol</label>
          <select id="role">${roles.map((r) => `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select>
        </div>
        <div class="perm-grid">
          ${screens.map((s) => `<label><input type="checkbox" data-s="${s}" ${perms[s] || perms['*'] ? 'checked' : ''}/> ${s}</label>`).join('')}
        </div>
        <button type="button" class="btn" id="ok-role">Guardar permisos del rol</button>
      </div>

      <div class="card form-card">
        <h3>Menú por usuario (override master)</h3>
        <p class="muted">Para un usuario concreto: <b>Heredar</b> del rol, <b>Mostrar</b> u <b>Ocultar</b> cada opción del menú.</p>
        <div class="form-row"><label>Usuario</label>
          <select id="uid">${users.map((u) => `<option value="${u.id}" ${u.id === userId ? 'selected' : ''}>${u.username} (${u.role})</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Pantalla</th><th>Rol</th><th>Override</th></tr></thead>
          <tbody>
            ${screens.map((s) => {
              const roleAllows = !!(perms[s] || perms['*'] || (selUser && selUser.role === 'master'));
              const ov = Object.prototype.hasOwnProperty.call(uscreens, s) ? (uscreens[s] ? 'show' : 'hide') : 'inherit';
              return `<tr>
                <td>${s}</td>
                <td>${roleAllows ? 'sí' : 'no'}</td>
                <td>
                  <select data-ov="${s}">
                    <option value="inherit" ${ov === 'inherit' ? 'selected' : ''}>Heredar rol</option>
                    <option value="show" ${ov === 'show' ? 'selected' : ''}>Mostrar</option>
                    <option value="hide" ${ov === 'hide' ? 'selected' : ''}>Ocultar</option>
                  </select>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
        <button type="button" class="btn" id="ok-user" style="margin-top:10px">Guardar menú del usuario</button>
      </div>`;

    el.querySelector('#role').onchange = (e) => { role = e.target.value; paint(); };
    const uidEl = el.querySelector('#uid');
    if (uidEl) uidEl.onchange = (e) => { userId = e.target.value; paint(); };

    el.querySelector('#ok-role').onclick = async () => {
      const permissions = {};
      el.querySelectorAll('[data-s]').forEach((c) => { permissions[c.dataset.s] = c.checked; });
      await eng.updateRolePermissions(role, permissions);
      if (window.__deliciasRefreshMenu) window.__deliciasRefreshMenu();
      redraw();
    };

    el.querySelector('#ok-user').onclick = async () => {
      if (!userId) return;
      const map = {};
      el.querySelectorAll('[data-ov]').forEach((sel) => {
        const v = sel.value;
        if (v === 'show') map[sel.dataset.ov] = true;
        else if (v === 'hide') map[sel.dataset.ov] = false;
        // inherit → no key
      });
      await eng.setUserScreens(userId, map);
      if (window.__deliciasRefreshMenu) window.__deliciasRefreshMenu();
      alert('Menú del usuario actualizado. Si es la sesión actual, el lateral se refresca al momento.');
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


export function renderRoles(el, eng, redraw) {
  const rows = (eng.state.roles || []).map((r) => [
    r.code, r.name, r.description || '—', r.system ? 'sistema' : 'custom',
    r.system ? '—' : `<button class="btn-ghost" data-del="${r.id}">Eliminar</button>`,
  ]);
  el.innerHTML = `
    <div class="card form-card">
      <h3>Nomenclador de roles</h3>
      <p class="muted">CRUD completo para master. Roles de sistema no se eliminan.</p>
      <div class="form-row"><label>Código</label><input id="code" placeholder="supervisor"/></div>
      <div class="form-row"><label>Nombre</label><input id="name"/></div>
      <div class="form-row"><label>Descripción</label><input id="desc"/></div>
      <button type="button" class="btn" id="ok">Crear rol</button>
    </div>
    ${table(rows, ['Código', 'Nombre', 'Descripción', 'Tipo', ''])}
    <div class="card"><p class="muted">Tras crear un rol, asigne pantallas en <b>Permisos UI</b> y asígnelo a usuarios.</p></div>`;
  el.querySelector('#ok').onclick = async () => {
    try {
      await eng.createRole({
        code: el.querySelector('#code').value,
        name: el.querySelector('#name').value,
        description: el.querySelector('#desc').value,
      });
      redraw();
    } catch (e) { alert(e.message); }
  };
  el.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('¿Eliminar rol?')) return;
      try { await eng.deleteRole(b.dataset.del); redraw(); }
      catch (e) { alert(e.message); }
    };
  });
}
