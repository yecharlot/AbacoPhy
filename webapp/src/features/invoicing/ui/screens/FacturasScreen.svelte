<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { InvoicingStore, InvoicingState } from '../stores/invoicingStore';
  import type { InvoiceLine } from '../../domain/entities/InvoiceLine';

  export let store: InvoicingStore;

  let state: InvoicingState = {
    status: 'idle',
    invoices: [],
    error: null,
    saving: false
  };

  let showForm = false;
  let customerName = '';
  let customerId = '';
  let currency = 'CUP';
  let lines: InvoiceLine[] = [];

  // Line form
  let prodId = '';
  let prodName = '';
  let qty = '1';
  let price = '0';

  onMount(() => {
    const unsub = store.subscribe(s => state = s);
    void store.load();
    return unsub;
  });

  function addLine() {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price) || 0;
    if (!prodName || q <= 0 || p <= 0) return;
    lines = [...lines, {
      productId: prodId || 'custom',
      productName: prodName,
      quantity: q,
      price: p,
      total: q * p
    }];
    prodId = '';
    prodName = '';
    qty = '1';
    price = '0';
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
  }

  $: subtotal = lines.reduce((acc, l) => acc + l.total, 0);
  $: tax = subtotal * 0.10; // 10% tax example
  $: total = subtotal + tax;

  async function handleSubmit() {
    if (!customerName || lines.length === 0) return;
    try {
      await store.emit({
        date: new Date().toISOString().split('T')[0],
        customerId,
        customerName,
        lines,
        subtotal,
        tax,
        total,
        currency
      });
      showForm = false;
      customerName = '';
      lines = [];
    } catch { /* handled in store */ }
  }
</script>

<Card>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h2 style="margin:0">Facturación</h2>
    <Button on:click={() => showForm = !showForm}>
      {showForm ? 'Cancelar' : '+ Nueva Factura'}
    </Button>
  </div>

  {#if showForm}
    <div class="invoice-form">
      <div class="row">
        <Input label="Cliente / Razón Social" bind:value={customerName} required />
        <Input label="ID Fiscal (opcional)" bind:value={customerId} />
      </div>

      <div class="lines-editor">
        <h4>Líneas de Detalle</h4>
        <div class="line-form">
          <Input label="Producto/Servicio" bind:value={prodName} />
          <Input label="Cant." type="number" bind:value={qty} />
          <Input label="Precio" type="number" step="0.01" bind:value={price} />
          <Button variant="secondary" on:click={addLine}>Añadir</Button>
        </div>

        <table class="lines-table">
          <thead>
            <tr>
              <th>Detalle</th>
              <th style="text-align:right">Cant.</th>
              <th style="text-align:right">Precio</th>
              <th style="text-align:right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each lines as line, i}
              <tr>
                <td>{line.productName}</td>
                <td style="text-align:right">{line.quantity}</td>
                <td style="text-align:right"><Money amount={line.price} {currency} /></td>
                <td style="text-align:right"><Money amount={line.total} {currency} /></td>
                <td style="text-align:center">
                  <button class="btn-del" on:click={() => removeLine(i)}>×</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Subtotal:</span> <Money amount={subtotal} {currency} /></div>
          <div class="total-row"><span>Impuestos (10%):</span> <Money amount={tax} {currency} /></div>
          <div class="total-row grand-total"><span>Total:</span> <Money amount={total} {currency} /></div>
        </div>
      </div>

      <div style="margin-top:20px; display:flex; gap:8px;">
        <Button on:click={handleSubmit} disabled={state.saving || lines.length === 0}>
          {state.saving ? 'Emitiendo...' : 'Emitir Factura'}
        </Button>
      </div>
    </div>
  {:else}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th style="text-align:right">Total</th>
            <th style="text-align:center">Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#if state.invoices.length === 0}
            <tr><td colspan="6" style="text-align:center; padding:20px; color:var(--ap-text-muted)">No hay facturas registradas</td></tr>
          {:else}
            {#each state.invoices as inv}
              <tr>
                <td><code>{inv.number}</code></td>
                <td>{inv.date}</td>
                <td>{inv.customerName}</td>
                <td style="text-align:right"><Money amount={inv.total} currency={inv.currency} /></td>
                <td style="text-align:center">
                  <span class="badge status-{inv.status}">{inv.status}</span>
                </td>
                <td style="text-align:right">
                  <Button variant="ghost" size="sm" on:click={() => store.downloadPdf(inv.id, inv.number)}>
                    PDF
                  </Button>
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
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .line-form { display: grid; grid-template-columns: 2fr 0.5fr 1fr auto; gap: 8px; align-items: end; margin-bottom: 12px; }
  .lines-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem; }
  .lines-table th { text-align: left; border-bottom: 1px solid var(--ap-border); padding: 8px; }
  .lines-table td { padding: 8px; border-bottom: 1px solid var(--ap-border); }
  .btn-del { border: 0; background: 0; color: var(--ap-danger); font-size: 1.2rem; cursor: pointer; }

  .totals { margin-top: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .total-row { display: flex; gap: 20px; font-size: 0.9rem; }
  .grand-total { font-weight: 700; font-size: 1.1rem; color: var(--ap-primary); margin-top: 8px; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .data-table th { text-align: left; padding: 12px; border-bottom: 2px solid var(--ap-border); color: var(--ap-text-secondary); }
  .data-table td { padding: 12px; border-bottom: 1px solid var(--ap-border); }

  .badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600; }
  .status-emitted { background: rgba(97, 230, 225, 0.1); color: #0d9488; }
  .status-paid { background: rgba(76, 175, 80, 0.1); color: #2e7d32; }
</style>
