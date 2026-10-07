<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { CostingState, CostingStore } from '../stores/costingStore';
  import {
    buildPriceDashboard,
    filterAndSortPriceSheets,
    priceStatus,
    relativeTime,
    resolveLiveCost,
    statusLabel,
    suggestedFromMarkup,
    type PriceFilter,
    type PriceSort,
  } from '../viewmodels/priceDashboard';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleSheetsPayload, seedSheetsViaStore } from '../dev/sheetsSeed';

  export let store: CostingStore;

  let state: CostingState = store.getState();

  let productId = '';
  let productQuery = '';
  let productPickerOpen = false;
  let markupPct = '25';
  let priceOverride = '';
  let notes = '';
  let formError = '';
  let editingId = '';

  let searchQ = '';
  let listFilter: PriceFilter = 'all';
  let listSort: PriceSort = 'recent';

  onMount(() => {
    const unsub = store.subscribe((s: CostingState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function num(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    const s = String(value).trim();
    if (s === '') return undefined;
    const parsed = parseFloat(s);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function productLabel(p: { code?: string; name?: string }): string {
    return `${p.code || '—'} · ${p.name || ''}`.trim();
  }

  function filterProducts(list: typeof state.products, query: string, limit = 12) {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, limit);
    return list
      .filter((p) => {
        const hay = `${p.code || ''} ${p.name || ''} ${p.category || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, limit);
  }

  $: productIdsWithPrice = new Set(state.priceSheets.map((s) => s.productId));
  $: dashboard = buildPriceDashboard(state.priceSheets, state.products, state.costSheets);
  $: sheetCurrency = state.priceSheets[0]?.currency || '';

  $: liveCost = productId
    ? resolveLiveCost(productId, state.products, state.costSheets)
    : { cost: 0, origin: 'none' as const, isComposite: false };

  $: markupN = num(markupPct) ?? 25;
  $: suggestedLive =
    num(priceOverride) !== undefined && (num(priceOverride) as number) > 0
      ? (num(priceOverride) as number)
      : suggestedFromMarkup(liveCost.cost, markupN);

  $: selectedProduct = state.products.find((p) => p.id === productId);
  $: vigenteLive =
    selectedProduct?.priceSale && selectedProduct.priceSale > 0
      ? selectedProduct.priceSale
      : 0;

  $: formStatus = priceStatus(suggestedLive, vigenteLive || suggestedLive, liveCost.cost);

  $: filteredSheets = filterAndSortPriceSheets(
    state.priceSheets,
    state.products,
    state.costSheets,
    searchQ,
    listFilter,
    listSort,
  );

  function onProductQuery(value: string) {
    productQuery = value;
    productId = '';
    productPickerOpen = true;
  }

  function selectProduct(id: string) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const existing = state.priceSheets.find((s) => s.productId === p.id);
    if (existing) {
      loadSheet(existing);
      return;
    }
    productId = p.id;
    productQuery = productLabel(p);
    productPickerOpen = false;
    editingId = '';
    const live = resolveLiveCost(p.id, state.products, state.costSheets);
    markupPct = '25';
    priceOverride = '';
    notes = '';
    formError = '';
    if (live.cost <= 0) {
      formError = 'Este producto no tiene costo vigente (recepción confirmada o ficha de costo).';
    }
  }

  function loadSheet(sheet: (typeof state.priceSheets)[number]) {
    editingId = sheet.id;
    productId = sheet.productId;
    productQuery = productLabel({ code: sheet.productCode, name: sheet.productName });
    markupPct = sheet.marginPct ? String(sheet.marginPct) : '25';
    priceOverride = '';
    notes = sheet.notes || '';
    formError = '';
    productPickerOpen = false;
  }

  function resetForm() {
    productId = '';
    productQuery = '';
    markupPct = '25';
    priceOverride = '';
    notes = '';
    editingId = '';
    formError = '';
    productPickerOpen = false;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!productId) {
      formError = 'Seleccione un producto del catálogo';
      return;
    }
    const cost = liveCost.cost;
    const markup = num(markupPct);
    const manual = num(priceOverride);
    if ((!markup || markup <= 0) && (!manual || manual <= 0)) {
      formError = 'Indique markup % o un precio manual';
      return;
    }
    if (cost <= 0 && (!manual || manual <= 0)) {
      formError = 'Sin costo vigente: fije un precio manual o registre costo del producto';
      return;
    }
    try {
      await store.savePriceSheet({
        productId,
        costRef: cost > 0 ? cost : undefined,
        marginPct: markup,
        price: manual && manual > 0 ? manual : undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo guardar la ficha de precio';
    }
  }

  async function handleDelete(sheet: (typeof state.priceSheets)[number]) {
    if (!confirm(`¿Eliminar ficha de precio de «${sheet.productName || sheet.productCode}»?`)) return;
    try {
      await store.removePriceSheet(sheet.id);
      if (editingId === sheet.id) resetForm();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo eliminar';
    }
  }

  function fmtPct(n: number): string {
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
  }

  function sheetCardModel(sheet: (typeof state.priceSheets)[number]) {
    const live = resolveLiveCost(sheet.productId, state.products, state.costSheets);
    const cost = live.cost > 0 ? live.cost : sheet.costRef;
    const sug = suggestedFromMarkup(cost, sheet.marginPct);
    const prod = state.products.find((p) => p.id === sheet.productId);
    const vigente = prod?.priceSale && prod.priceSale > 0 ? prod.priceSale : sheet.price;
    const st = priceStatus(sug, vigente, cost);
    const costChanged = cost > 0 && sheet.costRef > 0 && Math.abs(cost - sheet.costRef) > 0.005;
    return { live, cost, sug, vigente, st, costChanged };
  }
</script>

<section class="price-page">
  <DevSeedPanel
    title="Seed fichas de costo y precio"
    description="JSON de ejemplo. Requiere productos en el nomenclador."
    sample={buildSampleSheetsPayload()}
    onSeed={(data) => seedSheetsViaStore(store, data)}
  />

  <!-- Stats -->
  <div class="stats-rail" role="region" aria-label="Resumen de fichas de precio">
    <div
      class="stat-chip"
      title="Productos con ficha de precio. Al guardar se publica el precio en el canal de venta (POS)."
    >
      <span class="stat-ico" aria-hidden="true">🏷</span>
      <div>
        <p class="stat-val">{dashboard.sheetsCount}</p>
        <p class="stat-lbl">Fichas de precio</p>
      </div>
    </div>
    <div
      class="stat-chip"
      title="Productos del catálogo sin ficha de precio (aún no tienen regla de markup publicada)."
    >
      <span class="stat-ico" aria-hidden="true">📭</span>
      <div>
        <p class="stat-val">{dashboard.withoutSheetCount}</p>
        <p class="stat-lbl">Sin ficha de precio</p>
      </div>
    </div>
    <div
      class="stat-chip warn"
      title="Precio de venta (POS) por debajo del sugerido con el costo y markup actuales."
    >
      <span class="stat-ico" aria-hidden="true">⚠</span>
      <div>
        <p class="stat-val">{dashboard.belowSuggestedCount}</p>
        <p class="stat-lbl">Bajo el sugerido</p>
      </div>
    </div>
    <div class="stat-chip ok" title="Precio vigente alineado con el sugerido (tolerancia ~0,5%).">
      <span class="stat-ico" aria-hidden="true">✓</span>
      <div>
        <p class="stat-val">{dashboard.okCount}</p>
        <p class="stat-lbl">Dentro del objetivo</p>
      </div>
    </div>
    <div
      class="stat-chip"
      title="Requieren revisión: bajo sugerido, bajo costo o sin precio de venta."
    >
      <span class="stat-ico" aria-hidden="true">🔎</span>
      <div>
        <p class="stat-val">{dashboard.needsReviewCount}</p>
        <p class="stat-lbl">Requieren revisión</p>
      </div>
    </div>
    <div class="stat-chip" title="Promedio del markup % sobre costo configurado en las fichas.">
      <span class="stat-ico" aria-hidden="true">%</span>
      <div>
        <p class="stat-val">{dashboard.avgMarkup.toFixed(1)}</p>
        <p class="stat-lbl">Markup medio</p>
      </div>
    </div>
  </div>

  <!-- Variaciones -->
  <Card>
    <div class="var-head">
      <h2>Variaciones de costo / precio · últimos 7 días</h2>
      <p class="muted">
        Si cambió el costo (base o ficha), se recalcula el <strong>precio sugerido</strong> con el
        markup de la ficha. El precio vigente del POS <strong>no se cambia solo</strong>: hay que
        republicar la ficha.
      </p>
    </div>
    {#if dashboard.variations.length === 0}
      <p class="muted empty-var">Sin variaciones de costo con impacto en precio esta semana.</p>
    {:else}
      <ul class="var-list">
        {#each dashboard.variations as row (row.productId)}
          <li class="var-row" class:up={row.direction === 'up'} class:down={row.direction === 'down'}>
            <div class="var-name">
              <strong>{row.productCode || '—'}</strong>
              <span class="muted">{row.productName}</span>
              <span class="badge-st" class:warn={row.status === 'below_suggested' || row.status === 'below_cost'}
                >{statusLabel(row.status)}</span
              >
            </div>
            <div class="var-prices">
              <span class="muted">Costo</span>
              <Money amount={row.costPrev} currency={sheetCurrency} />
              <span class="arrow-sep">→</span>
              <Money amount={row.costCur} currency={sheetCurrency} />
              <span class="pct" class:up={row.direction === 'up'} class:down={row.direction === 'down'}
                >{fmtPct(row.costPct)}</span
              >
            </div>
            <div class="var-prices">
              <span class="muted">Sugerido</span>
              <Money amount={row.suggestedPrev} currency={sheetCurrency} />
              <span class="arrow-sep">→</span>
              <Money amount={row.suggestedCur} currency={sheetCurrency} />
            </div>
            <div class="var-vigente">
              <span class="muted">Vigente POS</span>
              <Money amount={row.vigente} currency={sheetCurrency} />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <div class="workspace">
    <!-- Form -->
    <aside class="col-form">
      <Card>
        <h2>{editingId ? 'Editar ficha de precio' : 'Nueva ficha de precio'}</h2>
        <p class="muted intro">
          Define el <strong>markup % sobre el costo</strong> (no es margen sobre el precio de venta).
          Guardar <strong>publica</strong> el precio en el producto para el POS.
        </p>

        <form onsubmit={handleSubmit}>
          <div class="field product-picker">
            <label class="lbl" for="price-product">Producto</label>
            <div class="picker-control">
              <input
                id="price-product"
                class="sel picker-input"
                type="text"
                value={productQuery}
                autocomplete="off"
                placeholder="Buscar por código o nombre…"
                oninput={(e) => onProductQuery((e.currentTarget as HTMLInputElement).value)}
                onfocus={() => (productPickerOpen = true)}
              />
              {#if productId}
                <button
                  type="button"
                  class="picker-clear"
                  title="Limpiar"
                  onclick={() => {
                    productId = '';
                    productQuery = '';
                    productPickerOpen = true;
                  }}>×</button
                >
              {/if}
            </div>
            {#if productPickerOpen}
              {@const matches = filterProducts(state.products, productQuery)}
              <ul class="picker-list" role="listbox">
                {#if matches.length === 0}
                  <li class="picker-empty">No se encontró el producto en el catálogo</li>
                {:else}
                  {#each matches as p (p.id)}
                    <li role="option">
                      <button
                        type="button"
                        class="picker-option"
                        class:selected={p.id === productId}
                        onclick={() => selectProduct(p.id)}
                      >
                        <span class="po-main"
                          >{productLabel(p)}{productIdsWithPrice.has(p.id) ? ' · tiene ficha' : ''}</span
                        >
                        <span class="po-unit">{p.unit || ''}</span>
                      </button>
                    </li>
                  {/each}
                {/if}
              </ul>
            {/if}
          </div>

          {#if productId}
            <div class="cost-box">
              <div class="cost-row">
                <span>Tipo</span>
                <strong>{liveCost.isComposite ? 'Producto compuesto' : 'Producto base'}</strong>
              </div>
              <div class="cost-row">
                <span
                  >{liveCost.origin === 'sheet'
                    ? 'Costo de ficha'
                    : liveCost.origin === 'avg'
                      ? 'Costo promedio / std'
                      : 'Costo'}</span
                >
                <strong
                  ><Money amount={liveCost.cost} currency={sheetCurrency} /></strong
                >
              </div>
              {#if vigenteLive > 0}
                <div class="cost-row">
                  <span>Precio vigente (POS)</span>
                  <strong><Money amount={vigenteLive} currency={sheetCurrency} /></strong>
                </div>
              {/if}
            </div>
          {/if}

          <div class="params grid">
            <Input
              id="price-markup"
              label="Markup % sobre costo"
              type="number"
              step="any"
              bind:value={markupPct}
              placeholder="25"
            />
            <Input
              id="price-manual"
              label="Precio manual (opcional)"
              type="number"
              step="any"
              bind:value={priceOverride}
              placeholder="Calculado si vacío"
            />
          </div>
          <p class="muted formula">
            Fórmula: precio = costo × (1 + markup/100). Ejemplo: costo 100 + markup 30 % → 130.
          </p>

          <Input id="price-notes" label="Notas (obligatorio si precio &lt; costo)" bind:value={notes} />

          <div class="suggest-box" aria-live="polite">
            <span class="sug-label">Precio sugerido / a publicar</span>
            <p class="sug-value"><Money amount={suggestedLive} currency={sheetCurrency} /></p>
            <p class="muted">
              Costo {liveCost.cost.toFixed(2)} · Markup {markupN}%
              {#if num(priceOverride)}
                · precio manual
              {/if}
            </p>
            {#if productId && vigenteLive > 0}
              <p class="status-line" class:warn={formStatus === 'below_suggested' || formStatus === 'below_cost'}>
                {statusLabel(formStatus)}
                {#if Math.abs(suggestedLive - vigenteLive) > 0.005}
                  · Δ
                  <Money amount={suggestedLive - vigenteLive} currency={sheetCurrency} />
                {/if}
              </p>
            {/if}

            <!-- Barra Costo | Markup | Precio -->
            {#if suggestedLive > 0 && liveCost.cost > 0}
              {@const costW = Math.min(100, (liveCost.cost / suggestedLive) * 100)}
              {@const markW = Math.max(0, 100 - costW)}
              <div class="stack-bar" title="Costo vs markup dentro del precio">
                <div class="seg cost" style={`width:${costW}%`}></div>
                <div class="seg mark" style={`width:${markW}%`}></div>
              </div>
              <div class="stack-legend">
                <span><i class="dot cost"></i> Costo</span>
                <span><i class="dot mark"></i> Markup</span>
              </div>
            {/if}
          </div>

          {#if formError}
            <p class="err">{formError}</p>
          {/if}
          {#if state.error}
            <p class="err">{state.error}</p>
          {/if}

          <div class="actions">
            {#if editingId}
              <Button type="button" variant="ghost" disabled={state.saving} onclick={resetForm}
                >Cancelar</Button
              >
            {/if}
            <Button type="submit" disabled={state.saving || !productId}>
              {state.saving ? 'Publicando…' : editingId ? 'Actualizar y publicar' : 'Guardar y publicar en POS'}
            </Button>
          </div>
        </form>
      </Card>
    </aside>

    <!-- List -->
    <section class="col-list" aria-label="Fichas de precio">
      <div class="list-toolbar">
        <Input id="price-search" label="Buscar" bind:value={searchQ} placeholder="Nombre o código…" />
        <div class="field">
          <label class="lbl" for="price-filter">Filtro</label>
          <select id="price-filter" class="sel" bind:value={listFilter}>
            <option value="all">Todas</option>
            <option value="base">Productos base</option>
            <option value="composite">Compuestos</option>
            <option value="below">Bajo el sugerido</option>
            <option value="ok">Dentro del objetivo</option>
            <option value="review">Requieren revisión</option>
          </select>
        </div>
        <div class="field">
          <label class="lbl" for="price-sort">Orden</label>
          <select id="price-sort" class="sel" bind:value={listSort}>
            <option value="recent">Más recientes</option>
            <option value="cost_desc">Mayor costo</option>
            <option value="cost_asc">Menor costo</option>
            <option value="price_desc">Mayor precio</option>
            <option value="price_asc">Menor precio</option>
            <option value="markup_desc">Mayor markup</option>
          </select>
        </div>
      </div>

      <div class="cards-scroll">
        {#if filteredSheets.length === 0}
          <p class="muted empty-list">No hay fichas que coincidan.</p>
        {:else}
          <div class="cards-grid">
            {#each filteredSheets as sheet (sheet.id || sheet.productId)}
              {@const m = sheetCardModel(sheet)}
              <article class="sheet-card">
                <header class="card-head">
                  <div>
                    <h3 class="card-name">{sheet.productName || '—'}</h3>
                    <p class="card-code">{sheet.productCode}</p>
                    <span class="badge-type"
                      >{m.live.isComposite ? 'Compuesto' : 'Base'}</span
                    >
                    <span
                      class="badge-st"
                      class:warn={m.st === 'below_suggested' || m.st === 'below_cost'}
                      class:ok={m.st === 'ok'}>{statusLabel(m.st)}</span
                    >
                  </div>
                  <div class="card-final">
                    <span class="final-label">Sugerido</span>
                    <p class="final-value">
                      <Money amount={m.sug} currency={sheet.currency || sheetCurrency} />
                    </p>
                  </div>
                </header>

                {#if m.sug > 0 && m.cost > 0}
                  {@const costW = Math.min(100, (m.cost / m.sug) * 100)}
                  <div class="stack-bar compact">
                    <div class="seg cost" style={`width:${costW}%`}></div>
                    <div class="seg mark" style={`width:${100 - costW}%`}></div>
                  </div>
                {/if}

                <div class="card-breakdown">
                  <div class="bd-row">
                    <span>Costo actual</span>
                    <Money amount={m.cost} currency={sheet.currency} />
                  </div>
                  <div class="bd-row">
                    <span>Markup</span>
                    <span>{(sheet.marginPct || 0).toFixed(1)} %</span>
                  </div>
                  <div class="bd-row">
                    <span>Vigente POS</span>
                    <Money amount={m.vigente} currency={sheet.currency} />
                  </div>
                  {#if m.costChanged}
                    <div class="bd-row warn-text">
                      <span>Costo vs ficha</span>
                      <span
                        >ref <Money amount={sheet.costRef} currency={sheet.currency} /> → vivo</span
                      >
                    </div>
                  {/if}
                </div>

                <footer class="card-foot">
                  <span class="meta">{relativeTime(sheet.updatedAt)}</span>
                </footer>

                <div class="card-actions">
                  <Button type="button" variant="secondary" size="sm" onclick={() => loadSheet(sheet)}
                    >Editar</Button
                  >
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={state.saving}
                    onclick={() => handleDelete(sheet)}>Eliminar</Button
                  >
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  </div>
</section>

<style>
  .price-page {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
  }
  .stats-rail {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
  }
  .stat-chip {
    flex: 1 0 auto;
    min-width: 128px;
    max-width: 180px;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border, var(--color-border));
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .stat-chip.warn {
    border-color: color-mix(in srgb, #e8a35d 45%, var(--ap-border));
  }
  .stat-chip.ok {
    border-color: color-mix(in srgb, #3ecf8e 40%, var(--ap-border));
  }
  .stat-ico {
    width: 1.4rem;
    text-align: center;
  }
  .stat-val {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stat-lbl {
    margin: 0.05rem 0 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ap-text-muted);
  }
  .var-head h2 {
    margin: 0 0 0.2rem;
    font-size: 1rem;
  }
  .var-list {
    list-style: none;
    margin: 0.65rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 240px;
    overflow-y: auto;
  }
  .var-row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
  }
  .var-row.up {
    border-color: color-mix(in srgb, #e85d5d 28%, var(--ap-border));
  }
  .var-row.down {
    border-color: color-mix(in srgb, #3ecf8e 28%, var(--ap-border));
  }
  .var-name {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .var-prices,
  .var-vigente {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .arrow-sep {
    opacity: 0.45;
  }
  .pct.up {
    color: #e85d5d;
    font-weight: 700;
  }
  .pct.down {
    color: #3ecf8e;
    font-weight: 700;
  }
  .workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  @media (min-width: 1024px) {
    .workspace {
      grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);
      height: min(72vh, 900px);
    }
    .col-form {
      overflow-y: auto;
      min-height: 0;
    }
    .col-list {
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }
    .cards-scroll {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
  }
  .list-toolbar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }
  @media (min-width: 640px) {
    .list-toolbar {
      grid-template-columns: 1.4fr 1fr 1fr;
      align-items: end;
    }
  }
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @media (min-width: 900px) {
    .cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .sheet-card {
    border: 1px solid var(--ap-border);
    border-radius: 16px;
    background: var(--ap-bg-elevated, var(--color-surface));
    padding: 0.85rem 0.95rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    animation: cardIn 0.35s ease both;
  }
  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .card-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }
  .card-code {
    margin: 0.1rem 0;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
  }
  .badge-type,
  .badge-st {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.12rem 0.4rem;
    border-radius: 999px;
    margin-right: 0.25rem;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 14%, transparent);
  }
  .badge-st.warn {
    background: color-mix(in srgb, #e8a35d 22%, transparent);
    color: #e8a35d;
  }
  .badge-st.ok {
    background: color-mix(in srgb, #3ecf8e 18%, transparent);
    color: #3ecf8e;
  }
  .final-label {
    font-size: 0.65rem;
    font-weight: 650;
    text-transform: uppercase;
    color: var(--ap-text-muted);
  }
  .final-value {
    margin: 0.1rem 0;
    font-size: 1.1rem;
    font-weight: 800;
  }
  .card-breakdown {
    font-size: 0.8rem;
  }
  .bd-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: var(--ap-text-secondary);
    padding: 0.15rem 0;
  }
  .warn-text {
    color: #e8a35d;
  }
  .card-foot {
    display: flex;
    justify-content: space-between;
  }
  .meta {
    font-size: 0.72rem;
    color: var(--ap-text-muted);
  }
  .card-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
  }
  h2 {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
  }
  .intro {
    margin: 0 0 0.75rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger, #e85d5d);
    font-size: 0.82rem;
  }
  .formula {
    margin: -0.25rem 0 0.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0 0.6rem;
  }
  .field {
    min-width: 0;
  }
  .lbl {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.25rem;
  }
  .sel {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.88rem;
    margin-bottom: 0.35rem;
  }
  .product-picker {
    position: relative;
  }
  .picker-control {
    position: relative;
    display: flex;
    align-items: center;
  }
  .picker-input {
    margin-bottom: 0 !important;
    padding-right: 2rem;
  }
  .picker-clear {
    position: absolute;
    right: 0.4rem;
    border: none;
    background: transparent;
    color: var(--ap-text-muted);
    cursor: pointer;
    font-size: 1.1rem;
  }
  .picker-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 4px;
    position: absolute;
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 220px;
    overflow-y: auto;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, #171b29);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  }
  .picker-option {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    text-align: left;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ap-text);
    cursor: pointer;
    font-size: 0.82rem;
    font-family: inherit;
  }
  .picker-option:hover,
  .picker-option.selected {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
  }
  .po-unit {
    font-size: 0.68rem;
    font-weight: 650;
    text-transform: uppercase;
    color: var(--ap-text-muted);
  }
  .picker-empty {
    padding: 8px 10px;
    font-size: 0.78rem;
    color: var(--ap-text-muted);
  }
  .cost-box {
    margin: 0.5rem 0 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    font-size: 0.84rem;
  }
  .cost-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.2rem 0;
  }
  .suggest-box {
    margin: 0.75rem 0;
    padding: 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 7%, var(--ap-bg-elevated));
  }
  .sug-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ap-text-muted);
  }
  .sug-value {
    margin: 0.2rem 0;
    font-size: 1.45rem;
    font-weight: 800;
  }
  .status-line.warn {
    color: #e8a35d;
    font-weight: 650;
  }
  .stack-bar {
    display: flex;
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 0.55rem;
    background: var(--ap-border);
  }
  .stack-bar.compact {
    height: 8px;
    margin: 0.15rem 0;
  }
  .seg.cost {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 75%, #888);
  }
  .seg.mark {
    background: color-mix(in srgb, #7c6af0 80%, #aaa);
  }
  .stack-legend {
    display: flex;
    gap: 0.85rem;
    margin-top: 0.35rem;
    font-size: 0.72rem;
    color: var(--ap-text-muted);
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
  }
  .dot.cost {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 75%, #888);
  }
  .dot.mark {
    background: color-mix(in srgb, #7c6af0 80%, #aaa);
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .empty-list,
  .empty-var {
    margin: 0.4rem 0 0;
  }
  @media (max-width: 720px) {
    .var-row {
      grid-template-columns: 1fr;
    }
  }
</style>
