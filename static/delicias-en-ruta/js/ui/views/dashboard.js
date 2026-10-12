export function renderDashboard(el, eng) {
  const eq = eng.equationSnapshot();
  const t = eng.state.tenant || {};
  const ecuacion = eng.getEcuacionAmpliada();
  el.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="label">Activo</div><div class="value">${Number(eq.activo || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Pasivo</div><div class="value">${Number(eq.pasivo || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Patrimonio</div><div class="value">${Number(eq.patrimonio || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Neto (Ing − Gas)</div><div class="value">${Number(eq.neto || 0).toFixed(2)}</div></div>
    </div>
    <div class="card equation-card">
      <h3>Ecuación ampliada</h3>
      <p><b>Activo</b> ${Number(eq.activo).toFixed(2)}
        = <b>Pasivo</b> ${Number(eq.pasivo).toFixed(2)}
        + <b>Patrimonio</b> ${Number(eq.patrimonio).toFixed(2)}
        + <b>Neto</b> ${Number(eq.neto).toFixed(2)}
        → derecha ${Number(eq.pasivo_patrimonio_neto).toFixed(2)}
      </p>
      <p class="muted">${ecuacion.equilibrada ? '✓ Equilibrada' : '✗ Revisar asientos'} · ${t.name || 'Delicias en Ruta'} · IPFS local</p>
    </div>
    <div class="grid">
      <div class="kpi"><div class="label">Ingresos</div><div class="value">${Number(eq.ingresos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Gastos</div><div class="value">${Number(eq.gastos || 0).toFixed(2)}</div></div>
      <div class="kpi"><div class="label">Ventas/pedidos</div><div class="value">${eng.state.kpis?.pedidos || 0}</div></div>
      <div class="kpi"><div class="label">Stock ítems</div><div class="value">${eng.state.kpis?.stock || 0}</div></div>
    </div>`;
}
