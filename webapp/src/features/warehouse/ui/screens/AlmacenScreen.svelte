<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import {
    stockHealth,
    transferDemand,
    warehouseInsight,
  } from '../viewmodels/warehouseInsights';
  import { getReceptionVisualStatus } from '../../domain/entities/Reception';

  export let store: WarehouseStore;

  let state: WarehouseState = store.getState();

  let query = '';
  let statusFilter: 'all' | 'available' | 'low' | 'out' = 'all';
  let actionError = '';

  onMount(() => {
    const unsubscribe = store.subscribe((next: WarehouseState) => {
      state = next;
    });
    void store.loadAll();
    return unsubscribe;
  });

  $: totalValue = state.rows.reduce((acc, row) => acc + row.amountBase, 0);
  $: unitsValue = state.unitStocks.reduce((acc, stock) => acc + stock.amountBase, 0);

  $: insight = warehouseInsight(state.rows);
  $: demand = transferDemand(state.transfers);
  $: pendingReceptions = state.receptions.filter((reception) =>
          reception.metadataState?.receptionStatus === 'pending_entry' ||
          (!reception.metadataState?.receptionStatus && reception.status === 'pendiente_entrada'),
  );
  $: problemReceptions = state.receptions.filter((reception) =>
          reception.metadataState?.receptionStatus === 'entry_problem' || reception.status === 'problemas_entrada',
  );

  $: normalizedQuery = query.trim().toLocaleLowerCase();
  $: filteredRows = state.rows.filter((row) => {
    const matchesSearch = !normalizedQuery ||
            row.name.toLocaleLowerCase().includes(normalizedQuery) ||
            row.code.toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all' ||
            stockHealth(row.qty, insight.lowThreshold) === statusFilter;
    return matchesSearch && matchesStatus;
  });
  $: baseCurrency = state.rows[0]?.currency || '';

  function healthLabel(qty: number): string {
    const health = stockHealth(qty, insight.lowThreshold);
    return health === 'available' ? 'Habilitado' : health === 'low' ? 'Casi agotado' : 'Agotado';
  }

  async function resolveProblem(id: string) {
    actionError = '';
    try {
      await store.enterReception({ id, accept: true, note: 'Problema revisado y entrada resuelta en almacén.' });
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'No se pudo resolver la entrada.';
    }
  }

  async function rejectReception(id: string) {
    const reason = window.prompt('Motivo para rechazar la entrada:')?.trim();
    if (!reason) return;
    actionError = '';
    try {
      await store.enterReception({ id, accept: false, reason });
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'No se pudo rechazar la entrada.';
    }
  }
</script>

