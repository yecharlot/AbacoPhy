<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
    LineChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { PosState, PosStore } from '../stores/posStore';
  import { salesByDay, salesByUnit, salesTotals, topSoldProducts } from '../viewmodels/posCharts';
  import type { CreateSaleLineInput } from '../../domain/entities/Sale';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSamplePosSalesPayload, seedPosSalesViaStore } from '../dev/salesSeed';

  export let store: PosStore;

  type DraftLine = {
    productId: string;
    qty: string;
    unitPrice: string;
    discountPct: string;
  };

  let state: PosState = store.getState();

  let unitId = '';
  let seller = '';
  let lines: DraftLine[] = [{ productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  let formError = '';

  onMount(() => {
    const unsub = store.subscribe((s: PosState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function priceOf(productId: string): number {
    return state.products.find((p) => p.id === productId)?.priceSale ?? 0;
  }

  let dailySales: ChartPoint[] = [];
  let unitSplit: ChartPoint[] = [];
  let topProducts: ChartPoint[] = [];

  $: dailySales = salesByDay(state.sales);
  $: unitSplit = salesByUnit(state.sales);
  $: topProducts = topSoldProducts(state.sales);
  $: totals = salesTotals(state.sales);
  $: saleCurrency = state.sales.length > 0 ? state.sales[0].currency : '';

  $: estimated = lines.reduce((acc, line) => {
    const price = parseFloat(line.unitPrice) || priceOf(line.productId);
    const gross = (parseFloat(line.qty) || 0) * price;
    const discount = gross * ((parseFloat(line.discountPct) || 0) / 100);
    return acc + gross - discount;
  }, 0);

  function addLine() {
    lines = [...lines, { productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';

    const payload: CreateSaleLineInput[] = lines
      .filter((line) => line.productId !== '')
      .map((line) => ({
        productId: line.productId,
        qty: parseFloat(line.qty) || 0,
        unitPrice: line.unitPrice === '' ? undefined : parseFloat(line.unitPrice),
        discountPct: line.discountPct === '' ? undefined : parseFloat(line.discountPct),
      }));

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto';
      return;
    }

    try {
      await store.registerSale({
        unitId: unitId || undefined,
        seller: seller.trim() || undefined,
        lines: payload,
      });
      lines = [{ productId: '', qty: '1', unitPrice: '', discountPct: '' }];
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<section class="analytics">
  <DevSeedPanel
    title="Seed ventas POS"
    description="JSON: sales[20] con productIndex, qty, unitPrice. Requiere productos y unidad de venta."
    sample={buildSamplePosSalesPayload()}
    onSeed={(data) => seedPosSalesViaStore(store, data)}
  />
  <div class="stats">
    <StatCard
      variant="hero"
      label="Ventas acumuladas"
      amount={totals.total}
      currency={saleCurrency}
      caption={`${state.sales.length} ventas registradas · rebajas ${totals.discount.toFixed(2)}`}
    />
    <div class="stat-column">
      <StatCard variant="positive" label="Margen bruto" amount={totals.margin} currency={saleCurrency} caption="Ventas menos costo de la mercancía" />
      <StatCard variant="negative" label="Costo de ventas" amount={totals.cost} currency={saleCurrency} caption="Valorado por el backend" />
    </div>
  </div>

  <div class="charts">
    <PanelCard title="Ventas por día" subtitle="Últimas jornadas con actividad" tag="Diario">
      <LineChart points={dailySales} color="var(--accent-green)" emptyText="Aún no hay ventas" />
    </PanelCard>
    <PanelCard title="Ventas por unidad" subtitle="Reparto del importe cobrado" tag="Unidades">
      <DonutChart points={unitSplit} centerLabel="Vendido" currency={saleCurrency} />
    </PanelCard>
  </div>

  {#if topProducts.length > 0}
    <PanelCard title="Productos más vendidos" subtitle="Importe por producto" tag="Top 6">
      <BarChart points={topProducts} height={160} highlightLast={false} />
    </PanelCard>
  {/if}
</section>

<Card>
  <div class="head">
    <h2>Venta de mostrador</h2>
    {#if state.lastSale}
      <Badge tone="ok">Última venta: {state.lastSale.number}</Badge>
    {/if}
  </div>

  <form on:submit={handleSubmit}>
    <div class="grid">
      <div class="field">
        <label class="lbl" for="pos-unit">Unidad de venta</label>
        <select id="pos-unit" class="sel" bind:value={unitId}>
          <option value="">Almacén central</option>
          {#each state.units as unit (unit.id)}
            <option value={unit.id}>{unit.code} · {unit.name}</option>
          {/each}
        </select>
      </div>
      <Input id="pos-seller" label="Vendedor" bind:value={seller} placeholder="Quien despacha" />
    </div>

    {#each lines as line, index (index)}
      <div class="line">
        <div class="field">
          <label class="lbl" for={`pos-prod-${index}`}>Producto</label>
          <select id={`pos-prod-${index}`} class="sel" bind:value={line.productId}>
            <option value="">Seleccione producto</option>
            {#each state.products as product (product.id)}
              <option value={product.id}>{product.code} · {product.name}</option>
            {/each}
          </select>
        </div>
        <Input id={`pos-qty-${index}`} label="Cant." type="number" step="0.01" bind:value={line.qty} placeholder="1" />
        <Input
          id={`pos-price-${index}`}
          label="Precio"
          type="number"
          step="0.01"
          bind:value={line.unitPrice}
          placeholder={priceOf(line.productId).toFixed(2)}
        />
        <Input
          id={`pos-disc-${index}`}
          label="Rebaja %"
          type="number"
          step="0.01"
          bind:value={line.discountPct}
          placeholder="0"
        />
        <button type="button" class="drop" aria-label="Quitar línea" on:click={() => removeLine(index)}>✕</button>
      </div>
    {/each}

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}

    <div class="actions">
      <span class="total">Importe estimado: {estimated.toFixed(2)}</span>
      <Button variant="secondary" on:click={addLine}>Añadir línea</Button>
      <Button type="submit" disabled={state.saving}>{state.saving ? 'Cobrando…' : 'Cobrar venta'}</Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Ventas registradas</h2>
  {#if state.sales.length === 0}
    <p class="muted">Aún no hay ventas registradas.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Unidad</th>
            <th>Vendedor</th>
            <th class="num">Rebaja</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {#each state.sales as sale (sale.id)}
            <tr>
              <td>{sale.number}</td>
              <td>{sale.date}</td>
              <td>{sale.unitName || '—'}</td>
              <td>{sale.seller || '—'}</td>
              <td class="num"><Money amount={sale.discount} /></td>
              <td class="num"><Money amount={sale.total} currency={sale.currency} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  .analytics {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    margin-bottom: var(--dashboard-gap, 12px);
  }
  .stats,
  .charts,
  .stat-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  @media (min-width: 900px) {
    .stats { grid-template-columns: 1.4fr 1fr; }
    .charts { grid-template-columns: 1.3fr 1fr; }
  }
  h2 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0 0.8rem;
  }
  .line {
    display: grid;
    grid-template-columns: 2fr 0.8fr 1fr 0.9fr auto;
    gap: 0 0.6rem;
    align-items: end;
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
  .drop {
    border: 1px solid var(--ap-border);
    background: transparent;
    color: var(--ap-danger);
    border-radius: 10px;
    height: 42px;
    width: 42px;
    margin-bottom: 0.7rem;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .total {
    margin-right: auto;
    font-weight: 600;
    color: var(--ap-primary);
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
  @media (max-width: 860px) {
    .line {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
