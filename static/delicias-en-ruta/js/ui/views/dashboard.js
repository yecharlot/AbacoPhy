export function renderDashboard(el, state) {
  const k = state.kpis || {};
  el.innerHTML = `
    <div class="card">
      <h3>${state.tenant?.name || 'Delicias en Ruta'}</h3>
      <p class="muted">${state.tenant?.slogan || ''}</p>
      <p class="muted">${state.tenant?.activity || ''}</p>
    </div>
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${(k.ingresos||0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${(k.gastos||0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Pedidos</div><div class="value">${k.pedidos||0}</div></div>
      <div class="kpi"><div class="label">Productos carta</div><div class="value">${k.stock||0}</div></div>
    </div>
    <div class="card">
      <h3>Última persistencia IPFS</h3>
      <p class="cid">${state.meta?.lastCid || 'sin CID aún — guarda un movimiento'}</p>
      <p class="muted">${state.meta?.updatedAt || ''}</p>
    </div>
  `;
}
