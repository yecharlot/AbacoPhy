<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';
  import {
    getReceptionVisualStatus,
    isReceptionAbandoned,
    receptionAbandonReason,
    receptionStatusLabel,
    type CreateReceptionLineInput,
    type Reception,
  } from '../../domain/entities/Reception';
  import {
    filterReceptionsForReport,
    openReceptionReportWindow,
    type ReceptionReportKind,
  } from '../pdf/buildReceptionReportHtml';

  export let store: WarehouseStore;
  export let receiverCandidates: Array<{ name: string; role: string }> = [];
  export let businessName: string = '';
  export let businessCurrency: string = 'CUP';

  type DraftLine = {
    productId: string;
    /** Texto del buscador / etiqueta visible: código · nombre */
    productQuery: string;
    qty: string;
    unitCost: string;
  };

  let state: WarehouseState = store.getState();

  // Formulario (cerrado por defecto)
  let showForm = false;
  let supplier = '';
  let docRef = '';
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let hasInvoice = true;
  let invoiceRef = '';
  let receiver = '';
  let lines: DraftLine[] = [{ productId: '', productQuery: '', qty: '', unitCost: '' }];
  let formError = '';
  let formOk = '';

  // Secciones secundarias (laterales, nunca debajo del historial)
  let showAbandoned = false;
  /** Visible mientras haya incidencias; auto-abierto. */
  let showProblems = false;
  let showFilters = true;
  let problemsUserClosed = false;

  // Detalles expandibles por recepción
  let expandedIds: Record<string, boolean> = {};

  // Filtros historial
  let filterDateFrom = '';
  let filterDateTo = '';
  let filterValueMin = '';
  let filterValueMax = '';
  let filterProduct = '';
  let filterCode = '';

  // Informe
  let showReportModal = false;
  let reportKind: ReceptionReportKind = 'general';
  let reportFrom = '';
  let reportTo = '';
  let reportError = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: products = state.products ?? [];
  $: receiverNames = (receiverCandidates ?? [])
    .map((c) => (c.name || '').trim())
    .filter(Boolean);
  $: receiverDatalistId = 'reception-receiver-suggestions';
  $: stockRows = state.rows ?? [];
  $: receptions = [...(state.receptions ?? [])].reverse();
  $: problemReceptions = receptions.filter(
    (r) => getReceptionVisualStatus(r) === 'entry_problem' && !isReceptionAbandoned(r),
  );
  $: abandonedReceptions = receptions.filter((r) => isReceptionAbandoned(r));
  // Auto-abrir panel de problemas si hay al menos una incidencia
  $: if (problemReceptions.length > 0) {
    showProblems = true;
    problemsUserClosed = false;
  } else if (!problemsUserClosed) {
    showProblems = false;
  }

  $: sideOpen = showProblems || showAbandoned;

  function toggleProblems() {
    if (problemReceptions.length > 0) {
      showProblems = true;
      return;
    }
    showProblems = !showProblems;
    problemsUserClosed = !showProblems;
  }

  function toggleAbandoned() {
    showAbandoned = !showAbandoned;
  }
  $: mainHistory = receptions.filter((r) => !isReceptionAbandoned(r));

  $: filteredHistory = mainHistory.filter((r) => {
    if (filterDateFrom && (r.date || '') < filterDateFrom) return false;
    if (filterDateTo && (r.date || '') > filterDateTo) return false;
    const total = Number(r.totalCost) || 0;
    if (filterValueMin !== '' && total < parseFloat(filterValueMin)) return false;
    if (filterValueMax !== '' && total > parseFloat(filterValueMax)) return false;
    if (filterCode.trim()) {
      const q = filterCode.trim().toLowerCase();
      const hay = `${r.number || ''} ${r.docRef || ''} ${r.invoiceRef || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterProduct.trim()) {
      const q = filterProduct.trim().toLowerCase();
      const hit = (r.lines || []).some((l) => {
        const s = `${l.productCode || ''} ${l.productName || ''} ${l.productId || ''}`.toLowerCase();
        return s.includes(q);
      });
      if (!hit) return false;
    }
    return true;
  });

  $: hasActiveFilters = !!(
    filterDateFrom ||
    filterDateTo ||
    filterValueMin ||
    filterValueMax ||
    filterProduct.trim() ||
    filterCode.trim()
  );

  $: estimated = lines.reduce(
    (acc, line) => acc + (parseFloat(line.qty) || 0) * (parseFloat(line.unitCost) || 0),
    0,
  );

  function productLabel(id: string): string {
    const p = products.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function productUnit(id: string): string {
    return products.find((x) => x.id === id)?.unit || '';
  }

  /** Picker predictivo por línea (evita <select> con miles de opciones). */
  let pickerOpenIndex: number | null = null;
  const PICKER_LIMIT = 40;

  function closeProductPicker() {
    pickerOpenIndex = null;
  }

  function openProductPicker(index: number) {
    pickerOpenIndex = index;
  }

  function filterProducts(query: string) {
    const q = (query || '').trim().toLowerCase();
    const list = products || [];
    if (!q) return list.slice(0, PICKER_LIMIT);
    const out: typeof list = [];
    for (const p of list) {
      const hay = `${p.code || ''} ${p.name || ''} ${p.unit || ''} ${p.category || ''}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(p);
        if (out.length >= PICKER_LIMIT) break;
      }
    }
    return out;
  }

  function onProductQueryInput(index: number, value: string) {
    const next = [...lines];
    next[index] = {
      ...next[index],
      productQuery: value,
      // Si el usuario edita el texto, invalidar selección previa
      productId: '',
    };
    lines = next;
    pickerOpenIndex = index;
  }

  function selectProduct(index: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const next = [...lines];
    const stock = stockRows.find((r) => r.productId === productId);
    const suggested =
      stock && Number(stock.avgCost) > 0 ? String(stock.avgCost) : next[index].unitCost;
    next[index] = {
      ...next[index],
      productId: p.id,
      productQuery: `${p.code || '—'} · ${p.name}`,
      unitCost: next[index].unitCost || suggested || '',
    };
    lines = next;
    closeProductPicker();
  }

  function clearProduct(index: number) {
    const next = [...lines];
    next[index] = { ...next[index], productId: '', productQuery: '' };
    lines = next;
    openProductPicker(index);
  }

  function addLine() {
    lines = [...lines, { productId: '', productQuery: '', qty: '', unitCost: '' }];
    closeProductPicker();
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    supplier = '';
    docRef = '';
    note = '';
    date = new Date().toISOString().slice(0, 10);
    hasInvoice = true;
    invoiceRef = '';
    receiver = '';
    lines = [{ productId: '', productQuery: '', qty: '', unitCost: '' }];
    closeProductPicker();
    formError = '';
  }

  function openForm() {
    resetForm();
    formOk = '';
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    formError = '';
  }

  function clearFilters() {
    filterDateFrom = '';
    filterDateTo = '';
    filterValueMin = '';
    filterValueMax = '';
    filterProduct = '';
    filterCode = '';
  }

  function toggleDetails(id: string) {
    expandedIds = { ...expandedIds, [id]: !expandedIds[id] };
  }

  function statusTone(r: Reception): string {
    const v = getReceptionVisualStatus(r);
    if (v === 'entry_confirmed') return 'ok';
    if (v === 'entry_problem') return 'warn';
    if (v === 'abandoned' || v === 'cancelled') return 'off';
    return 'pending';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (products.length === 0) {
      formError = 'No hay productos. Cree al menos uno en el Nomenclador de productos.';
      return;
    }
    if (!receiver.trim()) {
      formError = 'Indique quién recibe la mercancía';
      return;
    }
    if (hasInvoice) {
      const ref = (invoiceRef || docRef).trim();
      if (!ref) {
        formError = 'Compra con factura: indique el número de factura';
        return;
      }
      if (!supplier.trim()) {
        formError = 'Compra con factura: indique el proveedor';
        return;
      }
    }

    const payload: CreateReceptionLineInput[] = [];
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = parseFloat(line.qty);
      const unitCostRaw = String(line.unitCost ?? '').trim();
      if (!unitCostRaw) {
        formError =
          'Indique el costo unitario documental de cada línea. El costo promedio solo cambia cuando Almacén confirma la entrada.';
        return;
      }
      const unitCost = parseFloat(unitCostRaw);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        formError = 'El costo unitario de la recepción no puede ser negativo';
        return;
      }
      payload.push({ productId: line.productId, qty, unitCost });
    }

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto con cantidad y costo unitario';
      return;
    }

    try {
      await store.addReception({
        hasInvoice,
        invoiceRef: invoiceRef.trim() || docRef.trim() || undefined,
        supplier: supplier.trim() || undefined,
        receiver: receiver.trim(),
        docRef: docRef.trim() || undefined,
        note: note.trim() || undefined,
        date: date || undefined,
        lines: payload,
      });
      formOk = `Informe registrado · pendiente de entrada física · total documental ${estimated.toFixed(2)}`;
      resetForm();
      showForm = false;
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo confirmar la recepción';
    }
  }

  function openReportModal() {
    reportKind = 'general';
    reportFrom = '';
    reportTo = '';
    reportError = '';
    showReportModal = true;
  }

  function closeReportModal() {
    showReportModal = false;
    reportError = '';
  }

  function generateReport() {
    reportError = '';
    try {
      const rows = filterReceptionsForReport(receptions, {
        kind: reportKind,
        periodFrom: reportFrom || undefined,
        periodTo: reportTo || undefined,
      });
      openReceptionReportWindow(rows, {
        kind: reportKind,
        businessName,
        currency: businessCurrency || 'CUP',
        periodFrom: reportFrom || undefined,
        periodTo: reportTo || undefined,
      });
      closeReportModal();
    } catch (err) {
      reportError = err instanceof Error ? err.message : 'No se pudo generar el informe';
    }
  }
