<script lang="ts">
  import { onMount } from 'svelte';
  import { Card } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import EntryForm from '../components/EntryForm.svelte';

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

  async function handleSubmit(data: any) {
    await store.addIncome(data);
    alert('Ingreso registrado correctamente');
  }
</script>

<Card>
  <h2 style="margin-top:0">Registrar Ingreso</h2>
  <p style="color:var(--ap-text-secondary); margin-bottom:20px;">
    Capture entradas de efectivo, cobros o cualquier incremento de activos.
  </p>

  <EntryForm
    type="income"
    accounts={state.accounts}
    saving={state.saving}
    onSubmit={handleSubmit}
  />
</Card>
