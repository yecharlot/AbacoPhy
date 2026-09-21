<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import EquationCard from '../components/EquationCard.svelte';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadSummary();
    return unsub;
  });
</script>

{#if state.summaryStatus === 'loading' && !state.summary}
  <Card><p class="muted">Cargando resumen…</p></Card>
{:else if state.summaryStatus === 'error' && !state.summary}
  <Card>
    <p class="err" role="alert">{state.error}</p>
  </Card>
{:else if state.summary}
  <Card>
    <h2 style="margin-top:0">Dashboard</h2>
    <div class="totals">
      <div>
        <span class="lbl">Ingresos</span>
        <Money amount={state.summary.ingresos} />
      </div>
      <div>
        <span class="lbl">Gastos</span>
        <Money amount={state.summary.gastos} />
      </div>
      <div>
        <span class="lbl">Neto</span>
        <Money amount={state.summary.neto} />
      </div>
    </div>
    {#if state.summary.rev != null}
      <p class="meta">rev {state.summary.rev}{#if state.summary.rootCid} · CID {state.summary.rootCid.slice(0, 12)}…{/if}</p>
    {/if}
  </Card>
  <EquationCard equation={state.summary.equation} />
{:else}
  <Card><p class="muted">Sin datos de resumen</p></Card>
{/if}

<style>
  .muted {
    color: var(--ap-text-muted);
  }
  .err {
    color: var(--ap-danger);
  }
  .totals {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
  .lbl {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ap-text-muted);
  }
  .meta {
    font-size: 0.75rem;
    color: var(--ap-text-muted);
    margin: 0.75rem 0 0;
  }
</style>
