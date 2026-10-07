<script lang="ts">
  import { Button, Input, PredictivePicker } from '../../../../infrastructure/ui/shared';
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
  $: accountItems = filtered.map((a) => ({
    id: a.id,
    label: `${a.code} · ${a.name}`,
    hint: a.type,
  }));

  async function handleSubmit(e?: Event) {
    e?.preventDefault();
    if (saving) return;
    if (!accountId) {
      return;
    }
    const amount = Number(String(amountStr).replace(',', '.'));
    await onSubmit({
      accountId,
      amount,
      description,
      date: date || undefined,
    });
    amountStr = '';
    description = '';
    // mantener cuenta seleccionada para altas rápidas en serie
  }
</script>

<form onsubmit={handleSubmit}>
  <label class="lbl" for="entry-account">Cuenta</label>
  <PredictivePicker
    id="entry-account"
    items={accountItems}
    value={accountId}
    placeholder="Buscar código o nombre de cuenta…"
    disabled={saving}
    emptyText="Sin cuentas de este tipo"
    onSelect={(it) => (accountId = it.id)}
    onClear={() => (accountId = '')}
  />

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
  <Input
    id="entry-date"
    label="Fecha (opcional)"
    type="text"
    placeholder="YYYY-MM-DD"
    bind:value={date}
    disabled={saving}
  />

  {#if error}
    <p class="err" role="alert">{error}</p>
  {/if}
  {#if !accountId}
    <p class="hint">Seleccione una cuenta de la lista predictiva.</p>
  {/if}

  <Button type="submit" disabled={saving || !accountId}>
    {saving
      ? 'Guardando…'
      : accountTypeFilter === 'income'
        ? 'Registrar ingreso'
        : 'Registrar gasto'}
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
  .err {
    color: var(--ap-danger);
    font-size: 0.88rem;
  }
  .hint {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    color: var(--ap-text-muted);
  }
</style>
