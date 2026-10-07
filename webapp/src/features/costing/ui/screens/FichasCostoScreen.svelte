<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money, ConfirmDialog } from '../../../../infrastructure/ui/shared';
  import { DonutChart } from '../../../../infrastructure/ui/charts';
  import type { CostingState, CostingStore } from '../stores/costingStore';
  import {
    buildCostDashboard,
    filterAndSortSheets,
    type SheetFilter,
    type SheetSort,
  } from '../viewmodels/costDashboard';
  import {
    buildLivePreview,
    defaultDifficultyFactor,
    relativeTime,
    sheetCompositionPoints,
  } from '../viewmodels/costComposition';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleSheetsPayload, seedSheetsViaStore } from '../dev/sheetsSeed';

  export let store: CostingStore;

  let state: CostingState = store.getState();

  let productId = '';
  let productQuery = '';
  let formError = '';
  let editingProductId = '';
  let recipeLines: Array<{ productId: string; productQuery: string; qty: string }> = [
    { productId: '', productQuery: '', qty: '1' },
  ];
  let productPickerOpen = false;
  let componentPickerIndex: number | null = null;
  let laborMinutes = '';
  let difficultyLevel = '3';
  let difficultyFactor = '';
  let laborBaseRate = '';

  let searchQ = '';
  let listFilter: SheetFilter = 'all';
  let listSort: SheetSort = 'recent';

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

  function filterProducts(
    list: typeof state.products,
    query: string,
    limit = 12,
  ): typeof state.products {
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, limit);
    return list
      .filter((p) => {
        const hay = `${p.code || ''} ${p.name || ''} ${p.category || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, limit);
  }

  function onProductQueryInput(value: string) {
    if (editingProductId) return;
    productQuery = value;
    productId = '';
    productPickerOpen = true;
  }

  function selectMainProduct(id: string) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    productId = p.id;
    productQuery = productLabel(p);
    productPickerOpen = false;
  }

  function onComponentQuery(index: number, value: string) {
    const next = [...recipeLines];
    next[index] = { ...next[index], productQuery: value, productId: '' };
    recipeLines = next;
    componentPickerIndex = index;
  }

  function selectComponent(index: number, id: string) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const next = [...recipeLines];
    next[index] = {
      ...next[index],
      productId: p.id,
      productQuery: productLabel(p) + (productIdsWithSheet.has(p.id) ? ' (compuesto)' : ''),
    };
    recipeLines = next;
    componentPickerIndex = null;
  }

  $: productIdsWithSheet = new Set(state.costSheets.map((s) => s.productId));
  $: baseProductsForNewSheet = state.products.filter((p) => !productIdsWithSheet.has(p.id));
  $: dashboard = buildCostDashboard(state.costSheets, state.products);
  $: sheetCurrency =
    state.costSheets[0]?.currency ||
    '';

  $: live = buildLivePreview(
    recipeLines,
    num(laborMinutes) ?? 0,
    num(difficultyLevel) ?? 3,
    num(difficultyFactor),
    num(laborBaseRate) ?? 0,
    state.products,
    state.costSheets,
    productIdsWithSheet,
  );

  $: filteredSheets = filterAndSortSheets(state.costSheets, searchQ, listFilter, listSort);

  function resetForm() {
    productId = '';
    productQuery = '';
    recipeLines = [{ productId: '', productQuery: '', qty: '1' }];
    laborMinutes = '';
    difficultyLevel = '3';
    difficultyFactor = '';
    laborBaseRate = '';
    editingProductId = '';
    formError = '';
    productPickerOpen = false;
    componentPickerIndex = null;
  }

  function addRecipeLine() {
    recipeLines = [...recipeLines, { productId: '', productQuery: '', qty: '1' }];
  }

  function removeRecipeLine(i: number) {
    recipeLines = recipeLines.filter((_, idx) => idx !== i);
    if (recipeLines.length === 0) recipeLines = [{ productId: '', productQuery: '', qty: '1' }];
    if (componentPickerIndex === i) componentPickerIndex = null;
  }

  function loadSheetForEdit(sheet: (typeof state.costSheets)[number]) {
    editingProductId = sheet.productId;
    productId = sheet.productId;
    productQuery = productLabel({ code: sheet.productCode, name: sheet.productName });
    laborMinutes = sheet.laborMinutes ? String(sheet.laborMinutes) : '';
    difficultyLevel = sheet.difficultyLevel ? String(sheet.difficultyLevel) : '3';
    difficultyFactor = sheet.difficultyFactor ? String(sheet.difficultyFactor) : '';
    laborBaseRate = sheet.laborBaseRate ? String(sheet.laborBaseRate) : '';
    recipeLines = sheet.components?.length
      ? sheet.components.map((c) => ({
          productId: c.productId,
          productQuery: productLabel({ code: c.productCode, name: c.productName }),
          qty: String(c.qty),
        }))
      : [{ productId: '', productQuery: '', qty: '1' }];
    formError = '';
    productPickerOpen = false;
    componentPickerIndex = null;
    if (typeof document !== 'undefined') {
      document.getElementById('cost-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  let pendingDeleteSheet: (typeof state.costSheets)[number] | null = null;
  let deleteBusy = false;

  function requestDeleteSheet(sheet: (typeof state.costSheets)[number]) {
    pendingDeleteSheet = sheet;
  }

  async function confirmDeleteSheet() {
    const sheet = pendingDeleteSheet;
    if (!sheet) return;
    deleteBusy = true;
    formError = '';
    try {
      await store.removeCostSheet(sheet.productId);
      if (editingProductId === sheet.productId) resetForm();
      pendingDeleteSheet = null;
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo eliminar la ficha';
      pendingDeleteSheet = null;
    } finally {
      deleteBusy = false;
    }
  }

  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    if (!productId) {
      formError = 'Seleccione el producto';
      return;
    }
    if (!editingProductId && productIdsWithSheet.has(productId)) {
      formError = 'Este producto ya tiene ficha. Use Editar en la tarjeta correspondiente.';
      return;
    }
    const components = recipeLines
      .filter((l) => l.productId && (num(l.qty) ?? 0) > 0)
      .map((l) => ({ productId: l.productId, qty: num(l.qty) as number }));
    if (components.length === 0) {
      formError = 'Añada al menos un componente con cantidad > 0.';
      return;
    }
    if (components.some((c) => c.productId === productId)) {
      formError = 'Un producto no puede ser componente de sí mismo.';
      return;
    }
    try {
      const level = num(difficultyLevel) ?? 3;
      const factor = num(difficultyFactor) ?? defaultDifficultyFactor(level);
      await store.saveCostSheet({
        productId,
        components,
        laborMinutes: num(laborMinutes),
        difficultyLevel: level,
        difficultyFactor: factor,
        laborBaseRate: num(laborBaseRate),
      });
      resetForm();
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo guardar la ficha';
    }
  }

  function fmtPct(n: number): string {
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
  }

  function sheetDelta(sheet: (typeof state.costSheets)[number]) {
    const prev = sheet.previousCostoUnitario || 0;
    const cur = sheet.costoUnitario || 0;
    if (prev <= 0 || cur === prev) return null;
    const abs = cur - prev;
    const pct = (abs / prev) * 100;
    return { abs, pct, dir: abs > 0 ? 'up' : 'down' as const };
  }
</script>

<section class="cost-page">
  <DevSeedPanel
    title="Seed fichas de costo y precio"
    description="JSON de ejemplo. Requiere productos en el nomenclador."
    sample={buildSampleSheetsPayload()}
    onSeed={(data) => seedSheetsViaStore(store, data)}
  />

  <!-- 1. Estadísticas -->
  <div class="stats-rail" role="region" aria-label="Resumen de fichas de costo">
    <div
      class="stat-chip"
      title="Productos compuestos con ficha de costo definida. Su costo final es el de la ficha."
    >
      <span class="stat-ico" aria-hidden="true">📋</span>
      <div>
        <p class="stat-val">{dashboard.sheetsCount}</p>
        <p class="stat-lbl">Fichas de costo</p>
      </div>
    </div>
    <div
      class="stat-chip"
      title="Productos base sin ficha. Costo final = costo promedio unitario tras recepción confirmada en almacén."
    >
      <span class="stat-ico" aria-hidden="true">📦</span>
      <div>
        <p class="stat-val">{dashboard.withoutSheetCount}</p>
        <p class="stat-lbl">Sin ficha (base)</p>
      </div>
    </div>
    <div
      class="stat-chip rise"
      title="Productos cuyo costo final aumentó en el período reciente (con historial)."
    >
      <span class="stat-ico" aria-hidden="true">↑</span>
      <div>
        <p class="stat-val">{dashboard.risingCount}</p>
        <p class="stat-lbl">Costo en aumento</p>
      </div>
    </div>
    <div class="stat-chip fall" title="Productos cuyo costo final disminuyó recientemente.">
      <span class="stat-ico" aria-hidden="true">↓</span>
      <div>
        <p class="stat-val">{dashboard.fallingCount}</p>
        <p class="stat-lbl">Costo en baja</p>
      </div>
    </div>
    <div
      class="stat-chip"
      title="Fichas actualizadas en los últimos 7 días (edición o propagación)."
    >
      <span class="stat-ico" aria-hidden="true">🕒</span>
      <div>
        <p class="stat-val">{dashboard.recentModifiedCount}</p>
        <p class="stat-lbl">Modificadas (7 días)</p>
      </div>
    </div>
    <div
      class="stat-chip impact"
      title="Suma neta de variaciones de costo unitario en compuestos con cambio reciente."
    >
      <span class="stat-ico" aria-hidden="true">Σ</span>
      <div>
        <p
          class="stat-val"
          class:up={dashboard.impactAbs > 0}
          class:down={dashboard.impactAbs < 0}
        >
          {dashboard.impactAbs > 0 ? '+' : ''}{dashboard.impactAbs.toFixed(2)}
        </p>
        <p class="stat-lbl">Impacto neto</p>
      </div>
    </div>
  </div>

  <!-- 2. Variaciones 7 días -->
  <Card>
    <div class="var-head">
      <h2>Variaciones de costo · últimos 7 días</h2>
      <p class="muted">
        Compuesto = costo de ficha. ↑ rojo aumento · ↓ verde disminución. Si hay costo previo, la
        variación suele deberse a un componente o a una edición de receta.
      </p>
    </div>
    {#if dashboard.variations.length === 0}
      <p class="muted empty-var">Sin variaciones registradas en la última semana.</p>
    {:else}
      <ul class="var-list">
        {#each dashboard.variations as row (row.productId)}
          <li class="var-row" class:up={row.direction === 'up'} class:down={row.direction === 'down'}>
            <div class="var-name">
              <strong>{row.productCode || '—'}</strong>
              <span class="muted">{row.productName}</span>
              {#if row.inherited}
                <span class="badge-inherited">Variación por recálculo / componente</span>
              {/if}
            </div>
            <div class="var-prices">
              <Money amount={row.previous} currency={sheetCurrency} />
              <span class="arrow-sep">→</span>
              <Money amount={row.current} currency={sheetCurrency} />
            </div>
            <div class="var-delta">
              <span class="dir" aria-hidden="true"
                >{row.direction === 'up' ? '↑' : row.direction === 'down' ? '↓' : '·'}</span
              >
              <span class="pct">{fmtPct(row.pctDelta)}</span>
              <span class="abs muted"
                >({row.absDelta > 0 ? '+' : ''}{row.absDelta.toFixed(2)})</span
              >
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <!-- 3. Dos columnas: formulario | listado tarjetas -->
  <div class="workspace">
    <!-- Columna izquierda: formulario -->
    <aside class="col-form" id="cost-form-panel">
      <Card>
        <h2>{editingProductId ? 'Editar ficha de costo' : 'Nueva ficha de costo'}</h2>
        <p class="muted intro">
          Define los componentes y parámetros para calcular el costo de elaboración de un producto
          <strong>compuesto</strong>. Los productos base no tienen ficha; su costo es el promedio de
          almacén.
        </p>

        <form onsubmit={handleSubmit}>
          <div class="field product-picker">
            <label class="lbl" for="cost-product">Producto a elaborar</label>
            <div class="picker-control">
              <input
                id="cost-product"
                class="sel picker-input"
                type="text"
                value={productQuery}
                disabled={!!editingProductId}
                autocomplete="off"
                placeholder="Escriba código o nombre…"
                oninput={(e) => onProductQueryInput((e.currentTarget as HTMLInputElement).value)}
                onfocus={() => {
                  if (!editingProductId) productPickerOpen = true;
                }}
              />
              {#if productId && !editingProductId}
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
            {#if productPickerOpen && !editingProductId}
              {@const matches = filterProducts(baseProductsForNewSheet, productQuery)}
              <ul class="picker-list" role="listbox">
                {#if baseProductsForNewSheet.length === 0}
                  <li class="picker-empty">No hay productos base sin ficha</li>
                {:else if matches.length === 0}
                  <li class="picker-empty">Sin coincidencias</li>
                {:else}
                  {#each matches as p (p.id)}
                    <li role="option">
                      <button
                        type="button"
                        class="picker-option"
                        class:selected={p.id === productId}
                        onclick={() => selectMainProduct(p.id)}
                      >
                        <span class="po-main">{productLabel(p)}</span>
                        <span class="po-unit">{p.unit || ''}</span>
                      </button>
                    </li>
                  {/each}
                {/if}
              </ul>
            {/if}
            {#if !editingProductId && baseProductsForNewSheet.length === 0}
              <p class="muted">No hay productos base sin ficha. Edite una tarjeta o cree productos.</p>
            {/if}
          </div>

          <div class="recipe">
            <h3 class="subh">Componentes de la receta</h3>
            <p class="muted">Cantidad por 1 unidad elaborada. Puede ser base o compuesto.</p>
            {#each recipeLines as line, i}
              {@const liveLine = live.lines.find((l) => l.productId === line.productId)}
              {@const componentPool = state.products.filter((p) => p.id !== productId)}
              <div class="recipe-block">
                <div class="recipe-row">
                  <div class="product-picker grow">
                    <div class="picker-control">
                      <input
                        class="sel picker-input"
                        type="text"
                        value={line.productQuery}
                        autocomplete="off"
                        placeholder="Buscar componente…"
                        oninput={(e) => onComponentQuery(i, (e.currentTarget as HTMLInputElement).value)}
                        onfocus={() => (componentPickerIndex = i)}
                      />
                      {#if line.productId}
                        <button
                          type="button"
                          class="picker-clear"
                          title="Limpiar"
                          onclick={() => {
                            const next = [...recipeLines];
                            next[i] = { productId: '', productQuery: '', qty: next[i].qty };
                            recipeLines = next;
                            componentPickerIndex = i;
                          }}>×</button
                        >
                      {/if}
                    </div>
                    {#if componentPickerIndex === i}
                      {@const matches = filterProducts(componentPool, line.productQuery)}
                      <ul class="picker-list" role="listbox">
                        {#if matches.length === 0}
                          <li class="picker-empty">Sin coincidencias</li>
                        {:else}
                          {#each matches as p (p.id)}
                            <li role="option">
                              <button
                                type="button"
                                class="picker-option"
                                class:selected={p.id === line.productId}
                                onclick={() => selectComponent(i, p.id)}
                              >
                                <span class="po-main"
                                  >{productLabel(p)}{productIdsWithSheet.has(p.id)
                                    ? ' · compuesto'
                                    : ''}</span
                                >
                                <span class="po-unit">{p.unit || ''}</span>
                              </button>
                            </li>
                          {/each}
                        {/if}
                      </ul>
                    {/if}
                  </div>
                  <Input type="number" step="any" bind:value={line.qty} placeholder="Cant." />
                  <Button type="button" variant="ghost" size="sm" onclick={() => removeRecipeLine(i)}
                    >Quitar</Button
                  >
                </div>
                {#if liveLine}
                  <div class="line-meta">
                    <span
                      >{liveLine.unit ? `Ud: ${liveLine.unit}` : ''}
                      {liveLine.isComposite ? '· compuesto' : '· base'}</span
                    >
                    <span
                      >Costo ud.
                      <Money amount={liveLine.unitCost} currency={sheetCurrency} /></span
                    >
                    <span
                      >Aporte
                      <Money amount={liveLine.lineCost} currency={sheetCurrency} />
                      ({liveLine.pct.toFixed(1)}%)</span
                    >
                  </div>
                {/if}
              </div>
            {/each}
            <Button type="button" variant="secondary" size="sm" onclick={addRecipeLine}
              >+ Componente</Button
            >
          </div>

          <div class="params grid">
            <Input
              id="cost-mins"
              label="Tiempo (minutos)"
              type="number"
              step="any"
              bind:value={laborMinutes}
            />
            <Input
              id="cost-diff"
              label="Dificultad (1–5)"
              type="number"
              step="1"
              bind:value={difficultyLevel}
            />
            <Input
              id="cost-factor"
              label="Factor dificultad"
              type="number"
              step="any"
              bind:value={difficultyFactor}
              placeholder="auto"
            />
            <Input
              id="cost-rate"
              label="Costo base / minuto"
              type="number"
              step="any"
              bind:value={laborBaseRate}
            />
          </div>

          <!-- Resumen dinámico -->
          <div class="cost-summary" aria-live="polite">
            <div class="sum-row">
              <span>Costo de componentes</span>
              <strong><Money amount={live.materialCost} currency={sheetCurrency} /></strong>
            </div>
            <div class="sum-row">
              <span>Costo de elaboración</span>
              <strong><Money amount={live.laborCost} currency={sheetCurrency} /></strong>
            </div>
            <div class="sum-row final">
              <span>Costo final</span>
              <strong class="final-amt"><Money amount={live.finalCost} currency={sheetCurrency} /></strong>
            </div>
          </div>

          {#if formError}
            <p class="err">{formError}</p>
          {/if}
          {#if state.error}
            <p class="err">{state.error}</p>
          {/if}

          <div class="actions">
            {#if editingProductId}
              <Button type="button" variant="ghost" disabled={state.saving} onclick={resetForm}
                >Cancelar</Button
              >
            {/if}
            <Button type="submit" disabled={state.saving}>
              {state.saving
                ? 'Guardando…'
                : editingProductId
                  ? 'Actualizar ficha'
                  : 'Crear ficha (base → compuesto)'}
            </Button>
          </div>
        </form>
      </Card>
    </aside>

    <!-- Columna derecha: listado -->
    <section class="col-list" aria-label="Fichas de costo existentes">
      <div class="list-toolbar">
        <Input
          id="cost-search"
          label="Buscar"
          bind:value={searchQ}
          placeholder="Nombre o código…"
        />
        <div class="field">
          <label class="lbl" for="cost-filter">Filtro</label>
          <select id="cost-filter" class="sel" bind:value={listFilter}>
            <option value="all">Todas</option>
            <option value="recent">Actualizadas (7 días)</option>
            <option value="up">Costo en aumento</option>
            <option value="down">Costo en disminución</option>
          </select>
        </div>
        <div class="field">
          <label class="lbl" for="cost-sort">Orden</label>
          <select id="cost-sort" class="sel" bind:value={listSort}>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="cost_desc">Mayor costo</option>
            <option value="cost_asc">Menor costo</option>
            <option value="var_desc">Mayor variación</option>
            <option value="var_asc">Menor variación</option>
          </select>
        </div>
      </div>

      <div class="cards-scroll">
        {#if filteredSheets.length === 0}
          <p class="muted empty-list">No hay fichas que coincidan con la búsqueda o el filtro.</p>
        {:else}
          <div class="cards-grid">
            {#each filteredSheets as sheet (sheet.id || sheet.productId)}
              {@const delta = sheetDelta(sheet)}
              {@const points = sheetCompositionPoints(sheet)}
              <article class="sheet-card">
                <header class="card-head">
                  <div class="card-titles">
                    <h3 class="card-name">{sheet.productName || '—'}</h3>
                    <p class="card-code">{sheet.productCode}</p>
                    <span class="badge-compuesto">Producto compuesto</span>
                  </div>
                  <div class="card-final">
                    <span class="final-label">Costo final</span>
                    <p class="final-value">
                      <Money amount={sheet.costoUnitario} currency={sheet.currency || sheetCurrency} />
                    </p>
                    {#if delta}
                      <p class="card-delta" class:up={delta.dir === 'up'} class:down={delta.dir === 'down'}>
                        <span aria-hidden="true">{delta.dir === 'up' ? '↑' : '↓'}</span>
                        {fmtPct(delta.pct)}
                      </p>
                    {/if}
                  </div>
                </header>

                <div class="card-donut">
                  <DonutChart
                    points={points}
                    centerLabel="Costo"
                    currency={sheet.currency || sheetCurrency}
                    size={150}
                    thickness={18}
                    emptyText="Sin desglose"
                  />
                </div>

                <div class="card-breakdown">
                  <div class="bd-row">
                    <span>Componentes</span>
                    <Money
                      amount={sheet.materialCost || sheet.materiaPrima}
                      currency={sheet.currency}
                    />
                  </div>
                  <div class="bd-row">
                    <span>Elaboración</span>
                    <Money
                      amount={sheet.laborCost || sheet.salarioDirecto}
                      currency={sheet.currency}
                    />
                  </div>
                </div>

                <footer class="card-foot">
                  <span class="meta"
                    >{sheet.laborMinutes || 0} min · Dif. {sheet.difficultyLevel || '—'}
                    {sheet.difficultyFactor ? `· f ${sheet.difficultyFactor}` : ''}</span
                  >
                  <span class="meta">{relativeTime(sheet.updatedAt)}</span>
                </footer>

                <div class="card-actions">
                  <Button type="button" variant="secondary" size="sm" onclick={() => loadSheetForEdit(sheet)}
                    >Editar</Button
                  >
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={state.saving}
                    onclick={() => requestDeleteSheet(sheet)}>Eliminar</Button
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

<ConfirmDialog
  open={!!pendingDeleteSheet}
  title="Eliminar ficha de costo"
  message={pendingDeleteSheet
    ? `Se eliminará la ficha de «${`${pendingDeleteSheet.productCode || ''} ${pendingDeleteSheet.productName || pendingDeleteSheet.productId}`.trim()}». No se podrá si este producto es componente de otras recetas.`
    : ''}
  confirmLabel="Eliminar ficha"
  variant="danger"
  busy={deleteBusy}
  onConfirm={() => void confirmDeleteSheet()}
  onCancel={() => {
    if (!deleteBusy) pendingDeleteSheet = null;
  }}
/>

<style>

  .cost-page {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
  }

  /* Stats */
  .stats-rail {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
    padding-bottom: 0.2rem;
    scroll-snap-type: x proximity;
  }
  .stat-chip {
    flex: 1 0 auto;
    min-width: 132px;
    max-width: 190px;
    scroll-snap-align: start;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border, var(--color-border));
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .stat-chip.rise {
    border-color: color-mix(in srgb, #e85d5d 40%, var(--ap-border));
  }
  .stat-chip.fall {
    border-color: color-mix(in srgb, #3ecf8e 40%, var(--ap-border));
  }
  .stat-ico {
    width: 1.5rem;
    text-align: center;
    opacity: 0.9;
  }
  .stat-val {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
  }
  .stat-val.up {
    color: #e85d5d;
  }
  .stat-val.down {
    color: #3ecf8e;
  }
  .stat-lbl {
    margin: 0.05rem 0 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ap-text-muted, var(--color-text-muted));
  }

  /* Variations */
  .var-head h2 {
    margin: 0 0 0.2rem;
    font-size: 1rem;
  }
  .empty-var {
    margin: 0.4rem 0 0;
  }
  .var-list {
    list-style: none;
    margin: 0.65rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 220px;
    overflow-y: auto;
  }
  .var-row {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: center;
    padding: 0.5rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
  }
  .var-row.up {
    border-color: color-mix(in srgb, #e85d5d 30%, var(--ap-border));
  }
  .var-row.down {
    border-color: color-mix(in srgb, #3ecf8e 30%, var(--ap-border));
  }
  .var-name {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .badge-inherited {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 650;
    padding: 0.12rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 18%, transparent);
    color: var(--ap-text-secondary);
    width: fit-content;
  }
  .var-prices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    font-size: 0.86rem;
  }
  .arrow-sep {
    opacity: 0.45;
  }
  .var-delta {
    display: flex;
    gap: 0.3rem;
    align-items: baseline;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .var-row.up .var-delta {
    color: #e85d5d;
  }
  .var-row.down .var-delta {
    color: #3ecf8e;
  }

  /* Workspace 2 cols */
  .workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
    align-items: stretch;
  }
  @media (min-width: 1024px) {
    .workspace {
      grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
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
      padding-right: 0.15rem;
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
  /* Desktop list side: always 2 cols when wide enough */
  @media (min-width: 1024px) {
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
    gap: 0.55rem;
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
    align-items: flex-start;
  }
  .card-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.25;
  }
  .card-code {
    margin: 0.1rem 0;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
  }
  .badge-compuesto {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 16%, transparent);
    color: var(--ap-text-secondary);
  }
  .card-final {
    text-align: right;
  }
  .final-label {
    font-size: 0.65rem;
    font-weight: 650;
    text-transform: uppercase;
    color: var(--ap-text-muted);
  }
  .final-value {
    margin: 0.1rem 0;
    font-size: 1.15rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .card-delta {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .card-delta.up {
    color: #e85d5d;
  }
  .card-delta.down {
    color: #3ecf8e;
  }
  .card-donut {
    display: flex;
    justify-content: center;
  }
  .card-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
  }
  .bd-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: var(--ap-text-secondary);
  }
  .card-foot {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .meta {
    font-size: 0.72rem;
    color: var(--ap-text-muted);
  }
  .card-actions {
    display: flex;
    gap: 0.4rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .empty-list {
    padding: 1rem 0.25rem;
  }

  /* Form */
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
  .subh {
    margin: 0 0 0.3rem;
    font-size: 0.88rem;
    font-weight: 650;
  }
  .recipe {
    margin: 0.5rem 0 0.75rem;
    padding: 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: color-mix(in srgb, var(--ap-bg-elevated) 80%, transparent);
  }
  .recipe-block {
    margin-bottom: 0.5rem;
  }
  .product-picker {
    position: relative;
    min-width: 0;
  }
  .product-picker.grow {
    flex: 1;
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
    line-height: 1;
    padding: 0.2rem 0.35rem;
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
    border: 1px solid var(--ap-border, var(--color-border));
    background: var(--ap-bg-elevated, var(--color-surface, #171b29));
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  }
  .picker-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    text-align: left;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ap-text, var(--color-text-primary));
    cursor: pointer;
    font-size: 0.82rem;
    font-family: inherit;
  }
  .picker-option:hover,
  .picker-option.selected {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
  }
  .po-main {
    min-width: 0;
  }
  .po-unit {
    flex-shrink: 0;
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
  .recipe-row {
    display: grid;
    grid-template-columns: 1fr minmax(72px, 96px) auto;
    gap: 0.4rem;
    align-items: end;
  }
  .line-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.85rem;
    font-size: 0.72rem;
    color: var(--ap-text-muted);
    margin-top: 0.25rem;
    padding-left: 0.15rem;
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
  .cost-summary {
    margin: 0.75rem 0;
    padding: 0.75rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 6%, var(--ap-bg-elevated));
  }
  .sum-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.84rem;
    padding: 0.25rem 0;
    color: var(--ap-text-secondary);
  }
  .sum-row.final {
    margin-top: 0.35rem;
    padding-top: 0.45rem;
    border-top: 1px solid var(--ap-border);
    align-items: baseline;
  }
  .sum-row.final span {
    font-weight: 700;
    color: var(--ap-text);
  }
  .final-amt {
    font-size: 1.25rem;
    font-weight: 800;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  @media (max-width: 640px) {
    .var-row {
      grid-template-columns: 1fr;
    }
  }
</style>
