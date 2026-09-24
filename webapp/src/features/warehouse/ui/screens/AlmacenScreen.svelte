<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import {
    receptionsSeries,
    stockDistribution,
    topStockByValue,
  } from '../viewmodels/warehouseCharts';

  export let store: WarehouseStore;

  let state: WarehouseState = store.getState();

  let unitName = '';
  let unitAddress = '';
  let unitPhone = '';
  let unitOk = '';
  let unitErr = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: totalValue = state.rows.reduce((acc, row) => acc + row.amountBase, 0);
  $: unitsValue = state.unitStocks.reduce((acc, stock) => acc + stock.amountBase, 0);

  let topStock: ChartPoint[] = [];
  let distribution: ChartPoint[] = [];
  let receptionFlow: ChartPoint[] = [];

  $: topStock = topStockByValue(state.rows);
  $: distribution = stockDistribution(state.rows, state.unitStocks, state.units);
  $: receptionFlow = receptionsSeries(state.receptions);
  $: baseCurrency = state.rows.length > 0 ? state.rows[0].currency : '';

  function unitLabel(unitId: string): string {
    const found = state.units.find((u) => u.id === unitId);
    return found ? `${found.code} · ${found.name}` : unitId;
  }

  function productLabel(productId: string): string {
    const row = state.rows.find((r) => r.productId === productId);
    if (row) return `${row.code} · ${row.name}`;
    const product = state.products.find((p) => p.id === productId);
    return product ? `${product.code} · ${product.name}` : productId;
  }

  async function handleCreateUnit(e: Event) {
    e.preventDefault();
    unitOk = '';
    unitErr = '';
    if (!unitName.trim()) {
      unitErr = 'El nombre de la unidad es obligatorio';
      return;
    }
    try {
      await store.addSalesUnit({
        name: unitName.trim(),
        address: unitAddress.trim() || undefined,
        phone: unitPhone.trim() || undefined,
      });
      unitName = '';
      unitAddress = '';
      unitPhone = '';
      unitOk = 'Unidad de venta creada';
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<section class="analytics">
  <div class="stats">
    <StatCard
      variant="hero"
      label="Valor en almacén central"
      amount={totalValue}
      currency={baseCurrency}
      caption={`${state.rows.length} productos con existencia`}
    />
    <StatCard
      label="Valor en unidades de venta"
      amount={unitsValue}
      currency={baseCurrency}
      caption={`${state.units.length} unidades activas`}
    />
  </div>

  <div class="charts">
    <PanelCard title="Productos de mayor valor" subtitle="Importe a costo promedio" tag="Top 6">
      <BarChart points={topStock} height={180} emptyText="Sin existencias que graficar" />
    </PanelCard>
    <PanelCard title="Distribución de la mercancía" subtitle="Almacén central vs. unidades" tag="Valor">
      <DonutChart points={distribution} centerLabel="Inventario" currency={baseCurrency} />
    </PanelCard>
  </div>

  {#if receptionFlow.length > 0}
    <PanelCard title="Entradas por recepción" subtitle="Costo total de las últimas entradas" tag="Recepción">
      <BarChart points={receptionFlow} height={150} />
    </PanelCard>
  {/if}
</section>

<Card>
  <div class="head">
    <h2>Almacén central</h2>
    <Badge tone={state.status === 'error' ? 'off' : 'default'}>{state.rows.length} productos</Badge>
  </div>

  {#if state.status === 'loading'}
    <p class="muted">Cargando existencias…</p>
  {:else if state.status === 'error'}
    <p class="err">{state.error}</p>
  {:else if state.rows.length === 0}
    <p class="muted">Sin existencias en almacén central. Cree productos y registre una recepción para dar entrada.</p>
  {:else}
    <p class="muted">Valor total en almacén: <Money amount={totalValue} /></p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>UM</th>
            <th class="num">Cantidad</th>
            <th class="num">Costo prom.</th>
            <th class="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {#each state.rows as row (row.productId)}
            <tr>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.unit}</td>
              <td class="num">{row.qty}</td>
              <td class="num"><Money amount={row.avgCost} /></td>
              <td class="num"><Money amount={row.amountBase} currency={row.currency} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<Card>
  <h2>Unidades de venta</h2>
  {#if state.units.length === 0}
    <p class="muted">Todavía no hay unidades de venta registradas.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {#each state.units as unit (unit.id)}
            <tr>
              <td>{unit.code}</td>
              <td>{unit.name}</td>
              <td>{unit.address || '—'}</td>
              <td>{unit.phone || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if unitOk}<p class="ok-banner">{unitOk}</p>{/if}
  {#if unitErr}<p class="err">{unitErr}</p>{/if}
  <form class="unit-form" on:submit={handleCreateUnit}>
    <div class="form-grid">
      <Input id="unit-name" label="Nombre de la unidad *" bind:value={unitName} placeholder="Punto de venta" />
      <Input id="unit-address" label="Dirección" bind:value={unitAddress} placeholder="Calle y número" />
      <Input id="unit-phone" label="Teléfono" bind:value={unitPhone} placeholder="Opcional" />
    </div>
    <div class="form-actions">
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Guardando…' : 'Añadir unidad de venta'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Existencias por unidad de venta</h2>
  {#if state.unitStocks.length === 0}
    <p class="muted">Aún no hay mercancía transferida a unidades.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Producto</th>
            <th class="num">Cantidad</th>
            <th class="num">Costo prom.</th>
            <th class="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {#each state.unitStocks as stock (`${stock.unitId}-${stock.productId}`)}
            <tr>
              <td>{unitLabel(stock.unitId)}</td>
              <td>{productLabel(stock.productId)}</td>
              <td class="num">{stock.qty}</td>
              <td class="num"><Money amount={stock.avgCost} /></td>
              <td class="num"><Money amount={stock.amountBase} /></td>
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
  .charts {
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
    color: var(--ap-text-secondary);
    font-size: 0.85rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.85rem;
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
    letter-spacing: 0.04em;
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
  .form {
    margin-top: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }
  .unit-form {
    margin-top: 1rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px 16px;
    align-items: start;
  }
  @media (max-width: 720px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
  .form-actions {
    margin-top: 1rem;
  }
  .ok-banner {
    color: var(--accent-green, var(--ap-ok));
    font-size: 0.85rem;
  }
</style>
