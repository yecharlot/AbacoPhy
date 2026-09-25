<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';
  import type { Employee } from '../../domain/entities/Employee';

  export let store: PayrollStore;
  /** Unidades de venta del negocio (opcional) para asociar al trabajador. */
  export let units: import('../../../warehouse/domain/entities/SalesUnit').SalesUnit[] = [];

  let state: PayrollState = store.getState();
  let editingId: string | null = null;
  let name = '';
  let ci = '';
  let role = '';
  let department = '';
  let hireDate = new Date().toISOString().slice(0, 10);
  let salary = '';
  let currency = 'CUP';
  let unitIds: string[] = [];
  let formError = '';
  let formOk = '';
  let showInactive = true;

  onMount(() => {
    const unsub = store.subscribe((s) => (state = s));
    void store.loadEmployees();
    return unsub;
  });

  $: all = state.employees ?? [];
  $: employees = showInactive ? all : all.filter((e) => e.active);
  $: hasEditApi = typeof store.editEmployee === 'function';
  $: hasDismissApi = typeof store.dismissEmployee === 'function';

  function reset() {
    editingId = null;
    name = '';
    ci = '';
    role = '';
    department = '';
    hireDate = new Date().toISOString().slice(0, 10);
    salary = '';
    currency = 'CUP';
    unitIds = [];
  }

  function startEdit(e: Employee) {
    editingId = e.id;
    name = e.name;
    ci = e.ci || '';
    role = e.role || '';
    department = e.department || '';
    hireDate = e.hireDate || new Date().toISOString().slice(0, 10);
    salary = String(e.salary ?? '');
    currency = e.currency || 'CUP';
    unitIds = [...(e.unitIds || [])];
    formError = '';
    formOk = '';
    // scroll form into view
    requestAnimationFrame(() => {
      document.querySelector('.empleados .form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
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
      if (editingId) {
        if (!hasEditApi) {
          formError =
            'La función de edición no está cableada (falta UpdateEmployee en el módulo DI). Aplique el zip completo.';
          return;
        }
        await store.editEmployee({
          id: editingId,
          name: name.trim(),
          ci: ci.trim() || undefined,
          role: role.trim() || undefined,
          department: department.trim() || undefined,
          hireDate: hireDate || undefined,
          salary: sal,
          currency,
          unitIds,
        });
        formOk = 'Trabajador actualizado · traza nomina.trabajador.edicion';
      } else {
        await store.addEmployee({
          name: name.trim(),
          ci: ci.trim() || undefined,
          role: role.trim() || undefined,
          department: department.trim() || undefined,
          hireDate: hireDate || undefined,
          salary: sal,
          currency,
          unitIds,
        });
        formOk = 'Trabajador registrado · traza nomina.trabajador.alta';
      }
      reset();
    } catch (err) {
      formError = err instanceof Error ? err.message : state.error || 'Error al guardar';
    }
  }

  async function handleDismiss(e: Employee) {
    if (!hasDismissApi) {
      formError =
        'La baja no está cableada (falta DeactivateEmployee en el módulo DI). Aplique el zip completo.';
      return;
    }
    if (!confirm(`¿Dar de baja a «${e.name}»?\nQuedará inactivo y se registrará en la traza de auditoría.`)) {
      return;
    }
    formError = '';
    formOk = '';
    try {
      await store.dismissEmployee(e.id);
      formOk = `Baja de ${e.name} · traza nomina.trabajador.baja`;
      if (editingId === e.id) reset();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error al dar de baja';
    }
  }

  async function handleReactivate(e: Employee) {
    if (!hasEditApi) {
      formError = 'No se puede reactivar: falta UpdateEmployee en el DI.';
      return;
    }
    formError = '';
    formOk = '';
    try {
      await store.editEmployee({
        id: e.id,
        name: e.name,
        salary: e.salary,
        active: true,
      });
      formOk = `${e.name} reactivado`;
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error al reactivar';
    }
  }
</script>

<section class="empleados" data-screen="empleados">
  <header class="page-head">
    <div>
      <h1>Empleados</h1>
      <p class="sub">
        Alta, <strong>edición de puesto/salario</strong> y <strong>baja</strong>. Cada acción se
        registra en la traza del servidor (<code>nomina.trabajador.*</code>).
      </p>
    </div>
    <Button variant="secondary" on:click={() => store.loadEmployees()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  {#if !hasEditApi || !hasDismissApi}
    <p class="banner warn" role="status">
      Módulo incompleto: falta cablear
      {#if !hasEditApi}<code>editEmployee</code>{/if}
      {#if !hasEditApi && !hasDismissApi} y {/if}
      {#if !hasDismissApi}<code>dismissEmployee</code>{/if}
      en el store/DI. Sustituya
      <code>payrollModule.ts</code>, <code>payrollStore.ts</code> y use cases del paquete de entrega.
    </p>
  {/if}

  {#if formOk}<p class="banner ok">{formOk}</p>{/if}
  {#if formError}<p class="banner err">{formError}</p>{/if}
  {#if state.error && !formError}<p class="banner err">{state.error}</p>{/if}

  <div class="layout">
    <Card>
      <div class="form-card">
        <h2>{editingId ? '✎ Editar trabajador' : '+ Nuevo trabajador'}</h2>
        {#if editingId}
          <p class="editing-hint">Modificando registro. Cambie puesto, salario u otros campos y guarde.</p>
        {/if}
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
              <span class="lbl">Cargo / puesto</span>
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
          {#if units.length > 0}
            <div class="field field-span">
              <span class="lbl">Puntos de venta donde puede operar</span>
              <div class="unit-checks">
                {#each units as u (u.id)}
                  <label class="chk">
                    <input type="checkbox" value={u.id} bind:group={unitIds} disabled={state.saving} />
                    {u.code ? `${u.code} · ` : ''}{u.name}
                  </label>
                {/each}
              </div>
            </div>
          {/if}
          <div class="form-actions">
            {#if editingId}
              <Button type="button" variant="secondary" on:click={reset} disabled={state.saving}>
                Cancelar edición
              </Button>
            {/if}
            <Button type="submit" disabled={state.saving}>
              {#if state.saving}
                Guardando…
              {:else if editingId}
                Guardar cambios
              {:else}
                Registrar trabajador
              {/if}
            </Button>
          </div>
        </form>
      </div>
    </Card>

    <Card>
      <div class="list-head">
        <h2>Listado ({employees.length})</h2>
        <label class="toggle">
          <input type="checkbox" bind:checked={showInactive} />
          Mostrar bajas
        </label>
      </div>
      {#if state.status === 'loading' && employees.length === 0}
        <p class="muted">Cargando…</p>
      {:else if employees.length === 0}
        <p class="muted">No hay trabajadores para mostrar.</p>
      {:else}
        <ul class="emp-list">
          {#each employees as e (e.id)}
            <li class="emp-item" class:inactive={!e.active}>
              <div class="emp-main">
                <div class="name">{e.name}</div>
                <div class="meta">
                  {e.role || 'Sin puesto'} · {e.department || 'Sin depto.'}
                  {#if e.ci} · CI {e.ci}{/if}
                </div>
                <div class="salary"><Money amount={e.salary} currency={e.currency} /></div>
                <span class="pill" class:off={!e.active}>{e.active ? 'Activo' : 'Baja'}</span>
              </div>
              <div class="emp-actions">
                {#if e.active}
                  <Button type="button" variant="secondary" on:click={() => startEdit(e)} disabled={state.saving}>
                    Editar
                  </Button>
                  <Button type="button" variant="secondary" on:click={() => handleDismiss(e)} disabled={state.saving}>
                    Despedir
                  </Button>
                {:else}
                  <Button type="button" variant="secondary" on:click={() => handleReactivate(e)} disabled={state.saving}>
                    Reactivar
                  </Button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>
  </div>
</section>

<style>
  .empleados { display: flex; flex-direction: column; gap: 14px; }
  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  h1 { margin: 0; font-size: 1.25rem; }
  h2 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  .sub { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); max-width: 56ch; }
  .sub code { font-size: 0.75rem; }
  .editing-hint {
    margin: -4px 0 12px;
    font-size: 0.8rem;
    color: var(--accent-cyan, #2dd4bf);
  }
  .layout { display: grid; gap: 14px; }
  @media (min-width: 960px) {
    .layout { grid-template-columns: 1fr 1.15fr; align-items: start; }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 16px;
  }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field-span { grid-column: 1 / -1; }
  .lbl {
    font-size: 0.68rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }
  .req { color: var(--accent-red, #f17b7b); }
  .field input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 0.88rem;
  }
  .form-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 1rem; }
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--color-text-secondary);
  }
  .emp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .emp-item {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft, transparent);
  }
  .emp-item.inactive { opacity: 0.65; }
  .name { font-weight: 650; color: var(--color-text-primary); font-size: 0.95rem; }
  .meta { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }
  .salary { margin-top: 6px; font-variant-numeric: tabular-nums; font-weight: 600; }
  .pill {
    display: inline-block;
    margin-top: 6px;
    font-size: 0.68rem;
    font-weight: 650;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-green, #34d399) 16%, transparent);
    color: var(--accent-green, #34d399);
  }
  .pill.off {
    background: color-mix(in srgb, var(--color-text-muted) 20%, transparent);
    color: var(--color-text-muted);
  }
  .emp-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .banner { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
  .banner.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
    color: var(--accent-red, #f17b7b);
  }
  .banner.ok {
    background: color-mix(in srgb, var(--accent-green, #34d399) 12%, transparent);
    color: var(--accent-green, #34d399);
  }
  .banner.warn {
    background: color-mix(in srgb, #f59e0b 14%, transparent);
    color: #fbbf24;
  }
  .banner code { font-size: 0.78rem; }
  .unit-checks { display: flex; flex-direction: column; gap: 6px; }
  .chk { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
