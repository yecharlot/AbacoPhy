<script lang="ts">
  import { Button, Input } from '../../../../infrastructure/ui/shared';
  import type { Account } from '../../domain/entities/Account';

  export let type: 'income' | 'expense' = 'income';
  export let accounts: Account[] = [];
  export let saving = false;
  export let onSubmit: (data: any) => Promise<void>;

  let date = new Date().toISOString().split('T')[0];
  let concept = '';
  let amount = '';
  let accountId = '';
  let category = '';
  let error = '';

  $: filteredAccounts = accounts.filter(a =>
    type === 'income' ? (a.type === 'asset' || a.type === 'income') : (a.type === 'asset' || a.type === 'expense')
  );

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!concept || !amount || !accountId) {
      error = 'Complete los campos obligatorios';
      return;
    }
    error = '';
    try {
      await onSubmit({
        date,
        concept,
        amount: parseFloat(amount),
        currency: accounts.find(a => a.id === accountId)?.currency || 'CUP',
        accountId,
        category
      });
      concept = '';
      amount = '';
      category = '';
    } catch (err: any) {
      error = err.message || 'Error al guardar';
    }
  }
</script>

<form on:submit={handleSubmit} class="form">
  <Input id="e-date" label="Fecha" type="date" bind:value={date} required disabled={saving} />
  <Input id="e-concept" label="Concepto / Detalle" bind:value={concept} required disabled={saving} />

  <div class="row">
    <Input id="e-amount" label="Importe" type="number" step="0.01" bind:value={amount} required disabled={saving} />
    <div class="field">
      <label class="lbl" for="e-acc">Cuenta</label>
      <select id="e-acc" class="select-inp" bind:value={accountId} required disabled={saving}>
        <option value="">Seleccionar...</option>
        {#each filteredAccounts as acc}
          <option value={acc.id}>{acc.name} ({acc.currency})</option>
        {/each}
      </select>
    </div>
  </div>

  <Input id="e-cat" label="Categoría (opcional)" bind:value={category} disabled={saving} />

  {#if error}
    <p class="err">{error}</p>
  {/if}

  <Button type="submit" disabled={saving}>
    {saving ? 'Guardando...' : type === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
  </Button>
</form>

<style>
  .form { display: flex; flex-direction: column; gap: 8px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    margin-bottom: 6px;
  }
  .select-inp {
    width: 100%;
    padding: 12px 14px;
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--ap-border);
    border-radius: 12px;
    color: var(--ap-text);
    font-family: inherit;
  }
  .err { color: var(--ap-danger); font-size: 0.85rem; margin: 4px 0; }
</style>
