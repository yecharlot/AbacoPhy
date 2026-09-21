<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import { BarChart, PanelCard, StatCard, type ChartPoint } from '../../../../infrastructure/ui/charts';
  import type { CostingState, CostingStore } from '../stores/costingStore';
  import { marginByProduct } from '../viewmodels/costingCharts';

  export let store: CostingStore;

  let state: CostingState = store.getState();

  let productId = '';
  let costRef = '';
  let marginPct = '';
  let price = '';
  let notes = '';
  let formError = '';

  onMount(() => {
    const unsub = store.subscribe((s: CostingState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function num(value: string): number | undefined {
    if (value.trim() === '') return undefined;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  $: suggested =
    num(price) !== undefined
      ? (num(price) as number)
      : (num(costRef) ?? 0) * (1 + (num(marginPct) ?? 0) / 100);

  let margins: ChartPoint[] = [];
  $: margins = marginByProduct(state.priceSheets);
  $: avgMargin =
    state.priceSheets.length > 0
      ? state.priceSheets.reduce((acc, sheet) => acc + sheet.marginPct, 0) / state.priceSheets.length
      : 0;

  function costSheetFor(id: string): number | null {
    const sheet = state.costSheets.find((c) => c.productId === id);
    return sheet ? sheet.costoUnitario : null;
  }

  function useCostSheet() {
    const value = costSheetFor(productId);
    if (value !== null) costRef = String(value);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!productId) {
      formError = 'Seleccione el producto';
      return;
    }
    try {
      await store.savePriceSheet({
        productId,
        costRef: num(costRef),
        marginPct: num(marginPct),
        price: num(price),
        notes: notes.trim() || undefined,
      });
      productId = '';
      costRef = '';
      marginPct = '';
      price = '';
      notes = '';
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleRemove(id: string) {
    try {
      await store.removePriceSheet(id);
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<section class="analytics">
  <div class="stats">
    <StatCard
      variant="hero"
      label="Margen medio de la lista"
      amount={avgMargin}
      currency="%"
      caption={`${state.priceSheets.length} fichas de precio vigentes`}
    />
    <PanelCard title="Margen por producto" subtitle="Precio menos costo de referencia" tag="Top 6">
      <BarChart points={margins} height={160} highlightLast={false} emptyText="Sin fichas de precio" />
    </PanelCard>
  </div>
</section>

<Card>
  <h2>Nueva ficha de precio</h2>
  <p class="muted">
    Indique el precio directamente o un costo de referencia con margen; el backend calcula el precio
    final y actualiza el precio de venta del producto.
  </p>

  <form on:submit={handleSubmit}>
    <div class="field">
      <label class="lbl" for="price-product">Producto</label>
      <select id="price-product" class="sel" bind:value={productId}>
        <option value="">Seleccione producto</option>
        {#each state.products as product (product.id)}
          <option value={product.id}>{product.code} · {product.name}</option>
        {/each}
      </select>
    </div>

    <div class="grid">
      <Input id="price-cost" label="Costo de referencia" type="number" step="0.01" bind:value={costRef} placeholder="0.00" />
      <Input id="price-margin" label="Margen %" type="number" step="0.01" bind:value={marginPct} placeholder="30" />
      <Input id="price-price" label="Precio de venta" type="number" step="0.01" bind:value={price} placeholder="opcional" />
      <Input id="price-notes" label="Notas" bind:value={notes} placeholder="Opcional" />
    </div>

    {#if productId && costSheetFor(productId) !== null}
      <p class="muted">
        Este producto tiene ficha de costo con unitario {costSheetFor(productId)}.
        <button type="button" class="link" on:click={useCostSheet}>Usar como costo de referencia</button>
      </p>
    {/if}

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}

    <div class="actions">
      <span class="total">Precio estimado: {suggested.toFixed(2)}</span>
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Guardando…' : 'Guardar ficha de precio'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Fichas de precio registradas</h2>
  {#if state.priceSheets.length === 0}
    <p class="muted">Todavía no hay fichas de precio.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="num">Costo ref.</th>
            <th class="num">Margen %</th>
            <th class="num">Precio</th>
            <th>Notas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each state.priceSheets as sheet (sheet.id)}
            <tr>
              <td>{sheet.productCode} · {sheet.productName}</td>
              <td class="num"><Money amount={sheet.costRef} /></td>
              <td class="num">{sheet.marginPct}</td>
              <td class="num"><Money amount={sheet.price} currency={sheet.currency} /></td>
              <td>{sheet.notes || '—'}</td>
              <td>
                <Button variant="ghost" size="sm" disabled={state.saving} on:click={() => handleRemove(sheet.id)}>
                  Eliminar
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  .analytics { margin-bottom: var(--dashboard-gap, 12px); }
  .stats {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  @media (min-width: 900px) {
    .stats { grid-template-columns: 1fr 1.5fr; }
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .link {
    background: none;
    border: none;
    color: var(--ap-primary);
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-decoration: underline;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 0 0.8rem;
  }
  .field {
    min-width: 0;
  }
  .lbl {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.3rem;
  }
  .sel {
    width: 100%;
    padding: 0.62rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.9rem;
    margin-bottom: 0.7rem;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .total {
    margin-right: auto;
    font-size: 0.85rem;
    color: var(--ap-text-secondary);
    font-variant-numeric: tabular-nums;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    white-space: nowrap;
  }
  td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
