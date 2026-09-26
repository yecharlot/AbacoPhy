<script lang="ts">
  import { onMount } from 'svelte';
  import { Card } from '../../../../infrastructure/ui/shared';
  import EntryForm from '../components/EntryForm.svelte';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();
  let formError: string | null = null;
  let okMsg = '';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAccounts();
    return unsub;
  });

  async function handleSubmit(data: {
    accountId: string;
    amount: number;
    description: string;
    date?: string;
  }) {
    formError = null;
    okMsg = '';
    try {
      await store.createExpense(data);
      okMsg = 'Gasto registrado';
      setTimeout(() => {
        okMsg = '';
      }, 2500);
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Error';
    }
  }
</script>

<Card>
  <h2 style="margin-top:0">Gastos</h2>
  <p class="muted">La partida doble la aplica el backend.</p>
  <EntryForm
    accounts={state.accounts}
    accountTypeFilter="expense"
    saving={state.saving}
    error={formError}
    onSubmit={handleSubmit}
  />
  {#if okMsg}
    <p class="ok">{okMsg}</p>
  {/if}
</Card>

<style>
  .muted {
    color: var(--ap-text-secondary);
    font-size: 0.9rem;
  }
  .ok {
    color: var(--ap-ok);
    font-size: 0.88rem;
  }
</style>
