<script lang="ts">
  import { Button, Input } from '../../../../infrastructure/ui/shared';
  import type { Account } from '../../domain/entities/Account';

  export let accounts: Account[] = [];
  export let accountTypeFilter: 'income' | 'expense' = 'income';
  export let saving = false;
  export let error: string | null = null;
  export let onSubmit: (data: {
    accountId: string;
    amount: number;
    description: string;
    date?: string;
  }) => void | Promise<void>;

  let accountId = '';
  let amountStr = '';
  let description = '';
  let date = '';

  $: filtered = accounts.filter((a) => a.type === accountTypeFilter);

  async function handleSubmit() {
    if (saving) return;
    const amount = Number(amountStr.replace(',', '.'));
    await onSubmit({
      accountId,
      amount,
      description,
      date: date || undefined,
    });
    amountStr = '';
    description = '';
  }
</script>

<form
  on:submit|preventDefault={handleSubmit}
>
  <label class="lbl" for="entry-account">Cuenta</label>
  <select id="entry-account" class="sel" bind:value={accountId} disabled={saving} required>
    <option value="">— seleccionar —</option>
    {#each filtered as a (a.id)}
      <option value={a.id}>{a.code} · {a.name}</option>
    {/each}
  </select>

  <Input
    id="entry-amount"
    label="Importe"
    type="number"
    bind:value={amountStr}
    disabled={saving}
    required
  />
  <Input
    id="entry-desc"
    label="Descripción"
    bind:value={description}
    disabled={saving}
    required
  />
  <Input id="entry-date" label="Fecha (opcional)" type="text" placeholder="YYYY-MM-DD" bind:value={date} disabled={saving} />

  {#if error}
    <p class="err" role="alert">{error}</p>
  {/if}

  <Button type="submit" disabled={saving}>
    {saving ? 'Guardando…' : accountTypeFilter === 'income' ? 'Registrar ingreso' : 'Registrar gasto'}
  </Button>
</form>

<style>
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    margin-bottom: 5px;
  }
  .sel {
    width: 100%;
    padding: 11px 13px;
    margin-bottom: 0.75rem;
    background: var(--ap-bg);
    border: 1px solid var(--ap-border);
    border-radius: 12px;
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.92rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.88rem;
  }
</style>
