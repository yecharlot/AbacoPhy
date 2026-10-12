export function renderDashboard(el, state) {
  const k = state.kpis || {};
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${Number(k.ingresos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${Number(k.gastos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Pedidos</div><div class="value">${k.pedidos || 0}</div></div>
      <div class="kpi"><div class="label">Stock ítems</div><div class="value">${k.stock || 0}</div></div>
    </div>
    <div class="card">
      <h3>${state.tenant?.name || 'Delicias en Ruta'}</h3>
      <p class="muted">Gemelo funcional de ÁbacoPhy con la identidad visual de Delicias en Ruta.
      Datos: <b>${state.mode}</b>${state.online ? ' · conectado a API' : ' · offline local'}.</p>
    </div>`;
}
