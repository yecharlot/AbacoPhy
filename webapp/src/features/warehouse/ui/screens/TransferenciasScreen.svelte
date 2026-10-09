<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import type { CreateTransferLineInput, Transfer } from '../../domain/entities/Transfer';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';
  import {
    filterTransfersForReport,
    openTransferReportWindow,
    type TransferReportKind,
  } from '../pdf/buildTransferReportHtml';

  export let store: WarehouseStore;
  /** Opcional: nombre del negocio para cabecera de informes. */
  export let businessName: string = '';
  export let businessCurrency: string = 'CUP';

  type DraftLine = {
    productId: string;
    qty: string;
  };


  let state: WarehouseState = store.getState();

  // —— Formulario (cerrado por defecto) ——
  let showForm = false;
  let unitId = '';
  let note = '';
  let date = new Date().toISOString().slice(0, 10);
  let lines: DraftLine[] = [{ productId: '', qty: '' }];
  let formError = '';
  let formOk = '';

  // —— Stats panel ——
  let showStats = false;

  // —— Filtros listado ——
  let filterDateFrom = '';
  let filterDateTo = '';
  let filterName = '';
  let filterProduct = '';
  let filterUnitId = '';

  // —— Informe ——
  let showReportModal = false;
  let reportKind: TransferReportKind = 'general';
  let reportFrom = '';
  let reportTo = '';
  let reportUnitId = '';
  let reportError = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: units = (state.units ?? []).filter((u) => u.active !== false);
  $: stockRows = (state.rows ?? []).filter((r) => r.qty > 0);
  $: transfers = [...(state.transfers ?? [])].reverse();

  $: filteredTransfers = transfers.filter((t) => {
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;
    if (filterUnitId && t.unitId !== filterUnitId) return false;
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase();
      const hay = `${t.number || ''} ${t.note || ''} ${t.unitName || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterProduct.trim()) {
      const q = filterProduct.trim().toLowerCase();
      const hit = (t.lines || []).some((l) => {
        const s = `${l.productCode || ''} ${l.productName || ''} ${l.productId || ''}`.toLowerCase();
        return s.includes(q);
      });
      if (!hit) return false;
    }
    return true;
  });

  $: stats = buildStats(transfers, units);

  function stockOf(productId: string): number {
    return state.rows.find((r) => r.productId === productId)?.qty ?? 0;
  }

  function productLabel(id: string): string {
    const r = state.rows.find((x) => x.productId === id);
    if (r) return `${r.code || '—'} · ${r.name}`;
    const p = state.products?.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function unitLabel(id: string): string {
    const u = units.find((x) => x.id === id);
    if (u) return `${u.code || ''} · ${u.name}`.trim();
    const t = transfers.find((x) => x.unitId === id);
    return t?.unitName || id;
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    unitId = '';
    note = '';
    date = new Date().toISOString().slice(0, 10);
    lines = [{ productId: '', qty: '' }];
    formError = '';
    formOk = '';
  }

  function openForm() {
    resetForm();
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    formError = '';
    formOk = '';
  }

  function clearFilters() {
    filterDateFrom = '';
    filterDateTo = '';
    filterName = '';
    filterProduct = '';
    filterUnitId = '';
  }

  $: hasActiveFilters = !!(
    filterDateFrom ||
    filterDateTo ||
    filterName.trim() ||
    filterProduct.trim() ||
    filterUnitId
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (units.length === 0) {
      formError = 'Cree primero un punto de venta en Negocio.';
      return;
    }
    if (!unitId) {
      formError = 'Seleccione la unidad de venta destino';
      return;
    }
    if (stockRows.length === 0) {
      formError = 'No hay existencias en almacén. Registre una recepción primero.';
      return;
    }

    const payload: CreateTransferLineInput[] = [];
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = parseFloat(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      const available = stockOf(line.productId);
      if (qty > available) {
        formError = `Stock insuficiente para ${productLabel(line.productId)} (disponible: ${available})`;
        return;
      }
      payload.push({ productId: line.productId, qty });
    }

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto con cantidad';
      return;
    }

    try {
      await store.addTransfer({
        unitId,
        date: date || undefined,
        note: note.trim() || undefined,
        lines: payload,
      });
      formOk = 'Transferencia confirmada · stock actualizado en almacén y unidad';
      resetForm();
      showForm = false;
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo confirmar la transferencia';
    }
  }

  function buildStats(
    list: Transfer[],
    unitList: { id: string; name: string; code: string }[],
  ) {
    const total = list.length;
    let totalQty = 0;
    let totalLines = 0;
    const byProduct = new Map<string, { name: string; qty: number }>();
    const byUnit = new Map<string, { name: string; count: number; qty: number }>();
    const monthKey = new Date().toISOString().slice(0, 7);
    let thisMonth = 0;

    for (const t of list) {
      if ((t.date || '').startsWith(monthKey)) thisMonth += 1;
      const uName = t.unitName || unitList.find((u) => u.id === t.unitId)?.name || t.unitId;
      const uAcc = byUnit.get(t.unitId) || { name: uName, count: 0, qty: 0 };
      uAcc.count += 1;

      for (const line of t.lines || []) {
        totalLines += 1;
        totalQty += Number(line.qty) || 0;
        uAcc.qty += Number(line.qty) || 0;
        const key = line.productId || line.productCode || line.productName;
        const pAcc = byProduct.get(key) || {
          name: line.productName || line.productCode || key,
          qty: 0,
        };
        pAcc.qty += Number(line.qty) || 0;
        byProduct.set(key, pAcc);
      }
      byUnit.set(t.unitId, uAcc);
    }

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    const topUnits = [...byUnit.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      total,
      totalQty,
      totalLines,
      thisMonth,
      avgLines: total ? totalLines / total : 0,
      topProducts,
      topUnits,
    };
  }

  function openReportModal() {
    reportKind = 'general';
    reportFrom = '';
    reportTo = '';
    reportUnitId = units[0]?.id || '';
    reportError = '';
    showReportModal = true;
  }

  function closeReportModal() {
    showReportModal = false;
    reportError = '';
  }

  function generateReportPdf() {
    reportError = '';
    if (reportKind === 'period' || reportKind === 'unit_period') {
      if (!reportFrom || !reportTo) {
        reportError = 'Seleccione el rango de fechas';
        return;
      }
      if (reportFrom > reportTo) {
        reportError = 'La fecha inicial no puede ser posterior a la final';
        return;
      }
    }
    if (reportKind === 'unit' || reportKind === 'unit_period') {
      if (!reportUnitId) {
        reportError = 'Seleccione el punto de venta';
        return;
      }
    }

    const rows = filterTransfersForReport(transfers, {
      kind: reportKind,
      periodFrom: reportFrom,
      periodTo: reportTo,
      unitId: reportUnitId,
    });

    try {
      // Misma vía que facturas: Blob URL (no window.open vacío)
      openTransferReportWindow(rows, {
        kind: reportKind,
        businessName,
        currency: businessCurrency || 'CUP',
        periodFrom: reportFrom,
        periodTo: reportTo,
        unitId: reportUnitId,
        unitLabel: reportUnitId ? unitLabel(reportUnitId) : '',
        unitNameLookup: unitLabel,
      });
      closeReportModal();
    } catch (err) {
      reportError =
        err instanceof Error
          ? err.message
          : 'No se pudo abrir el informe';
    }
  }

  function formatNum(n: number): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('es', { maximumFractionDigits: 4 });
  }
</script>

<section class="transfer" data-screen="transferencias" class:stats-open={showStats}>
  <DevSeedPanel
    title="Seed recepciones / transferencias (DEV)"
    description="ensureUnit + receptions + transfers. Requiere productos."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />

  <header class="page-head">
    <div>
      <h1>Transferencias</h1>
      <p class="sub">
        Consulte, filtre y analice movimientos de almacén a puntos de venta. La creación queda bajo demanda.
      </p>
    </div>
    <Button variant="secondary" onclick={() => store.loadAll()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  <!-- Fila 1: acciones -->
  <div class="actions-row" role="toolbar" aria-label="Acciones de transferencias">
    <Button type="button" onclick={openForm} disabled={state.saving}>Nueva transferencia</Button>
    <Button
      type="button"
      variant="secondary"
      onclick={() => (showStats = !showStats)}
    >
      {showStats ? 'Ver menos' : 'Ver estadísticas'}
    </Button>
    <Button type="button" variant="secondary" onclick={openReportModal}>Generar informe</Button>
  </div>

  <!-- Fila 2: stats + listado -->
  <div class="main-grid">
    <aside class="stats-col" aria-hidden={!showStats}>
      <div class="stats-slide">
        <Card>
          <div class="stats-head">
            <p class="eyebrow">Análisis</p>
            <h2>Estadísticas</h2>
            <p class="stats-lede">Movimiento de inventario vía transferencias (no ventas).</p>
          </div>
          <div class="stat-grid">
            <div class="stat-tile">
              <span class="stat-val">{stats.total}</span>
              <span class="stat-lbl">Transferencias</span>
            </div>
            <div class="stat-tile">
              <span class="stat-val">{stats.thisMonth}</span>
              <span class="stat-lbl">Este mes</span>
            </div>
            <div class="stat-tile">
              <span class="stat-val">{formatNum(stats.totalQty)}</span>
              <span class="stat-lbl">Uds. movidas</span>
            </div>
            <div class="stat-tile">
              <span class="stat-val">{formatNum(stats.avgLines)}</span>
              <span class="stat-lbl">Líneas / TR</span>
            </div>
          </div>

          <h3 class="stat-section">Top productos transferidos</h3>
          {#if stats.topProducts.length === 0}
            <p class="muted">Sin datos aún.</p>
          {:else}
            <ul class="rank-list">
              {#each stats.topProducts as p}
                <li>
                  <span>{p.name}</span>
                  <strong>{formatNum(p.qty)}</strong>
                </li>
              {/each}
            </ul>
          {/if}

          <h3 class="stat-section">Destinos más usados</h3>
          {#if stats.topUnits.length === 0}
            <p class="muted">Sin datos aún.</p>
          {:else}
            <ul class="rank-list">
              {#each stats.topUnits as u}
                <li>
                  <span>{u.name} <small>({u.count} TR)</small></span>
                  <strong>{formatNum(u.qty)}</strong>
                </li>
              {/each}
            </ul>
          {/if}
        </Card>
      </div>
    </aside>

    <div class="list-col">
      <Card>
        <div class="list-head">
          <div>
            <p class="eyebrow">Histórico</p>
            <h2>Listado de transferencias</h2>
          </div>
          <span class="result-count"
            >{filteredTransfers.length}
            {hasActiveFilters ? ` de ${transfers.length}` : ''}</span
          >
        </div>

        <div class="filters" aria-label="Filtros de transferencias">
          <label class="f">
            <span>Desde</span>
            <input type="date" bind:value={filterDateFrom} />
          </label>
          <label class="f">
            <span>Hasta</span>
            <input type="date" bind:value={filterDateTo} />
          </label>
          <label class="f grow">
            <span>Nombre / nº / nota</span>
            <input type="search" bind:value={filterName} placeholder="Buscar…" />
          </label>
          <label class="f grow">
            <span>Producto</span>
            <input type="search" bind:value={filterProduct} placeholder="Código o nombre" />
          </label>
          <label class="f">
            <span>Punto de venta</span>
            <select bind:value={filterUnitId}>
              <option value="">Todos</option>
              {#each units as u (u.id)}
                <option value={u.id}>{u.code} · {u.name}</option>
              {/each}
            </select>
          </label>
          {#if hasActiveFilters}
            <div class="f-actions">
              <Button type="button" variant="secondary" onclick={clearFilters}>Limpiar filtros</Button>
            </div>
          {/if}
        </div>

        {#if state.status === 'loading' && transfers.length === 0}
          <p class="muted">Cargando transferencias…</p>
        {:else if filteredTransfers.length === 0}
          <p class="empty">
            {transfers.length === 0
              ? 'Aún no hay transferencias registradas.'
              : 'Ninguna transferencia coincide con los filtros.'}
          </p>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Fecha</th>
                  <th>Punto de venta</th>
                  <th>Detalle</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredTransfers as t (t.id)}
                  <tr>
                    <td class="mono">{t.number || '—'}</td>
                    <td>{t.date || '—'}</td>
                    <td>{t.unitName || unitLabel(t.unitId)}</td>
                    <td class="detail">
                      {#if t.lines?.length}
                        <ul>
                          {#each t.lines as l}
                            <li>
                              {l.productCode || '—'} · {l.productName || '—'}
                              <strong>× {formatNum(l.qty)}</strong>
                            </li>
                          {/each}
                        </ul>
                      {:else}
                        <span class="muted-inline">Sin líneas</span>
                      {/if}
                      {#if t.note}
                        <p class="note-line">{t.note}</p>
                      {/if}
                    </td>
                    <td><span class="pill">{t.status || 'ok'}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card>
    </div>
  </div>
</section>

<!-- Modal: nueva transferencia -->
{#if showForm}
  <div class="modal-backdrop" role="presentation" onclick={closeForm}>
    <div
      class="modal modal-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-tr-title"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal-head">
        <h3 id="new-tr-title">Nueva transferencia</h3>
        <p class="modal-sub">
          Mueve mercancía del almacén central a un punto de venta. El costo se toma del promedio en
          almacén.
        </p>
      </div>

      {#if units.length === 0}
        <p class="banner err">Declare al menos un punto de venta en Negocio antes de transferir.</p>
        <div class="modal-actions">
          <Button type="button" variant="secondary" onclick={closeForm}>Cerrar</Button>
        </div>
      {:else if stockRows.length === 0}
        <p class="banner err">No hay stock en almacén. Confirme una recepción primero.</p>
        <div class="modal-actions">
          <Button type="button" variant="secondary" onclick={closeForm}>Cerrar</Button>
        </div>
      {:else}
        <form class="form" onsubmit={handleSubmit}>
          <div class="form-grid">
            <label class="field">
              <span>Punto de venta destino</span>
              <select bind:value={unitId} disabled={state.saving}>
                <option value="">Seleccione…</option>
                {#each units as u (u.id)}
                  <option value={u.id}>{u.code} · {u.name}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span>Fecha</span>
              <input type="date" bind:value={date} disabled={state.saving} />
            </label>
            <label class="field span-2">
              <span>Nota (opcional)</span>
              <input type="text" bind:value={note} disabled={state.saving} placeholder="Referencia interna" />
            </label>
          </div>

          <div class="lines-head">
            <h4>Líneas</h4>
            <Button type="button" variant="secondary" onclick={addLine} disabled={state.saving}
              >+ Línea</Button
            >
          </div>

          {#each lines as line, i (i)}
            <div class="line-row">
              <label class="field grow">
                <span>Producto</span>
                <select bind:value={line.productId} disabled={state.saving}>
                  <option value="">Seleccione…</option>
                  {#each stockRows as r (r.productId)}
                    <option value={r.productId}
                      >{r.code} · {r.name} (disp. {r.qty})</option
                    >
                  {/each}
                </select>
              </label>
              <label class="field qty">
                <span>Cantidad</span>
                <input type="number" min="0.01" step="any" bind:value={line.qty} disabled={state.saving} />
              </label>
              <div class="avail">
                <span class="label-ish">Disp.</span>
                <span class="avail-n"
                  >{line.productId ? formatNum(stockOf(line.productId)) : '—'}</span
                >
              </div>
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
          {#if formOk}
            <p class="banner ok" role="status">{formOk}</p>
          {/if}

          <div class="modal-actions">
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Guardando…' : 'Realizar transferencia'}
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

<!-- Modal: generar informe -->
{#if showReportModal}
  <div class="modal-backdrop" role="presentation" onclick={closeReportModal}>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 id="report-title">Generar informe</h3>
      <p class="modal-sub">Seleccione el tipo. Se abrirá una vista lista para imprimir o guardar como PDF.</p>

      <fieldset class="report-kinds">
        <legend class="sr-only">Tipo de informe</legend>
        <label class="radio">
          <input type="radio" bind:group={reportKind} value="general" />
          Informe general de transferencias
        </label>
        <label class="radio">
          <input type="radio" bind:group={reportKind} value="period" />
          Informe de transferencias por período
        </label>
        <label class="radio">
          <input type="radio" bind:group={reportKind} value="unit" />
          Informe general por punto de venta
        </label>
        <label class="radio">
          <input type="radio" bind:group={reportKind} value="unit_period" />
          Informe por punto de venta en un período
        </label>
      </fieldset>

      {#if reportKind === 'period' || reportKind === 'unit_period'}
        <div class="form-grid">
          <label class="field">
            <span>Desde</span>
            <input type="date" bind:value={reportFrom} />
          </label>
          <label class="field">
            <span>Hasta</span>
            <input type="date" bind:value={reportTo} />
          </label>
        </div>
      {/if}

      {#if reportKind === 'unit' || reportKind === 'unit_period'}
        <label class="field">
          <span>Punto de venta</span>
          <select bind:value={reportUnitId}>
            {#each units as u (u.id)}
              <option value={u.id}>{u.code} · {u.name}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if reportError}
        <p class="banner err" role="alert">{reportError}</p>
      {/if}

      <div class="modal-actions">
        <Button type="button" onclick={generateReportPdf}>Generar PDF</Button>
        <Button type="button" variant="secondary" onclick={closeReportModal}>Cancelar</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .transfer {
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
    max-width: 36rem;
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

  .main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    align-items: start;
  }
  @media (min-width: 960px) {
    .transfer.stats-open .main-grid {
      grid-template-columns: minmax(240px, 0.42fr) minmax(0, 1fr);
    }
  }

  .stats-col {
    display: none;
  }
  .transfer.stats-open .stats-col {
    display: block;
  }
  .stats-slide {
    animation: statsSlideIn 0.28s ease both;
  }
  @keyframes statsSlideIn {
    from {
      opacity: 0;
      transform: translateX(-18px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .stats-head h2 {
    margin: 0 0 0.25rem;
    font-size: 1.05rem;
  }
  .stats-lede {
    margin: 0 0 0.85rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }
  .stat-tile {
    padding: 0.55rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: color-mix(in srgb, var(--color-bg, #050812) 40%, transparent);
  }
  .stat-val {
    display: block;
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stat-lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .stat-section {
    margin: 0.75rem 0 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .rank-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .rank-list li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    font-size: 0.8rem;
  }
  .rank-list small {
    color: var(--color-text-muted, var(--ap-text-muted));
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
    min-width: 120px;
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
  .filters input,
  .filters select {
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

  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
    min-width: 480px;
  }
  th {
    text-align: left;
    font-size: 0.68rem;
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
    vertical-align: top;
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
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 16%, transparent);
    color: var(--accent-cyan, var(--ap-primary));
  }
  .detail ul {
    margin: 0;
    padding-left: 1.05rem;
    font-size: 0.78rem;
  }
  .note-line {
    margin: 4px 0 0;
    font-size: 0.72rem;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .empty,
  .muted,
  .muted-inline {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.85rem;
  }
  .empty {
    padding: 1rem 0;
    text-align: center;
  }

  /* Modals */
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
    max-height: min(92vh, 720px);
    overflow: auto;
    overscroll-behavior: contain;
    padding: 1.1rem 1.15rem 1.2rem;
    border-radius: 16px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface, var(--ap-bg-elevated, #171b29));
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  }
  .modal-form {
    width: min(560px, 100%);
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
  .field span,
  .label-ish {
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
    grid-template-columns: 1fr minmax(88px, 0.28fr) 52px 32px;
    gap: 8px;
    align-items: end;
    margin-bottom: 0.45rem;
  }
  @media (max-width: 560px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  .avail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 38px;
    justify-content: flex-end;
  }
  .avail-n {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--accent-cyan, var(--ap-primary));
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
    line-height: 1;
  }
  .remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .banner {
    margin: 0.5rem 0 0;
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
    align-items: flex-start;
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

  @media (max-width: 959px) {
    .transfer.stats-open .stats-col {
      display: block;
    }
    .stats-slide {
      animation-name: statsSlideDown;
    }
    @keyframes statsSlideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  @media (max-width: 600px) {
    .actions-row > :global(button) {
      flex: 1 1 calc(50% - 0.25rem);
      min-height: 40px;
    }
  }
</style>
