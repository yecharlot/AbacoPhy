<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';
  import {
    getReceptionVisualStatus,
    type CreateReceptionLineInput,
  } from '../../domain/entities/Reception';

  export let store: WarehouseStore;
  /**
   * Usuarios sugeridos para «Quién recibe» (roles master, admin, económico, almacenero).
   * Proviene del listado de usuarios del negocio; el padre filtra por rol.
   */
  export let receiverCandidates: Array<{ name: string; role: string }> = [];

  type DraftLine = {
    productId: string;
    qty: string;
    unitCost: string;
  };

  let state: WarehouseState = store.getState();

  let supplier = '';
  let docRef = '';
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let hasInvoice = true;
  let invoiceRef = '';
  let receiver = '';
  let lines: DraftLine[] = [{ productId: '', qty: '', unitCost: '' }];
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: products = state.products ?? [];
  $: receiverNames = (receiverCandidates ?? [])
    .map((c) => (c.name || '').trim())
    .filter(Boolean);
  $: receiverDatalistId = 'reception-receiver-suggestions';

  $: stockRows = state.rows ?? [];
  $: receptions = [...(state.receptions ?? [])].reverse();
  $: problemReceptions = receptions.filter(
          (r) => getReceptionVisualStatus(r) === 'entry_problem',
  );
  $: estimated = lines.reduce(
    (acc, line) => acc + (parseFloat(line.qty) || 0) * (parseFloat(line.unitCost) || 0),
    0,
  );

  function productLabel(id: string): string {
    const p = products.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function onProductChange(index: number, productId: string) {
    const next = [...lines];
    // Sugerencia: promedio ponderado actual del stock (no costo de nomenclador).
    // El valor que confirme el usuario en esta recepción es el que alimenta el nuevo promedio.
    const stock = stockRows.find((r) => r.productId === productId);
    const suggested =
      stock && Number(stock.avgCost) > 0 ? String(stock.avgCost) : next[index].unitCost;
    next[index] = {
      ...next[index],
      productId,
      unitCost: next[index].unitCost || suggested || '',
    };
    lines = next;
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '', unitCost: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    supplier = '';
    docRef = '';
    note = '';
    date = new Date().toISOString().slice(0, 10);
    hasInvoice = true;
    invoiceRef = '';
    receiver = '';
    lines = [{ productId: '', qty: '', unitCost: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (products.length === 0) {
      formError = 'No hay productos. Cree al menos uno en el Nomenclador de productos.';
      return;
    }
    if (!receiver.trim()) {
      formError = 'Indique quién recibe la mercancía';
      return;
    }
    if (hasInvoice) {
      const ref = (invoiceRef || docRef).trim();
      if (!ref) {
        formError = 'Compra con factura: indique el número de factura';
        return;
      }
      if (!supplier.trim()) {
        formError = 'Compra con factura: indique el proveedor';
        return;
      }
    }

    const payload: CreateReceptionLineInput[] = [];
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = parseFloat(line.qty);
      const unitCostRaw = String(line.unitCost ?? '').trim();
      if (!unitCostRaw) {
        formError =
          'Indique el costo unitario documental de cada línea. El costo promedio solo cambia cuando Almacén confirma la entrada.';
        return;
      }
      const unitCost = parseFloat(unitCostRaw);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        formError = 'El costo unitario de la recepción no puede ser negativo';
        return;
      }
      // unitCost de la línea → backend recalcula avg_cost del producto
      payload.push({ productId: line.productId, qty, unitCost });
    }

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto con cantidad y costo unitario';
      return;
    }

    try {
      await store.addReception({
        hasInvoice,
        invoiceRef: invoiceRef.trim() || docRef.trim() || undefined,
        supplier: supplier.trim() || undefined,
        receiver: receiver.trim(),
        docRef: docRef.trim() || undefined,
        note: note.trim() || undefined,
        date: date || undefined,
        lines: payload,
      });
      formOk = `Informe registrado · pendiente de entrada física · total documental ${estimated.toFixed(2)}`;
      resetForm();
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo confirmar la recepción';
    }
  }
</script>

