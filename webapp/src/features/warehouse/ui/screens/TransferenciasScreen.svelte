<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import type { CreateTransferLineInput } from '../../domain/entities/Transfer';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';

  export let store: WarehouseStore;

  type DraftLine = {
    productId: string;
    qty: string;
  };

  let state: WarehouseState = store.getState();

  let unitId = '';
  let note = '';
  let lines: DraftLine[] = [{ productId: '', qty: '' }];
  let formError = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function stockOf(productId: string): number {
    return state.rows.find((r) => r.productId === productId)?.qty ?? 0;
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';

    if (!unitId) {
      formError = 'Seleccione la unidad de venta destino';
      return;
    }

    const payload: CreateTransferLineInput[] = lines
      .filter((line) => line.productId !== '')
      .map((line) => ({ productId: line.productId, qty: parseFloat(line.qty) || 0 }));

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto';
      return;
    }

    try {
      await store.addTransfer({ unitId, note: note.trim() || undefined, lines: payload });
      unitId = '';
      note = '';
      lines = [{ productId: '', qty: '' }];
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<Card>
  <DevSeedPanel
    title="Seed recepciones y transferencias"
    description="Mismo payload que Recepción: ensureUnit + receptions + transfers (20 c/u)."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />
  <h2>Transferencia almacén → unidad de venta</h2>
  {#if state.units.length === 0}
    <p class="err">Cree primero una unidad de venta en la pantalla Almacén.</p>
  {/if}

  <form on:submit={handleSubmit}>
    <div class="field">
      <label class="lbl" for="tr-unit">Unidad de venta destino</label>
      <select id="tr-unit" class="sel" bind:value={unitId}>
        <option value="">Seleccione unidad</option>
        {#each state.units as unit (unit.id)}
          <option value={unit.id}>{unit.code} · {unit.name}</option>
        {/each}
      </select>
    </div>

    {#each lines as line, index (index)}
      <div class="line">
        <div class="field">
          <label class="lbl" for={`tr-prod-${index}`}>Producto</label>
          <select id={`tr-prod-${index}`} class="sel" bind:value={line.productId}>
            <option value="">Seleccione producto</option>
            {#each state.rows as row (row.productId)}
              <option value={row.productId}>{row.code} · {row.name} (disp. {row.qty})</option>
            {/each}
          </select>
        </div>
        <Input id={`tr-qty-${index}`} label="Cantidad" type="number" step="0.01" bind:value={line.qty} placeholder="0" />
        <button type="button" class="drop" aria-label="Quitar línea" on:click={() => removeLine(index)}>✕</button>
      </div>
      {#if line.productId && (parseFloat(line.qty) || 0) > stockOf(line.productId)}
        <p class="err">Existencia insuficiente en almacén para esta línea.</p>
      {/if}
    {/each}

    <Input id="tr-note" label="Nota" bind:value={note} placeholder="Observaciones" />

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}

    <div class="actions">
      <Button variant="secondary" on:click={addLine}>Añadir línea</Button>
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Confirmando…' : 'Confirmar transferencia'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Transferencias registradas</h2>
  {#if state.transfers.length === 0}
    <p class="muted">Todavía no hay transferencias.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Unidad</th>
            <th class="num">Líneas</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {#each state.transfers as transfer (transfer.id)}
            <tr>
              <td>{transfer.number}</td>
              <td>{transfer.date}</td>
              <td>{transfer.unitName || transfer.unitId}</td>
              <td class="num">{transfer.lines.length}</td>
              <td>{transfer.status}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .line {
    display: grid;
    grid-template-columns: 2fr 1fr auto;
    gap: 0 0.7rem;
    align-items: end;
  }
  .field {
    min-width: 0;
  }
  .lbl {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.3rem;
  }
  .sel {
    width: 100%;
    padding: 0.62rem 0.7rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.9rem;
    margin-bottom: 0.7rem;
  }
  .drop {
    border: 1px solid var(--ap-border);
    background: transparent;
    color: var(--ap-danger);
    border-radius: 10px;
    height: 42px;
    width: 42px;
    margin-bottom: 0.7rem;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    white-space: nowrap;
  }
  td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
