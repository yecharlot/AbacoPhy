<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Money } from '../../../../infrastructure/ui/shared';
  import InvoiceForm from '../components/InvoiceForm.svelte';
  import type { InvoiceStore, InvoiceState } from '../stores/invoiceStore';

  export let store: InvoiceStore;

  let state: InvoiceState = store.getState();
  let formError: string | null = null;
  let okMsg = '';
  let showForm = false;

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.load();
    return unsub;
  });

  async function handleEmit(data: {
    clientName: string;
    clientTax: string;
    lines: { description: string; qty: number; unitPrice: number }[];
    tax: number;
  }) {
    formError = null;
    okMsg = '';
    try {
      await store.emitInvoice({
        clientName: data.clientName,
        clientTax: data.clientTax || undefined,
        lines: data.lines,
        tax: data.tax,
        status: 'issued',
      });
      okMsg = 'Factura emitida';
      showForm = false;
      setTimeout(() => {
        okMsg = '';
      }, 2500);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error';
    }
  }

  async function handlePdf(id: string) {
    try {
      await store.downloadPdf(id);
    } catch {
      /* error in state */
    }
  }
</script>

{#if state.status === 'loading' && state.invoices.length === 0 && !showForm}
  <Card><p class="muted">Cargando facturas…</p></Card>
{:else if state.status === 'error' && state.invoices.length === 0 && !showForm}
  <Card>
    <p class="err" role="alert">{state.error}</p>
    <Button variant="secondary" on:click={() => store.load()}>Reintentar</Button>
  </Card>
{:else}
  <Card>
    <div class="head">
      <h2 style="margin:0">Facturas</h2>
      <Button variant="secondary" on:click={() => (showForm = !showForm)}>
        {showForm ? 'Ver listado' : 'Nueva factura'}
      </Button>
    </div>
    {#if okMsg}
      <p class="ok">{okMsg}</p>
    {/if}
    {#if state.error && !formError}
      <p class="err" role="alert">{state.error}</p>
    {/if}
  </Card>

  {#if showForm}
    <Card>
      <h3 style="margin-top:0">Emitir</h3>
      <p class="muted">Al emitir (issued/paid) el backend publica el asiento de ingreso.</p>
      <InvoiceForm saving={state.saving} error={formError} onSubmit={handleEmit} />
    </Card>
  {:else if state.invoices.length === 0}
    <Card><p class="muted">Sin facturas</p></Card>
  {:else}
    <Card>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th class="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each state.invoices as inv (inv.id)}
              <tr>
                <td>{inv.number || inv.id.slice(0, 8)}</td>
                <td>{inv.clientName}</td>
                <td>{inv.issuedAt || '—'}</td>
                <td>{inv.status}</td>
                <td class="num"><Money amount={inv.total} /></td>
                <td>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={state.downloadingId === inv.id}
                    on:click={() => handlePdf(inv.id)}
                  >
                    {state.downloadingId === inv.id ? '…' : 'PDF'}
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
{/if}

<style>
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.9rem;
  }
  .err {
    color: var(--accent-red, var(--ap-danger));
  }
  .ok {
    color: var(--accent-green, var(--ap-ok));
    font-size: 0.88rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
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