</script>

<section class="recepcion" data-screen="recepcion">
  <DevSeedPanel
    title="Seed recepciones / transferencias (DEV)"
    description="Requiere productos. ensureUnit + receptions + transfers."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />

  <header class="page-head">
    <div>
      <h1>Informes de recepción</h1>
      <p class="sub">
        Compra documental: no modifica stock ni costo promedio hasta que Almacén confirma la entrada
        física.
      </p>
    </div>
    <Button variant="secondary" onclick={() => store.loadAll()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  {#if state.status === 'error' && state.error}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}
  {#if formOk && !showForm}
    <p class="banner ok" role="status">{formOk}</p>
  {/if}

  <!-- Acciones -->
  <div class="actions-row" role="toolbar" aria-label="Acciones de recepción">
    <Button type="button" onclick={openForm} disabled={state.saving}>Nueva recepción</Button>
    <Button type="button" variant="secondary" onclick={openReportModal}>Generar informes</Button>
    <Button
      type="button"
      variant="secondary"
      onclick={toggleProblems}
      disabled={problemReceptions.length > 0 && showProblems}
      title={problemReceptions.length > 0 ? 'Visible mientras haya incidencias' : ''}
    >
      {#if problemReceptions.length > 0}
        Problemas ({problemReceptions.length})
      {:else}
        {showProblems ? 'Ocultar problemas' : 'Ver recepciones con problemas'}
      {/if}
    </Button>
    <Button type="button" variant="secondary" onclick={toggleAbandoned}>
      {showAbandoned
        ? 'Ocultar descartadas'
        : `Ver descartadas${abandonedReceptions.length ? ` (${abandonedReceptions.length})` : ''}`}
    </Button>
  </div>

  <div class="main-layout" class:side-open={sideOpen}>
    <aside class="side-col" aria-label="Paneles secundarios de recepción">
      {#if showProblems}
        <div class="side-panel slide-in">
<Card>
        <div class="sec-head">
          <h2>Recepciones con problemas ({problemReceptions.length})</h2>
        </div>
        {#if problemReceptions.length === 0}
          <p class="muted">No hay recepciones con incidencia abierta.</p>
        {:else}
          <ul class="rx-list compact">
            {#each problemReceptions as r (r.id)}
              <li class="rx-item issue">
                <div class="rx-row">
                  <div class="rx-main">
                    <span class="dot warn"></span>
                    <div>
                      <strong class="mono">{r.number}</strong>
                      <p class="rx-meta">{r.supplier || 'Sin proveedor'} · {r.date}</p>
                      <p class="issue-text">
                        {r.metadataState?.problemReason || r.note || 'Problema sin detalle'}
                      </p>
                    </div>
                  </div>
                  <Money amount={r.totalCost} currency={r.currency || businessCurrency} />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </Card>
        </div>
      {/if}
      {#if showAbandoned}
        <div class="side-panel slide-in">
<Card>
        <div class="sec-head">
          <h2>Recepciones descartadas ({abandonedReceptions.length})</h2>
        </div>
        {#if abandonedReceptions.length === 0}
          <p class="muted">No hay recepciones abandonadas.</p>
        {:else}
          <ul class="rx-list compact">
            {#each abandonedReceptions as r (r.id)}
              <li class="rx-item dim">
                <div class="rx-row">
                  <div class="rx-main">
                    <span class="dot off"></span>
                    <div>
                      <strong class="mono">{r.number}</strong>
                      <p class="rx-meta">{r.date} · Abandonada</p>
                      <p class="issue-text">{receptionAbandonReason(r)}</p>
                    </div>
                  </div>
                  <Money amount={r.totalCost} currency={r.currency || businessCurrency} />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </Card>
        </div>
      {/if}
    </aside>

    <div class="history-col">
  <!-- Historial principal -->
  <Card>
    <div class="list-head">
      <div>
        <p class="eyebrow">Consulta</p>
        <h2>Historial de informes</h2>
      </div>
      <div class="list-head-side">
        <span class="result-count"
          >{filteredHistory.length}{hasActiveFilters ? ` de ${mainHistory.length}` : ''}</span
        >
        <Button type="button" variant="secondary" onclick={() => (showFilters = !showFilters)}>
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </Button>
      </div>
    </div>

    {#if showFilters}
      <div class="filters" aria-label="Filtros de recepción">
        <label class="f">
          <span>Desde</span>
          <input type="date" bind:value={filterDateFrom} />
        </label>
        <label class="f">
          <span>Hasta</span>
          <input type="date" bind:value={filterDateTo} />
        </label>
        <label class="f">
          <span>Valor mín.</span>
          <input type="number" step="any" min="0" bind:value={filterValueMin} placeholder="0" />
        </label>
        <label class="f">
          <span>Valor máx.</span>
          <input type="number" step="any" min="0" bind:value={filterValueMax} placeholder="—" />
        </label>
        <label class="f grow">
          <span>Producto</span>
          <input type="search" bind:value={filterProduct} placeholder="Código o nombre" />
        </label>
        <label class="f grow">
          <span>Código / factura</span>
          <input type="search" bind:value={filterCode} placeholder="Nº IR, factura…" />
        </label>
        {#if hasActiveFilters}
          <div class="f-actions">
            <Button type="button" variant="secondary" onclick={clearFilters}>Limpiar filtros</Button>
          </div>
        {/if}
      </div>
    {/if}

    {#if state.status === 'loading' && receptions.length === 0}
      <p class="muted">Cargando recepciones…</p>
    {:else if filteredHistory.length === 0}
      <p class="empty">
        {mainHistory.length === 0
          ? 'Aún no hay informes de recepción.'
          : 'Ninguna recepción coincide con los filtros.'}
      </p>
    {:else}
      <ul class="rx-list">
        {#each filteredHistory as r (r.id)}
          {@const visual = getReceptionVisualStatus(r)}
          {@const open = !!expandedIds[r.id]}
          <li class="rx-item" class:open>
            <div class="rx-row">
              <div class="rx-main">
                <span class="dot {statusTone(r)}" aria-hidden="true"></span>
                <div>
                  <strong class="mono">{r.number || '—'}</strong>
                  <p class="rx-meta">
                    {r.date || '—'}
                    {#if r.supplier} · {r.supplier}{/if}
                    · {(r.lines || []).length} línea{(r.lines || []).length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div class="rx-side">
                <Money amount={r.totalCost} currency={r.currency || businessCurrency} />
                <span class="pill {statusTone(r)}">{receptionStatusLabel(visual)}</span>
                <Button type="button" variant="secondary" onclick={() => toggleDetails(r.id)}>
                  {open ? 'Ocultar detalles' : 'Ver detalles'}
                </Button>
              </div>
            </div>
            {#if open}
              <div class="rx-details">
                <div class="details-inner">
                  {#if r.receiver}
                    <p class="detail-note"><strong>Recibe:</strong> {r.receiver}</p>
                  {/if}
                  {#if r.docRef || r.invoiceRef}
                    <p class="detail-note">
                      <strong>Doc:</strong>
                      {r.invoiceRef || r.docRef}
                    </p>
                  {/if}
                  {#if (r.lines || []).length === 0}
                    <p class="muted">Sin líneas de producto.</p>
                  {:else}
                    <table class="lines-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th class="num">Cant.</th>
                          <th class="num">Costo unit.</th>
                          <th class="num">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each r.lines as l}
                          <tr>
                            <td>
                              <strong>{l.productName || '—'}</strong>
                              <small>{l.productCode || '—'}</small>
                            </td>
                            <td class="num">{l.qty}</td>
                            <td class="num"
                              ><Money amount={l.unitCost} currency={r.currency || businessCurrency} /></td
                            >
                            <td class="num"
                              ><Money amount={l.amount} currency={r.currency || businessCurrency} /></td
                            >
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  {/if}
                  {#if r.note}
                    <p class="detail-note muted">{r.note}</p>
                  {/if}
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

    </div>
  </div>

</section>

<!-- Modal nueva recepción -->
{#if showForm}
  <div class="modal-backdrop" role="presentation" onclick={closeForm}>
    <div
      class="modal modal-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-rx-title"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal-head">
        <h3 id="new-rx-title">Nueva recepción</h3>
        <p class="modal-sub">
          Informe documental de compra. Stock y costo promedio solo cambian cuando Almacén da entrada.
        </p>
      </div>

      {#if products.length === 0}
        <p class="banner err">No hay productos en el nomenclador.</p>
        <div class="modal-actions">
          <Button type="button" variant="secondary" onclick={closeForm}>Cerrar</Button>
        </div>
      {:else}
        <form class="form" onsubmit={handleSubmit}>
          <div class="form-grid">
            <label class="field">
              <span>Fecha</span>
              <input type="date" bind:value={date} disabled={state.saving} />
            </label>
            <label class="field">
              <span>Quién recibe</span>
              <input
                type="text"
                list={receiverDatalistId}
                bind:value={receiver}
                disabled={state.saving}
                placeholder="Nombre"
                autocomplete="off"
              />
              <datalist id={receiverDatalistId}>
                {#each receiverNames as n}
                  <option value={n}></option>
                {/each}
              </datalist>
            </label>
            <label class="field span-2 check">
              <input type="checkbox" bind:checked={hasInvoice} disabled={state.saving} />
              Compra con factura
            </label>
            {#if hasInvoice}
              <label class="field">
                <span>Nº factura</span>
                <input type="text" bind:value={invoiceRef} disabled={state.saving} />
              </label>
              <label class="field">
                <span>Proveedor</span>
                <input type="text" bind:value={supplier} disabled={state.saving} />
              </label>
            {:else}
              <label class="field">
                <span>Proveedor (opc.)</span>
                <input type="text" bind:value={supplier} disabled={state.saving} />
              </label>
              <label class="field">
                <span>Ref. documento (opc.)</span>
                <input type="text" bind:value={docRef} disabled={state.saving} />
              </label>
            {/if}
            <label class="field span-2">
              <span>Nota</span>
              <input type="text" bind:value={note} disabled={state.saving} placeholder="Opcional" />
            </label>
          </div>

          <div class="lines-head">
            <h4>Líneas · estimado <Money amount={estimated} currency={businessCurrency} /></h4>
            <Button type="button" variant="secondary" onclick={addLine} disabled={state.saving}
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
                    placeholder="Buscar por código o nombre…"
                    autocomplete="off"
                    oninput={(e) =>
                      onProductQueryInput(i, (e.currentTarget as HTMLInputElement).value)}
                    onfocus={() => openProductPicker(i)}
                    onkeydown={(e) => {
                      if (e.key === 'Escape') closeProductPicker();
                    }}
                  />
                  {#if line.productId}
                    <span class="unit-badge" title="Unidad de medida">{productUnit(line.productId)}</span>
                    <button
                      type="button"
                      class="clear-prod"
                      disabled={state.saving}
                      onclick={() => clearProduct(i)}
                      aria-label="Quitar producto">×</button
                    >
                  {/if}
                </div>
                {#if pickerOpenIndex === i}
                  {@const matches = filterProducts(line.productQuery)}
                  <ul class="picker-list" role="listbox">
                    {#if matches.length === 0}
                      <li class="picker-empty">Sin coincidencias</li>
                    {:else}
                      {#each matches as p (p.id)}
                        <li role="option">
                          <button
                            type="button"
                            class="picker-option"
                            class:selected={line.productId === p.id}
                            onclick={() => selectProduct(i, p.id)}
                          >
                            <span class="po-main"
                              ><strong>{p.code || '—'}</strong> · {p.name}</span
                            >
                            <span class="po-unit">{p.unit || '—'}</span>
                          </button>
                        </li>
                      {/each}
                      {#if products.length > PICKER_LIMIT && !(line.productQuery || '').trim()}
                        <li class="picker-hint">Escriba para filtrar · {products.length} productos</li>
                      {/if}
                    {/if}
                  </ul>
                {/if}
              </div>
              <label class="field qty">
                <span>Cantidad{#if line.productId && productUnit(line.productId)}
                    <em class="unit-inline">({productUnit(line.productId)})</em>{/if}</span
                >
                <input type="number" min="0.01" step="any" bind:value={line.qty} disabled={state.saving} />
              </label>
              <label class="field qty">
                <span>Costo unitario</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  bind:value={line.unitCost}
                  disabled={state.saving}
                />
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

          <div class="modal-actions">
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Guardando…' : 'Registrar recepción'}
            </Button>
            <Button type="button" variant="secondary" onclick={closeForm} disabled={state.saving}
              >Cancelar</Button
            >
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- Modal informes -->
{#if showReportModal}
  <div class="modal-backdrop" role="presentation" onclick={closeReportModal}>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-report-title"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 id="rx-report-title">Generar informes</h3>
      <p class="modal-sub">Seleccione el tipo. Se abrirá una vista lista para imprimir o guardar como PDF.</p>

      <fieldset class="report-kinds">
        <legend class="sr-only">Tipo</legend>
        <label class="radio"
          ><input type="radio" bind:group={reportKind} value="general" /> Informe general del historial</label
        >
        <label class="radio"
          ><input type="radio" bind:group={reportKind} value="confirmed" /> Recepciones confirmadas</label
        >
        <label class="radio"
          ><input type="radio" bind:group={reportKind} value="rejected" /> Recepciones rechazadas</label
        >
        <label class="radio"
          ><input type="radio" bind:group={reportKind} value="abandoned" /> Descartadas / abandonadas</label
        >
        <label class="radio"
          ><input type="radio" bind:group={reportKind} value="problems" /> Con problemas</label
        >
      </fieldset>

      <div class="form-grid">
        <label class="field">
          <span>Desde (opc.)</span>
          <input type="date" bind:value={reportFrom} />
        </label>
        <label class="field">
          <span>Hasta (opc.)</span>
          <input type="date" bind:value={reportTo} />
        </label>
      </div>

      {#if reportError}
        <p class="banner err" role="alert">{reportError}</p>
      {/if}

      <div class="modal-actions">
        <Button type="button" onclick={generateReport}>Generar PDF</Button>
        <Button type="button" variant="secondary" onclick={closeReportModal}>Cancelar</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .recepcion {
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
    margin: 0 0 0.25rem;
    font-size: clamp(1.2rem, 2.2vw, 1.45rem);
    font-weight: 700;
  }
  .sub {
    margin: 0;
    font-size: 0.88rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    max-width: 38rem;
  }
  .eyebrow {
    margin: 0 0 0.2rem;
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-cyan, #61e6e1);
  }

  .actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .list-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .list-head h2 {
    margin: 0;
    font-size: 1.05rem;
  }
  .list-head-side {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .result-count {
    font-size: 0.75rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem 0.65rem;
    margin-bottom: 0.85rem;
    align-items: flex-end;
  }
  .filters .f {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 110px;
  }
  .filters .f.grow {
    flex: 1 1 140px;
  }
  .filters .f span {
    font-size: 0.62rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .filters input {
    padding: 7px 9px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: var(--color-text-primary, var(--ap-text));
    font-size: 0.84rem;
    min-height: 36px;
  }
  .f-actions {
    display: flex;
    align-items: flex-end;
  }

  .rx-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .rx-item {
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: 12px;
    background: color-mix(in srgb, var(--color-bg, #050812) 35%, transparent);
    overflow: hidden;
  }
  .rx-item.issue {
    border-color: color-mix(in srgb, var(--accent-orange, #f0a35e) 40%, var(--ap-border));
  }
  .rx-item.dim {
    opacity: 0.9;
  }
  .rx-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.65rem 0.75rem;
  }
  .rx-main {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    min-width: 0;
  }
  .rx-meta {
    margin: 0.12rem 0 0;
    font-size: 0.75rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .rx-side {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .dot {
    width: 8px;
    height: 8px;
    margin-top: 0.35rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot.ok {
    background: var(--accent-green, #b7f56a);
  }
  .dot.warn {
    background: var(--accent-orange, #f0a35e);
  }
  .dot.pending {
    background: var(--accent-cyan, #61e6e1);
  }
  .dot.off {
    background: var(--ap-text-muted, #858c9d);
  }
  .pill {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .pill.ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 16%, transparent);
    color: var(--accent-green, #b7f56a);
  }
  .pill.warn {
    background: color-mix(in srgb, var(--accent-orange, #f0a35e) 16%, transparent);
    color: var(--accent-orange, #f0a35e);
  }
  .pill.pending {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 16%, transparent);
    color: var(--accent-cyan, #61e6e1);
  }
  .pill.off {
    background: color-mix(in srgb, var(--ap-text-muted) 14%, transparent);
    color: var(--ap-text-muted);
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88rem;
  }

  .rx-details {
    border-top: 1px solid var(--color-border, var(--ap-border));
    animation: slideIn 0.28s ease both;
  }
  .details-inner {
    padding: 0.65rem 0.75rem 0.85rem;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .lines-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  .lines-table th {
    text-align: left;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
    padding: 4px 6px;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  .lines-table td {
    padding: 6px;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    vertical-align: top;
  }
  .lines-table small {
    display: block;
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.7rem;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .detail-note {
    margin: 0 0 0.4rem;
    font-size: 0.8rem;
  }
  .issue-text {
    margin: 0.25rem 0 0;
    font-size: 0.78rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }

  .main-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    align-items: start;
  }
  .side-col {
    display: none;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
  }
  .main-layout.side-open .side-col {
    display: flex;
  }
  @media (min-width: 960px) {
    .main-layout.side-open {
      grid-template-columns: minmax(240px, 0.4fr) minmax(0, 1fr);
    }
    .side-col {
      position: sticky;
      top: 0.5rem;
      max-height: calc(100dvh - 8rem);
      overflow-y: auto;
    }
  }
  /* Móvil: paneles arriba del historial (no bajo lista larga) */
  @media (max-width: 959px) {
    .side-col {
      order: -1;
    }
  }
  .side-panel {
    min-width: 0;
  }
  .slide-in {
    animation: sideSlideIn 0.28s ease both;
  }
  @keyframes sideSlideIn {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .sec-head h2 {
    margin: 0 0 0.65rem;
    font-size: 0.98rem;
  }
  .history-col {
    min-width: 0;
  }

  .empty,
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
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

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgba(5, 8, 18, 0.72);
    backdrop-filter: blur(4px);
  }
  .modal {
    width: min(440px, 100%);
    max-height: min(92vh, 740px);
    overflow: auto;
    padding: 1.1rem 1.15rem 1.2rem;
    border-radius: 16px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated, #171b29));
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  }
  .modal-form {
    width: min(580px, 100%);
  }
  .modal h3 {
    margin: 0 0 0.3rem;
    font-size: 1.05rem;
  }
  .modal-sub {
    margin: 0 0 0.85rem;
    font-size: 0.82rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 0.85rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 0.65rem;
  }
  .form-grid .span-2 {
    grid-column: 1 / -1;
  }
  @media (max-width: 520px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
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
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .field input,
  .field select {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-bg, #050812);
    color: var(--color-text-primary, var(--ap-text));
    min-height: 38px;
  }
  .field.check {
    flex-direction: row;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.85rem;
  }
  .lines-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.85rem 0 0.45rem;
  }
  .lines-head h4 {
    margin: 0;
    font-size: 0.85rem;
  }
  .line-row {
    display: grid;
    grid-template-columns: 1fr minmax(72px, 0.22fr) minmax(88px, 0.28fr) 32px;
    gap: 8px;
    align-items: end;
    margin-bottom: 0.45rem;
  }
  @media (max-width: 560px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  .remove {
    width: 32px;
    height: 38px;
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
  .report-kinds {
    border: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .radio {
    display: flex;
    gap: 0.45rem;
    font-size: 0.86rem;
    cursor: pointer;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 600px) {
    .actions-row > :global(button) {
      flex: 1 1 calc(50% - 0.25rem);
      min-height: 40px;
    }
  }

  .product-picker {
    position: relative;
    z-index: 2;
  }
  .picker-control {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .picker-control input {
    flex: 1;
    min-width: 0;
  }
  .unit-badge {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 4px 7px;
    border-radius: 8px;
    border: 1px solid var(--color-border, var(--ap-border));
    color: var(--accent-cyan, #61e6e1);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 10%, transparent);
  }
  .clear-prod {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    line-height: 1;
  }
  .picker-list {
    list-style: none;
    margin: 4px 0 0;
    padding: 4px;
    position: absolute;
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 220px;
    overflow-y: auto;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated, #171b29));
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
    color: var(--color-text-primary, var(--ap-text));
    cursor: pointer;
    font-size: 0.82rem;
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
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .picker-empty,
  .picker-hint {
    padding: 8px 10px;
    font-size: 0.78rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .unit-inline {
    font-style: normal;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    color: var(--accent-cyan, #61e6e1);
    margin-left: 4px;
  }

</style>
