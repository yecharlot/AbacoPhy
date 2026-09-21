<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import EquationCard from '../components/EquationCard.svelte';

  export let store: AccountingStore;

  let state: AccountingState = {
    status: 'idle',
    accounts: [],
    entries: [],
    summary: null,
    error: null,
    saving: false
  };

  onMount(() => {
    const unsub = store.subscribe(s => state = s);
    void store.loadDashboard();
    return unsub;
  });
</script>

<div class="dashboard">
  {#if state.status === 'loading' && !state.summary}
    <Card><p style="color:var(--ap-text-secondary)">Cargando resumen financiero...</p></Card>
  {:else if state.status === 'error'}
    <Card>
      <p style="color:var(--ap-danger)">{state.error}</p>
      <button on:click={() => store.loadDashboard()}>Reintentar</button>
    </Card>
  {:else if state.summary}
    <EquationCard equation={state.summary} />

    <div class="grid">
      <Card>
        <h3 style="margin-top:0">Últimos Movimientos</h3>
        <div class="entries-list">
          {#if state.entries.length === 0}
            <p style="color:var(--ap-text-muted); text-align:center; padding:20px;">Sin movimientos recientes</p>
          {:else}
            {#each state.entries as entry}
              <div class="entry-item">
                <div class="entry-main">
                  <span class="concept">{entry.concept}</span>
                  <span class="date">{entry.date}</span>
                </div>
                <div class="entry-amount" class:income={entry.type === 'income'} class:expense={entry.type === 'expense'}>
                  {entry.type === 'expense' ? '-' : ''}
                  <Money amount={entry.amount} currency={entry.currency} />
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Card>

      <Card>
        <h3 style="margin-top:0">Estado de Cuentas</h3>
        <div class="accounts-mini">
          {#each state.accounts.slice(0, 5) as acc}
            <div class="acc-mini-item">
              <span>{acc.name}</span>
              <span style="font-weight:600"><Money amount={acc.balance} currency={acc.currency} /></span>
            </div>
          {/each}
          {#if state.accounts.length > 5}
            <p style="font-size:0.8rem; text-align:right; color:var(--ap-primary); margin-top:8px; cursor:pointer">
              Ver todas →
            </p>
          {/if}
        </div>
      </Card>
    </div>
  {/if}
</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 16px; }
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 900px) {
    .grid { grid-template-columns: 1.5fr 1fr; }
  }
  .entry-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--ap-border);
  }
  .entry-main { display: flex; flex-direction: column; }
  .concept { font-weight: 500; font-size: 0.95rem; }
  .date { font-size: 0.8rem; color: var(--ap-text-muted); }
  .entry-amount { font-weight: 700; font-variant-numeric: tabular-nums; }
  .income { color: var(--ap-ok); }
  .expense { color: var(--ap-danger); }

  .accounts-mini { display: flex; flex-direction: column; gap: 8px; }
  .acc-mini-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    padding: 4px 0;
  }
</style>
