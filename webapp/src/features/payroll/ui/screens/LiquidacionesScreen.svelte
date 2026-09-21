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
  let employeeId = '';
  let periodStart = '';
  let periodEnd = '';
  let bonus = '0';
  let deductions = '0';

  onMount(() => {
    const unsub = store.subscribe(s => state = s);
    void store.loadEmployees();
    void store.loadPayslips();
    return unsub;
  });

  $: selectedEmployee = state.employees.find(e => e.id === employeeId);
  $: baseAmount = selectedEmployee?.salaryBase || 0;
  $: currency = selectedEmployee?.currency || 'CUP';
  $: totalNet = baseAmount + (parseFloat(bonus) || 0) - (parseFloat(deductions) || 0);

  async function handleSubmit() {
    if (!employeeId || !periodStart || !periodEnd) return;
    try {
      await store.addPayslip({
        employeeId,
        employeeName: `${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`,
        periodStart,
        periodEnd,
        baseAmount,
        bonus: parseFloat(bonus) || 0,
        deductions: parseFloat(deductions) || 0,
        totalNet,
        currency
      });
      showForm = false;
    } catch { /* handled in store */ }
  }
</script>

<Card>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h2 style="margin:0">Liquidaciones de Nómina</h2>
    <Button on:click={() => showForm = !showForm}>
      {showForm ? 'Cancelar' : '+ Nueva Liquidación'}
    </Button>
  </div>

  {#if showForm}
    <div class="form">
      <div class="field">
        <label class="lbl">Empleado</label>
        <select class="select-inp" bind:value={employeeId} disabled={state.saving}>
          <option value="">Seleccionar empleado...</option>
          {#each state.employees as emp}
            <option value={emp.id}>{emp.firstName} {emp.lastName} ({emp.position})</option>
          {/each}
        </select>
      </div>

      <div class="row">
        <Input label="Inicio Periodo" type="date" bind:value={periodStart} />
        <Input label="Fin Periodo" type="date" bind:value={periodEnd} />
      </div>

      <div class="row">
        <div class="field">
          <label class="lbl">Salario Base</label>
          <div class="readonly-val"><Money amount={baseAmount} {currency} /></div>
        </div>
        <Input label="Bonos / Extras" type="number" step="0.01" bind:value={bonus} />
        <Input label="Deducciones" type="number" step="0.01" bind:value={deductions} />
      </div>

      <div class="total-preview">
        <span>Neto a Pagar:</span>
        <span class="net-val"><Money amount={totalNet} {currency} /></span>
      </div>

      <Button on:click={handleSubmit} disabled={state.saving || !employeeId}>
        {state.saving ? 'Procesando...' : 'Generar Liquidación'}
      </Button>
    </div>
  {:else}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Empleado</th>
            <th>Periodo</th>
            <th style="text-align:right">Neto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#if state.payslips.length === 0}
            <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--ap-text-muted)">No hay liquidaciones procesadas</td></tr>
          {:else}
            {#each state.payslips as ps}
              <tr>
                <td>{ps.dateEmitted}</td>
                <td>{ps.employeeName}</td>
                <td style="font-size:0.8rem">{ps.periodStart} al {ps.periodEnd}</td>
                <td style="text-align:right; font-weight:600"><Money amount={ps.totalNet} currency={ps.currency} /></td>
                <td style="text-align:right">
                  <Button variant="ghost" size="sm">Ver</Button>
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
  .form { display: flex; flex-direction: column; gap: 8px; }
  .lbl { display: block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--ap-text-muted); margin-bottom: 6px; }
  .select-inp { width: 100%; padding: 12px; background: var(--ap-bg); border: 1px solid var(--ap-border); border-radius: 12px; }
  .readonly-val { padding: 12px; background: var(--color-surface-soft); border-radius: 8px; font-weight: 500; }
  .total-preview { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(97, 230, 225, 0.05); border-radius: 12px; margin: 12px 0; }
  .net-val { font-size: 1.25rem; font-weight: 700; color: var(--ap-primary); }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .data-table th { text-align: left; padding: 12px; border-bottom: 2px solid var(--ap-border); color: var(--ap-text-secondary); }
  .data-table td { padding: 12px; border-bottom: 1px solid var(--ap-border); }
</style>
