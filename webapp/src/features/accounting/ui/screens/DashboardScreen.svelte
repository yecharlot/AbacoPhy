<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Money } from '../../../../infrastructure/ui/shared';
  import {
    AreaChart,
    DonutChart,
    PanelCard,
    StatCard,
  } from '../../../../infrastructure/ui/charts';
  import type { AccountingState, AccountingStore } from '../stores/accountingStore';
  import type { WarehouseStore, WarehouseState } from '../../../warehouse/ui/stores/warehouseStore';
  import type { CostingStore, CostingState } from '../../../costing/ui/stores/costingStore';
  import EquationCard from '../components/EquationCard.svelte';
  import { DevSeedPanel, DevResetPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleEntriesPayload, seedEntriesViaStore } from '../dev/entriesSeed';
  import {
    accountsByType,
    CHART_SCOPE_OPTIONS,
    expenseSplit,
    flowSeries,
    seriesDelta,
    topAccounts,
    type ChartScope,
  } from '../viewmodels/dashboardCharts';
  import { buildReviewToday, type ReviewTodaySummary } from '../viewmodels/reviewToday';

  export let store: AccountingStore;
  /** Opcional: stock + recepciones para «qué revisar hoy». */
  export let warehouseStore: WarehouseStore | undefined = undefined;
  /** Opcional: fichas de costo/precio. */
  export let costingStore: CostingStore | undefined = undefined;
  /** Navegar a otra pantalla desde una alerta. */
  export let onNavigate: ((screenId: string) => void) | undefined = undefined;
  /** Solo DEV: reinicio de plataforma (master). */
  export let onDevReset: (() => Promise<string | void>) | undefined = undefined;

  let state: AccountingState = store.getState();
  let scope: ChartScope = 'month';
  let whState: WarehouseState | null = warehouseStore?.getState() ?? null;
  let costState: CostingState | null = costingStore?.getState() ?? null;
  let reviewFilter: 'all' | 'stock' | 'price' | 'reception' = 'all';

  onMount(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(
      store.subscribe((s: AccountingState) => {
        state = s;
      }),
    );
    if (warehouseStore) {
      unsubs.push(
        warehouseStore.subscribe((s) => {
          whState = s;
        }),
      );
      void warehouseStore.loadAll().catch(() => undefined);
    }
    if (costingStore) {
      unsubs.push(
        costingStore.subscribe((s) => {
          costState = s;
        }),
      );
      void costingStore.loadAll().catch(() => undefined);
    }
    void store.loadDashboard();
    return () => unsubs.forEach((u) => u());
  });

  $: unitNameMap = (() => {
    const m = new Map<string, string>();
    for (const u of whState?.units ?? []) {
      m.set(u.id, u.name || u.code || u.id);
    }
    return m;
  })();

  $: review = buildReviewToday({
    unitStocks: whState?.unitStocks,
    warehouseRows: whState?.rows,
    products: costState?.products?.length
      ? costState.products
      : whState?.products,
    receptions: whState?.receptions,
    priceSheets: costState?.priceSheets,
    costSheets: costState?.costSheets,
    unitNames: unitNameMap,
  }) as ReviewTodaySummary;

  $: reviewVisible =
    reviewFilter === 'all'
      ? review.items
      : review.items.filter((i) => i.category === reviewFilter);

  function num(v: unknown): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  $: flow = flowSeries(state.entries ?? [], scope, true);
  $: incomeSeries = flow.find((s) => s.id === 'income')?.points ?? [];
  $: expenseSeries = flow.find((s) => s.id === 'expense')?.points ?? [];
  $: splitPoints = expenseSplit(state.entries ?? []);
  $: structurePoints = accountsByType(state.accounts ?? []);
  $: incomeDelta = seriesDelta(incomeSeries);
  $: expenseDelta = seriesDelta(expenseSeries);
  $: scopeLabel =
    CHART_SCOPE_OPTIONS.find((o) => o.id === scope)?.label ?? 'Mensual';
  $: baseCurrency =
    state.accounts && state.accounts.length > 0 ? state.accounts[0].currency ?? '' : '';
  $: recent = (state.entries ?? []).slice(0, 7);
  $: accountsTop = topAccounts(state.accounts ?? []);
  $: summary = state.summary;
  $: assets = num(summary?.assets);
  $: liabilities = num(summary?.liabilities);
  $: equity = num(summary?.equity);
  $: income = num(summary?.income);
  $: expenses = num(summary?.expenses);
  $: netProfit = num(summary?.netProfit);
  /**
   * Patrimonio neto (KPI hero) = Activo − Pasivo.
   * No usar solo `equity` del plan: con ecuación ampliada
   *   Activo = Pasivo + Patrimonio + (Ingresos − Gastos)
   * el capital contable puede ser 0 y el valor del negocio estar en el resultado.
   * Fuente de verdad del resumen: assets/liabilities del summary backend.
   */
  $: patrimonioNeto = assets - liabilities;
</script>

