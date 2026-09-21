<script lang="ts">
  import { Button, Input } from '../../../../infrastructure/ui/shared';

  export let saving = false;
  export let error: string | null = null;
  export let onSubmit: (data: {
    clientName: string;
    clientTax: string;
    lines: { description: string; qty: number; unitPrice: number }[];
    tax: number;
  }) => void | Promise<void>;

  let clientName = '';
  let clientTax = '';
  let taxStr = '0';
  let lines: { description: string; qtyStr: string; priceStr: string }[] = [
    { description: '', qtyStr: '1', priceStr: '' },
  ];

  function addLine() {
    lines = [...lines, { description: '', qtyStr: '1', priceStr: '' }];
  }

  function removeLine(i: number) {
    if (lines.length <= 1) return;
    lines = lines.filter((_, idx) => idx !== i);
  }

  async function handleSubmit() {
    if (saving) return;
    await onSubmit({
      clientName,
      clientTax,
      tax: Number(taxStr.replace(',', '.')) || 0,
      lines: lines.map((l) => ({
        description: l.description,
        qty: Number(l.qtyStr.replace(',', '.')) || 0,
        unitPrice: Number(l.priceStr.replace(',', '.')) || 0,
      })),
    });
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <Input id="inv-client" label="Cliente" bind:value={clientName} disabled={saving} required />
  <Input id="inv-taxid" label="NIT / Id. fiscal (opcional)" bind:value={clientTax} disabled={saving} />
  <Input id="inv-tax" label="Impuesto" type="text" bind:value={taxStr} disabled={saving} />

  <p class="section">Líneas</p>
  {#each lines as line, i (i)}
    <div class="line">
      <Input
        id="inv-line-d-{i}"
        label="Descripción"
        bind:value={line.description}
        disabled={saving}
        required
      />
      <div class="row">
        <Input id="inv-line-q-{i}" label="Cant." bind:value={line.qtyStr} disabled={saving} required />
        <Input id="inv-line-p-{i}" label="P. unit." bind:value={line.priceStr} disabled={saving} required />
      </div>
      {#if lines.length > 1}
        <button type="button" class="link" disabled={saving} on:click={() => removeLine(i)}>Quitar línea</button>
      {/if}
    </div>
  {/each}

  <Button type="button" variant="secondary" disabled={saving} on:click={addLine}>+ Línea</Button>

  {#if error}
    <p class="err" role="alert">{error}</p>
  {/if}

  <div class="actions">
    <Button type="submit" disabled={saving}>{saving ? 'Emitiendo…' : 'Emitir factura'}</Button>
  </div>
</form>

<style>
  .section {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    margin: 0.75rem 0 0.35rem;
  }
  .line {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .link {
    background: none;
    border: none;
    color: var(--accent-red, var(--ap-danger));
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 0.35rem;
  }
  .err {
    color: var(--accent-red, var(--ap-danger));
    font-size: 0.88rem;
  }
  .actions {
    margin-top: 0.75rem;
  }
</style>
