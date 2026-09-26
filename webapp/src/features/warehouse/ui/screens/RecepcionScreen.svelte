<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import type { CreateReceptionLineInput } from '../../domain/entities/Reception';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';

  export let store: WarehouseStore;

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
  let enterError = '';
  let enterOk = '';

  // Filtros
  let filterReceiver = '';
  let filterInvoice = '';
  let filterSupplier = '';
  let filterProduct = '';
  let filterMinCost = '';
  let filterMaxCost = '';
  let filterPanelOpen = false;

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: products = state.products ?? [];
  $: receptions = [...(state.receptions ?? [])].reverse();
  $: estimated = lines.reduce(
    (acc, line) => acc + (parseFloat(line.qty) || 0) * (parseFloat(line.unitCost) || 0),
    0,
  );

  $: filteredReceptions = receptions.filter(r => {
    const receiverMatch = !filterReceiver || (r.receiver || '').toLowerCase().includes(filterReceiver.toLowerCase());
    const invoiceMatch = !filterInvoice || (r.invoiceRef || '').toLowerCase().includes(filterInvoice.toLowerCase());
    const supplierMatch = !filterSupplier || (r.supplier || '').toLowerCase().includes(filterSupplier.toLowerCase());
    const productMatch = !filterProduct || (r.lines?.some(ln => 
      (ln.productName || productLabel(ln.productId)).toLowerCase().includes(filterProduct.toLowerCase())
    ) ?? false);
    const minCostMatch = !filterMinCost || r.totalCost >= parseFloat(filterMinCost);
    const maxCostMatch = !filterMaxCost || r.totalCost <= parseFloat(filterMaxCost);
    
    return receiverMatch && invoiceMatch && supplierMatch && productMatch && minCostMatch && maxCostMatch;
  });

  function productLabel(id: string): string {
    const p = products.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function onProductChange(index: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    const next = [...lines];
    next[index] = {
      ...next[index],
      productId,
      unitCost:
        next[index].unitCost ||
        (p && p.costStd > 0 ? String(p.costStd) : next[index].unitCost),
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

  function clearFilters() {
    filterReceiver = '';
    filterInvoice = '';
    filterSupplier = '';
    filterProduct = '';
    filterMinCost = '';
    filterMaxCost = '';
  }

  $: hasActiveFilters = !!(
    filterReceiver ||
    filterInvoice ||
    filterSupplier ||
    filterProduct ||
    filterMinCost ||
    filterMaxCost
  );

  function isPending(status: string | undefined): boolean {
    const s = (status || '').toLowerCase();
    return s === 'pendiente_entrada' || s === 'pendiente';
  }

  async function handleEnter(r: { id: string; number?: string }) {
    enterError = '';
    enterOk = '';
    enteringId = r.id;
    try {
      await store.enterReception({ id: r.id, accept: true });
      enterOk = `Entrada al almacén registrada · ${r.number || r.id}`;
    } catch (err) {
      enterError =
        err instanceof Error ? err.message : 'No se pudo dar entrada al almacén';
    } finally {
      enteringId = '';
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (products.length === 0) {
      formError = 'No hay productos. Cree al menos uno en Catálogo.';
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
      const unitCost = parseFloat(line.unitCost);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        formError = 'El costo unitario no puede ser negativo';
        return;
      }
      payload.push({ productId: line.productId, qty, unitCost });
    }

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto con cantidad';
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
      formOk = `Recepción confirmada · total estimado ${estimated.toFixed(2)}`;
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
        Entrada de mercancía al almacén central. Tras confirmar, el stock y el costo promedio se
        actualizan en el servidor.
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

  <div class="layout">
    <Card>
      <h2>Nueva recepción</h2>

      {#if products.length === 0}
        <p class="muted">
          No hay productos en el nomenclador. Vaya a <strong>Catálogo</strong> y cree al menos uno
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
              <input bind:value={receiver} placeholder="Nombre del receptor" disabled={state.saving} />
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
                  <span class="lbl">Costo unit.</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.unitCost}
                    placeholder="0.00"
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
      <h2>Historial ({filteredReceptions.length}/{receptions.length})</h2>
      {#if state.status === 'loading' && receptions.length === 0}
        <p class="muted">Cargando recepciones…</p>
      {:else if receptions.length === 0}
        <p class="muted">Aún no hay informes de recepción confirmados.</p>
      {:else}
        <div class="filter-bar" aria-label="Panel de filtros de recepciones">
          <div class="filter-trigger-wrap">
            <button
              type="button"
              class="filter-trigger"
              title="Abrir panel de filtros"
              aria-label="Abrir panel de filtros"
              on:click={() => (filterPanelOpen = !filterPanelOpen)}
            >
              <span class="filter-trigger-icon">⚙</span>
              <span>Filtros</span>
            </button>

            {#if hasActiveFilters}
              <button
                type="button"
                class="filter-clear-inline"
                title="Borrar filtros"
                aria-label="Borrar filtros"
                on:click={clearFilters}
              >
                Limpiar
              </button>
            {/if}
          </div>

          {#if filterPanelOpen}
            <div class="filters-panel" role="dialog" aria-label="Panel de filtros del historial">
              <div class="filters-grid">
                <div class="filter-field">
                  <label class="filter-label">Receptor</label>
                  <input
                    type="text"
                    class="filter-input"
                    placeholder="Buscar por receptor…"
                    bind:value={filterReceiver}
                  />
                </div>
                <div class="filter-field">
                  <label class="filter-label">Nº Factura</label>
                  <input
                    type="text"
                    class="filter-input"
                    placeholder="Buscar por factura…"
                    bind:value={filterInvoice}
                  />
                </div>
                <div class="filter-field">
                  <label class="filter-label">Proveedor</label>
                  <input
                    type="text"
                    class="filter-input"
                    placeholder="Buscar por proveedor…"
                    bind:value={filterSupplier}
                  />
                </div>
                <div class="filter-field">
                  <label class="filter-label">Producto</label>
                  <input
                    type="text"
                    class="filter-input"
                    placeholder="Buscar por producto…"
                    bind:value={filterProduct}
                  />
                </div>
                <div class="filter-field">
                  <label class="filter-label">Costo mín.</label>
                  <input
                    type="number"
                    class="filter-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    bind:value={filterMinCost}
                  />
                </div>
                <div class="filter-field">
                  <label class="filter-label">Costo máx.</label>
                  <input
                    type="number"
                    class="filter-input"
                    placeholder="9999.99"
                    min="0"
                    step="0.01"
                    bind:value={filterMaxCost}
                  />
                </div>
              </div>
            </div>
          {/if}
        </div>

        <div class="history-container">
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
                {#each filteredReceptions as r (r.id)}
                <tr>
                  <td class="mono">{r.number}</td>
                  <td>{r.date}</td>
                  <td>
                    {r.supplier || '—'}
                    {#if r.receiver}<div class="muted-inline">Recibe: {r.receiver}</div>{/if}
                  </td>
                  <td>
                    <div class="lines-display">
                      <button class="lines-toggle" on:click={() => r._expanded = !r._expanded}>
                        <span class="toggle-icon">{r._expanded ? '▼' : '▶'}</span>
                        <span class="lines-count">{r.lines?.length ?? 0} items</span>
                      </button>
                    </div>
                  </td>
                  <td class="num"><Money amount={r.totalCost} currency={r.currency} /></td>
                  <td><span class="pill" class:pill-pending={isPending(r.status)} class:pill-ok={!isPending(r.status) && (r.status || '').toLowerCase() === 'entrado'}>{r.status || '—'}</span></td>
                  <td class="actions">
                    {#if isPending(r.status)}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!!enteringId || state.saving}
                        on:click={() => handleEnter(r)}
                      >
                        {enteringId === r.id ? '⏳ Entrando…' : '✓ Dar entrada'}
                      </Button>
                    {:else}
                      <span class="muted-sm">—</span>
                    {/if}
                  </td>
                </tr>
                {#if r.lines?.length && r._expanded}
                  <tr class="detail-row">
                    <td colspan="7">
                      <div class="detail-panel">
                        <div class="detail-header">
                          <h4>Artículos recibidos</h4>
                          <span class="detail-count">{r.lines.length} productos</span>
                        </div>
                        <div class="detail-grid">
                          {#each r.lines as ln, j (j)}
                            <div class="line-card">
                              <div class="line-card-header">
                                <strong class="line-product-name">{ln.productName || productLabel(ln.productId)}</strong>
                              </div>
                              <div class="line-card-body">
                                <div class="line-stat">
                                  <span class="stat-label">Cantidad</span>
                                  <span class="stat-value">{ln.qty}</span>
                                </div>
                                <div class="line-stat">
                                  <span class="stat-label">Costo unit.</span>
                                  <span class="stat-value"><Money amount={ln.unitCost} /></span>
                                </div>
                                <div class="line-stat total">
                                  <span class="stat-label">Subtotal</span>
                                  <span class="stat-value"><Money amount={ln.qty * ln.unitCost} /></span>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
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
    height: calc(100vh - 280px);
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: 1fr 1.5fr;
      align-items: start;
    }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 12px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0 0.75rem;
  }
  .lines-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.75rem 0 0.5rem;
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
    margin-top: 0.75rem;
    padding-top: 0.5rem;
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
  td.actions {
    text-align: right;
    vertical-align: middle;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }
  .pill {
    font-size: 0.68rem;
    font-weight: 650;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 16%, transparent);
    color: var(--accent-green, var(--ap-ok));
  }
  .pill-pending {
    background: color-mix(in srgb, var(--accent-yellow, #ffe35a) 18%, transparent);
    color: var(--accent-yellow, var(--ap-text-secondary));
    font-weight: 700;
  }
  .pill-ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 18%, transparent);
    color: var(--accent-green, var(--ap-ok));
  }
  .detail-row {
    border: none !important;
    background: transparent;
  }
  .detail-row td {
    padding: 0 0.5rem 1rem 0.5rem;
    border: none;
    background: transparent;
  }
  .detail-panel {
    background: color-mix(in srgb, var(--accent-cyan) 6%, transparent);
    border-left: 3px solid var(--accent-cyan);
    border-radius: 10px;
    padding: 16px;
    margin: 8px 0;
  }
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-border);
  }
  .detail-header h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 650;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .detail-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-weight: 600;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }
  .line-card {
    background: var(--color-surface-soft);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--accent-cyan);
    border-radius: 8px;
    overflow: hidden;
  }
  .line-card-header {
    padding: 12px;
    background: color-mix(in srgb, var(--accent-cyan) 4%, transparent);
    border-bottom: 1px solid var(--color-border);
  }
  .line-product-name {
    display: block;
    font-size: 0.9rem;
    color: var(--color-text-primary);
    word-break: break-word;
    line-height: 1.3;
  }
  .line-card-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .line-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 0.85rem;
  }
  .line-stat.total {
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
    font-weight: 600;
  }
  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-weight: 600;
  }
  .stat-value {
    color: var(--color-text-primary);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .line-stat.total .stat-value {
    color: var(--accent-cyan);
    font-size: 0.95rem;
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
  .lines-display {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lines-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    font-weight: 600;
    font-size: 0.85rem;
    font-family: inherit;
    transition: all var(--motion-fast);
  }
  .lines-toggle:hover {
    color: var(--accent-cyan);
  }
  .toggle-icon {
    display: inline-block;
    font-size: 0.7rem;
    transition: transform var(--motion-fast);
  }
  .lines-count {
    font-weight: 600;
    color: inherit;
    font-size: 0.85rem;
  }
  .history-container {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 400px);
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 8px;
  }
  .history-container::-webkit-scrollbar {
    width: 8px;
  }
  .history-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .history-container::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-border) 150%, transparent);
    border-radius: 4px;
  }
  .history-container::-webkit-scrollbar-thumb:hover {
    background: var(--color-border);
  }
  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }
  .filter-trigger-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-surface-soft);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--motion-fast);
  }
  .filter-trigger:hover {
    border-color: var(--accent-cyan);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-cyan) 35%, transparent);
  }
  .filter-trigger-icon {
    font-size: 0.95rem;
    color: var(--accent-cyan);
    line-height: 1;
  }
  .filter-clear-inline {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
  }
  .filter-clear-inline:hover {
    color: var(--accent-red);
  }
  .filters-panel {
    background: color-mix(in srgb, var(--accent-cyan) 4%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 14px;
  }
  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .filter-label {
    font-size: 0.7rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--color-text-muted);
  }
  .filter-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 0.85rem;
    transition: all var(--motion-fast);
  }
  .filter-input:focus {
    outline: none;
    border-color: var(--accent-cyan);
    background: var(--color-surface);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-cyan) 8%, transparent);
  }
  .filter-input::placeholder {
    color: var(--color-text-muted);
  }
</style>
