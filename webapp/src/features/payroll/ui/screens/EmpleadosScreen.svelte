<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';

  export let store: PayrollStore;

  let state: PayrollState = {
    status: 'idle',
    employees: [],
    payslips: [],
    error: null,
    saving: false
  };

  let showForm = false;
  let code = '';
  let firstName = '';
  let lastName = '';
  let identityCard = '';
  let position = '';
  let salaryBase = '';
  let currency = 'CUP';
  let hiringDate = new Date().toISOString().split('T')[0];

  onMount(() => {
    const unsub = store.subscribe(s => state = s);
    void store.loadEmployees();
    return unsub;
  });

  async function handleSubmit() {
    if (!firstName || !lastName || !identityCard) return;
    try {
      await store.addEmployee({
        code,
        firstName,
        lastName,
        identityCard,
        position,
        salaryBase: parseFloat(salaryBase) || 0,
        currency,
        hiringDate
      });
      showForm = false;
      // Reset form
      code = ''; firstName = ''; lastName = ''; identityCard = ''; position = ''; salaryBase = '';
    } catch { /* handled in store */ }
  }
</script>

<Card>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h2 style="margin:0">Empleados</h2>
    <Button on:click={() => showForm = !showForm}>
      {showForm ? 'Cancelar' : '+ Nuevo Empleado'}
    </Button>
  </div>

  {#if showForm}
    <div class="form">
      <div class="row">
        <Input label="Código / Ficha" bind:value={code} />
        <Input label="Carné de Identidad" bind:value={identityCard} required />
      </div>
      <div class="row">
        <Input label="Nombre(s)" bind:value={firstName} required />
        <Input label="Apellidos" bind:value={lastName} required />
      </div>
      <div class="row">
        <Input label="Cargo / Puesto" bind:value={position} />
        <Input label="Fecha Contratación" type="date" bind:value={hiringDate} />
      </div>
      <div class="row">
        <Input label="Salario Base" type="number" step="0.01" bind:value={salaryBase} />
        <Input label="Moneda" bind:value={currency} />
      </div>
      <Button on:click={handleSubmit} disabled={state.saving}>
        {state.saving ? 'Guardando...' : 'Registrar Empleado'}
      </Button>
    </div>
  {:else}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>CI</th>
            <th>Cargo</th>
            <th style="text-align:right">Salario Base</th>
            <th style="text-align:center">Estado</th>
          </tr>
        </thead>
        <tbody>
          {#if state.employees.length === 0}
            <tr><td colspan="6" style="text-align:center; padding:20px; color:var(--ap-text-muted)">No hay empleados registrados</td></tr>
          {:else}
            {#each state.employees as emp}
              <tr>
                <td><code>{emp.code}</code></td>
                <td>{emp.firstName} {emp.lastName}</td>
                <td>{emp.identityCard}</td>
                <td>{emp.position}</td>
                <td style="text-align:right"><Money amount={emp.salaryBase} currency={emp.currency} /></td>
                <td style="text-align:center">
                  <span class="badge" class:active={emp.active}>{emp.active ? 'Activo' : 'Baja'}</span>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
  .form { display: flex; flex-direction: column; gap: 4px; }
  .table-container { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .data-table th { text-align: left; padding: 12px; border-bottom: 2px solid var(--ap-border); color: var(--ap-text-secondary); }
  .data-table td { padding: 12px; border-bottom: 1px solid var(--ap-border); }
  .badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; background: var(--ap-text-muted); color: white; }
  .badge.active { background: var(--ap-ok); }
</style>