<div class="dashboard" data-screen="dashboard">
  <!-- Siempre visible en DEV (también durante loading) -->
  <DevSeedPanel
    title="Carga masiva de asientos"
    description="JSON: entries[] con type, amount, concept, date (y opcionales currency, accountId, category). Si falta accountId se elige por tipo."
    sample={buildSampleEntriesPayload(730)}
    onSeed={(data) => seedEntriesViaStore(store, data)}
  />
  {#if onDevReset}
    <DevResetPanel
      onReset={onDevReset}
      onDone={() => {
        void store.loadDashboard();
      }}
    />
  {/if}


  {#if state.status === 'loading' && !state.summary}
    <PanelCard title="Resumen">
      <p class="muted">Cargando resumen financiero…</p>
    </PanelCard>
  {:else if state.status === 'error' && !state.summary}
    <PanelCard title="Resumen">
      <p class="err">{state.error}</p>
      <Button variant="secondary" onclick={() => store.loadDashboard()}>Reintentar</Button>
    </PanelCard>
  {:else if summary}
    <section class="hero-grid">
      <StatCard
        variant="hero"
        label="Patrimonio neto"
        amount={patrimonioNeto}
        currency={baseCurrency}
        caption={`Activos ${assets.toFixed(2)} · Pasivos ${liabilities.toFixed(2)}`}
      >
        <div class="hero-actions">
          <Badge tone={netProfit >= 0 ? 'ok' : 'off'}>
            {netProfit >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          </Badge>
        </div>
      </StatCard>

      <div class="stat-column">
        <StatCard
          variant="positive"
          label="Ingresos del período"
          amount={income}
          currency={baseCurrency}
          caption="Según resumen del backend"
          delta={incomeDelta}
        />
        <StatCard
          variant="negative"
          label="Gastos del período"
          amount={expenses}
          currency={baseCurrency}
          caption="Según resumen del backend"
          delta={expenseDelta}
        />
      </div>
    </section>

    <!-- Qué revisar hoy -->
    <section class="review-section" aria-label="Qué revisar hoy">
      <PanelCard
        title="Qué revisar hoy"
        subtitle="Stock, precios y recepciones que requieren atención"
        tag={review.total ? `${review.total} aviso${review.total === 1 ? '' : 's'}` : 'Al día'}
      >
        <div class="review-stats">
          <button
            type="button"
            class="rchip"
            class:active={reviewFilter === 'all'}
            onclick={() => (reviewFilter = 'all')}
          >
            Todos · {review.total}
          </button>
          <button
            type="button"
            class="rchip critical"
            class:active={reviewFilter === 'stock'}
            onclick={() => (reviewFilter = 'stock')}
            title="Agotados y bajo umbral en PDV"
          >
            Stock · {review.stockOut + review.stockLow}
          </button>
          <button
            type="button"
            class="rchip warn"
            class:active={reviewFilter === 'price'}
            onclick={() => (reviewFilter = 'price')}
            title="Costo cambió o precio bajo el sugerido"
          >
            Precios · {review.pricesStale}
          </button>
          <button
            type="button"
            class="rchip info"
            class:active={reviewFilter === 'reception'}
            onclick={() => (reviewFilter = 'reception')}
            title="Pendientes de entrada o con problemas"
          >
            Recepciones · {review.receptionsPending + review.receptionsProblem}
          </button>
        </div>

        {#if !warehouseStore && !costingStore}
          <p class="muted">Conecte almacén y fichas para ver alertas operativas.</p>
        {:else if reviewVisible.length === 0}
          <p class="muted review-ok">
            {reviewFilter === 'all'
              ? 'Nada pendiente: stock, precios y recepciones en orden.'
              : 'No hay avisos en este filtro.'}
          </p>
        {:else}
          <ul class="review-list">
            {#each reviewVisible as item (item.id)}
              <li class="review-item" class:critical={item.severity === 'critical'} class:warn={item.severity === 'warn'}>
                <div class="ri-body">
                  <strong>{item.title}</strong>
                  <span class="muted">{item.detail}</span>
                </div>
                {#if item.actionScreen && onNavigate}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onclick={() => onNavigate(item.actionScreen)}
                  >
                    {item.actionLabel || 'Ir'}
                  </Button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </PanelCard>
    </section>

    <section class="flow-section">
      <PanelCard
        title="Ingresos vs gastos"
        subtitle="Cómo se comportan uno respecto al otro en el tiempo"
        tag={scopeLabel}
      >
        <div class="scope-row" role="group" aria-label="Alcance temporal">
          {#each CHART_SCOPE_OPTIONS as opt (opt.id)}
            <button
              type="button"
              class="scope-pill"
              class:active={scope === opt.id}
              onclick={() => (scope = opt.id)}
            >
              {opt.label}
            </button>
          {/each}
        </div>
        <AreaChart
          series={flow}
          height={240}
          emptyText="Aún no hay movimientos para este alcance"
        />
      </PanelCard>
    </section>

    <section class="chart-grid">
      <PanelCard title="Reparto de gastos" subtitle="Por categoría o cuenta" tag="Gastos">
        <DonutChart points={splitPoints} centerLabel="Total" currency={baseCurrency} />
      </PanelCard>
      <PanelCard title="Estructura de cuentas" subtitle="Saldos agrupados por tipo" tag="Balance">
        <DonutChart points={structurePoints} centerLabel="Saldos" currency={baseCurrency} />
      </PanelCard>
    </section>

    <EquationCard equation={summary} currency={baseCurrency || 'CUP'} />

    <section class="chart-grid">
      <PanelCard title="Movimientos recientes" subtitle={`${(state.entries ?? []).length} asientos`}>
        {#if recent.length === 0}
          <p class="muted">Sin movimientos recientes.</p>
        {:else}
          <ul class="tx">
            {#each recent as entry (entry.id)}
              <li>
                <span class="tx-icon" class:in={entry.type === 'income'}>
                  {entry.type === 'income' ? '↑' : '↓'}
                </span>
                <span class="tx-main">
                  <strong>{entry.concept}</strong>
                  <small>{entry.date}{entry.accountName ? ` · ${entry.accountName}` : ''}</small>
                </span>
                <span class="tx-amount" class:in={entry.type === 'income'}>
                  {entry.type === 'expense' ? '−' : '+'}<Money amount={num(entry.amount)} currency={entry.currency} />
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </PanelCard>

      <PanelCard title="Cuentas principales" subtitle="Mayores saldos del plan de cuentas">
        {#if accountsTop.length === 0}
          <p class="muted">Sin cuentas cargadas.</p>
        {:else}
          <ul class="accounts">
            {#each accountsTop as account (account.id)}
              <li>
                <span class="acc-name">
                  <strong>{account.name}</strong>
                  <small>{account.code}</small>
                </span>
                <span class="acc-value"><Money amount={num(account.balance)} currency={account.currency} /></span>
              </li>
            {/each}
          </ul>
        {/if}
      </PanelCard>
    </section>
  {:else}
    <PanelCard title="Resumen">
      <p class="muted">Sin datos de resumen todavía.</p>
      <Button variant="secondary" on:click={() => store.loadDashboard()}>Cargar</Button>
    </PanelCard>
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
  }
  .scope-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }
  .scope-pill {
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    border-radius: var(--radius-pill);
    padding: 6px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .scope-pill.active {
    background: color-mix(in srgb, var(--accent-cyan) 18%, transparent);
    color: var(--color-text-primary);
    border-color: color-mix(in srgb, var(--accent-cyan) 40%, transparent);
  }
  .scope-pill:focus-visible {
    outline: 2px solid var(--accent-cyan);
    outline-offset: 2px;
  }
  .flow-section {
    display: block;
  }
  .hero-grid,
  .chart-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  .stat-column {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  .hero-actions {
    margin-top: var(--space-3);
  }
  .muted {
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin: 0;
  }
  .err {
    color: var(--accent-red);
    font-size: 0.85rem;
  }
  .tx,
  .accounts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .tx li,
  .accounts li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
  }
  .tx-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent-red) 18%, transparent);
    color: var(--accent-red);
    font-weight: 700;
    flex: 0 0 auto;
  }
  .tx-icon.in {
    background: color-mix(in srgb, var(--accent-green) 18%, transparent);
    color: var(--accent-green);
  }
  .tx-main,
  .acc-name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .tx-main strong,
  .acc-name strong {
    font-size: 0.86rem;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tx-main small,
  .acc-name small {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }
  .tx-amount,
  .acc-value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--accent-red);
    white-space: nowrap;
  }
  .tx-amount.in {
    color: var(--accent-green);
  }
  .acc-value {
    color: var(--color-text-primary);
  }
  @media (min-width: 900px) {
    .hero-grid {
      grid-template-columns: 1.4fr 1fr;
    }
    .chart-grid {
      grid-template-columns: 1.3fr 1fr;
    }
  }

  .review-section {
    margin-bottom: 0.25rem;
  }
  .review-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
  }
  .rchip {
    border: 1px solid var(--ap-border, var(--color-border));
    background: transparent;
    color: var(--ap-text, inherit);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 650;
    cursor: pointer;
    font-family: inherit;
  }
  .rchip.active {
    border-color: var(--accent-cyan, #61e6e1);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 14%, transparent);
  }
  .rchip.critical.active {
    border-color: color-mix(in srgb, #e85d5d 55%, var(--ap-border));
  }
  .rchip.warn.active {
    border-color: color-mix(in srgb, #e8a35d 55%, var(--ap-border));
  }
  .review-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 320px;
    overflow-y: auto;
  }
  .review-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, transparent);
  }
  .review-item.critical {
    border-color: color-mix(in srgb, #e85d5d 35%, var(--ap-border));
  }
  .review-item.warn {
    border-color: color-mix(in srgb, #e8a35d 35%, var(--ap-border));
  }
  .ri-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .ri-body strong {
    font-size: 0.88rem;
  }
  .review-ok {
    padding: 0.5rem 0;
  }
</style>
