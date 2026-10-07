<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import {
    buildTrialBalance,
    buildIncomeStatement,
    buildJournal,
  } from '../../domain/reports';
  import TrialBalanceTable from '../components/reports/TrialBalanceTable.svelte';
  import IncomeStatementPanel from '../components/reports/IncomeStatementPanel.svelte';
  import JournalTable from '../components/reports/JournalTable.svelte';
  import {
    exportIncomeStatementCsv,
    exportIncomeStatementPdf,
    exportJournalCsv,
    exportJournalPdf,
    exportTrialBalanceCsv,
    exportTrialBalancePdf,
  } from '../export/accountingReportsExport';

  export let store: AccountingStore;
  /** Contexto de emisión del informe (negocio + usuario). */
  export let businessName: string = '';
  export let generatedBy: string = '';
  export let generatedByRole: string = '';

  type ReportTab = 'balance' | 'resultados' | 'diario';

  let state: AccountingState = store.getState();
  let tab: ReportTab = 'balance';
  let fromDate = '';
  let toDate = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    // Una sola carga: cuentas + asientos + summary
    void store.loadDashboard();
    return unsub;
  });

  $: trial = buildTrialBalance(state.accounts ?? []);
  $: statement = buildIncomeStatement({
    accounts: state.accounts ?? [],
    summary: state.summary,
    entries: state.entries ?? [],
    from: fromDate || undefined,
    to: toDate || undefined,
  });
  $: journal = buildJournal(state.entries ?? [], state.accounts ?? []);

  $: loading = state.status === 'loading' && (state.accounts?.length ?? 0) === 0;
  $: hasError = state.status === 'error' && (state.accounts?.length ?? 0) === 0;

  function setTab(t: ReportTab) {
    tab = t;
  }

  function clearPeriod() {
    fromDate = '';
    toDate = '';
  }

  let exportErr = '';

  function exportCtx() {
    return {
      businessName: businessName || undefined,
      generatedBy: generatedBy || undefined,
      generatedByRole: generatedByRole || undefined,
    };
  }

  function exportCsv() {
    exportErr = '';
    try {
      if (tab === 'balance') exportTrialBalanceCsv(trial);
      else if (tab === 'resultados') exportIncomeStatementCsv(statement);
      else exportJournalCsv(journal);
    } catch (e) {
      exportErr = e instanceof Error ? e.message : 'No se pudo exportar';
    }
  }

  async function exportPdf() {
    exportErr = '';
    try {
      if (tab === 'balance') await exportTrialBalancePdf(trial, exportCtx());
      else if (tab === 'resultados') await exportIncomeStatementPdf(statement, exportCtx());
      else await exportJournalPdf(journal, exportCtx());
    } catch (e) {
      exportErr = e instanceof Error ? e.message : 'No se pudo exportar';
    }
  }
</script>

<div class="reportes" data-screen="reportes">
  <header class="page-head">
    <div>
      <h2 class="page-title">Reportes contables</h2>
      <p class="page-sub">
        Balance de comprobación, estado de resultados y libro diario a partir del plan de cuentas y
        los asientos.
      </p>
    </div>
    <div class="head-actions">
      <Button type="button" variant="secondary" size="sm" onclick={exportCsv} disabled={loading}>
        CSV
      </Button>
      <Button type="button" variant="secondary" size="sm" onclick={exportPdf} disabled={loading}>
        PDF
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onclick={() => store.loadDashboard()}
        disabled={state.status === 'loading'}
      >
        Actualizar
      </Button>
    </div>
  </header>
  {#if exportErr}
    <p class="err" role="alert">{exportErr}</p>
  {/if}

  <div class="tabs" role="tablist" aria-label="Tipo de reporte">
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={tab === 'balance'}
      aria-selected={tab === 'balance'}
      onclick={() => setTab('balance')}
    >
      Balance de comprobación
    </button>
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={tab === 'resultados'}
      aria-selected={tab === 'resultados'}
      onclick={() => setTab('resultados')}
    >
      Estado de resultados
    </button>
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={tab === 'diario'}
      aria-selected={tab === 'diario'}
      onclick={() => setTab('diario')}
    >
      Libro diario
    </button>
  </div>

  {#if loading}
    <Card>
      <p class="muted">Cargando datos contables…</p>
    </Card>
  {:else if hasError}
    <Card>
      <p class="err" role="alert">{state.error ?? 'Error al cargar'}</p>
      <Button variant="secondary" onclick={() => store.loadDashboard()}>Reintentar</Button>
    </Card>
  {:else}
    {#if tab === 'resultados'}
      <div class="period">
        <label class="field">
          <span>Desde</span>
          <input type="date" bind:value={fromDate} />
        </label>
        <label class="field">
          <span>Hasta</span>
          <input type="date" bind:value={toDate} />
        </label>
        {#if fromDate || toDate}
          <Button variant="ghost" size="sm" onclick={clearPeriod}>Quitar filtro</Button>
        {/if}
        <p class="period-hint">
          Sin fechas: saldos del plan de cuentas. Con fechas: se recalcula desde asientos del
          periodo.
        </p>
      </div>
    {/if}

    {#if tab === 'balance'}
      <TrialBalanceTable {trial} />
    {:else if tab === 'resultados'}
      <IncomeStatementPanel {statement} />
    {:else}
      <JournalTable {journal} />
    {/if}
  {/if}
</div>

<style>
  .reportes {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .page-title {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }
  .page-sub {
    margin: 0.25rem 0 0;
    font-size: 0.86rem;
    color: var(--ap-text-muted, var(--color-text-secondary));
    max-width: 36rem;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.25rem;
    background: color-mix(in srgb, var(--ap-bg-elevated, var(--color-surface)) 80%, transparent);
    border: 1px solid var(--ap-border, var(--color-border));
    border-radius: 12px;
  }
  .tab {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--ap-text-secondary, var(--ap-text-muted));
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.85rem;
    border-radius: 9px;
    cursor: pointer;
    transition:
      background 140ms ease,
      color 140ms ease;
  }
  .tab:hover {
    color: var(--ap-text, var(--color-text-primary));
  }
  .tab.active {
    background: var(--ap-bg, var(--color-surface-raised, #fff));
    color: var(--ap-text, var(--color-text-primary));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .tab:focus-visible {
    outline: 2px solid var(--accent-cyan, #61e6e1);
    outline-offset: 2px;
  }
  .period {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.65rem 1rem;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--ap-border, var(--color-border));
    border-radius: 12px;
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ap-text-muted);
  }
  .field input {
    font: inherit;
    font-size: 0.88rem;
    text-transform: none;
    letter-spacing: normal;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--ap-border, var(--color-border));
    background: var(--ap-bg, transparent);
    color: var(--ap-text);
  }
  .period-hint {
    flex-basis: 100%;
    margin: 0;
    font-size: 0.75rem;
    color: var(--ap-text-muted);
    text-transform: none;
    letter-spacing: normal;
  }
  .muted {
    color: var(--ap-text-muted);
  }
  .err {
    color: var(--ap-danger, #f17b7b);
  }
</style>
