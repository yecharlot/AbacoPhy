<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money, notifyErr, notifyOk } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { PosState, PosStore } from '../stores/posStore';
  import { salesByDay, salesTotals, topSoldProducts } from '../viewmodels/posCharts';
  import type { CreateSaleLineInput, Sale } from '../../domain/entities/Sale';
  import type { EmitInvoiceInput } from '../../../invoicing/domain/entities/Invoice';
  import {
    buildUnitStockBoard,
    LOW_STOCK_THRESHOLD,
  } from '../../domain/stockStatus';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSamplePosSalesPayload, seedPosSalesViaStore } from '../dev/salesSeed';

  export let store: PosStore;
  export let sessionRole: string = '';
  export let sessionDisplayName: string = '';
  export let sessionUsername: string = '';
  export let assignedUnitIds: string[] = [];
  export let canInvoice: boolean = false;
  /** InvoicingStore real: método `emit`. Alias legacy `emitInvoice`. */
  export let invoiceStore: {
    emit?: (input: EmitInvoiceInput) => Promise<void>;
    emitInvoice?: (input: EmitInvoiceInput) => Promise<void>;
  } | null = null;

  type DraftLine = {
    productId: string;
    productQuery: string;
    qty: string;
    unitPrice: string;
    discountPct: string;
  };

  let state: PosState = store.getState();
  let unitId = '';
  let seller = '';
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let lines: DraftLine[] = [
    { productId: '', productQuery: '', qty: '1', unitPrice: '', discountPct: '' },
  ];
  let formError = '';
  let formOk = '';
  let showForm = false;
  let expandedSaleId: string | null = null;
  let historyPage = 0;
  const PAGE_SIZE = 12;
  let selectedSaleIds: Record<string, boolean> = {};
  let invoiceBusy = false;
  let invoiceMsg = '';
  let invoiceErr = '';
  let pickerOpenIndex: number | null = null;
  const PICKER_LIMIT = 40;

  const isSellerRole = () => {
    const r = (sessionRole || '').toLowerCase();
    return r === 'vendedor' || r === 'operador';
  };

  /** Contenedor del formulario de venta para foco de teclado. */
  let formEl: HTMLFormElement | null = null;

  function focusProductSearch(lineIndex = 0) {
    // Dejar que el DOM pinte el formulario
    requestAnimationFrame(() => {
      const root = formEl;
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>('input[type="search"]');
      const el = inputs[lineIndex] ?? inputs[inputs.length - 1];
      el?.focus();
      el?.select?.();
    });
  }

  function openFormAndFocus() {
    openForm();
    focusProductSearch(0);
  }

  function isEditableTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return t.isContentEditable;
  }

  function onPosKeydown(e: KeyboardEvent) {
    // No interferir con atajos del sistema / browser
    if (e.altKey || e.metaKey) return;

    const key = e.key;

    // Esc: cierra picker → form
    if (key === 'Escape') {
      if (pickerOpenIndex !== null) {
        e.preventDefault();
        pickerOpenIndex = null;
        return;
      }
      if (showForm && !state.saving) {
        e.preventDefault();
        closeForm();
      }
      return;
    }

    // F2 — nueva venta
    if (key === 'F2') {
      e.preventDefault();
      if (!showForm) openFormAndFocus();
      else focusProductSearch(0);
      return;
    }

    // F3 — añadir línea (solo con formulario abierto)
    if (key === 'F3') {
      if (!showForm || state.saving) return;
      e.preventDefault();
      addLine();
      focusProductSearch(Math.max(0, lines.length - 1));
      return;
    }

    // F4 o Ctrl+Enter — cobrar
    if (key === 'F4' || (key === 'Enter' && e.ctrlKey)) {
      if (!showForm || state.saving) return;
      e.preventDefault();
      formEl?.requestSubmit?.();
      return;
    }

    // / — foco búsqueda producto (si no está ya en un campo de texto libre tipo note)
    if (key === '/' && showForm && !e.ctrlKey) {
      if (isEditableTarget(e.target) && (e.target as HTMLInputElement).type !== 'search') {
        // permitir escribir / en notas
        const ty = (e.target as HTMLInputElement).type;
        if (ty === 'text' || ty === 'textarea') return;
      }
      e.preventDefault();
      const idx = lines.findIndex((l) => !l.productId);
      focusProductSearch(idx >= 0 ? idx : lines.length - 1);
      return;
    }
  }

  onMount(() => {
    const unsub = store.subscribe((s: PosState) => {
      state = s;
      applyDefaultUnitAndSeller();
    });
    void store.loadAll().then(() => applyDefaultUnitAndSeller());
    window.addEventListener('keydown', onPosKeydown);
    return () => {
      unsub();
      window.removeEventListener('keydown', onPosKeydown);
    };
  });

  function applyDefaultUnitAndSeller() {
    const units = state.units ?? [];
    if (isSellerRole()) {
      const name = (sessionDisplayName || sessionUsername || '').trim();
      if (name && !seller) seller = name;
      if (assignedUnitIds?.length) {
        const match = units.find((u) => assignedUnitIds.includes(u.id));
        if (match) unitId = match.id;
      } else if (!unitId && units.length === 1) {
        unitId = units[0].id;
      }
    } else if (!unitId && units.length === 1) {
      unitId = units[0].id;
    }
  }

  $: products = state.products ?? [];
  $: units = state.units ?? [];
  $: unitLocked = isSellerRole() && !!unitId && (assignedUnitIds?.length > 0 || units.length === 1);
  $: unitLabel = units.find((u) => u.id === unitId)?.name || units.find((u) => u.id === unitId)?.code || '—';

  $: board = buildUnitStockBoard(unitId, products, state.unitStocks ?? [], LOW_STOCK_THRESHOLD);
  $: stockOut = board.out;
  $: stockLow = board.low;
  $: stockOk = board.ok;

  $: unitSales = (state.sales ?? []).filter((s) => !unitId || s.unitId === unitId);
  $: sellerSales = isSellerRole()
    ? unitSales.filter((s) => {
        const n = (sessionDisplayName || sessionUsername || '').trim().toLowerCase();
        if (!n) return true;
        return (s.seller || '').toLowerCase().includes(n);
      })
    : unitSales;

  $: sortedHistory = [...unitSales].sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) return db.localeCompare(da);
    return (b.number || '').localeCompare(a.number || '');
  });
  $: historyTotalPages = Math.max(1, Math.ceil(sortedHistory.length / PAGE_SIZE));
  $: historyPageClamped = Math.min(historyPage, historyTotalPages - 1);
  $: historySlice = sortedHistory.slice(
    historyPageClamped * PAGE_SIZE,
    historyPageClamped * PAGE_SIZE + PAGE_SIZE,
  );

  $: sellerDaySales = sellerSales.filter((s) => {
    const today = new Date().toISOString().slice(0, 10);
    return (s.date || '').slice(0, 10) === today;
  });
  $: sellerTotals = salesTotals(sellerSales);
  $: sellerDayTotals = salesTotals(sellerDaySales);
  $: topProducts = topSoldProducts(sellerSales) as ChartPoint[];
  $: dailySales = salesByDay(sellerSales) as ChartPoint[];
  $: saleCurrency = sellerSales[0]?.currency || unitSales[0]?.currency || '';

  $: estimated = lines.reduce((acc, line) => {
    const price = parseFloat(line.unitPrice) || priceOf(line.productId);
    const gross = (parseFloat(line.qty) || 0) * price;
    const discount = gross * ((parseFloat(line.discountPct) || 0) / 100);
    return acc + gross - discount;
  }, 0);

  function lineStockIssue(line: (typeof lines)[number]): string | null {
    if (!line.productId) return null;
    const qty = parseFloat(line.qty) || 0;
    const available = stockOf(line.productId);
    if (available !== null && available <= 0) return 'Sin stock';
    if (available !== null && qty > available) return `Solo ${available} disp.`;
    return null;
  }

  function linePrice(line: (typeof lines)[number]): number {
    const u = parseFloat(line.unitPrice);
    if (Number.isFinite(u) && u > 0) return u;
    return line.productId ? priceOf(line.productId) : 0;
  }

  function lineTotal(line: (typeof lines)[number]): number {
    const qty = parseFloat(line.qty) || 0;
    const price = linePrice(line);
    const disc = (parseFloat(line.discountPct) || 0) / 100;
    return qty * price * (1 - disc);
  }

  $: checkoutBlocked = lines.some((l) => {
    if (!l.productId) return false;
    if (lineStockIssue(l)) return true;
    if (linePrice(l) <= 0) return true;
    const q = parseFloat(l.qty);
    return !Number.isFinite(q) || q <= 0;
  });

  $: hasSaleLines = lines.some((l) => l.productId);

  $: sellableProducts = (() => {
    if (!unitId) return [] as typeof products;
    const ids = new Set(
      (state.unitStocks ?? [])
        .filter((s) => s.unitId === unitId && s.qty > 0)
        .map((s) => s.productId),
    );
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

  function filterProducts(query: string) {
    const q = (query || '').trim().toLowerCase();
    const list = sellableProducts;
    if (!q) return list.slice(0, PICKER_LIMIT);
    const out: typeof list = [];
    for (const p of list) {
      const hay = `${p.code || ''} ${p.name || ''}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(p);
        if (out.length >= PICKER_LIMIT) break;
      }
    }
    return out;
  }

  function onProductQueryInput(index: number, value: string) {
    const next = [...lines];
    next[index] = { ...next[index], productQuery: value, productId: '' };
    lines = next;
    pickerOpenIndex = index;
  }

  function selectProduct(index: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const stock = stockOf(productId);
    if (stock !== null && stock <= 0) {
      formError = `«${p.name}» sin stock en este PDV`;
      return;
    }
    const next = [...lines];
    const price = priceOf(productId);
    next[index] = {
      ...next[index],
      productId: p.id,
      productQuery: `${p.code || '—'} · ${p.name}`,
      // Precio siempre desde catálogo/ficha de precio (visible y editable)
      unitPrice: price > 0 ? String(price) : next[index].unitPrice || '',
      qty: next[index].qty || '1',
    };
    lines = next;
    pickerOpenIndex = null;
    formError = '';
  }

  function clearProduct(index: number) {
    const next = [...lines];
    next[index] = { ...next[index], productId: '', productQuery: '' };
    lines = next;
    pickerOpenIndex = index;
  }

  function addLine() {
    lines = [
      ...lines,
      { productId: '', productQuery: '', qty: '1', unitPrice: '', discountPct: '' },
    ];
    pickerOpenIndex = null;
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    if (!isSellerRole()) seller = '';
    else seller = (sessionDisplayName || sessionUsername || '').trim();
    note = '';
    date = new Date().toISOString().slice(0, 10);
    lines = [{ productId: '', productQuery: '', qty: '1', unitPrice: '', discountPct: '' }];
    pickerOpenIndex = null;
    formError = '';
  }

  function openForm() {
    resetForm();
    formOk = '';
    showForm = true;
  }

  // openFormAndFocus defined above in onMount block area — keep single path

  function closeForm() {
    showForm = false;
    formError = '';
  }

  function toggleDetails(id: string) {
    expandedSaleId = expandedSaleId === id ? null : id;
  }

  function toggleSelectSale(id: string) {
    selectedSaleIds = { ...selectedSaleIds, [id]: !selectedSaleIds[id] };
  }

  function selectedSalesList(): Sale[] {
    return sortedHistory.filter((s) => selectedSaleIds[s.id]);
  }

  async function callEmitInvoice(payload: EmitInvoiceInput) {
    if (!invoiceStore) throw new Error('Facturación no disponible');
    if (typeof invoiceStore.emit === 'function') {
      await invoiceStore.emit(payload);
      return;
    }
    if (typeof invoiceStore.emitInvoice === 'function') {
      await invoiceStore.emitInvoice(payload);
      return;
    }
    throw new Error('El store de facturación no expone emit()');
  }

  async function emitInvoiceFromSales(sales: Sale[]) {
    if (!canInvoice || !invoiceStore || sales.length === 0) return;
    invoiceErr = '';
    invoiceMsg = '';
    invoiceBusy = true;
    try {
      const invLines = sales.flatMap((sale) =>
        (sale.lines || []).map((l) => ({
          description: `[${sale.number}] ${l.productCode || ''} ${l.productName}`.trim(),
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
      );
      const clientName =
        sales.length === 1
          ? `Venta ${sales[0].number}`
          : `Prefactura ${sales.length} ventas`;
      await callEmitInvoice({
        clientName,
        currency: sales[0].currency || saleCurrency || undefined,
        unitId: sales[0].unitId || unitId || undefined,
        unitName: sales[0].unitName || unitLabel,
        lines: invLines,
        status: 'issued',
        metadata: JSON.stringify({
          source: 'pos',
          saleIds: sales.map((s) => s.id),
          saleNumbers: sales.map((s) => s.number),
        }),
      });
      invoiceMsg =
        sales.length === 1
          ? `Factura emitida desde venta ${sales[0].number}`
          : `Factura emitida agrupando ${sales.length} ventas`;
      selectedSaleIds = {};
    } catch (e) {
      invoiceErr = e instanceof Error ? e.message : 'No se pudo emitir la factura';
    } finally {
      invoiceBusy = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!unitId) {
      formError = 'Seleccione el punto de venta';
      return;
    }
    if (products.length === 0) {
      formError = 'No hay productos en el nomenclador.';
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
      if (available !== null && available <= 0) {
        formError = `Sin stock: ${productLabel(line.productId)}. Transfiera desde almacén.`;
        return;
      }
      if (available !== null && qty > available) {
        formError = `Stock insuficiente para ${productLabel(line.productId)} (pide ${qty}, disp. ${available})`;
        return;
      }
      const unitPrice = parseFloat(line.unitPrice);
      const price = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : priceOf(line.productId);
      if (!price || price <= 0) {
        formError = `Sin precio de venta: ${productLabel(line.productId)}. Defínalo en Fichas de precio.`;
        return;
      }
      const discountPct = parseFloat(line.discountPct);
      payload.push({
        productId: line.productId,
        qty,
        unitPrice: price,
        discountPct: Number.isFinite(discountPct) && discountPct > 0 ? discountPct : undefined,
      });
    }
    if (payload.length === 0) {
      formError = 'Añada al menos un producto a la venta';
      return;
    }
    try {
      await store.registerSale({
        unitId,
        seller: seller.trim() || undefined,
        date: date || undefined,
        note: note.trim() || undefined,
        lines: payload,
      });
      const num = store.getState().lastSale?.number;
      formOk = num
        ? `Venta ${num} registrada · total ${estimated.toFixed(2)}`
        : 'Venta registrada correctamente';
      try {
        notifyOk(formOk);
      } catch {
        /* toast opcional */
      }
      resetForm();
      // Mantener formulario abierto para cobro rápido de la siguiente venta
      showForm = true;
      lines = [{ productId: '', productQuery: '', qty: '1', unitPrice: '', discountPct: '' }];
      focusProductSearch(0);
    } catch (err) {
      formError =
        err instanceof Error ? err.message : state.error || 'No se pudo registrar la venta';
      try {
        notifyErr(formError);
      } catch {
        /* toast opcional */
      }
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
      <p class="eyebrow">Operación de mostrador</p>
      <h1>Ventas · Punto de venta</h1>
      <p class="sub">
        {#if unitId}
          Contexto: <strong>{unitLabel}</strong>
          {#if isSellerRole()}
            · Vendedor: <strong>{sessionDisplayName || sessionUsername || '—'}</strong>
          {/if}
        {:else}
          Seleccione un punto de venta para ver stock y registrar ventas.
        {/if}
      </p>
    </div>
    <div class="head-actions">
      {#if !unitLocked}
        <label class="unit-select">
          <span>Punto de venta</span>
          <select bind:value={unitId} disabled={state.status === 'loading'}>
            <option value="">— Elegir —</option>
            {#each units as u}
              <option value={u.id}>{u.name || u.code || u.id}</option>
            {/each}
          </select>
        </label>
      {:else}
        <div class="unit-pill" title="Asignado a su usuario">
          <span class="unit-pill-lbl">PDV</span>
          <strong>{unitLabel}</strong>
        </div>
      {/if}
      <Button variant="secondary" onclick={() => store.loadAll()} disabled={state.status === 'loading'}>
        Actualizar
      </Button>
    </div>
  </header>

  {#if state.status === 'error' && state.error}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}
  {#if formOk && !showForm}
    <p class="banner ok" role="status">{formOk}</p>
  {/if}
  {#if invoiceMsg}
    <p class="banner ok" role="status">{invoiceMsg}</p>
  {/if}
  {#if invoiceErr}
    <p class="banner err" role="alert">{invoiceErr}</p>
  {/if}

  <div class="stock-row" class:dim={!unitId}>
    <div class="stock-block out" title="Cantidad disponible = 0">
      <div class="stock-head">
        <span class="stock-ico" aria-hidden="true">⊘</span>
        <div>
          <h2>Agotados</h2>
          <p>{stockOut.length} producto{stockOut.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <ul class="stock-list">
        {#if !unitId}
          <li class="empty-hint">Elija un PDV</li>
        {:else if stockOut.length === 0}
          <li class="empty-hint">Ninguno</li>
        {:else}
          {#each stockOut as row (row.productId)}
            <li><span class="sn">{row.name}</span><span class="sq">{row.qty}</span></li>
          {/each}
        {/if}
      </ul>
    </div>
    <div class="stock-block low" title="Cantidad ≤ {LOW_STOCK_THRESHOLD}">
      <div class="stock-head">
        <span class="stock-ico" aria-hidden="true">⚠</span>
        <div>
          <h2>Casi agotados</h2>
          <p>≤ {LOW_STOCK_THRESHOLD} uds · {stockLow.length}</p>
        </div>
      </div>
      <ul class="stock-list">
        {#if !unitId}
          <li class="empty-hint">Elija un PDV</li>
        {:else if stockLow.length === 0}
          <li class="empty-hint">Ninguno</li>
        {:else}
          {#each stockLow as row (row.productId)}
            <li><span class="sn">{row.name}</span><span class="sq">{row.qty}</span></li>
          {/each}
        {/if}
      </ul>
    </div>
    <div class="stock-block ok" title="Disponibles para venta">
      <div class="stock-head">
        <span class="stock-ico" aria-hidden="true">✓</span>
        <div>
          <h2>Habilitados</h2>
          <p>{stockOk.length} en venta</p>
        </div>
      </div>
      <ul class="stock-list">
        {#if !unitId}
          <li class="empty-hint">Elija un PDV</li>
        {:else if stockOk.length === 0}
          <li class="empty-hint">Sin stock positivo</li>
        {:else}
          {#each stockOk as row (row.productId)}
            <li><span class="sn">{row.name}</span><span class="sq">{row.qty}</span></li>
          {/each}
        {/if}
      </ul>
    </div>
  </div>

  <div class="actions-row">
    <div class="quick-stats">
      <div class="qs" title="Tickets del vendedor en este contexto">
        <span class="qs-val">{sellerSales.length}</span>
        <span class="qs-lbl">Ventas</span>
      </div>
      <div class="qs" title="Importe cobrado hoy">
        <span class="qs-val"><Money amount={sellerDayTotals.total} currency={saleCurrency} /></span>
        <span class="qs-lbl">Hoy</span>
      </div>
      <div class="qs" title="Margen aproximado (cobrado − costo)">
        <span class="qs-val"><Money amount={sellerTotals.margin} currency={saleCurrency} /></span>
        <span class="qs-lbl">Margen</span>
      </div>
    </div>
    <div class="action-btns">
      <Button type="button" onclick={openFormAndFocus} disabled={!unitId || state.saving}>Nueva venta <span class="kbd-inline"><kbd>F2</kbd></span></Button>
      <span class="kbd-hints-bar muted" aria-hidden="true">
        <kbd>F2</kbd> nueva · <kbd>F3</kbd> línea · <kbd>F4</kbd>/<kbd>Ctrl+↵</kbd> cobrar · <kbd>Esc</kbd> cerrar
      </span>
      {#if canInvoice && selectedSalesList().length > 0}
        <Button
          type="button"
          variant="secondary"
          disabled={invoiceBusy}
          onclick={() => emitInvoiceFromSales(selectedSalesList())}
        >
          Facturar selección ({selectedSalesList().length})
        </Button>
      {/if}
    </div>
  </div>

  <div class="main-split">
    <div class="col-left">
      {#if showForm}
        <Card>
          <div class="card-head">
            <div>
              <h2>Nueva venta</h2>
                          <p class="kbd-hints" title="Atajos de teclado">
              <kbd>F2</kbd> venta · <kbd>F3</kbd> línea · <kbd>F4</kbd> cobrar · <kbd>Esc</kbd> cerrar · <kbd>/</kbd> buscar
            </p>

            </div>
            <Button type="button" variant="ghost" size="sm" onclick={closeForm}>Cerrar</Button>
          </div>
          {#if !unitId}
            <p class="muted">Seleccione un punto de venta.</p>
          {:else if sellableProducts.length === 0}
            <p class="muted">No hay productos con stock en este PDV. Transfiera desde Almacén.</p>
          {:else}
            <form class="form" bind:this={formEl} onsubmit={handleSubmit}>
              <div class="form-grid">
                <label class="field">
                  <span>Fecha</span>
                  <input type="date" bind:value={date} disabled={state.saving} />
                </label>
                <label class="field">
                  <span>Vendedor</span>
                  <input
                    type="text"
                    bind:value={seller}
                    disabled={state.saving || isSellerRole()}
                    readonly={isSellerRole()}
                    placeholder="Nombre"
                  />
                </label>
                <label class="field span-2">
                  <span>Nota</span>
                  <input type="text" bind:value={note} disabled={state.saving} placeholder="Opcional" />
                </label>
              </div>
              <div class="lines-head">
                <h3>Líneas · estimado <Money amount={estimated} currency={saleCurrency} /></h3>
                <Button type="button" variant="secondary" size="sm" onclick={addLine} disabled={state.saving}
                  >+ Línea</Button
                >
              </div>
              {#each lines as line, i (i)}
                <div class="line-row">
                  <div class="field grow product-picker">
                    <span>Producto</span>
                    <div class="picker-control">
                      <input
                        type="search"
                        value={line.productQuery}
                        disabled={state.saving}
                        placeholder="Buscar código o nombre…"
                        autocomplete="off"
                        oninput={(e) =>
                          onProductQueryInput(i, (e.currentTarget as HTMLInputElement).value)}
                        onfocus={() => (pickerOpenIndex = i)}
                      />
                      {#if line.productId}
                        <button
                          type="button"
                          class="clear-prod"
                          disabled={state.saving}
                          onclick={() => clearProduct(i)}
                          aria-label="Quitar">×</button
                        >
                      {/if}
                    </div>
                    {#if pickerOpenIndex === i}
                      {@const matches = filterProducts(line.productQuery)}
                      <ul class="picker-list" role="listbox">
                        {#if matches.length === 0}
                          <li class="picker-empty">Sin coincidencias con stock</li>
                        {:else}
                          {#each matches as p (p.id)}
                            <li role="option">
                              <button type="button" class="picker-option" onclick={() => selectProduct(i, p.id)}>
                                <span class="po-main"
                                  ><strong>{p.code || '—'}</strong> · {p.name}</span
                                >
                                <span class="po-meta">
                                  <span class="po-price"
                                    ><Money amount={p.priceSale ?? 0} currency={saleCurrency} /></span
                                  >
                                  <span class="po-stock" title="Stock en PDV">{stockOf(p.id) ?? 0} ud</span>
                                </span>
                              </button>
                            </li>
                          {/each}
                        {/if}
                      </ul>
                    {/if}
                  </div>
                  <label class="field qty">
                    <span>Cant.</span>
                    <input type="number" min="0.01" step="any" bind:value={line.qty} disabled={state.saving} />
                  </label>
                  <label class="field qty">
                    <span>Precio</span>
                    <input type="number" min="0" step="any" bind:value={line.unitPrice} disabled={state.saving} />
                  </label>
                  <label class="field qty">
                    <span>Desc.%</span>
                    <input type="number" min="0" max="100" step="any" bind:value={line.discountPct} disabled={state.saving} />
                  </label>
                  <button
                    type="button"
                    class="remove"
                    disabled={state.saving || lines.length <= 1}
                    onclick={() => removeLine(i)}
                    aria-label="Quitar línea">×</button
                  >
                </div>
              {/each}
              {#if formError}
                <p class="banner err" role="alert">{formError}</p>
              {/if}
              <div class="checkout-bar">
                <div class="checkout-total">
                  <span class="ct-label">Total a cobrar</span>
                  <p class="ct-value"><Money amount={estimated} currency={saleCurrency} /></p>
                  {#if checkoutBlocked && hasSaleLines}
                    <span class="stock-warn">Revise stock o precio en las líneas</span>
                  {/if}
                </div>
                <div class="form-actions">
                  <Button
                    type="submit"
                    disabled={state.saving || !hasSaleLines || checkoutBlocked || !unitId}
                  >
                    {state.saving ? 'Cobrando…' : 'Cobrar venta'}
                  </Button>
                  <Button type="button" variant="ghost" onclick={closeForm} disabled={state.saving}
                    >Cerrar</Button
                  >
                </div>
              </div>
            </form>
          {/if}
        </Card>
      {/if}

      <div class="seller-stats">
        <div class="stats">
          <StatCard label="Tickets" amount={sellerSales.length} caption="En este PDV / vendedor" variant="plain" />
          <StatCard
            label="Cobrado"
            amount={sellerTotals.total}
            currency={saleCurrency}
            caption="Total histórico filtrado"
            variant="hero"
          />
          <StatCard
            label="Últimas 24h (día)"
            amount={sellerDayTotals.total}
            currency={saleCurrency}
            caption="{sellerDaySales.length} venta{sellerDaySales.length === 1 ? '' : 's'} hoy"
            variant="plain"
          />
        </div>
        {#if dailySales.length > 0 || topProducts.length > 0}
          <div class="charts">
            {#if dailySales.length > 0}
              <PanelCard title="Ventas por día" subtitle="Importe" tag="Tendencia">
                <BarChart points={dailySales} height={140} />
              </PanelCard>
            {/if}
            {#if topProducts.length > 0}
              <PanelCard title="Más vendidos" subtitle="Por importe" tag="Top">
                <BarChart points={topProducts} height={140} highlightLast={false} />
              </PanelCard>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="col-right">
      <Card>
        <div class="card-head">
          <div>
            <p class="eyebrow">Historial</p>
            <h2>Ventas del PDV</h2>
          </div>
          <span class="result-count">{sortedHistory.length}</span>
        </div>
        {#if !unitId}
          <p class="muted">Seleccione un punto de venta para ver el historial.</p>
        {:else if sortedHistory.length === 0}
          <p class="empty">Aún no hay ventas en este punto de venta.</p>
        {:else}
          <ul class="sale-list">
            {#each historySlice as s (s.id)}
              {@const open = expandedSaleId === s.id}
              <li class="sale-item" class:open>
                <div class="sale-row">
                  {#if canInvoice}
                    <label class="chk" title="Incluir en factura">
                      <input
                        type="checkbox"
                        checked={!!selectedSaleIds[s.id]}
                        onchange={() => toggleSelectSale(s.id)}
                      />
                    </label>
                  {/if}
                  <div class="sale-main">
                    <strong class="mono">{s.number}</strong>
                    <p class="sale-meta">
                      {s.date || '—'}
                      {#if s.seller} · {s.seller}{/if}
                      · {(s.lines || []).length} línea{(s.lines || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div class="sale-side">
                    <Money amount={s.total} currency={s.currency || saleCurrency} />
                    <Button type="button" variant="secondary" size="sm" onclick={() => toggleDetails(s.id)}>
                      {open ? 'Ocultar' : 'Ver detalles'}
                    </Button>
                    {#if canInvoice}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={invoiceBusy}
                        onclick={() => emitInvoiceFromSales([s])}
                      >
                        Emitir factura
                      </Button>
                    {/if}
                  </div>
                </div>
                {#if open}
                  <div class="sale-details">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th class="num">Cant.</th>
                          <th class="num">Precio</th>
                          <th class="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each s.lines || [] as l}
                          <tr>
                            <td>
                              <strong>{l.productName}</strong>
                              <small>{l.productCode}</small>
                            </td>
                            <td class="num">{l.qty}</td>
                            <td class="num"><Money amount={l.unitPrice} currency={s.currency} /></td>
                            <td class="num"><Money amount={l.lineTotal} currency={s.currency} /></td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                    {#if s.note}<p class="muted">{s.note}</p>{/if}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
          {#if historyTotalPages > 1}
            <div class="pager">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={historyPageClamped <= 0}
                onclick={() => (historyPage = Math.max(0, historyPageClamped - 1))}
              >
                Anterior
              </Button>
              <span class="page-ind">{historyPageClamped + 1} / {historyTotalPages}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={historyPageClamped >= historyTotalPages - 1}
                onclick={() => (historyPage = Math.min(historyTotalPages - 1, historyPageClamped + 1))}
              >
                Siguiente
              </Button>
            </div>
          {/if}
        {/if}
      </Card>
    </div>
  </div>
</section>

<style>
  .pos {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 1.5rem;
  }
  .page-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .page-head h1 {
    margin: 0 0 0.2rem;
    font-size: clamp(1.15rem, 2.2vw, 1.4rem);
    font-weight: 700;
  }
  .eyebrow {
    margin: 0 0 0.15rem;
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-cyan, #61e6e1);
  }
  .sub {
    margin: 0;
    font-size: 0.86rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .head-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .unit-select {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 0.75rem;
  }
  .unit-select span {
    font-size: 0.62rem;
    font-weight: 650;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }
  .unit-select select {
    min-height: 36px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: var(--color-text-primary);
  }
  .unit-pill {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 10%, transparent);
  }
  .unit-pill-lbl {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent-cyan, #61e6e1);
  }
  .stock-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }
  .stock-row.dim {
    opacity: 0.72;
  }
  @media (max-width: 820px) {
    .stock-row {
      grid-template-columns: 1fr;
    }
  }
  .stock-block {
    border-radius: 14px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated, #171b29));
    padding: 0.65rem 0.75rem;
    max-height: 200px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .stock-block.out {
    border-color: color-mix(in srgb, var(--accent-red, #f17b7b) 35%, var(--ap-border));
  }
  .stock-block.low {
    border-color: color-mix(in srgb, var(--accent-orange, #f0a35e) 35%, var(--ap-border));
  }
  .stock-block.ok {
    border-color: color-mix(in srgb, var(--accent-green, #b7f56a) 30%, var(--ap-border));
  }
  .stock-head {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin-bottom: 0.45rem;
  }
  .stock-head h2 {
    margin: 0;
    font-size: 0.9rem;
  }
  .stock-head p {
    margin: 0.1rem 0 0;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }
  .stock-ico {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    font-size: 0.95rem;
    flex-shrink: 0;
  }
  .out .stock-ico {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 18%, transparent);
    color: var(--accent-red, #f17b7b);
  }
  .low .stock-ico {
    background: color-mix(in srgb, var(--accent-orange, #f0a35e) 18%, transparent);
    color: var(--accent-orange, #f0a35e);
  }
  .ok .stock-ico {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 18%, transparent);
    color: var(--accent-green, #b7f56a);
  }
  .stock-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .stock-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.28rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
    font-size: 0.8rem;
  }
  .sn {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sq {
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    flex-shrink: 0;
  }
  .empty-hint {
    color: var(--color-text-muted);
    font-size: 0.78rem !important;
    border: none !important;
  }
  .actions-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }
  .quick-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .qs {
    min-width: 88px;
    padding: 0.45rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 40%, transparent);
  }
  .qs-val {
    display: block;
    font-weight: 700;
    font-size: 0.95rem;
  }
  .qs-lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }
  .action-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .main-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.85rem;
    align-items: start;
  }
  @media (max-width: 960px) {
    .main-split {
      grid-template-columns: 1fr;
    }
  }
  .col-left,
  .col-right {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }
  .card-head h2 {
    margin: 0;
    font-size: 1.02rem;
  }
  .result-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
  }
  @media (max-width: 640px) {
    .stats {
      grid-template-columns: 1fr;
    }
  }
  .charts {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 0.65rem;
  }
  .form-grid .span-2 {
    grid-column: 1 / -1;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.78rem;
  }
  .field span {
    font-size: 0.62rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
  }
  .field input {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: var(--color-text-primary);
    min-height: 36px;
  }
  .lines-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.75rem 0 0.4rem;
  }
  .lines-head h3 {
    margin: 0;
    font-size: 0.88rem;
  }
  .line-row {
    display: grid;
    grid-template-columns: 1fr 64px 72px 64px 32px;
    gap: 6px;
    align-items: end;
    margin-bottom: 0.4rem;
  }
  @media (max-width: 560px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  .product-picker {
    position: relative;
    z-index: 2;
  }
  .picker-control {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .picker-control input {
    flex: 1;
    min-width: 0;
  }
  .clear-prod {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .picker-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 4px;
    position: absolute;
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 200px;
    overflow-y: auto;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface, #171b29);
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
    color: inherit;
    cursor: pointer;
    font-size: 0.82rem;
  }
  .picker-option:hover {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
  }
  .po-stock {
    font-size: 0.72rem;
    font-weight: 650;
    color: var(--accent-cyan, #61e6e1);
  }
  .picker-empty {
    padding: 8px 10px;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }
  .remove {
    width: 32px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 0.75rem;
  }
  .sale-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: min(62vh, 640px);
    overflow-y: auto;
  }
  .sale-item {
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: 12px;
    overflow: hidden;
  }
  .sale-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.65rem;
  }
  .chk {
    display: flex;
    align-items: center;
  }
  .sale-main {
    flex: 1;
    min-width: 0;
  }
  .sale-meta {
    margin: 0.1rem 0 0;
    font-size: 0.74rem;
    color: var(--color-text-secondary);
  }
  .sale-side {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .sale-details {
    border-top: 1px solid var(--color-border);
    padding: 0.55rem 0.65rem 0.75rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th {
    text-align: left;
    font-size: 0.62rem;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 4px 6px;
    border-bottom: 1px solid var(--color-border);
  }
  td {
    padding: 6px;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }
  td small {
    display: block;
    color: var(--color-text-muted);
    font-size: 0.7rem;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.86rem;
  }
  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    margin-top: 0.65rem;
  }
  .page-ind {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .empty,
  .muted {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }
  .empty {
    text-align: center;
    padding: 1rem 0;
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

  .po-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    flex-shrink: 0;
  }
  .po-price {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent-cyan, #61e6e1);
  }
  .po-main {
    min-width: 0;
    text-align: left;
  }
  .picker-option {
    align-items: flex-start;
  }
  .line-total-field {
    min-width: 5.5rem;
  }
  .line-total {
    margin: 0;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    font-size: 0.95rem;
  }
  .stock-warn {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    color: #e85d5d;
  }
  .stock-ok {
    display: block;
    font-size: 0.68rem;
    color: var(--ap-text-muted);
  }
  .checkout-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 8%, var(--ap-bg-elevated, transparent));
    position: sticky;
    bottom: 0;
    z-index: 5;
  }
  .ct-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ap-text-muted);
  }
  .ct-value {
    margin: 0.1rem 0 0;
    font-size: 1.35rem;
    font-weight: 800;
  }
  .checkout-total {
    min-width: 0;
  }

  .kbd-hints {
    margin: 0.25rem 0 0;
    font-size: 0.72rem;
    color: var(--ap-text-muted, #888);
  }
  .kbd-hints-bar {
    font-size: 0.72rem;
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .kbd-inline {
    margin-left: 0.35rem;
    opacity: 0.85;
  }
  kbd {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    border-radius: 5px;
    border: 1px solid var(--ap-border, #444);
    background: color-mix(in srgb, var(--ap-bg-elevated, #1a1a22) 80%, transparent);
    font-size: 0.68rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 650;
  }
</style>
