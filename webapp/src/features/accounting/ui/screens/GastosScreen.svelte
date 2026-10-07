<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, EmptyState, Input, Money, notifyErr, notifyOk } from '../../../../infrastructure/ui/shared';
  import EntryForm from '../components/EntryForm.svelte';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import {
    accountName,
    filterEntriesByType,
    sumAmounts,
    type EntryListFilter,
  } from '../viewmodels/entryList';
  import { exportEntriesCsv, exportEntriesPdf } from '../export/accountingReportsExport';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();
  let formError: string | null = null;
  let showForm = false;
  let searchQ = '';
  let period: EntryListFilter = 'month';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void Promise.all([store.loadAccounts(), store.loadEntries({ limit: 5000 })]);
    return unsub;
  });

  $: list = filterEntriesByType(state.entries, 'expense', searchQ, period);
  $: total = sumAmounts(list);
  $: currency = list[0]?.currency || state.accounts[0]?.currency || '';

  async function handleSubmit(data: {
    accountId: string;
    amount: number;
    description: string;
    date?: string;
  }) {
    formError = null;
    try {
      await store.createExpense(data);
      notifyOk('Gasto registrado');
      showForm = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar gasto';
      formError = msg;
      notifyErr(msg);
    }
  }
</script>

<section class="acc-page">
  <div class="stats-rail">
    <div class="stat-chip" title="Suma de los gastos visibles según filtro">
      <span class="stat-ico" aria-hidden="true">↓</span>
      <div>
        <p class="stat-val"><Money amount={total} {currency} /></p>
        <p class="stat-lbl">Total filtrado</p>
      </div>
    </div>
    <div class="stat-chip">
      <span class="stat-ico" aria-hidden="true">#</span>
      <div>
        <p class="stat-val">{list.length}</p>
        <p class="stat-lbl">Movimientos</p>
      </div>
    </div>
    <div class="stat-chip">
      <span class="stat-ico" aria-hidden="true">📒</span>
      <div>
        <p class="stat-val">{state.accounts.filter((a) => a.type === 'expense').length}</p>
        <p class="stat-lbl">Cuentas de gasto</p>
      </div>
    </div>
  </div>

  <div class="actions-bar">
          <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={list.length === 0}
        onclick={() => exportEntriesCsv('expense', list, state.accounts)}
      >CSV</Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={list.length === 0}
        onclick={() => {
          try { exportEntriesPdf('expense', list, state.accounts); }
          catch (e) { formError = e instanceof Error ? e.message : 'No se pudo exportar PDF'; }
        }}
      >PDF</Button>
<Button
      type="button"
      variant={showForm ? 'secondary' : 'primary'}
      onclick={() => {
        showForm = !showForm;
        formError = null;
      }}
    >
      {showForm ? 'Cerrar formulario' : 'Nuevo gasto'}
    </Button>
  </div>

  <div class="workspace">
    {#if showForm}
      <aside class="col-form">
        <Card>
          <h2>Registrar gasto</h2>
          <p class="muted">La partida doble la aplica el backend. Elija la cuenta de gasto.</p>
          <EntryForm
            accounts={state.accounts}
            accountTypeFilter="expense"
            saving={state.saving}
            error={formError}
            onSubmit={handleSubmit}
          />
        </Card>
      </aside>
    {/if}

    <section class="col-list" class:full={!showForm}>
      <div class="list-toolbar">
        <Input id="exp-search" label="Buscar" bind:value={searchQ} placeholder="Descripción o cuenta…" />
        <div class="field">
          <label class="lbl" for="exp-period">Periodo</label>
          <select id="exp-period" class="sel" bind:value={period}>
            <option value="week">Última semana</option>
            <option value="month">Este mes</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      <div class="list-scroll">
        {#if state.status === 'loading' && state.entries.length === 0}
          <p class="muted">Cargando movimientos…</p>
        {:else if state.status === 'error' && list.length === 0}
          <p class="err" role="alert">{state.error}</p>
          <Button type="button" variant="secondary" onclick={() => store.loadEntries({ limit: 5000 })}
            >Reintentar</Button
          >
        {:else if list.length === 0}
                    <EmptyState
            compact
            icon="accounts"
            title="Sin gastos en este filtro"
            description={period === 'all'
              ? 'Registre el primer gasto con el botón superior.'
              : 'Pruebe ampliar el periodo o limpiar la búsqueda.'}
            actionLabel={!showForm ? 'Nuevo gasto' : undefined}
            onAction={!showForm ? () => (showForm = true) : undefined}
          />
        {:else}
          <ul class="entry-list">
            {#each list as e (e.id)}
              <li class="entry-card">
                <div class="entry-main">
                  <strong>{e.description || e.concept || 'Sin descripción'}</strong>
                  <span class="muted">{accountName(state.accounts, e.accountId)}</span>
                </div>
                <div class="entry-meta">
                  <span class="date">{e.date ? e.date.slice(0, 10) : '—'}</span>
                  <span class="amt expense"
                    ><Money amount={e.amount} currency={e.currency || currency} /></span
                  >
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  </div>
</section>

<style>
  .acc-page {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
  }
  .stats-rail {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
  }
  .stat-chip {
    flex: 1 0 auto;
    min-width: 140px;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .stat-val {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .stat-lbl {
    margin: 0.05rem 0 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ap-text-muted);
  }
  .actions-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
  }
  @media (min-width: 960px) {
    .workspace {
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      height: min(68vh, 820px);
    }
    .workspace:has(.col-list.full) {
      grid-template-columns: 1fr;
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
    .list-scroll {
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
  @media (min-width: 560px) {
    .list-toolbar {
      grid-template-columns: 1.5fr 1fr;
      align-items: end;
    }
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
  }
  h2 {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger, #e85d5d);
  }
  .empty {
    padding: 1.5rem 0.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .empty-title {
    margin: 0;
    font-weight: 700;
  }
  .entry-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .entry-card {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, var(--color-surface));
    animation: in 0.28s ease both;
  }
  @keyframes in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .entry-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .entry-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.2rem;
    flex-shrink: 0;
  }
  .date {
    font-size: 0.72rem;
    color: var(--ap-text-muted);
  }
  .amt.expense {
    font-weight: 700;
    color: #e85d5d;
  }
</style>
