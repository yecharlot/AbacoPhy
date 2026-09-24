<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { WarehouseState, WarehouseStore } from '../stores/warehouseStore';
  import type { CreateReceptionLineInput } from '../../domain/entities/Reception';
  import { DevSeedPanel } from '../../../../infrastructure/ui/dev';
  import { buildSampleWarehouseOpsPayload, seedWarehouseOpsViaStore } from '../dev/opsSeed';

  export let store: WarehouseStore;

  type DraftLine = {
    productId: string;
    qty: string;
    unitCost: string;
  };

  let state: WarehouseState = store.getState();

  let supplier = '';
  let docRef = '';
  let note = '';
  let lines: DraftLine[] = [{ productId: '', qty: '', unitCost: '' }];
  let formError = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: estimated = lines.reduce(
    (acc, line) => acc + (parseFloat(line.qty) || 0) * (parseFloat(line.unitCost) || 0),
    0,
  );

  function addLine() {
    lines = [...lines, { productId: '', qty: '', unitCost: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    supplier = '';
    docRef = '';
    note = '';
    lines = [{ productId: '', qty: '', unitCost: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    const payload: CreateReceptionLineInput[] = lines
      .filter((line) => line.productId !== '')
      .map((line) => ({
        productId: line.productId,
        qty: parseFloat(line.qty) || 0,
        unitCost: parseFloat(line.unitCost) || 0,
      }));

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto';
      return;
    }

    try {
      await store.addReception({
        supplier: supplier.trim() || undefined,
        docRef: docRef.trim() || undefined,
        note: note.trim() || undefined,
        lines: payload,
      });
      resetForm();
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<Card>
  <DevSeedPanel
    title="Seed recepciones y transferencias"
    description="JSON: ensureUnit, receptions[20], transfers[20]. Requiere productos en catálogo. productIndex apunta al listado de productos del store."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />
  <h2>Nuevo informe de recepción</h2>
  <p class="muted">
    El costo promedio ponderado y el asiento contable los calcula el backend al confirmar.
  </p>

  <form on:submit={handleSubmit}>
    <div class="grid">
      <Input id="rec-supplier" label="Proveedor" bind:value={supplier} placeholder="Nombre del proveedor" />
      <Input id="rec-doc" label="Documento" bind:value={docRef} placeholder="Factura o vale" />
    </div>

    {#each lines as line, index (index)}
      <div class="line">
        <div class="field">
          <label class="lbl" for={`rec-prod-${index}`}>Producto</label>
          <select id={`rec-prod-${index}`} class="sel" bind:value={line.productId}>
            <option value="">Seleccione producto</option>
            {#each state.products as product (product.id)}
              <option value={product.id}>{product.code} · {product.name}</option>
            {/each}
          </select>
        </div>
        <Input id={`rec-qty-${index}`} label="Cantidad" type="number" step="0.01" bind:value={line.qty} placeholder="0" />
        <Input
          id={`rec-cost-${index}`}
          label="Costo unitario"
          type="number"
          step="0.01"
          bind:value={line.unitCost}
          placeholder="0.00"
        />
        <button type="button" class="drop" aria-label="Quitar línea" on:click={() => removeLine(index)}>✕</button>
      </div>
    {/each}

    <Input id="rec-note" label="Nota" bind:value={note} placeholder="Observaciones" />

    {#if formError}
      <p class="err">{formError}</p>
    {/if}
    {#if state.error}
      <p class="err">{state.error}</p>
    {/if}

    <div class="actions">
      <span class="total">Total estimado: {estimated.toFixed(2)}</span>
      <Button variant="secondary" on:click={addLine}>Añadir línea</Button>
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Confirmando…' : 'Confirmar recepción'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <h2>Informes registrados</h2>
  {#if state.receptions.length === 0}
    <p class="muted">Todavía no hay recepciones registradas.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Proveedor</th>
            <th class="num">Líneas</th>
            <th class="num">Total</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {#each state.receptions as reception (reception.id)}
            <tr>
              <td>{reception.number}</td>
              <td>{reception.date}</td>
              <td>{reception.supplier || '—'}</td>
              <td class="num">{reception.lines.length}</td>
              <td class="num"><Money amount={reception.totalCost} currency={reception.currency} /></td>
              <td>{reception.status}</td>
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0 0.8rem;
  }
  .line {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
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
    align-items: center;
    flex-wrap: wrap;
  }
  .total {
    margin-right: auto;
    font-size: 0.85rem;
    color: var(--ap-text-secondary);
    font-variant-numeric: tabular-nums;
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
  @media (max-width: 760px) {
    .line {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
