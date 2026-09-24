<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { InvoicingStore, InvoicingState } from '../stores/invoicingStore';

  export let store: InvoicingStore;

  type DraftLine = { description: string; qty: string; unitPrice: string };

  let state: InvoicingState = store.getState();
  let showForm = false;
  let clientName = '';
  let clientTax = '';
  let currency = 'CUP';
  let taxPct = '0';
  let lines: DraftLine[] = [{ description: '', qty: '1', unitPrice: '' }];
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s) => (state = s));
    void store.load();
    return unsub;
  });

  $: invoices = [...(state.invoices ?? [])].reverse();
  $: subtotal = lines.reduce(
    (acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0),
    0,
  );
  $: tax = subtotal * ((parseFloat(taxPct) || 0) / 100);
  $: total = subtotal + tax;

  function addLine() {
    lines = [...lines, { description: '', qty: '1', unitPrice: '' }];
  }
  function removeLine(i: number) {
    lines = lines.filter((_, idx) => idx !== i);
    if (lines.length === 0) addLine();
  }
  function resetForm() {
    clientName = '';
    clientTax = '';
    taxPct = '0';
    lines = [{ description: '', qty: '1', unitPrice: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!clientName.trim()) {
      formError = 'Indique el cliente / razón social';
      return;
    }
    const payload = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty: parseFloat(l.qty) || 0,
        unitPrice: parseFloat(l.unitPrice) || 0,
      }));
    if (payload.length === 0 || payload.some((l) => l.qty <= 0 || l.unitPrice < 0)) {
      formError = 'Añada líneas válidas (descripción, cantidad > 0)';
      return;
    }
    try {
      await store.emit({
        clientName: clientName.trim(),
        clientTax: clientTax.trim() || undefined,
        currency,
        tax,
        status: 'issued',
        lines: payload,
      });
      formOk = 'Factura emitida';
      showForm = false;
      resetForm();
    } catch (err) {
      formError = err instanceof Error ? err.message : state.error || 'Error al emitir';
    }
  }
</script>

<section class="facturas" data-screen="facturas">
  <header class="page-head">
    <div>
      <h1>Facturación</h1>
      <p class="sub">Emisión de facturas a clientes. El backend calcula importes y puede generar asiento.</p>
    </div>
    <div class="head-actions">
      <Button variant="secondary" on:click={() => store.load()} disabled={state.status === 'loading'}>
        Actualizar
      </Button>
      <Button on:click={() => (showForm = !showForm)}>
        {showForm ? 'Cancelar' : '+ Nueva factura'}
      </Button>
    </div>
  </header>

  {#if state.error && !formError}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}
  {#if formOk}<p class="banner ok" role="status">{formOk}</p>{/if}
  {#if formError}<p class="banner err" role="alert">{formError}</p>{/if}

  {#if showForm}
    <Card>
      <h2>Nueva factura</h2>
      <form class="form" on:submit={handleSubmit}>
        <div class="form-grid">
          <label class="field field-span">
            <span class="lbl">Cliente / razón social <span class="req">*</span></span>
            <input bind:value={clientName} placeholder="Nombre del cliente" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">ID fiscal / NIT</span>
            <input bind:value={clientTax} placeholder="Opcional" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Moneda</span>
            <input bind:value={currency} disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Impuesto %</span>
            <input type="number" min="0" step="any" bind:value={taxPct} disabled={state.saving} />
          </label>
        </div>

        <div class="lines-head">
          <h3>Líneas</h3>
          <Button type="button" variant="secondary" on:click={addLine}>+ Línea</Button>
        </div>
        {#each lines as line, i (i)}
          <div class="line-row">
            <label class="field grow">
              <span class="lbl">Descripción</span>
              <input bind:value={line.description} placeholder="Producto o servicio" disabled={state.saving} />
            </label>
            <label class="field narrow">
              <span class="lbl">Cant.</span>
              <input type="number" min="0" step="any" bind:value={line.qty} disabled={state.saving} />
            </label>
            <label class="field narrow">
              <span class="lbl">Precio</span>
              <input type="number" min="0" step="any" bind:value={line.unitPrice} disabled={state.saving} />
            </label>
            <button type="button" class="remove" on:click={() => removeLine(i)} disabled={lines.length <= 1}>×</button>
          </div>
        {/each}

        <div class="totals">
          <span>Subtotal: <Money amount={subtotal} {currency} /></span>
          <span>Impuesto: <Money amount={tax} {currency} /></span>
          <strong>Total: <Money amount={total} {currency} /></strong>
        </div>
        <div class="form-actions">
          <Button type="submit" disabled={state.saving}>
            {state.saving ? 'Emitiendo…' : 'Emitir factura'}
          </Button>
        </div>
      </form>
    </Card>
  {/if}

  <Card>
    <h2>Historial ({invoices.length})</h2>
    {#if state.status === 'loading' && invoices.length === 0}
      <p class="muted">Cargando…</p>
    {:else if invoices.length === 0}
      <p class="muted">No hay facturas emitidas.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th class="num">Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each invoices as inv (inv.id)}
              <tr>
                <td class="mono">{inv.number}</td>
                <td>{inv.clientName}</td>
                <td class="num"><Money amount={inv.total} currency={inv.currency} /></td>
                <td><span class="pill">{inv.status}</span></td>
                <td>
                  <button
                    type="button"
                    class="link"
                    on:click={() => store.downloadPdf(inv.id, inv.number)}
                  >
                    PDF
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .facturas { display: flex; flex-direction: column; gap: 14px; }
  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  .head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 1.25rem; }
  h2 { margin: 0 0 0.75rem; font-size: 0.95rem; }
  h3 { margin: 0; font-size: 0.85rem; }
  .sub { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted, var(--ap-text-muted)); }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field-span { grid-column: 1 / -1; }
  .lbl { font-size: 0.68rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); }
  .req { color: var(--accent-red, #f17b7b); }
  .field input, .line-row input {
    width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 12px;
    border: 1px solid var(--color-border); background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary); font-family: inherit; font-size: 0.88rem;
  }
  .lines-head { display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem; }
  .line-row { display: grid; grid-template-columns: 1fr 80px 100px 32px; gap: 8px; align-items: end; margin-bottom: 8px; }
  .remove { height: 36px; border-radius: 10px; border: 1px solid var(--color-border); background: transparent; cursor: pointer; }
  .totals { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0; font-size: 0.9rem; }
  .form-actions { margin-top: 8px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--color-border); }
  td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
  .pill { font-size: 0.68rem; font-weight: 650; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--accent-cyan) 16%, transparent); color: var(--accent-cyan); }
  .link { border: none; background: none; color: var(--accent-cyan); font-weight: 600; cursor: pointer; font-family: inherit; }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .banner { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
  .banner.err { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
  .banner.ok { background: color-mix(in srgb, var(--accent-green) 12%, transparent); color: var(--accent-green); }
</style>
