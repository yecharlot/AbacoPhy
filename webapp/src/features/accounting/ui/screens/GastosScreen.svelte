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
    await store.addExpense(data);
    alert('Gasto registrado correctamente');
  }
</script>

<Card>
  <h2 style="margin-top:0">Registrar Gasto</h2>
  <p style="color:var(--ap-text-secondary); margin-bottom:20px;">
    Capture pagos a proveedores, servicios o cualquier disminución de activos.
  </p>

  <EntryForm
    type="expense"
    accounts={state.accounts}
    saving={state.saving}
    onSubmit={handleSubmit}
  />
</Card>