<section class="recepcion" data-screen="recepcion">
  <DevSeedPanel
    title="Seed recepciones / transferencias (DEV)"
    description="Requiere productos. ensureUnit + receptions + transfers."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />

  <header class="page-head">
    <div>
      <h1>Informes de recepción</h1>
      <p class="sub">
        Registre la compra documental. Este informe no modifica stock ni costo promedio; Almacén debe verificar físicamente y dar entrada.
      </p>
    </div>
    <Button variant="secondary" on:click={() => store.loadAll()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  {#if state.status === 'error' && state.error}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}
  {#if formOk}
    <p class="banner ok" role="status">{formOk}</p>
  {/if}
  {#if formError}
    <p class="banner err" role="alert">{formError}</p>
  {/if}

  {#if problemReceptions.length > 0}
    <Card>
      <h2>Entradas con problemas ({problemReceptions.length})</h2>
      <div class="problem-list">
        {#each problemReceptions as r (r.id)}
          <article class="problem-item">
            <div>
              <strong>{r.number}</strong>
              <span class="muted-inline"> · {r.supplier || 'Sin proveedor'}</span>
            </div>
            <p>{r.metadataState?.problemReason || r.note || 'El almacén reportó un problema sin detalle.'}</p>
          </article>
        {/each}
      </div>
    </Card>
  {/if}

  <div class="layout">
    <Card>
      <h2>Nueva recepción</h2>

      {#if products.length === 0}
        <p class="muted">
          No hay productos en el nomenclador. Vaya a <strong>Nomenclador</strong> y cree al menos uno
          antes de recepcionar.
        </p>
      {:else}
        <form class="form" on:submit={handleSubmit}>
          <div class="form-grid">
            <label class="field">
              <span class="lbl">Fecha</span>
              <input type="date" bind:value={date} disabled={state.saving} />
            </label>
            <label class="field">
              <span class="lbl">Quién recibe <span class="req">*</span></span>
              <input
                bind:value={receiver}
                list={receiverDatalistId}
                placeholder={receiverNames.length
                  ? 'Escriba o elija un usuario…'
                  : 'Nombre del receptor'}
                autocomplete="off"
                disabled={state.saving}
              />
              <datalist id={receiverDatalistId}>
                {#each receiverCandidates as c (c.name + c.role)}
                  <option value={c.name}>{c.role}</option>
                {/each}
              </datalist>
              {#if receiverNames.length}
                <p class="field-hint">Sugerencias: master, admin, económico, almacenero</p>
              {/if}
            </label>
            <label class="field check">
              <span class="lbl">¿Con factura?</span>
              <label class="check-row">
                <input type="checkbox" bind:checked={hasInvoice} disabled={state.saving} />
                <span>Compra con factura de proveedor</span>
              </label>
            </label>
            {#if hasInvoice}
              <label class="field">
                <span class="lbl">Nº factura <span class="req">*</span></span>
                <input bind:value={invoiceRef} placeholder="Número de factura" disabled={state.saving} />
              </label>
              <label class="field">
                <span class="lbl">Proveedor <span class="req">*</span></span>
                <input bind:value={supplier} placeholder="Nombre del proveedor" disabled={state.saving} />
              </label>
            {:else}
              <label class="field">
                <span class="lbl">Proveedor</span>
                <input bind:value={supplier} placeholder="Opcional" disabled={state.saving} />
              </label>
              <label class="field">
                <span class="lbl">Documento ref.</span>
                <input bind:value={docRef} placeholder="Guía / remisión" disabled={state.saving} />
              </label>
            {/if}
            <label class="field field-span">
              <span class="lbl">Nota</span>
              <input bind:value={note} placeholder="Opcional" disabled={state.saving} />
            </label>
          </div>

          <div class="lines-head">
            <h3>Líneas</h3>
            <Button type="button" variant="secondary" on:click={addLine}>+ Línea</Button>
          </div>

          <div class="lines">
            {#each lines as line, i (i)}
              <div class="line-row">
                <label class="field grow">
                  <span class="lbl">Producto</span>
                  <select
                    value={line.productId}
                    on:change={(e) => onProductChange(i, e.currentTarget.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {#each products as p (p.id)}
                      <option value={p.id}>{p.code || '—'} · {p.name}</option>
                    {/each}
                  </select>
                </label>
                <label class="field">
                  <span class="lbl">Cantidad</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.qty}
                    placeholder="0"
                  />
                </label>
                <label class="field">
                  <span class="lbl">Costo unitario</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.unitCost}
                    placeholder="Según factura"
                    title="Costo unitario de esta recepción. Determina el nuevo promedio ponderado del producto."
                    required
                  />
                </label>
                <button
                  type="button"
                  class="remove"
                  title="Quitar línea"
                  on:click={() => removeLine(i)}
                  disabled={lines.length <= 1}
                >
                  ×
                </button>
              </div>
            {/each}
          </div>

          <div class="footer-bar">
            <p class="estimate">
              Total estimado: <strong><Money amount={estimated} /></strong>
            </p>
            <div class="actions">
              <Button type="button" variant="secondary" on:click={resetForm}>Limpiar</Button>
              <Button type="submit" disabled={state.saving || products.length === 0}>
                {state.saving ? 'Confirmando…' : 'Confirmar recepción'}
              </Button>
            </div>
          </div>
        </form>
      {/if}
    </Card>

    <Card>
      <h2>Historial ({receptions.length})</h2>
      {#if state.status === 'loading' && receptions.length === 0}
        <p class="muted">Cargando recepciones…</p>
      {:else if receptions.length === 0}
        <p class="muted">Aún no hay informes de recepción confirmados.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Líneas</th>
                <th class="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each receptions as r (r.id)}
                {@const visual = getReceptionVisualStatus(r)}
                <tr>
                  <td class="mono">{r.number}</td>
                  <td>{r.date}</td>
                  <td>
                    {r.supplier || '—'}
                    {#if r.receiver}<div class="muted-inline">Recibe: {r.receiver}</div>{/if}
                  </td>
                  <td>
                    <span class="muted-inline">{r.lines?.length ?? 0}</span>
                    {#if r.lines?.length}
                      <details class="detail">
                        <summary>ver</summary>
                        <ul>
                          {#each r.lines as ln, j (j)}
                            <li>
                              {ln.productName || productLabel(ln.productId)} · {ln.qty} ×
                              <Money amount={ln.unitCost} />
                            </li>
                          {/each}
                        </ul>
                      </details>
                    {/if}
                  </td>
                  <td class="num"><Money amount={r.totalCost} currency={r.currency} /></td>
                  <td>
                    <span class:pending={visual === 'pending_entry'} class:confirmed={visual === 'entry_confirmed'} class:problem={visual === 'entry_problem'} class:cancelled={visual === 'cancelled'} class="status-pill">
                        {visual === 'pending_entry'
                                ? 'Pendiente dar entrada'
                                : visual === 'entry_confirmed'
                                        ? 'Entrada confirmada'
                                        : visual === 'entry_problem'
                                                ? 'Problema con la entrada'
                                                : 'Recepción anulada'}
                      </span>
                    </td>
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
  .recepcion {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .status-pill.cancelled { background: color-mix(in srgb, var(--ap-text-muted) 14%, transparent); color: var(--ap-text-muted); }
  .page-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
  }
  h3 {
    margin: 0;
    font-size: 0.85rem;
  }
  .sub {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--color-text-muted, var(--ap-text-muted));
    max-width: 52ch;
  }
  .layout {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: 1.15fr 1fr;
      align-items: start;
    }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 16px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .field-span { grid-column: 1 / -1; }
  .lbl {
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .req { color: var(--accent-red, #f17b7b); }
  .field input, .check-row {
    font-family: inherit;
  }
  .field input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary, var(--ap-text));
    font-size: 0.88rem;
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
  .lines-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 1rem 0 0.5rem;
  }
  .lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .line-row {
    display: grid;
    grid-template-columns: 1fr 100px 110px 32px;
    gap: 8px;
    align-items: end;
  }
  @media (max-width: 640px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
    .remove {
      grid-column: 2;
      justify-self: end;
    }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .field.grow {
    min-width: 0;
  }
  .lbl {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  select,
  .line-row input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, transparent);
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.85rem;
  }
  .remove {
    width: 32px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: transparent;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    line-height: 1;
  }
  .remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .footer-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, var(--ap-border));
  }
  .estimate {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th {
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    color: var(--color-text-secondary, var(--ap-text-secondary));
    vertical-align: top;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }
   .status-pill {
    display: inline-flex;
    align-items: center;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .status-pill.pending { background: color-mix(in srgb, #f59e0b 16%, transparent); color: #b45309; }
  .status-pill.confirmed { background: color-mix(in srgb, var(--accent-green, #b7f56a) 16%, transparent); color: var(--accent-green, var(--ap-ok)); }
  .status-pill.problem { background: color-mix(in srgb, var(--accent-red, #f17b7b) 14%, transparent); color: var(--accent-red, var(--ap-danger)); }
  .problem-list { display: flex; flex-direction: column; gap: 8px; }
  .problem-item { padding: 10px 12px; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--accent-red, #f17b7b) 28%, var(--ap-border)); background: color-mix(in srgb, var(--accent-red, #f17b7b) 6%, transparent); }
  .problem-item p { margin: 5px 0 0; font-size: 0.82rem; color: var(--color-text-secondary, var(--ap-text-secondary)); }
  .detail {
    font-size: 0.75rem;
  }
  .detail ul {
    margin: 4px 0 0;
    padding-left: 1.1rem;
  }
  .muted,
  .muted-inline {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.85rem;
  }
  .banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
  .banner.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
    color: var(--accent-red, var(--ap-danger));
  }
  .banner.ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 12%, transparent);
    color: var(--accent-green, var(--ap-ok));
  }
  .field-hint {
    margin: 0.25rem 0 0;
    font-size: 0.78rem;
    color: var(--ap-text-secondary, #8a9a94);
  }
</style>
