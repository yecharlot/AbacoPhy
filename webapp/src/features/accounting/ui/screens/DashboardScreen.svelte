<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
    LineChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { AccountingState, AccountingStore } from '../stores/accountingStore';
  import EquationCard from '../components/EquationCard.svelte';
  import {
    accountsByType,
    expenseSplit,
    monthlySeries,
    seriesDelta,
    topAccounts,
  } from '../viewmodels/dashboardCharts';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();

  onMount(() => {
    const unsub = store.subscribe((s: AccountingState) => {
      state = s;
    });
    void store.loadDashboard();
    return unsub;
  });

  function num(v: unknown): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  $: incomeSeries = monthlySeries(state.entries ?? [], 'income') as ChartPoint[];
  $: expenseSeries = monthlySeries(state.entries ?? [], 'expense') as ChartPoint[];
  $: splitPoints = expenseSplit(state.entries ?? []) as ChartPoint[];
  $: structurePoints = accountsByType(state.accounts ?? []) as ChartPoint[];
  $: incomeDelta = seriesDelta(incomeSeries);
  $: expenseDelta = seriesDelta(expenseSeries);
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
</script>

<div class="dashboard" data-screen="dashboard">
  {#if state.status === 'loading' && !state.summary}
    <PanelCard title="Resumen">
      <p class="muted">Cargando resumen financiero…</p>
    </PanelCard>
  {:else if state.status === 'error' && !state.summary}
    <PanelCard title="Resumen">
      <p class="err">{state.error}</p>
      <Button variant="secondary" on:click={() => store.loadDashboard()}>Reintentar</Button>
    </PanelCard>
  {:else if summary}
    <section class="hero-grid">
      <StatCard
        variant="hero"
        label="Patrimonio neto"
        amount={equity}
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

    <section class="chart-grid">
      <PanelCard title="Flujo de ingresos" subtitle="Últimos meses con movimientos" tag="Mensual">
        <BarChart points={incomeSeries} height={190} emptyText="Aún no hay ingresos registrados" />
      </PanelCard>
      <PanelCard title="Reparto de gastos" subtitle="Por categoría o cuenta" tag="Gastos">
        <DonutChart points={splitPoints} centerLabel="Total" currency={baseCurrency} />
      </PanelCard>
    </section>

    <section class="chart-grid">
      <PanelCard title="Tendencia de gastos" subtitle="Comparación mes a mes" tag="Tendencia">
        <LineChart points={expenseSeries} color="var(--accent-pink)" emptyText="Sin gastos en el período" />
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
</style>
