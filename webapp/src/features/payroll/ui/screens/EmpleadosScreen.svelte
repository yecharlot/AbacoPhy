<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';

  export let store: PayrollStore;

  let state: PayrollState = store.getState();
  let showForm = false;
  let name = '';
  let idNumber = '';
  let position = '';
  let salaryStr = '';
  let formError: string | null = null;
  let okMsg = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadEmployees();
    return unsub;
  });

  async function handleCreate() {
    formError = null;
    okMsg = '';
    try {
      await store.createEmployee({
        name,
        idNumber: idNumber || undefined,
        position: position || undefined,
        salary: Number(salaryStr.replace(',', '.')) || 0,
      });
      okMsg = 'Trabajador creado';
      name = '';
      idNumber = '';
      position = '';
      salaryStr = '';
      showForm = false;
      setTimeout(() => {
        okMsg = '';
      }, 2500);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error';
    }
  }
</script>

<Card>
  <div class="head">
    <h2 style="margin:0">Trabajadores</h2>
    <Button variant="secondary" on:click={() => (showForm = !showForm)}>
      {showForm ? 'Ver listado' : 'Nuevo'}
    </Button>
  </div>
  {#if okMsg}<p class="ok">{okMsg}</p>{/if}
  {#if state.error && !formError}<p class="err" role="alert">{state.error}</p>{/if}
</Card>

{#if showForm}
  <Card>
    <h3 style="margin-top:0">Alta</h3>
    <form on:submit|preventDefault={handleCreate}>
      <Input id="emp-name" label="Nombre" bind:value={name} disabled={state.saving} required />
      <Input id="emp-id" label="CI / Id." bind:value={idNumber} disabled={state.saving} />
      <Input id="emp-pos" label="Cargo" bind:value={position} disabled={state.saving} />
      <Input id="emp-sal" label="Salario base" bind:value={salaryStr} disabled={state.saving} required />
      {#if formError}<p class="err" role="alert">{formError}</p>{/if}
      <Button type="submit" disabled={state.saving}>{state.saving ? 'Guardando…' : 'Guardar'}</Button>
    </form>
  </Card>
{:else if state.employeesStatus === 'loading' && state.employees.length === 0}
  <Card><p class="muted">Cargando…</p></Card>
{:else if state.employees.length === 0}
  <Card><p class="muted">Sin trabajadores</p></Card>
{:else}
  <Card>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>CI</th>
            <th>Cargo</th>
            <th class="num">Salario</th>
          </tr>
        </thead>
        <tbody>
          {#each state.employees as e (e.id)}
            <tr>
              <td>{e.name}</td>
              <td>{e.idNumber || '—'}</td>
              <td>{e.position || '—'}</td>
              <td class="num"><Money amount={e.salary} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{/if}

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .err {
    color: var(--accent-red, var(--ap-danger));
    font-size: 0.88rem;
  }
  .ok {
    color: var(--accent-green, var(--ap-ok));
    font-size: 0.88rem;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.35rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  th {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .num {
    text-align: right;
  }
</style>
