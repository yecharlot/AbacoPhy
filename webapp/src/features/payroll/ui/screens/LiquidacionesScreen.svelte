<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { PayrollStore, PayrollState } from '../stores/payrollStore';

  export let store: PayrollStore;

  let state: PayrollState = store.getState();
  let showForm = false;
  let employeeId = '';
  let period = '';
  let grossStr = '';
  let deductionsStr = '0';
  let formError: string | null = null;
  let okMsg = '';
  let pdfPeriod = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadEmployees();
    void store.loadPayslips();
    const now = new Date();
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    pdfPeriod = period;
    return unsub;
  });

  async function handleCreate() {
    formError = null;
    okMsg = '';
    try {
      await store.createPayslip({
        employeeId,
        period,
        gross: Number(grossStr.replace(',', '.')) || 0,
        deductions: Number(deductionsStr.replace(',', '.')) || 0,
        status: 'paid',
      });
      okMsg = 'Liquidación registrada';
      showForm = false;
      grossStr = '';
      deductionsStr = '0';
      setTimeout(() => {
        okMsg = '';
      }, 2500);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error';
    }
  }

  async function handlePdf() {
    try {
      await store.downloadPdf(pdfPeriod || 'all');
    } catch {
      /* in state */
    }
  }
</script>

<Card>
  <div class="head">
    <h2 style="margin:0">Liquidaciones</h2>
    <div class="actions">
      <Button variant="secondary" on:click={() => (showForm = !showForm)}>
        {showForm ? 'Ver listado' : 'Nueva'}
      </Button>
    </div>
  </div>
  <p class="muted">Las tasas / deducciones legales las aplica o valida el backend según configuración del negocio.</p>
  {#if okMsg}<p class="ok">{okMsg}</p>{/if}
  {#if state.error && !formError}<p class="err" role="alert">{state.error}</p>{/if}

  <div class="pdf-row">
    <Input id="pdf-period" label="Periodo PDF" bind:value={pdfPeriod} placeholder="YYYY-MM o all" disabled={state.downloading} />
    <Button variant="secondary" disabled={state.downloading} on:click={handlePdf}>
      {state.downloading ? 'Descargando…' : 'PDF nómina'}
    </Button>
  </div>
</Card>

{#if showForm}
  <Card>
    <h3 style="margin-top:0">Nueva liquidación</h3>
    <form on:submit|preventDefault={handleCreate}>
      <label class="lbl" for="pay-emp">Trabajador</label>
      <select id="pay-emp" class="sel" bind:value={employeeId} disabled={state.saving} required>
        <option value="">— seleccionar —</option>
        {#each state.employees as e (e.id)}
          <option value={e.id}>{e.name}</option>
        {/each}
      </select>
      <Input id="pay-period" label="Periodo (YYYY-MM)" bind:value={period} disabled={state.saving} required />
      <Input id="pay-gross" label="Bruto" bind:value={grossStr} disabled={state.saving} required />
      <Input id="pay-ded" label="Deducciones" bind:value={deductionsStr} disabled={state.saving} />
      {#if formError}<p class="err" role="alert">{formError}</p>{/if}
      <Button type="submit" disabled={state.saving}>{state.saving ? 'Guardando…' : 'Registrar'}</Button>
    </form>
  </Card>
{:else if state.payslipsStatus === 'loading' && state.payslips.length === 0}
  <Card><p class="muted">Cargando…</p></Card>
{:else if state.payslips.length === 0}
  <Card><p class="muted">Sin liquidaciones</p></Card>
{:else}
  <Card>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Trabajador</th>
            <th class="num">Bruto</th>
            <th class="num">Deduc.</th>
            <th class="num">Neto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {#each state.payslips as p (p.id)}
            <tr>
              <td>{p.period}</td>
              <td>{p.employeeName || p.employeeId.slice(0, 8)}</td>
              <td class="num"><Money amount={p.gross} /></td>
              <td class="num"><Money amount={p.deductions} /></td>
              <td class="num"><Money amount={p.net} /></td>
              <td>{p.status}</td>
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
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.88rem;
  }
  .err {
    color: var(--accent-red, var(--ap-danger));
    font-size: 0.88rem;
  }
  .ok {
    color: var(--accent-green, var(--ap-ok));
    font-size: 0.88rem;
  }
  .pdf-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    margin-bottom: 5px;
  }
  .sel {
    width: 100%;
    padding: 11px 13px;
    margin-bottom: 0.75rem;
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: 12px;
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.92rem;
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
