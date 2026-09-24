<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { CostingState, CostingStore } from '../stores/costingStore';
  import { costPerProduct, costStructure } from '../viewmodels/costingCharts';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleSheetsPayload, seedSheetsViaStore } from '../dev/sheetsSeed';

  export let store: CostingStore;

  let state: CostingState = store.getState();

  let productId = '';
  let period = '';
  let materiaPrima = '';
  let materialesAuxiliares = '';
  let energia = '';
  let salarioDirecto = '';
  let otrosDirectos = '';
  let gastosIndirectos = '';
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

  $: previewCost =
    (num(materiaPrima) ?? 0) +
    (num(materialesAuxiliares) ?? 0) +
    (num(energia) ?? 0) +
    (num(salarioDirecto) ?? 0) +
    (num(otrosDirectos) ?? 0) +
    (num(gastosIndirectos) ?? 0);

  let structure: ChartPoint[] = [];
  let costRanking: ChartPoint[] = [];

  $: selectedSheet = productId
    ? state.costSheets.find((sheet) => sheet.productId === productId) ?? null
    : state.costSheets[0] ?? null;
  $: structure = costStructure(selectedSheet);
  $: costRanking = costPerProduct(state.costSheets);
  $: avgCost =
    state.costSheets.length > 0
      ? state.costSheets.reduce((acc, sheet) => acc + sheet.costoUnitario, 0) / state.costSheets.length
      : 0;
  $: sheetCurrency = state.costSheets.length > 0 ? state.costSheets[0].currency : '';

  function resetForm() {
    productId = '';
    period = '';
    materiaPrima = '';
    materialesAuxiliares = '';
    energia = '';
    salarioDirecto = '';
    otrosDirectos = '';
    gastosIndirectos = '';
    notes = '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!productId) {
      formError = 'Seleccione el producto';
      return;
    }
    try {
      await store.saveCostSheet({
        productId,
        period: period.trim() || undefined,
        materiaPrima: num(materiaPrima),
        materialesAuxiliares: num(materialesAuxiliares),
        energia: num(energia),
        salarioDirecto: num(salarioDirecto),
        otrosDirectos: num(otrosDirectos),
        gastosIndirectos: num(gastosIndirectos),
        notes: notes.trim() || undefined,
      });
      resetForm();
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<section class="analytics">
  <DevSeedPanel
    title="Seed fichas de costo y precio"
    description="JSON: costSheets[20] + priceSheets[20]. Requiere productos."
    sample={buildSampleSheetsPayload()}
    onSeed={(data) => seedSheetsViaStore(store, data)}
  />
  <div class="stats">
    <StatCard
      variant="hero"
      label="Costo unitario promedio"
      amount={avgCost}
      currency={sheetCurrency}
      caption={`${state.costSheets.length} fichas de costo registradas`}
    />
    <StatCard
      label="Precio sugerido de la ficha activa"
      amount={selectedSheet ? selectedSheet.precioSugerido : 0}
      currency={sheetCurrency}
      caption={selectedSheet ? `${selectedSheet.productCode} · ${selectedSheet.productName}` : 'Seleccione un producto'}
    />
  </div>

  <div class="charts">
    <PanelCard
      title="Estructura de la ficha"
      subtitle={selectedSheet ? selectedSheet.productName : 'Sin ficha seleccionada'}
      tag="Elementos"
    >
      <DonutChart points={structure} centerLabel="Costo" currency={sheetCurrency} emptyText="Seleccione o cree una ficha de costo" />
    </PanelCard>
    <PanelCard title="Costo unitario por producto" subtitle="Fichas más costosas" tag="Top 6">
      <BarChart points={costRanking} height={180} highlightLast={false} />
    </PanelCard>
  </div>
</section>

<Card>
  <h2>Nueva ficha de costo</h2>
  <p class="muted">
    Si deja la materia prima vacía, el backend toma el costo promedio del almacén. El costo unitario
    y el precio sugerido (margen 30 %) los calcula el servidor.
  </p>

  <form on:submit={handleSubmit}>
    <div class="field">
      <label class="lbl" for="cost-product">Producto</label>
      <select id="cost-product" class="sel" bind:value={productId}>
        <option value="">Seleccione producto</option>
        {#each state.products as product (product.id)}
          <option value={product.id}>{product.code} · {product.name}</option>
        {/each}
      </select>
    </div>

    <div class="grid">
      <Input id="cost-period" label="Período" bind:value={period} placeholder="AAAA-MM" />
      <Input id="cost-mp" label="Materia prima" type="number" step="0.01" bind:value={materiaPrima} placeholder="auto" />
      <Input
        id="cost-aux"
        label="Materiales auxiliares"
        type="number"
        step="0.01"
        bind:value={materialesAuxiliares}
        placeholder="0.00"
      />
      <Input id="cost-energia" label="Energía" type="number" step="0.01" bind:value={energia} placeholder="0.00" />
      <Input
        id="cost-salario"
        label="Salario directo"
        type="number"
        step="0.01"
        bind:value={salarioDirecto}
        placeholder="0.00"
      />
      <Input
        id="cost-otros"
        label="Otros directos"
        type="number"
        step="0.01"
        bind:value={otrosDirectos}
        placeholder="0.00"
      />
      <Input
        id="cost-indirectos"
        label="Gastos indirectos"
        type="number"
        step="0.01"
        bind:value={gastosIndirectos}
        placeholder="0.00"
      />
      <Input id="cost-notes" label="Notas" bind:value={notes} placeholder="Opcional" />
    </div>

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}

    <div class="actions">
      <span class="total">Suma de elementos: {previewCost.toFixed(2)}</span>
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Guardando…' : 'Guardar ficha de costo'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Fichas de costo registradas</h2>
  {#if state.costSheets.length === 0}
    <p class="muted">Todavía no hay fichas de costo.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Período</th>
            <th class="num">MP</th>
            <th class="num">Salario</th>
            <th class="num">Indirectos</th>
            <th class="num">Costo unitario</th>
            <th class="num">Precio sugerido</th>
          </tr>
        </thead>
        <tbody>
          {#each state.costSheets as sheet (sheet.id)}
            <tr>
              <td>{sheet.productCode} · {sheet.productName}</td>
              <td>{sheet.period || '—'}</td>
              <td class="num"><Money amount={sheet.materiaPrima} /></td>
              <td class="num"><Money amount={sheet.salarioDirecto} /></td>
              <td class="num"><Money amount={sheet.gastosIndirectos} /></td>
              <td class="num"><Money amount={sheet.costoUnitario} currency={sheet.currency} /></td>
              <td class="num"><Money amount={sheet.precioSugerido} /></td>
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
    .charts { grid-template-columns: 1fr 1.2fr; }
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
