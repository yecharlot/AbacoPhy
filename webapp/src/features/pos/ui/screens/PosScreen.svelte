<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
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
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let lines: DraftLine[] = [{ productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s: PosState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: products = state.products ?? [];
  $: units = state.units ?? [];
  $: sales = [...(state.sales ?? [])].reverse();
  $: dailySales = salesByDay(state.sales) as ChartPoint[];
  $: unitSplit = salesByUnit(state.sales) as ChartPoint[];
  $: topProducts = topSoldProducts(state.sales) as ChartPoint[];
  $: totals = salesTotals(state.sales);
  $: saleCurrency = state.sales[0]?.currency ?? '';

  $: estimated = lines.reduce((acc, line) => {
    const price = parseFloat(line.unitPrice) || priceOf(line.productId);
    const gross = (parseFloat(line.qty) || 0) * price;
    const discount = gross * ((parseFloat(line.discountPct) || 0) / 100);
    return acc + gross - discount;
  }, 0);

  /** Productos con stock en la unidad seleccionada (o todos si no hay unidad). */
  $: sellableProducts = (() => {
    if (!unitId) return products;
    const ids = new Set(
      (state.unitStocks ?? [])
        .filter((s) => s.unitId === unitId && s.qty > 0)
        .map((s) => s.productId),
    );
    if (ids.size === 0) return products;
    return products.filter((p) => ids.has(p.id));
  })();

  function priceOf(productId: string): number {
    return products.find((p) => p.id === productId)?.priceSale ?? 0;
  }

  function stockOf(productId: string): number | null {
    if (!unitId) return null;
    const row = (state.unitStocks ?? []).find(
      (s) => s.unitId === unitId && s.productId === productId,
    );
    return row?.qty ?? 0;
  }

  function productLabel(id: string): string {
    const p = products.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function onProductChange(index: number, productId: string) {
    const next = [...lines];
    const price = priceOf(productId);
    next[index] = {
      ...next[index],
      productId,
      unitPrice: next[index].unitPrice || (price > 0 ? String(price) : ''),
    };
    lines = next;
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    seller = '';
    note = '';
    date = new Date().toISOString().slice(0, 10);
    lines = [{ productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (products.length === 0) {
      formError = 'No hay productos. Cree el nomenclador en Catálogo.';
      return;
    }

    const payload: CreateSaleLineInput[] = [];
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = parseFloat(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      const available = stockOf(line.productId);
      if (available !== null && qty > available) {
        formError = `Stock insuficiente en unidad para ${productLabel(line.productId)} (disp. ${available})`;
        return;
      }
      const unitPrice = parseFloat(line.unitPrice);
      const discountPct = parseFloat(line.discountPct);
      payload.push({
        productId: line.productId,
        qty,
        unitPrice: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : undefined,
        discountPct: Number.isFinite(discountPct) && discountPct > 0 ? discountPct : undefined,
      });
    }

    if (payload.length === 0) {
      formError = 'Añada al menos un producto a la venta';
      return;
    }

    try {
      await store.registerSale({
        unitId: unitId || undefined,
        seller: seller.trim() || undefined,
        date: date || undefined,
        note: note.trim() || undefined,
        lines: payload,
      });
      const num = store.getState().lastSale?.number;
      formOk = num
        ? `Venta ${num} registrada · total ${estimated.toFixed(2)}`
        : 'Venta registrada correctamente';
      resetForm();
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo registrar la venta';
    }
  }
</script>

<section class="pos" data-screen="pos">
  <DevSeedPanel
    title="Seed ventas POS (DEV)"
    description="Requiere unidad con stock. JSON: sales[] con unitIndex y líneas."
    sample={buildSamplePosSalesPayload()}
    onSeed={(data) => seedPosSalesViaStore(store, data)}
  />

  <header class="page-head">
    <div>
      <h1>Punto de venta</h1>
      <p class="sub">
        Venta de mostrador. Con unidad seleccionada se descuenta stock de esa unidad; sin unidad, del
        almacén central.
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

  <div class="stats">
    <StatCard
      label="Tickets"
      amount={state.sales.length}
      caption="Ventas confirmadas"
      variant="plain"
    />
    <StatCard
      label="Importe cobrado"
      amount={totals.total}
      currency={saleCurrency}
      caption="Suma de totales"
      variant="hero"
    />
    <StatCard
      label="Margen aprox."
      amount={totals.margin}
      currency={saleCurrency}
      caption="Cobrado − costo"
      variant="plain"
    />
  </div>

  {#if dailySales.length > 0 || unitSplit.length > 0}
    <div class="charts">
      <PanelCard title="Ventas por día" subtitle="Importe cobrado" tag="Tendencia">
        <BarChart points={dailySales} height={160} />
      </PanelCard>
      <PanelCard title="Por unidad" subtitle="Reparto del importe" tag="Unidades">
        <DonutChart points={unitSplit} centerLabel="Vendido" currency={saleCurrency} />
      </PanelCard>
    </div>
  {/if}

  {#if topProducts.length > 0}
    <PanelCard title="Productos más vendidos" subtitle="Importe por producto" tag="Top">
      <BarChart points={topProducts} height={150} highlightLast={false} />
    </PanelCard>
  {/if}

  <div class="layout">
    <Card>
      <div class="card-head">
        <h2>Nueva venta</h2>
        {#if state.lastSale}
          <Badge tone="ok">Última: {state.lastSale.number}</Badge>
        {/if}
      </div>

      {#if products.length === 0}
        <p class="muted">No hay productos. Cree el nomenclador en <strong>Catálogo</strong>.</p>
      {:else}
        <form class="form" on:submit={handleSubmit}>
          <div class="form-grid">
            <label class="field">
              <span class="lbl">Unidad de venta</span>
              <select bind:value={unitId} disabled={state.saving}>
                <option value="">Almacén central</option>
                {#each units as u (u.id)}
                  <option value={u.id}>{u.code ? `${u.code} · ` : ''}{u.name}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="lbl">Fecha</span>
              <input type="date" bind:value={date} disabled={state.saving} />
            </label>
            <label class="field">
              <span class="lbl">Vendedor</span>
              <input
                type="text"
                bind:value={seller}
                placeholder="Quien despacha"
                disabled={state.saving}
              />
            </label>
            <label class="field">
              <span class="lbl">Nota</span>
              <input type="text" bind:value={note} placeholder="Opcional" disabled={state.saving} />
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
                    disabled={state.saving}
                  >
                    <option value="">Seleccionar…</option>
                    {#each sellableProducts as p (p.id)}
                      <option value={p.id}>
                        {p.code || '—'} · {p.name}
                        {#if unitId}
                          (disp. {stockOf(p.id) ?? 0})
                        {/if}
                      </option>
                    {/each}
                  </select>
                </label>
                <label class="field narrow">
                  <span class="lbl">Cant.</span>
                  <input type="number" min="0" step="any" bind:value={line.qty} disabled={state.saving} />
                </label>
                <label class="field narrow">
                  <span class="lbl">Precio</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.unitPrice}
                    placeholder={priceOf(line.productId).toFixed(2)}
                    disabled={state.saving}
                  />
                </label>
                <label class="field narrow">
                  <span class="lbl">Rebaja %</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.discountPct}
                    placeholder="0"
                    disabled={state.saving}
                  />
                </label>
                <button
                  type="button"
                  class="remove"
                  on:click={() => removeLine(i)}
                  disabled={lines.length <= 1 || state.saving}
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
              <Button type="button" variant="secondary" on:click={resetForm} disabled={state.saving}>
                Limpiar
              </Button>
              <Button type="submit" disabled={state.saving}>
                {state.saving ? 'Registrando…' : 'Registrar venta'}
              </Button>
            </div>
          </div>
        </form>
      {/if}
    </Card>

    <Card>
      <h2>Historial ({sales.length})</h2>
      {#if state.status === 'loading' && sales.length === 0}
        <p class="muted">Cargando ventas…</p>
      {:else if sales.length === 0}
        <p class="muted">Aún no hay ventas registradas.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fecha</th>
                <th>Unidad</th>
                <th class="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each sales as s (s.id)}
                <tr>
                  <td class="mono">{s.number}</td>
                  <td>{s.date}</td>
                  <td>{s.unitName || 'Almacén'}</td>
                  <td class="num"><Money amount={s.total} currency={s.currency} /></td>
                  <td><span class="pill">{s.status || '—'}</span></td>
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
  .pos {
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
    max-width: 56ch;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .charts {
    display: grid;
    gap: 12px;
  }
  @media (min-width: 900px) {
    .charts {
      grid-template-columns: 1.2fr 1fr;
    }
  }
  .layout {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: 1.2fr 0.9fr;
      align-items: start;
    }
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 0.5rem;
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
  .lbl {
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  select,
  .field input,
  .line-row input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, var(--ap-bg, transparent));
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.88rem;
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
    grid-template-columns: 1fr 72px 88px 72px 32px;
    gap: 8px;
    align-items: end;
  }
  @media (max-width: 720px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
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
  }
  .remove:disabled {
    opacity: 0.35;
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
  .muted {
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
