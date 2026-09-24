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
  $: receptions = [...(state.receptions ?? [])].reverse();
  $: estimated = lines.reduce(
    (acc, line) => acc + (parseFloat(line.qty) || 0) * (parseFloat(line.unitCost) || 0),
    0,
  );

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
    lines = [{ productId: '', qty: '', unitCost: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (products.length === 0) {
      formError = 'No hay productos. Cree al menos uno en Catálogo.';
      return;
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
        supplier: supplier.trim() || undefined,
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
          <div class="grid">
            <Input id="rec-date" label="Fecha" type="date" bind:value={date} />
            <Input id="rec-supplier" label="Proveedor" bind:value={supplier} placeholder="Nombre del proveedor" />
            <Input id="rec-doc" label="Documento ref." bind:value={docRef} placeholder="Factura / guía" />
            <Input id="rec-note" label="Nota" bind:value={note} placeholder="Opcional" />
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
                <tr>
                  <td class="mono">{r.number}</td>
                  <td>{r.date}</td>
                  <td>{r.supplier || '—'}</td>
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
                  <td><span class="pill">{r.status || '—'}</span></td>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0 0.75rem;
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
  .pill {
    font-size: 0.68rem;
    font-weight: 650;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 16%, transparent);
    color: var(--accent-green, var(--ap-ok));
  }
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
</style>
