<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';

  export let store: PayrollStore;

  let state: PayrollState = store.getState();
  let employeeId = '';
  let period = new Date().toISOString().slice(0, 7); // YYYY-MM
  let grossOverride = '';
  let otherDeduct = '0';
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s) => (state = s));
    void store.loadEmployees();
    void store.loadPayslips();
    return unsub;
  });

  $: employees = (state.employees ?? []).filter((e) => e.active);
  $: payslips = [...(state.payslips ?? [])].reverse();
  $: selected = employees.find((e) => e.id === employeeId);
  $: previewGross = parseFloat(grossOverride) || selected?.salary || 0;
  $: ssWorker = previewGross * (selected?.ssWorkerRate ?? 0.05);
  $: other = parseFloat(otherDeduct) || 0;
  $: previewNet = previewGross - ssWorker - other;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!employeeId) {
      formError = 'Seleccione un trabajador';
      return;
    }
    try {
      const gross = parseFloat(grossOverride);
      await store.addPayslip({
        employeeId,
        period: period || undefined,
        gross: Number.isFinite(gross) && gross > 0 ? gross : undefined,
        otherDeduct: parseFloat(otherDeduct) || 0,
      });
      formOk = 'Liquidación generada';
      grossOverride = '';
      otherDeduct = '0';
    } catch (err) {
      formError = err instanceof Error ? err.message : state.error || 'Error al liquidar';
    }
  }
</script>

<section class="liquidaciones" data-screen="liquidaciones">
  <header class="page-head">
    <div>
      <h1>Nómina / liquidaciones</h1>
      <p class="sub">
        El servidor aplica tasas de vacaciones y seguridad social del trabajador y calcula neto y costo
        entidad.
      </p>
    </div>
    <Button
      variant="secondary"
      on:click={() => {
        void store.loadEmployees();
        void store.loadPayslips();
      }}
      disabled={state.status === 'loading'}
    >
      Actualizar
    </Button>
  </header>

  {#if formOk}<p class="banner ok">{formOk}</p>{/if}
  {#if formError}<p class="banner err">{formError}</p>{/if}

  <div class="layout">
    <Card>
      <h2>Generar liquidación</h2>
      {#if employees.length === 0}
        <p class="muted">Registre trabajadores en <strong>Empleados</strong> primero.</p>
      {:else}
        <form class="form" on:submit={handleSubmit}>
          <div class="form-grid">
            <label class="field field-span">
              <span class="lbl">Trabajador <span class="req">*</span></span>
              <select bind:value={employeeId} disabled={state.saving}>
                <option value="">Seleccionar…</option>
                {#each employees as e (e.id)}
                  <option value={e.id}>{e.name} · {e.salary} {e.currency}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="lbl">Periodo</span>
              <input type="month" bind:value={period} disabled={state.saving} />
            </label>
            <label class="field">
              <span class="lbl">Salario bruto (opcional)</span>
              <input
                type="number"
                min="0"
                step="any"
                bind:value={grossOverride}
                placeholder={selected ? String(selected.salary) : 'Salario base'}
                disabled={state.saving}
              />
            </label>
            <label class="field">
              <span class="lbl">Otras deducciones</span>
              <input type="number" min="0" step="any" bind:value={otherDeduct} disabled={state.saving} />
            </label>
          </div>

          {#if selected}
            <div class="preview">
              <div><span>Bruto est.</span> <Money amount={previewGross} currency={selected.currency} /></div>
              <div><span>SS trabajador (~{(selected.ssWorkerRate * 100).toFixed(1)}%)</span> <Money amount={ssWorker} currency={selected.currency} /></div>
              <div class="net"><span>Neto estimado</span> <strong><Money amount={previewNet} currency={selected.currency} /></strong></div>
            </div>
          {/if}

          <div class="form-actions">
            <Button type="submit" disabled={state.saving || !employeeId}>
              {state.saving ? 'Procesando…' : 'Generar liquidación'}
            </Button>
          </div>
        </form>
      {/if}
    </Card>

    <Card>
      <h2>Historial ({payslips.length})</h2>
      {#if payslips.length === 0}
        <p class="muted">No hay liquidaciones procesadas.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Periodo</th>
                <th class="num">Bruto</th>
                <th class="num">Neto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each payslips as ps (ps.id)}
                <tr>
                  <td>{ps.employeeName}</td>
                  <td>{ps.period}</td>
                  <td class="num"><Money amount={ps.gross} currency={ps.currency} /></td>
                  <td class="num"><Money amount={ps.net} currency={ps.currency} /></td>
                  <td><span class="pill">{ps.status || '—'}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  </div>
</section>

<style>
  .liquidaciones { display: flex; flex-direction: column; gap: 14px; }
  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  h1 { margin: 0; font-size: 1.25rem; }
  h2 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .sub { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); max-width: 56ch; }
  .layout { display: grid; gap: 14px; }
  @media (min-width: 960px) { .layout { grid-template-columns: 1fr 1.1fr; align-items: start; } }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field-span { grid-column: 1 / -1; }
  .lbl { font-size: 0.68rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); }
  .req { color: var(--accent-red); }
  .field input, .field select {
    width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 12px;
    border: 1px solid var(--color-border); background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary); font-family: inherit; font-size: 0.88rem;
  }
  .preview {
    margin-top: 12px; padding: 12px; border-radius: 12px;
    background: color-mix(in srgb, var(--accent-cyan) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-cyan) 22%, transparent);
    display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem;
  }
  .preview div { display: flex; justify-content: space-between; gap: 8px; }
  .net { margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--color-border); }
  .form-actions { margin-top: 1rem; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--color-border); }
  td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { font-size: 0.68rem; font-weight: 650; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--accent-green) 16%, transparent); color: var(--accent-green); }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .banner { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
  .banner.err { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
  .banner.ok { background: color-mix(in srgb, var(--accent-green) 12%, transparent); color: var(--accent-green); }
</style>
