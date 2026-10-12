export function renderDashboard(el, eng) {
  const k = eng.state.kpis || {};
  const t = eng.state.tenant || {};
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${Number(k.ingresos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${Number(k.gastos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Ventas / pedidos</div><div class="value">${k.pedidos || 0}</div></div>
      <div class="kpi"><div class="label">Ítems stock</div><div class="value">${k.stock || 0}</div></div>
    </div>
    <div class="card">
      <h3>${t.name || 'Delicias en Ruta'}</h3>
      <p class="muted">${t.slogan || ''}</p>
      <p class="muted">Persistencia <b>IPFS local</b> · sin depender de la rama main · listo offline.</p>
    </div>`;
}
