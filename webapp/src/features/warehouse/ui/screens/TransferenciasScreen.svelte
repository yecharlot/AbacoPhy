<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
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
  let date = new Date().toISOString().slice(0, 10);
  let lines: DraftLine[] = [{ productId: '', qty: '' }];
  let formError = '';
  let formOk = '';

  onMount(() => {
    const unsub = store.subscribe((s: WarehouseState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  $: units = state.units ?? [];
  $: /** Solo productos con stock en almacén central */
  stockRows = (state.rows ?? []).filter((r) => r.qty > 0);
  $: transfers = [...(state.transfers ?? [])].reverse();

  function stockOf(productId: string): number {
    return state.rows.find((r) => r.productId === productId)?.qty ?? 0;
  }

  function productLabel(id: string): string {
    const r = state.rows.find((x) => x.productId === id);
    if (r) return `${r.code || '—'} · ${r.name}`;
    const p = state.products?.find((x) => x.id === id);
    return p ? `${p.code || '—'} · ${p.name}` : id;
  }

  function unitLabel(id: string): string {
    const u = units.find((x) => x.id === id);
    return u ? `${u.code || ''} · ${u.name}`.trim() : id;
  }

  function addLine() {
    lines = [...lines, { productId: '', qty: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function resetForm() {
    unitId = '';
    note = '';
    date = new Date().toISOString().slice(0, 10);
    lines = [{ productId: '', qty: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';

    if (units.length === 0) {
      formError = 'Cree primero una unidad de venta en Almacén.';
      return;
    }
    if (!unitId) {
      formError = 'Seleccione la unidad de venta destino';
      return;
    }
    if (stockRows.length === 0) {
      formError = 'No hay existencias en almacén. Registre una recepción primero.';
      return;
    }

    const payload: CreateTransferLineInput[] = [];
    for (const line of lines) {
      if (!line.productId) continue;
      const qty = parseFloat(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        formError = 'Cada línea debe tener cantidad mayor que cero';
        return;
      }
      const available = stockOf(line.productId);
      if (qty > available) {
        formError = `Stock insuficiente para ${productLabel(line.productId)} (disponible: ${available})`;
        return;
      }
      payload.push({ productId: line.productId, qty });
    }

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto con cantidad';
      return;
    }

    try {
      await store.addTransfer({
        unitId,
        date: date || undefined,
        note: note.trim() || undefined,
        lines: payload,
      });
      formOk = 'Transferencia confirmada · stock actualizado en almacén y unidad';
      resetForm();
    } catch (err) {
      formError =
        err instanceof Error
          ? err.message
          : state.error || 'No se pudo confirmar la transferencia';
    }
  }
</script>

<section class="transfer" data-screen="transferencias">
  <DevSeedPanel
    title="Seed recepciones / transferencias (DEV)"
    description="ensureUnit + receptions + transfers. Requiere productos."
    sample={buildSampleWarehouseOpsPayload()}
    onSeed={(data) => seedWarehouseOpsViaStore(store, data)}
  />

  <header class="page-head">
    <div>
      <h1>Transferencias</h1>
      <p class="sub">
        Mueve mercancía del almacén central hacia una unidad de venta. El costo se toma del promedio
        en almacén.
      </p>
    </div>
    <Button variant="secondary" on:click={() => store.loadAll()} disabled={state.status === 'loading'}>
      Actualizar
    </Button>
  </header>

  {#if state.status === 'error' && state.error}
    <p class="banner err" role="alert">{state.error}</p>
  {/if}
  {#if formOk}
    <p class="banner ok" role="status">{formOk}</p>
  {/if}
  {#if formError}
    <p class="banner err" role="alert">{formError}</p>
  {/if}

  <div class="layout">
    <Card>
      <h2>Nueva transferencia</h2>

      {#if units.length === 0}
        <p class="muted">
          No hay unidades de venta. Créelas en <strong>Almacén</strong> antes de transferir.
        </p>
      {:else if stockRows.length === 0}
        <p class="muted">
          El almacén central no tiene existencias. Confirme una <strong>recepción</strong> primero.
        </p>
      {:else}
        <form class="form" on:submit={handleSubmit}>
          <div class="form-grid">
            <label class="field">
              <span class="lbl">Unidad destino <span class="req">*</span></span>
              <select bind:value={unitId} disabled={state.saving}>
                <option value="">Seleccionar unidad…</option>
                {#each units as u (u.id)}
                  <option value={u.id}>{u.code ? `${u.code} · ` : ''}{u.name}</option>
                {/each}
              </select>
            </label>
            <label class="field">
              <span class="lbl">Fecha</span>
              <input type="date" bind:value={date} disabled={state.saving} />
            </label>
            <label class="field field-span">
              <span class="lbl">Nota</span>
              <input
                type="text"
                bind:value={note}
                placeholder="Opcional"
                disabled={state.saving}
              />
            </label>
          </div>

          <div class="lines-head">
            <h3>Líneas (desde almacén)</h3>
            <Button type="button" variant="secondary" on:click={addLine}>+ Línea</Button>
          </div>

          <div class="lines">
            {#each lines as line, i (i)}
              <div class="line-row">
                <label class="field grow">
                  <span class="lbl">Producto</span>
                  <select bind:value={line.productId} disabled={state.saving}>
                    <option value="">Seleccionar…</option>
                    {#each stockRows as r (r.productId)}
                      <option value={r.productId}>
                        {r.code || '—'} · {r.name} (disp. {r.qty})
                      </option>
                    {/each}
                  </select>
                </label>
                <label class="field qty">
                  <span class="lbl">Cantidad</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    bind:value={line.qty}
                    placeholder="0"
                    disabled={state.saving}
                  />
                </label>
                <div class="avail">
                  {#if line.productId}
                    <span class="lbl">Disponible</span>
                    <span class="avail-n">{stockOf(line.productId)}</span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="remove"
                  title="Quitar línea"
                  on:click={() => removeLine(i)}
                  disabled={lines.length <= 1 || state.saving}
                >
                  ×
                </button>
              </div>
            {/each}
          </div>

          <div class="form-actions">
            <Button type="button" variant="secondary" on:click={resetForm} disabled={state.saving}>
              Limpiar
            </Button>
            <Button type="submit" disabled={state.saving}>
              {state.saving ? 'Confirmando…' : 'Confirmar transferencia'}
            </Button>
          </div>
        </form>
      {/if}
    </Card>

    <Card>
      <h2>Historial ({transfers.length})</h2>
      {#if state.status === 'loading' && transfers.length === 0}
        <p class="muted">Cargando transferencias…</p>
      {:else if transfers.length === 0}
        <p class="muted">Aún no hay transferencias registradas.</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fecha</th>
                <th>Unidad</th>
                <th>Líneas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {#each transfers as t (t.id)}
                <tr>
                  <td class="mono">{t.number}</td>
                  <td>{t.date}</td>
                  <td>{t.unitName || unitLabel(t.unitId)}</td>
                  <td>
                    <span class="muted-inline">{t.lines?.length ?? 0}</span>
                    {#if t.lines?.length}
                      <details class="detail">
                        <summary>ver</summary>
                        <ul>
                          {#each t.lines as ln, j (j)}
                            <li>
                              {ln.productName || productLabel(ln.productId)} · {ln.qty}
                              {#if ln.unitCost}
                                × <Money amount={ln.unitCost} />
                              {/if}
                            </li>
                          {/each}
                        </ul>
                      </details>
                    {/if}
                  </td>
                  <td><span class="pill">{t.status || '—'}</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  </div>
</section>

<style>
  .transfer {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .page-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  h1 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
  }
  h3 {
    margin: 0;
    font-size: 0.85rem;
  }
  .sub {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--color-text-muted, var(--ap-text-muted));
    max-width: 52ch;
  }
  .layout {
    display: grid;
    gap: 14px;
  }
  @media (min-width: 1100px) {
    .layout {
      grid-template-columns: 1.15fr 1fr;
      align-items: start;
    }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 16px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .field-span {
    grid-column: 1 / -1;
  }
  .lbl {
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .req {
    color: var(--accent-red, #f17b7b);
  }
  select,
  .field input,
  .line-row input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, var(--ap-bg, transparent));
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.88rem;
  }
  .lines-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 1rem 0 0.5rem;
  }
  .lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .line-row {
    display: grid;
    grid-template-columns: 1fr 100px 72px 32px;
    gap: 8px;
    align-items: end;
  }
  @media (max-width: 640px) {
    .line-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  .avail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 36px;
    justify-content: flex-end;
  }
  .avail-n {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--accent-cyan, var(--ap-primary));
  }
  .remove {
    width: 32px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: transparent;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    line-height: 1;
  }
  .remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, var(--ap-border));
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th {
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
  }
  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    color: var(--color-text-secondary, var(--ap-text-secondary));
    vertical-align: top;
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }
  .pill {
    font-size: 0.68rem;
    font-weight: 650;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 16%, transparent);
    color: var(--accent-cyan, var(--ap-primary));
  }
  .detail {
    font-size: 0.75rem;
  }
  .detail ul {
    margin: 4px 0 0;
    padding-left: 1.1rem;
  }
  .muted,
  .muted-inline {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.85rem;
  }
  .banner {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
  .banner.err {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 12%, transparent);
    color: var(--accent-red, var(--ap-danger));
  }
  .banner.ok {
    background: color-mix(in srgb, var(--accent-green, #b7f56a) 12%, transparent);
    color: var(--accent-green, var(--ap-ok));
  }
</style>
