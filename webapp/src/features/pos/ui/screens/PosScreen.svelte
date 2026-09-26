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
  import {
    LOW_STOCK_THRESHOLD,
    sortStockBoard,
    stockLevelMeta,
    type StockBoardRow,
    type StockLevel,
  } from '../../domain/stockStatus';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSamplePosSalesPayload, seedPosSalesViaStore } from '../dev/salesSeed';

  export let store: PosStore;
  /** Rol de sesión: vendedor | admin | master | … */
  export let userRole: string = '';
  /** Nombre a mostrar / fijar como vendedor (displayName o username). */
  export let userDisplayName: string = '';
  /** Candidatos extra para autocomplete (p.ej. usuarios rol vendedor). */
  export let sellerOptions: string[] = [];

  type DraftLine = {
    productId: string;
    qty: string;
    unitPrice: string;
    discountPct: string;
  };

  type StockFilter = 'all' | StockLevel;

  let state: PosState = store.getState();
  let unitId = '';
  let seller = '';
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let lines: DraftLine[] = [{ productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  let formError = '';
  let formOk = '';
  let stockFilter: StockFilter = 'all';
  let stockQuery = '';

  const isSellerRole = () => {
    const r = (userRole || '').toLowerCase();
    return r === 'vendedor' || r === 'seller';
  };
  const canPickSeller = () => {
    const r = (userRole || '').toLowerCase();
    return r === 'admin' || r === 'master' || r === 'contador' || r === 'economico' || !isSellerRole();
  };

  onMount(() => {
    const unsub = store.subscribe((s: PosState) => {
      state = s;
    });
    void store.loadAll();
    if (isSellerRole() && userDisplayName) {
      seller = userDisplayName;
    }
    return unsub;
  });

  $: products = state.products ?? [];
  $: units = state.units ?? [];
  $: sales = [...(state.sales ?? [])].reverse();
  $: recentSales = sales.slice(0, 8);
  $: dailySales = salesByDay(state.sales) as ChartPoint[];
  $: unitSplit = salesByUnit(state.sales) as ChartPoint[];
  $: topProducts = topSoldProducts(state.sales) as ChartPoint[];
  $: totals = salesTotals(state.sales);
  $: saleCurrency =
    state.sales[0]?.currency ||
    state.warehouseRows[0]?.currency ||
    '';

  $: sellerLocked = isSellerRole();
  $: showAnalytics = canPickSeller() && !isSellerRole();

  /** Candidatos autocomplete: props + vendedores de ventas previas. */
  $: sellerSuggestions = (() => {
    const set = new Set<string>();
    for (const s of sellerOptions) {
      const t = (s || '').trim();
      if (t) set.add(t);
    }
    for (const sale of state.sales ?? []) {
      const t = (sale.seller || '').trim();
      if (t) set.add(t);
    }
    if (userDisplayName.trim()) set.add(userDisplayName.trim());
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  })();

  $: estimated = lines.reduce((acc, line) => {
    const price = parseFloat(line.unitPrice) || priceOf(line.productId);
    const gross = (parseFloat(line.qty) || 0) * price;
    const discount = gross * ((parseFloat(line.discountPct) || 0) / 100);
    return acc + gross - discount;
  }, 0);

  function priceOf(productId: string): number {
    return products.find((p) => p.id === productId)?.priceSale ?? 0;
  }

  /** Stock según unidad seleccionada o almacén central. */
  function stockOf(productId: string): number {
    if (unitId) {
      const row = (state.unitStocks ?? []).find(
        (s) => s.unitId === unitId && s.productId === productId,
      );
      return row?.qty ?? 0;
    }
    const row = (state.warehouseRows ?? []).find((r) => r.productId === productId);
    return row?.qty ?? 0;
  }

  $: stockBoard = (() => {
    const rows: StockBoardRow[] = products.map((p) => {
      const qty = stockOf(p.id);
      return {
        productId: p.id,
        code: p.code || '—',
        name: p.name,
        qty,
        priceSale: p.priceSale ?? 0,
        unit: p.unit,
        meta: stockLevelMeta(qty),
      };
    });
    let list = sortStockBoard(rows);
    if (stockFilter !== 'all') {
      list = list.filter((r) => r.meta.level === stockFilter);
    }
    const q = stockQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q),
      );
    }
    return list;
  })();

  $: stockCounts = (() => {
    const all = products.map((p) => stockLevelMeta(stockOf(p.id)).level);
    return {
      all: all.length,
      out: all.filter((l) => l === 'out').length,
      low: all.filter((l) => l === 'low').length,
      ok: all.filter((l) => l === 'ok').length,
    };
  })();

  /** Productos vendibles: con stock > 0 en ubicación actual, ordenados por menos stock. */
  $: sellableProducts = (() => {
    return [...products]
      .map((p) => ({ p, qty: stockOf(p.id) }))
      .filter((x) => x.qty > 0)
      .sort((a, b) => a.qty - b.qty || a.p.name.localeCompare(b.p.name, 'es'))
      .map((x) => x.p);
  })();

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

  function quickAdd(productId: string) {
    const qty = stockOf(productId);
    if (qty <= 0) return;
    const emptyIdx = lines.findIndex((l) => !l.productId);
    if (emptyIdx >= 0) {
      onProductChange(emptyIdx, productId);
      return;
    }
    const price = priceOf(productId);
    lines = [
      ...lines,
      {
        productId,
        qty: '1',
        unitPrice: price > 0 ? String(price) : '',
        discountPct: '',
      },
    ];
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '1', unitPrice: '', discountPct: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    if (!sellerLocked) seller = '';
    else if (userDisplayName) seller = userDisplayName;
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
      if (qty > available) {
        formError = `Stock insuficiente para ${productLabel(line.productId)} (disp. ${available})`;
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
        err instanceof Error ? err.message : state.error || 'No se pudo registrar la venta';
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
        {#if sellerLocked}
          Venta rápida · stock y tickets. Vendedor fijado a tu sesión.
        {:else}
          Venta de mostrador. Prioriza stock bajo/agotado. Con unidad se descuenta de esa unidad;
          sin unidad, del almacén central.
        {/if}
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

  <!-- KPIs ligeros para todos: alertas de stock (útiles al vendedor) -->
  <div class="kpi-row">
    <button
      type="button"
      class="kpi kpi-danger"
      class:active={stockFilter === 'out'}
      on:click={() => (stockFilter = stockFilter === 'out' ? 'all' : 'out')}
    >
      <span class="kpi-ico" aria-hidden="true">⛔</span>
      <div>
        <strong>{stockCounts.out}</strong>
        <span>Agotados</span>
      </div>
    </button>
    <button
      type="button"
      class="kpi kpi-warn"
      class:active={stockFilter === 'low'}
      on:click={() => (stockFilter = stockFilter === 'low' ? 'all' : 'low')}
    >
      <span class="kpi-ico" aria-hidden="true">⚠️</span>
      <div>
        <strong>{stockCounts.low}</strong>
        <span>Bajo stock (≤{LOW_STOCK_THRESHOLD})</span>
      </div>
    </button>
    <button
      type="button"
      class="kpi kpi-ok"
      class:active={stockFilter === 'ok'}
      on:click={() => (stockFilter = stockFilter === 'ok' ? 'all' : 'ok')}
    >
      <span class="kpi-ico" aria-hidden="true">✅</span>
      <div>
        <strong>{stockCounts.ok}</strong>
        <span>Habilitados</span>
      </div>
    </button>
    <div class="kpi kpi-neutral">
      <span class="kpi-ico" aria-hidden="true">📦</span>
      <div>
        <strong>{stockCounts.all}</strong>
        <span>Productos</span>
      </div>
    </div>
  </div>

  {#if showAnalytics}
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
  {/if}

  <div class="layout">
    <!-- FORMULARIO: foco del vendedor -->
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
              {#if sellerLocked}
                <input
                  type="text"
                  value={seller}
                  readonly
                  class="locked"
                  title="Fijado por tu sesión de vendedor"
                />
              {:else}
                <input
                  type="text"
                  list="pos-seller-suggestions"
                  bind:value={seller}
                  placeholder="Buscar o escribir…"
                  autocomplete="off"
                  disabled={state.saving}
                />
                <datalist id="pos-seller-suggestions">
                  {#each sellerSuggestions as s}
                    <option value={s} />
                  {/each}
                </datalist>
              {/if}
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
                        {p.code || '—'} · {p.name} · disp. {stockOf(p.id)}
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
                  disabled={state.saving}
                  aria-label="Quitar línea"
                >
                  ×
                </button>
              </div>
            {/each}
          </div>

          <div class="form-foot">
            <div class="est">
              <span class="lbl">Total estimado</span>
              <strong><Money amount={estimated} currency={saleCurrency} /></strong>
            </div>
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Registrando…' : 'Cobrar / Registrar'}
            </Button>
          </div>
        </form>
      {/if}
    </Card>

    <!-- STOCK BOARD: información útil al vendedor -->
    <Card>
      <div class="card-head">
        <h2>Stock {unitId ? 'en unidad' : 'central'}</h2>
        <span class="muted-sm">Menor stock primero · clic = añadir línea</span>
      </div>

      <div class="stock-tools">
        <input
          type="search"
          class="stock-search"
          placeholder="Buscar código o nombre…"
          bind:value={stockQuery}
        />
        <div class="chips">
          <button type="button" class="chip" class:on={stockFilter === 'all'} on:click={() => (stockFilter = 'all')}>
            Todos ({stockCounts.all})
          </button>
          <button type="button" class="chip chip-danger" class:on={stockFilter === 'out'} on:click={() => (stockFilter = 'out')}>
            Agotado
          </button>
          <button type="button" class="chip chip-warn" class:on={stockFilter === 'low'} on:click={() => (stockFilter = 'low')}>
            Bajo
          </button>
          <button type="button" class="chip chip-ok" class:on={stockFilter === 'ok'} on:click={() => (stockFilter = 'ok')}>
            Habilitado
          </button>
        </div>
      </div>

      {#if stockBoard.length === 0}
        <p class="muted">Sin productos en este filtro.</p>
      {:else}
        <ul class="stock-list">
          {#each stockBoard as row (row.productId)}
            <li>
              <button
                type="button"
                class="stock-row"
                class:disabled={row.meta.level === 'out'}
                disabled={row.meta.level === 'out' || state.saving}
                on:click={() => quickAdd(row.productId)}
                title={row.meta.level === 'out' ? 'Sin stock' : 'Añadir a la venta'}
              >
                <span class="status status-{row.meta.tone}" title={row.meta.label}>
                  {#if row.meta.level === 'out'}
                    <span class="status-ico" aria-hidden="true">⛔</span>
                  {:else if row.meta.level === 'low'}
                    <span class="status-ico" aria-hidden="true">⚠️</span>
                  {:else}
                    <span class="status-ico" aria-hidden="true">✅</span>
                  {/if}
                  <span class="status-lbl">{row.meta.label}</span>
                </span>
                <span class="stock-meta">
                  <span class="stock-code">{row.code}</span>
                  <span class="stock-name">{row.name}</span>
                </span>
                <span class="stock-qty" class:qty-out={row.meta.level === 'out'} class:qty-low={row.meta.level === 'low'}>
                  {row.qty}
                  {#if row.unit}<span class="u">{row.unit}</span>{/if}
                </span>
                <span class="stock-price">
                  <Money amount={row.priceSale} currency={saleCurrency} />
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>
  </div>

  <!-- Tickets recientes: útil al vendedor (consulta rápida) -->
  <Card>
    <div class="card-head">
      <h2>Últimos tickets</h2>
      <span class="muted-sm">{recentSales.length} de {sales.length}</span>
    </div>
    {#if recentSales.length === 0}
      <p class="muted">Aún no hay ventas registradas.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Fecha</th>
              <th>Vendedor</th>
              <th>Unidad</th>
              <th class="num">Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {#each recentSales as s (s.id)}
              <tr>
                <td>{s.number || '—'}</td>
                <td>{s.date || '—'}</td>
                <td>{s.seller || '—'}</td>
                <td>{s.unitName || 'Central'}</td>
                <td class="num"><Money amount={s.total} currency={s.currency || saleCurrency} /></td>
                <td><span class="pill">{s.status || '—'}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
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
    margin: 0;
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
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .kpi {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated));
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }
  .kpi-neutral {
    cursor: default;
  }
  .kpi strong {
    display: block;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
  }
  .kpi span:not(.kpi-ico) {
    font-size: 0.72rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .kpi-ico {
    font-size: 1.15rem;
    line-height: 1;
  }
  .kpi-danger {
    border-color: color-mix(in srgb, #f17b7b 45%, transparent);
  }
  .kpi-warn {
    border-color: color-mix(in srgb, #f0b429 45%, transparent);
  }
  .kpi-ok {
    border-color: color-mix(in srgb, #3ecf8e 45%, transparent);
  }
  .kpi.active {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-cyan, #61e6e1) 50%, transparent);
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
      grid-template-columns: 1.15fr 0.95fr;
      align-items: start;
    }
  }
  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 0.65rem;
  }
  .muted,
  .muted-sm {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.85rem;
  }
  .muted-sm {
    font-size: 0.72rem;
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
  .line-row input,
  .stock-search {
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
  input.locked {
    opacity: 0.85;
    cursor: not-allowed;
    background: color-mix(in srgb, var(--color-surface-soft, #1a2220) 70%, transparent);
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
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
  .remove {
    height: 40px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 1.25rem;
    cursor: pointer;
  }
  .form-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, var(--ap-border));
  }
  .est strong {
    font-size: 1.15rem;
  }
  .banner {
    margin: 0;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.88rem;
  }
  .banner.err {
    background: color-mix(in srgb, #f17b7b 16%, transparent);
    color: #f17b7b;
  }
  .banner.ok {
    background: color-mix(in srgb, #3ecf8e 16%, transparent);
    color: #3ecf8e;
  }
  .stock-tools {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .chip.on {
    border-color: var(--accent-cyan, #61e6e1);
    color: var(--accent-cyan, #61e6e1);
  }
  .chip-danger.on {
    border-color: #f17b7b;
    color: #f17b7b;
  }
  .chip-warn.on {
    border-color: #f0b429;
    color: #f0b429;
  }
  .chip-ok.on {
    border-color: #3ecf8e;
    color: #3ecf8e;
  }
  .stock-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 420px;
    overflow-y: auto;
  }
  .stock-row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(100px, 0.9fr) 1.4fr auto auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, transparent);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 120ms ease, transform 120ms ease;
  }
  .stock-row:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 50%, var(--color-border));
  }
  .stock-row:disabled,
  .stock-row.disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 650;
  }
  .status-danger {
    color: #f17b7b;
  }
  .status-warn {
    color: #f0b429;
  }
  .status-ok {
    color: #3ecf8e;
  }
  .status-ico {
    font-size: 0.9rem;
  }
  .stock-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .stock-code {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }
  .stock-name {
    font-size: 0.86rem;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stock-qty {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.95rem;
  }
  .qty-out {
    color: #f17b7b;
  }
  .qty-low {
    color: #f0b429;
  }
  .stock-qty .u {
    font-size: 0.65rem;
    font-weight: 500;
    margin-left: 2px;
    color: var(--color-text-muted);
  }
  .stock-price {
    font-size: 0.8rem;
    justify-self: end;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.35rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  th {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 18%, transparent);
  }
</style>
