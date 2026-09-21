<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import AccountTable from '../components/AccountTable.svelte';

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
    void store.loadAccounts();
    return unsub;
  });
</script>

<Card>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h2 style="margin:0">Plan de Cuentas</h2>
    <Button size="sm">+ Nueva Cuenta</Button>
  </div>

  {#if state.status === 'loading'}
    <p style="color:var(--ap-text-secondary)">Cargando cuentas...</p>
  {:else if state.status === 'error'}
    <p style="color:var(--ap-danger)">{state.error}</p>
    <Button variant="secondary" on:click={() => store.loadAccounts()}>Reintentar</Button>
  {:else}
    <AccountTable accounts={state.accounts} />
  {/if}
</Card>