<section class="warehouse" data-screen="almacen">
  <header class="page-head">
    <div>
      <p class="eyebrow">Control operativo</p>
      <h1>Almacén central</h1>
      <p class="sub">Existencias, costo y flujo hacia los puntos de venta.</p>
    </div>
    <Button variant="secondary" on:click={() => store.loadAll()} disabled={state.status === 'loading'}>
      {state.status === 'loading' ? 'Actualizando…' : 'Actualizar datos'}
    </Button>
  </header>
  {#if state.status === 'error'}
    <p class="banner error" role="alert">{state.error}</p>
  {/if}
  {#if actionError}
    <p class="banner error" role="alert">{actionError}</p>
  {/if}
  <div class="warehouse-layout">
    <aside class="insights-column" aria-label="Resumen de almacén">
      <div class="column-title"><span>Resumen</span><small>Actualizado al abrir</small></div>

      <Card variant="hero">
        <p class="metric-label">Valor disponible</p>
        <p class="hero-value"><Money amount={insight.totalValue} currency={baseCurrency} /></p>
        <p class="hero-caption">Costo promedio de {insight.activeProducts} productos con existencia.</p>
      </Card>

      <div class="metric-grid">
        <Card>
          <p class="metric-label">Existencias</p>
          <strong>{state.rows.length}</strong>
          <span>referencias en central</span>
        </Card>
        <Card>
          <p class="metric-label">Pendientes</p>
          <strong>{pendingReceptions.length}</strong>
          <span>informes por validar</span>
        </Card>
      </div>

      <Card>
        <div class="card-heading">
          <div><p class="metric-label">Salud del stock</p><h2>Alertas de reposición</h2></div>
          <Badge tone={insight.lowProducts || insight.outProducts ? 'off' : 'ok'}>{insight.lowProducts + insight.outProducts}</Badge>
        </div>
        <div class="health-summary">
          <button class="health-row available" onclick={() => (statusFilter = 'available')}><span></span><b>Habilitado</b><em>{insight.activeProducts - insight.lowProducts}</em></button>
          <button class="health-row low" onclick={() => (statusFilter = 'low')}><span></span><b>Casi agotado</b><em>{insight.lowProducts}</em></button>
          <button class="health-row out" onclick={() => (statusFilter = 'out')}><span></span><b>Agotado</b><em>{insight.outProducts}</em></button>
        </div>
        <p class="hint">Alerta relativa: hasta {insight.lowThreshold} unidades, mientras se definen mínimos por producto.</p>
      </Card>

      <Card>
        <div class="card-heading">
          <div><p class="metric-label">Movimiento</p><h2>Más solicitados</h2></div>
          <span class="mini-tag">Salidas</span>
        </div>
        {#if demand.length}
          <ol class="demand-list">
            {#each demand as item, index (item.productId)}
              <li>
                <span class="rank">{index + 1}</span>
                <div><strong>{item.productName || item.productCode}</strong><small>{item.productCode} · {item.transfers} transferencias</small></div>
                <b>{item.qty}</b>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="empty-note">Las transferencias a puntos de venta aparecerán aquí.</p>
        {/if}
      </Card>

      <Card>
        <p class="metric-label">Criterio de demanda</p>
        <p class="note">El ranking usa unidades transferidas desde el almacén central; no mezcla ventas ni cambia los datos contables.</p>
      </Card>
    </aside>

    <div class="operations-column">
      <section class="receptions-panel" aria-labelledby="receptions-title">
        <div class="panel-head">
          <div><p class="eyebrow">Bandeja de entrada</p><h2 id="receptions-title">Informes de recepción</h2></div>
          <div class="head-counts"><Badge>{pendingReceptions.length} pendientes</Badge>{#if problemReceptions.length}<Badge tone="off">{problemReceptions.length} incidencias</Badge>{/if}</div>
        </div>
        <div class="reception-scroll">
          {#if pendingReceptions.length === 0 && problemReceptions.length === 0}
            <p class="empty-state">No hay recepciones por revisar. Los nuevos informes creados por Económico llegarán a esta bandeja.</p>
          {/if}
          {#each pendingReceptions as reception (reception.id)}
            <article class="reception-item">
              <div class="reception-main"><span class="state-dot pending"></span><div><strong>{reception.number}</strong><p>{reception.supplier || 'Proveedor no informado'} · {reception.lines.length} líneas</p></div></div>
              <div class="reception-meta"><span>{reception.date}</span><strong><Money amount={reception.totalCost} currency={reception.currency} /></strong></div>
              <div class="reception-actions"><Button on:click={() => resolveProblem(reception.id)} disabled={state.saving}>Dar entrada</Button><Button variant="secondary" on:click={() => rejectReception(reception.id)} disabled={state.saving}>Rechazar</Button></div>
            </article>
          {/each}
          {#each problemReceptions as reception (reception.id)}
            <article class="reception-item issue">
              <div class="reception-main"><span class="state-dot issue"></span><div><strong>{reception.number}</strong><p>{reception.metadataState?.problemReason || reception.note || 'Incidencia sin detalle'}</p></div></div>
              <div class="reception-meta"><span>Con incidencia</span><strong>{reception.supplier || '—'}</strong></div>
              <div class="reception-actions"><Button on:click={() => resolveProblem(reception.id)} disabled={state.saving}>Resolver</Button><Button variant="secondary" on:click={() => rejectReception(reception.id)} disabled={state.saving}>Actualizar rechazo</Button></div>
            </article>
          {/each}
        </div>
      </section>
      <section class="stock-panel" aria-labelledby="stock-title">
        <div class="panel-head stock-head">
          <div><p class="eyebrow">Inventario físico</p><h2 id="stock-title">Stock del almacén</h2></div>
          <span class="result-count">{filteredRows.length} de {state.rows.length}</span>
        </div>
        <div class="stock-tools">
          <label><span class="sr-only">Buscar producto por nombre o código</span><input bind:value={query} placeholder="Buscar por producto o código" /></label>
          <div class="filter-group" aria-label="Filtrar por estado de stock">
            {#each [['all', 'Todos'], ['available', 'Habilitados'], ['low', 'Casi agotados'], ['out', 'Agotados']] as option}
              <button
                      class:active={statusFilter === option[0]}
                      onclick={() =>
                         statusFilter = option[0] as typeof statusFilter
                      }>{option[1]}
              </button>
            {/each}
          </div>
        </div>
        <div class="stock-scroll">
          {#if state.status === 'loading' && !state.rows.length}
            <p class="empty-state">Cargando existencias…</p>
          {:else if filteredRows.length === 0}
            <p class="empty-state">No hay productos que coincidan con este filtro.</p>
          {:else}
            <table>
              <thead><tr><th>Producto</th><th>Estado</th><th class="num">Disponible</th><th class="num">Costo prom.</th><th class="num">Importe</th></tr></thead>
              <tbody>
              {#each filteredRows as row (row.productId)}
                {@const health = stockHealth(row.qty, insight.lowThreshold)}
                <tr>
                  <td><strong>{row.name}</strong><small>{row.code} · {row.unit}</small></td>
                  <td><span class="stock-state {health}"><i></i>{healthLabel(row.qty)}</span></td>
                  <td class="num quantity">{row.qty}</td>
                  <td class="num"><Money amount={row.avgCost} currency={row.currency} /></td>
                  <td class="num"><Money amount={row.amountBase} currency={row.currency} /></td>
                </tr>
              {/each}
              </tbody>
            </table>
          {/if}
        </div>
      </section>
    </div>
  </div>
</section>

<style>
  .warehouse { display: flex; flex-direction: column; gap: 14px; min-height: 0; }
  .page-head, .panel-head, .card-heading, .reception-item, .reception-main, .head-counts, .stock-tools, .filter-group { display: flex; align-items: center; }
  .page-head, .panel-head, .card-heading { justify-content: space-between; gap: 12px; }
  .page-head { align-items: flex-start; }
  .eyebrow, .metric-label { margin: 0; color: var(--ap-text-muted); font-size: .66rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
  h1, h2, p { margin: 0; } h1 { font-size: 1.4rem; letter-spacing: -.035em; } h2 { font-size: 1rem; margin-top: 3px; } .sub { color: var(--ap-text-secondary); font-size: .86rem; margin-top: 4px; }
  .banner { padding: 10px 12px; border-radius: 12px; font-size: .85rem; }.banner.error { color: var(--ap-danger); background: color-mix(in srgb, var(--ap-danger) 10%, transparent); }
  .warehouse-layout { display: grid; gap: 14px; min-height: 0; }
  .insights-column, .operations-column { min-width: 0; }.insights-column { display: flex; flex-direction: column; gap: 0; }.column-title { display: flex; justify-content: space-between; align-items: baseline; margin: 0 2px 8px; color: var(--ap-text-secondary); font-size: .78rem; font-weight: 700; }.column-title small { color: var(--ap-text-muted); font-size: .67rem; font-weight: 500; }
  .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.metric-grid :global(.card) { margin-bottom: 10px; }.metric-grid strong { display: block; color: var(--ap-text); font-size: 1.45rem; line-height: 1.15; margin: 6px 0 2px; }.metric-grid span { color: var(--ap-text-muted); font-size: .72rem; }
  .hero-value { color: #0a1210; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; margin: 7px 0 3px; }.hero-caption { color: rgba(10,18,16,.72); font-size: .76rem; }.hint, .note, .empty-note { margin-top: 10px; color: var(--ap-text-muted); font-size: .74rem; line-height: 1.45; }
  .health-summary { display: grid; gap: 4px; margin-top: 12px; }.health-row { appearance: none; border: 0; background: transparent; padding: 6px 0; display: grid; grid-template-columns: 9px 1fr auto; align-items: center; gap: 8px; text-align: left; cursor: pointer; color: var(--ap-text-secondary); font: inherit; font-size: .8rem; }.health-row:hover b { color: var(--ap-text); }.health-row span, .stock-state i, .state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ap-ok); }.health-row.low span, .stock-state.low i, .state-dot.pending { background: #e7aa3d; }.health-row.out span, .stock-state.out i, .state-dot.issue { background: var(--ap-danger); }.health-row em { font-style: normal; font-weight: 750; color: var(--ap-text); }
  .mini-tag { padding: 3px 7px; border-radius: 6px; background: var(--ap-primary-soft); color: var(--ap-primary); font-size: .62rem; font-weight: 700; text-transform: uppercase; }.demand-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 9px; }.demand-list li { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; }.rank { color: var(--ap-text-muted); font-size: .7rem; font-weight: 750; }.demand-list strong, .demand-list small { display: block; }.demand-list strong { color: var(--ap-text); font-size: .78rem; }.demand-list small { color: var(--ap-text-muted); font-size: .67rem; margin-top: 2px; }.demand-list > li > b { color: var(--ap-text); font-size: .82rem; }
  .operations-column { display: grid; grid-template-rows: minmax(255px, 34%) minmax(380px, 1fr); gap: 14px; }.receptions-panel, .stock-panel { background: var(--ap-bg-elevated); border: 1px solid var(--ap-border); border-radius: var(--ap-radius); padding: 16px; min-height: 0; display: flex; flex-direction: column; }.head-counts { gap: 6px; flex-wrap: wrap; justify-content: flex-end; }.reception-scroll, .stock-scroll { overflow: auto; min-height: 0; scrollbar-color: var(--ap-border-strong, var(--ap-border)) transparent; }.reception-scroll { margin-top: 12px; }.reception-item { gap: 12px; justify-content: space-between; padding: 10px 2px; border-top: 1px solid var(--ap-border); }.reception-item.issue { background: color-mix(in srgb, var(--ap-danger) 4%, transparent); margin-inline: -5px; padding-inline: 7px; border-radius: 8px; }.reception-main { align-items: flex-start; gap: 9px; min-width: 0; flex: 1; }.state-dot { margin-top: 5px; flex: 0 0 auto; }.reception-main strong { color: var(--ap-text); font-size: .82rem; }.reception-main p { color: var(--ap-text-secondary); font-size: .72rem; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 27ch; }.reception-meta { display: grid; text-align: right; gap: 3px; font-size: .7rem; color: var(--ap-text-muted); }.reception-meta strong { color: var(--ap-text-secondary); }.reception-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }.reception-actions :global(button) { font-size: .7rem; padding: 7px 9px; }
  .stock-head { margin-bottom: 12px; }.result-count { color: var(--ap-text-muted); font-size: .73rem; }.stock-tools { align-items: flex-start; gap: 9px; padding-bottom: 12px; border-bottom: 1px solid var(--ap-border); }.stock-tools label { flex: 1; }.stock-tools input { width: 100%; box-sizing: border-box; border: 1px solid var(--ap-border); border-radius: 9px; padding: 8px 10px; background: var(--ap-bg); color: var(--ap-text); font: inherit; font-size: .78rem; }.filter-group { gap: 4px; flex-wrap: wrap; justify-content: flex-end; }.filter-group button { border: 1px solid transparent; background: var(--ap-primary-soft); color: var(--ap-text-secondary); border-radius: 7px; padding: 6px 8px; font: inherit; font-size: .68rem; cursor: pointer; }.filter-group button.active { color: var(--ap-primary); border-color: color-mix(in srgb, var(--ap-primary) 35%, var(--ap-border)); background: color-mix(in srgb, var(--ap-primary) 13%, transparent); }.stock-scroll { margin-top: 2px; } table { width: 100%; border-collapse: collapse; font-size: .79rem; } th { position: sticky; top: 0; z-index: 1; text-align: left; padding: 9px 8px; color: var(--ap-text-muted); background: var(--ap-bg-elevated); border-bottom: 1px solid var(--ap-border); font-size: .65rem; letter-spacing: .07em; text-transform: uppercase; } td { padding: 10px 8px; border-bottom: 1px solid var(--ap-border); color: var(--ap-text-secondary); } td strong, td small { display: block; } td strong { color: var(--ap-text); font-size: .8rem; } td small { color: var(--ap-text-muted); font-size: .67rem; margin-top: 2px; }.num { text-align: right; font-variant-numeric: tabular-nums; }.quantity { color: var(--ap-text); font-weight: 750; }.stock-state { display: inline-flex; align-items: center; gap: 5px; color: var(--ap-text-secondary); font-size: .68rem; white-space: nowrap; }.empty-state { color: var(--ap-text-muted); font-size: .82rem; padding: 20px 2px; }.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  @media (min-width: 1100px) { .warehouse { height: calc(100dvh - 174px); max-height: 860px; }.warehouse-layout { grid-template-columns: minmax(290px, .9fr) minmax(560px, 1.65fr); flex: 1; overflow: hidden; }.insights-column { overflow-y: auto; padding-right: 4px; }.operations-column { min-height: 0; } }
  @media (max-width: 760px) { .reception-item { align-items: flex-start; flex-wrap: wrap; }.reception-meta { text-align: left; }.reception-actions { width: 100%; }.stock-tools { flex-direction: column; }.stock-tools label { width: 100%; }.filter-group { justify-content: flex-start; }.operations-column { grid-template-rows: auto minmax(350px, 1fr); }.reception-scroll { max-height: 340px; } th:nth-child(4), td:nth-child(4) { display: none; } }
</style>