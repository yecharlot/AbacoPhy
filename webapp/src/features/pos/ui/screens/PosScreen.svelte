<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Badge, Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { PosState, PosStore } from '../stores/posStore';
  import type { CreateSaleLineInput } from '../../domain/entities/Sale';
  import {
    LOW_STOCK_THRESHOLD,
    sortByQtyAsc,
    stockLevelMeta,
    type StockBoardRow,
  } from '../../domain/stockStatus';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSamplePosSalesPayload, seedPosSalesViaStore } from '../dev/salesSeed';

  export let store: PosStore;
  export let userRole: string = '';
  export let userDisplayName: string = '';
  export let sellerOptions: string[] = [];

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

  function isSellerRole(): boolean {
    const r = (userRole || '').toLowerCase();
    return r === 'vendedor' || r === 'seller';
  }

  onMount(() => {
    const unsub = store.subscribe((s: PosState) => {
      state = s;
    });
    void store.loadAll();
    if (isSellerRole() && userDisplayName) seller = userDisplayName;
    return unsub;
  });

  $: products = state.products ?? [];
  $: units = state.units ?? [];
  $: sales = [...(state.sales ?? [])].reverse();
  $: recentSales = sales.slice(0, 8);
  $: saleCurrency = state.sales[0]?.currency || state.warehouseRows?.[0]?.currency || '';
  $: sellerLocked = isSellerRole();

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

  /** Stock de la ubicación actual: unidad seleccionada o almacén central. */
  /**
   * Stock de un producto en la ubicación activa.
   * - Con unidad: solo qty en unitStocks de esa unidad (0 si no hay fila).
   * - Sin unidad: almacén central (warehouseRows).
   * Lee unitId/state dentro de la función; las $: que lo usan deben
   * referenciar unitId y state.unitStocks/warehouseRows explícitamente.
   */
  function stockOf(productId: string, uid: string = unitId): number {
    if (uid) {
      const row = (state.unitStocks ?? []).find(
        (s) => s.unitId === uid && s.productId === productId,
      );
      return row?.qty ?? 0;
    }
    const row = (state.warehouseRows ?? []).find((r) => r.productId === productId);
    return row?.qty ?? 0;
  }

  $: locationLabel = unitId
    ? units.find((u) => u.id === unitId)?.name || 'Unidad'
    : 'Almacén central';

  /**
   * Filas de stock para los 3 bloques.
   * Dependencias reactivas explícitas: unitId, unitStocks, warehouseRows, products.
   *
   * Con unidad seleccionada: SOLO productos que tienen fila en unitStocks
   * de esa unidad (transferidos / asignados al punto). No el catálogo completo.
   * Sin unidad: filas del almacén central (warehouseRows); si vacío, catálogo con qty 0.
   */
  $: allStockRows = (() => {
    const uid = unitId;
    const unitStocks = state.unitStocks ?? [];
    const warehouseRows = state.warehouseRows ?? [];
    const productById = new Map(products.map((p) => [p.id, p]));

    const rows: StockBoardRow[] = [];

    if (uid) {
      const forUnit = unitStocks.filter((s) => s.unitId === uid);
      for (const s of forUnit) {
        const p = productById.get(s.productId);
        const qty = Number(s.qty) || 0;
        rows.push({
          productId: s.productId,
          code: p?.code || '—',
          name: p?.name || s.productId,
          qty,
          priceSale: p?.priceSale ?? 0,
          unit: p?.unit,
          meta: stockLevelMeta(qty),
        });
      }
    } else {
      if (warehouseRows.length > 0) {
        for (const w of warehouseRows) {
          const p = productById.get(w.productId);
          const qty = Number(w.qty) || 0;
          rows.push({
            productId: w.productId,
            code: w.code || p?.code || '—',
            name: w.name || p?.name || w.productId,
            qty,
            priceSale: p?.priceSale ?? 0,
            unit: w.unit || p?.unit,
            meta: stockLevelMeta(qty),
          });
        }
      } else {
        for (const p of products) {
          rows.push({
            productId: p.id,
            code: p.code || '—',
            name: p.name,
            qty: 0,
            priceSale: p.priceSale ?? 0,
            unit: p.unit,
            meta: stockLevelMeta(0),
          });
        }
      }
    }
    return rows;
  })();

  $: blockAgotados = sortByQtyAsc(allStockRows.filter((r) => r.meta.level === 'out'));
  $: blockCasiAgotados = sortByQtyAsc(allStockRows.filter((r) => r.meta.level === 'low'));
  $: blockHabilitados = sortByQtyAsc(allStockRows.filter((r) => r.meta.level === 'ok'));

  /** Solo productos con stock > 0 en la ubicación activa (para el select de líneas). */
  $: sellableProducts = (() => {
    const uid = unitId;
    void state.unitStocks;
    void state.warehouseRows;
    return [...products]
      .map((p) => ({ p, qty: stockOf(p.id, uid) }))
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
    if (stockOf(productId) <= 0) return;
    const emptyIdx = lines.findIndex((l) => !l.productId);
    if (emptyIdx >= 0) {
      onProductChange(emptyIdx, productId);
      return;
    }
    const price = priceOf(productId);
    lines = [
      ...lines,
      { productId, qty: '1', unitPrice: price > 0 ? String(price) : '', discountPct: '' },
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
        Cobro rápido · stock de <strong>{locationLabel}</strong>. Al elegir unidad solo se listan productos
        transferidos a ese punto (no el catálogo global).
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

  <!-- Tres bloques de stock: altura FIJA + fade al cambiar unidad -->
  <div class="stock-blocks" aria-live="polite">
    <Card>
      <div class="stock-panel">
        <div class="block-head danger">
          <span class="block-ico" aria-hidden="true">⛔</span>
          <div>
            <h2>Agotados</h2>
            <p class="block-sub">{locationLabel} · {blockAgotados.length} productos</p>
          </div>
        </div>
        <div class="list-slot">
          {#key unitId}
            <div
              class="list-fade"
              in:fade={{ duration: 200 }}
            >
              {#if blockAgotados.length === 0}
                <p class="empty">Ningún producto agotado aquí.</p>
              {:else}
                <ul class="prod-list">
                  {#each blockAgotados as row (row.productId)}
                    <li class="prod-row is-out">
                      <span class="code">{row.code}</span>
                      <span class="name">{row.name}</span>
                      <span class="qty">0</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/key}
        </div>
      </div>
    </Card>

    <Card>
      <div class="stock-panel">
        <div class="block-head warn">
          <span class="block-ico" aria-hidden="true">⚠️</span>
          <div>
            <h2>Casi agotados</h2>
            <p class="block-sub">
              {locationLabel} · ≤ {LOW_STOCK_THRESHOLD} uds · {blockCasiAgotados.length}
            </p>
          </div>
        </div>
        <div class="list-slot">
          {#key unitId}
            <div
              class="list-fade"
              in:fade={{ duration: 200 }}
            >
              {#if blockCasiAgotados.length === 0}
                <p class="empty">Sin productos en umbral bajo.</p>
              {:else}
                <ul class="prod-list">
                  {#each blockCasiAgotados as row (row.productId)}
                    <li>
                      <button
                        type="button"
                        class="prod-row is-low"
                        on:click={() => quickAdd(row.productId)}
                        disabled={state.saving}
                        title="Añadir a la venta"
                      >
                        <span class="code">{row.code}</span>
                        <span class="name">{row.name}</span>
                        <span class="qty warn-qty">{row.qty}</span>
                        <span class="price"><Money amount={row.priceSale} currency={saleCurrency} /></span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/key}
        </div>
      </div>
    </Card>

    <Card>
      <div class="stock-panel">
        <div class="block-head ok">
          <span class="block-ico" aria-hidden="true">✅</span>
          <div>
            <h2>Habilitados</h2>
            <p class="block-sub">{locationLabel} · stock OK · {blockHabilitados.length}</p>
          </div>
        </div>
        <div class="list-slot">
          {#key unitId}
            <div
              class="list-fade"
              in:fade={{ duration: 200 }}
            >
              {#if blockHabilitados.length === 0}
                <p class="empty">No hay productos con stock suficiente.</p>
              {:else}
                <ul class="prod-list">
                  {#each blockHabilitados as row (row.productId)}
                    <li>
                      <button
                        type="button"
                        class="prod-row is-ok"
                        on:click={() => quickAdd(row.productId)}
                        disabled={state.saving}
                        title="Añadir a la venta"
                      >
                        <span class="code">{row.code}</span>
                        <span class="name">{row.name}</span>
                        <span class="qty ok-qty">{row.qty}</span>
                        <span class="price"><Money amount={row.priceSale} currency={saleCurrency} /></span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/key}
        </div>
      </div>
    </Card>
  </div>

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
              {#if sellerLocked}
                <input type="text" value={seller} readonly class="locked" title="Fijado por sesión" />
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
                >×</button>
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
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each recentSales as s (s.id)}
                <tr>
                  <td>{s.number || '—'}</td>
                  <td>{s.date || '—'}</td>
                  <td>{s.seller || '—'}</td>
                  <td class="num"><Money amount={s.total} currency={s.currency || saleCurrency} /></td>
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
    max-width: 58ch;
  }
  /*
   * Grid de 3 columnas independientes.
   * NO fijar height en el grid (eso aplastaba las 3 cards en 320px y se montaban).
   * Altura fija solo en cada .stock-panel.
   */
  .stock-blocks {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    align-items: stretch;
  }
  @media (min-width: 960px) {
    .stock-blocks {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  /* Cada card hija del grid no debe desbordar ni montarse */
  .stock-blocks > :global(*) {
    min-width: 0;
    max-width: 100%;
    align-self: stretch;
  }
  .stock-panel {
    display: flex;
    flex-direction: column;
    height: 300px;
    min-height: 300px;
    max-height: 300px;
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
  }
  .stock-panel .block-head {
    flex-shrink: 0;
  }
  /* Área de lista con altura fija; sin position:absolute (evita solapes entre cards) */
  .list-slot {
    flex: 1 1 auto;
    min-height: 0;
    height: 230px;
    max-height: 230px;
    overflow: hidden;
  }
  .list-fade {
    height: 100%;
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    box-sizing: border-box;
  }
  .block-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 10px;
  }
  .block-ico {
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .block-sub {
    margin: 2px 0 0;
    font-size: 0.72rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .block-head.danger h2 {
    color: #f17b7b;
  }
  .block-head.warn h2 {
    color: #f0b429;
  }
  .block-head.ok h2 {
    color: #3ecf8e;
  }
  .empty,
  .muted {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .muted-sm {
    font-size: 0.72rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .prod-list {
    list-style: none;
    margin: 0;
    padding: 0 2px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .list-fade .empty {
    margin: 0;
    padding: 4px 2px;
  }
  .prod-row {
    display: grid;
    grid-template-columns: 64px 1fr auto auto;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, transparent);
    color: inherit;
    font: inherit;
    text-align: left;
    box-sizing: border-box;
  }
  button.prod-row {
    cursor: pointer;
  }
  button.prod-row:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 45%, var(--color-border));
  }
  button.prod-row:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .prod-row.is-out {
    opacity: 0.7;
  }
  .code {
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-muted);
  }
  .name {
    font-size: 0.84rem;
    font-weight: 550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qty {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .warn-qty {
    color: #f0b429;
  }
  .ok-qty {
    color: #3ecf8e;
  }
  .price {
    font-size: 0.78rem;
    justify-self: end;
  }
  .layout {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: 1.25fr 0.85fr;
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
  input.locked {
    opacity: 0.85;
    cursor: not-allowed;
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
</style>
