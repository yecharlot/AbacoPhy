<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button } from '../../../../infrastructure/ui/shared';
  import AccountTable from '../components/AccountTable.svelte';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAccounts();
    return unsub;
  });
</script>

{#if state.accountsStatus === 'loading' && state.accounts.length === 0}
  <Card><p class="muted">Cargando cuentas…</p></Card>
{:else if state.accountsStatus === 'error' && state.accounts.length === 0}
  <Card>
    <p class="err" role="alert">{state.error}</p>
    <Button variant="secondary" on:click={() => store.loadAccounts()}>Reintentar</Button>
  </Card>
{:else}
  <AccountTable accounts={state.accounts} />
{/if}

<style>
  .muted {
    color: var(--ap-text-muted);
  }
  .err {
    color: var(--ap-danger);
  }
</style>
