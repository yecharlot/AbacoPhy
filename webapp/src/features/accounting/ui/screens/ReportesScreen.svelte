<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Money } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadEntries();
    void store.loadSummary();
    return unsub;
  });
</script>

<Card>
  <h2 style="margin-top:0">Reportes / asientos</h2>
  {#if state.entriesStatus === 'loading' && state.entries.length === 0}
    <p class="muted">Cargando…</p>
  {:else if state.entries.length === 0}
    <p class="muted">Sin asientos</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th class="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {#each state.entries as e (e.id)}
            <tr>
              <td>{e.date || '—'}</td>
              <td>{e.type}</td>
              <td>{e.description}</td>
              <td class="num"><Money amount={e.amount} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  .muted {
    color: var(--ap-text-muted);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.35rem;
    border-bottom: 1px solid var(--ap-border);
  }
  th {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--ap-text-muted);
  }
  .num {
    text-align: right;
  }
</style>
