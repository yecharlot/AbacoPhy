<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';

  export let store: PayrollStore;

  let state: PayrollState = store.getState();
  let name = '';
  let ci = '';
  let role = '';
  let department = '';
  let hireDate = new Date().toISOString().slice(0, 10);
  let salary = '';
  let currency = 'CUP';
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s) => (state = s));
    void store.loadEmployees();
    return unsub;
  });

  $: employees = state.employees ?? [];

  function reset() {
    name = '';
    ci = '';
    role = '';
    department = '';
    hireDate = new Date().toISOString().slice(0, 10);
    salary = '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!name.trim()) {
      formError = 'El nombre del trabajador es obligatorio';
      return;
    }
    const sal = parseFloat(salary);
    if (!Number.isFinite(sal) || sal < 0) {
      formError = 'Indique un salario válido';
      return;
    }
    try {
      await store.addEmployee({
        name: name.trim(),
        ci: ci.trim() || undefined,
        role: role.trim() || undefined,
        department: department.trim() || undefined,
        hireDate: hireDate || undefined,
        salary: sal,
        currency,
      });
      formOk = 'Trabajador registrado';
      reset();
    } catch (err) {
      formError = err instanceof Error ? err.message : state.error || 'Error al registrar';
    }
  }
</script>

<section class="empleados" data-screen="empleados">
  <header class="page-head">
    <div>
      <h1>Empleados</h1>
      <p class="sub">Trabajadores del negocio. Tasas SS/vacaciones por defecto según normativa (ajustables en backend).</p>
    </div>
    <Button variant="secondary" on:click={() => store.loadEmployees()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  {#if formOk}<p class="banner ok">{formOk}</p>{/if}
  {#if formError}<p class="banner err">{formError}</p>{/if}
  {#if state.error && !formError}<p class="banner err">{state.error}</p>{/if}

  <div class="layout">
    <Card>
      <h2>Nuevo trabajador</h2>
      <form class="form" on:submit={handleSubmit}>
        <div class="form-grid">
          <label class="field field-span">
            <span class="lbl">Nombre completo <span class="req">*</span></span>
            <input bind:value={name} placeholder="Nombre y apellidos" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">CI</span>
            <input bind:value={ci} placeholder="Carné de identidad" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Cargo / rol</span>
            <input bind:value={role} placeholder="Ej. Vendedor" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Departamento</span>
            <input bind:value={department} placeholder="Opcional" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Fecha de alta</span>
            <input type="date" bind:value={hireDate} disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Salario base <span class="req">*</span></span>
            <input type="number" min="0" step="any" bind:value={salary} placeholder="0.00" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Moneda</span>
            <input bind:value={currency} disabled={state.saving} />
          </label>
        </div>
        <div class="form-actions">
          <Button type="submit" disabled={state.saving}>
            {state.saving ? 'Guardando…' : 'Registrar trabajador'}
          </Button>
        </div>
      </form>
    </Card>

    <Card>
      <h2>Listado ({employees.length})</h2>
      {#if state.status === 'loading' && employees.length === 0}
        <p class="muted">Cargando…</p>
      {:else if employees.length === 0}
        <p class="muted">No hay trabajadores registrados.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CI</th>
                <th>Cargo</th>
                <th class="num">Salario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each employees as e (e.id)}
                <tr>
                  <td>{e.name}</td>
                  <td class="mono">{e.ci || '—'}</td>
                  <td>{e.role || '—'}</td>
                  <td class="num"><Money amount={e.salary} currency={e.currency} /></td>
                  <td><span class="pill" class:off={!e.active}>{e.active ? 'Activo' : 'Baja'}</span></td>
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
  .empleados { display: flex; flex-direction: column; gap: 14px; }
  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  h1 { margin: 0; font-size: 1.25rem; }
  h2 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .sub { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); max-width: 52ch; }
  .layout { display: grid; gap: 14px; }
  @media (min-width: 960px) { .layout { grid-template-columns: 1fr 1.1fr; align-items: start; } }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field-span { grid-column: 1 / -1; }
  .lbl { font-size: 0.68rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); }
  .req { color: var(--accent-red); }
  .field input {
    width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 12px;
    border: 1px solid var(--color-border); background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary); font-family: inherit; font-size: 0.88rem;
  }
  .form-actions { margin-top: 1rem; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--color-border); }
  td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
  .pill { font-size: 0.68rem; font-weight: 650; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--accent-green) 16%, transparent); color: var(--accent-green); }
  .pill.off { background: color-mix(in srgb, var(--color-text-muted) 20%, transparent); color: var(--color-text-muted); }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .banner { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
  .banner.err { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
  .banner.ok { background: color-mix(in srgb, var(--accent-green) 12%, transparent); color: var(--accent-green); }
</style>
