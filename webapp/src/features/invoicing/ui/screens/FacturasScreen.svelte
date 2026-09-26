<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Card, Money } from '../../../../infrastructure/ui/shared';
  import type { InvoicingStore, InvoicingState } from '../stores/invoicingStore';
  import type { Invoice } from '../../domain/entities/Invoice';
  import type { Employee } from '../../../payroll/domain/entities/Employee';
  import type { SalesUnit } from '../../../warehouse/domain/entities/SalesUnit';
  import type { PayrollStore } from '../../../payroll/ui/stores/payrollStore';
  import type { WarehouseStore } from '../../../warehouse/ui/stores/warehouseStore';

  export let store: InvoicingStore;
  /** Opcional: lista de trabajadores del negocio (sesión = 1 tenant). */
  export let payrollStore: PayrollStore | null = null;
  /** Opcional: unidades de venta del negocio. */
  export let warehouseStore: WarehouseStore | null = null;

  export let issuerName = 'ÁbacoPhy';
  export let issuerTaxId = '';
  export let issuerAddress = '';
  export let issuerPhone = '';

  type DraftLine = {
    code: string;
    description: string;
    unit: string;
    qty: string;
    unitPrice: string;
  };

  let state: InvoicingState = store.getState();
  let employees: Employee[] = [];
  let units: SalesUnit[] = [];

  let showForm = false;
  let clientName = '';
  let clientTax = '';
  let currency = 'CUP';
  let taxPct = '0';
  let unitId = '';
  let operatorId = '';
  let lines: DraftLine[] = [
    { code: '', description: '', unit: 'ud', qty: '1', unitPrice: '' },
  ];
  let formError = '';
  let formOk = '';
  let pdfBusyId: string | null = null;

  onMount(() => {
    const unsub = store.subscribe((s) => (state = s));
    void store.load();
    if (payrollStore) {
      const u1 = payrollStore.subscribe((s) => {
        employees = (s.employees || []).filter((e) => e.active);
      });
      void payrollStore.loadEmployees();
      // store unsubscribe
      const prev = unsub;
      return () => {
        prev();
        u1();
      };
    }
    if (warehouseStore) {
      const u2 = warehouseStore.subscribe((s) => {
        units = s.units || [];
      });
      void warehouseStore.loadAll?.();
      return () => {
        unsub();
        u2();
      };
    }
    return unsub;
  });

  // load units if warehouse present (separate effect)
  $: if (warehouseStore) {
    units = warehouseStore.getState().units || [];
  }
  $: if (payrollStore) {
    employees = (payrollStore.getState().employees || []).filter((e) => e.active);
  }

  $: invoices = [...(state.invoices ?? [])].reverse();
  $: subtotal = lines.reduce(
    (acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0),
    0,
  );
  $: tax = subtotal * ((parseFloat(taxPct) || 0) / 100);
  $: total = subtotal + tax;

  /** Empleados filtrados por unidad seleccionada (si tienen unitIds). */
  $: operators = (() => {
    if (!unitId) return employees;
    const linked = employees.filter(
      (e) => !e.unitIds?.length || e.unitIds.includes(unitId),
    );
    return linked.length ? linked : employees;
  })();

  $: selectedUnit = units.find((u) => u.id === unitId);
  $: selectedOp = employees.find((e) => e.id === operatorId);

  function composeDescription(l: DraftLine): string {
    const parts: string[] = [];
    if (l.code.trim()) parts.push(l.code.trim());
    if (l.description.trim()) parts.push(l.description.trim());
    if (l.unit.trim()) parts.push(`(${l.unit.trim()})`);
    return parts.join(' · ') || 'Concepto';
  }

  function addLine() {
    lines = [...lines, { code: '', description: '', unit: 'ud', qty: '1', unitPrice: '' }];
  }
  function removeLine(i: number) {
    lines = lines.filter((_, idx) => idx !== i);
    if (lines.length === 0) addLine();
  }
  function resetForm() {
    clientName = '';
    clientTax = '';
    taxPct = '0';
    unitId = '';
    operatorId = '';
    lines = [{ code: '', description: '', unit: 'ud', qty: '1', unitPrice: '' }];
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';
    formOk = '';
    if (!clientName.trim()) {
      formError = 'Indique el cliente / razón social';
      return;
    }
    const payload = lines
      .filter((l) => l.description.trim() || l.code.trim())
      .map((l) => ({
        description: composeDescription(l),
        qty: parseFloat(l.qty) || 0,
        unitPrice: parseFloat(l.unitPrice) || 0,
      }));
    if (payload.length === 0 || payload.some((l) => l.qty <= 0 || l.unitPrice < 0)) {
      formError = 'Cada línea necesita descripción (o código), cantidad > 0 y precio ≥ 0';
      return;
    }
    try {
      await store.emit({
        clientName: clientName.trim(),
        clientTax: clientTax.trim() || undefined,
        currency,
        tax,
        status: 'issued',
        lines: payload,
        unitId: unitId || undefined,
        unitName: selectedUnit?.name,
        operatorId: operatorId || undefined,
        operatorName: selectedOp?.name,
        issuerName: issuerName || undefined,
        issuerTaxId: issuerTaxId || undefined,
        issuerAddress: issuerAddress || undefined,
        issuerPhone: issuerPhone || undefined,
      });
      formOk = 'Factura emitida a nombre del negocio';
      showForm = false;
      resetForm();
    } catch (err) {
      // Si el backend rechaza campos extra, reintentar sin ellos
      const msg = err instanceof Error ? err.message : String(err);
      if (/unknown|campo|json|bad json/i.test(msg)) {
        try {
          await store.emit({
            clientName: clientName.trim(),
            clientTax: clientTax.trim() || undefined,
            currency,
            tax,
            status: 'issued',
            lines: payload,
          });
          formOk =
            'Factura emitida (el servidor aún no guarda operador/unidad; el PDF local sí los muestra)';
          showForm = false;
          resetForm();
          return;
        } catch (err2) {
          formError = err2 instanceof Error ? err2.message : 'Error al emitir';
          return;
        }
      }
      formError = msg || state.error || 'Error al emitir';
    }
  }

  async function handlePdf(inv: Invoice) {
    formError = '';
    formOk = '';
    pdfBusyId = inv.id;
    try {
      await store.downloadPdf(inv.id, inv.number);
      formOk = 'PDF de factura descargado';
    } catch (err) {
      formError = err instanceof Error ? err.message : 'No se pudo generar el documento';
    } finally {
      pdfBusyId = null;
    }
  }
</script>

<section class="facturas" data-screen="facturas">
  <header class="page-head">
    <div>
      <h1>Facturación</h1>
      <p class="sub">
        Se emite a nombre del <strong>negocio de la sesión</strong>
        {#if issuerName}(<em>{issuerName}</em>){/if}. Elija el punto de venta y el trabajador
        operador. El PDF incluye QR con los datos de la factura.
      </p>
    </div>
    <div class="head-actions">
      <Button variant="secondary" on:click={() => store.load()} disabled={state.status === 'loading'}>
        Actualizar
      </Button>
      <Button on:click={() => (showForm = !showForm)}>
        {showForm ? 'Cancelar' : '+ Nueva factura'}
      </Button>
    </div>
  </header>

  {#if formOk}<p class="banner ok">{formOk}</p>{/if}
  {#if formError}<p class="banner err">{formError}</p>{/if}

  {#if showForm}
    <Card>
      <h2>Nueva factura</h2>
      <form class="form" on:submit={handleSubmit}>
        <div class="form-grid">
          <label class="field field-span">
            <span class="lbl">Negocio emisor</span>
            <input value={issuerName || 'Negocio de la sesión actual'} disabled />
          </label>
          {#if units.length > 0}
            <label class="field">
              <span class="lbl">Punto / unidad de venta</span>
              <select bind:value={unitId} disabled={state.saving}>
                <option value="">— Central / sin punto —</option>
                {#each units as u (u.id)}
                  <option value={u.id}>{u.code ? `${u.code} · ` : ''}{u.name}</option>
                {/each}
              </select>
            </label>
          {/if}
          {#if operators.length > 0}
            <label class="field">
              <span class="lbl">Operador (trabajador)</span>
              <select bind:value={operatorId} disabled={state.saving}>
                <option value="">— Sin especificar —</option>
                {#each operators as e (e.id)}
                  <option value={e.id}>{e.name}{e.role ? ` · ${e.role}` : ''}</option>
                {/each}
              </select>
            </label>
          {:else if payrollStore}
            <p class="hint field-span">
              No hay trabajadores activos. Regístrelos en <strong>Empleados</strong> para marcar el
              operador en la factura.
            </p>
          {/if}
          <label class="field field-span">
            <span class="lbl">Cliente / razón social <span class="req">*</span></span>
            <input bind:value={clientName} placeholder="Nombre del cliente" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">ID fiscal cliente</span>
            <input bind:value={clientTax} placeholder="Opcional" disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Moneda</span>
            <input bind:value={currency} disabled={state.saving} />
          </label>
          <label class="field">
            <span class="lbl">Impuesto %</span>
            <input type="number" min="0" step="any" bind:value={taxPct} disabled={state.saving} />
          </label>
        </div>

        <div class="lines-head">
          <h3>Líneas</h3>
          <Button type="button" variant="secondary" on:click={addLine}>+ Línea</Button>
        </div>
        {#each lines as line, i (i)}
          <div class="line-row">
            <label class="field code">
              <span class="lbl">Código</span>
              <input bind:value={line.code} placeholder="SKU" disabled={state.saving} />
            </label>
            <label class="field grow">
              <span class="lbl">Descripción</span>
              <input bind:value={line.description} placeholder="Concepto" disabled={state.saving} />
            </label>
            <label class="field unit">
              <span class="lbl">UM</span>
              <input bind:value={line.unit} disabled={state.saving} />
            </label>
            <label class="field narrow">
              <span class="lbl">Cant.</span>
              <input type="number" min="0" step="any" bind:value={line.qty} disabled={state.saving} />
            </label>
            <label class="field narrow">
              <span class="lbl">Precio</span>
              <input type="number" min="0" step="any" bind:value={line.unitPrice} disabled={state.saving} />
            </label>
            <button type="button" class="remove" on:click={() => removeLine(i)} disabled={lines.length <= 1}>×</button>
          </div>
        {/each}

        <div class="totals">
          <span>Subtotal: <Money amount={subtotal} {currency} /></span>
          <span>Impuesto: <Money amount={tax} {currency} /></span>
          <strong>Total: <Money amount={total} {currency} /></strong>
        </div>
        <div class="form-actions">
          <Button type="submit" disabled={state.saving}>
            {state.saving ? 'Emitiendo…' : 'Emitir factura'}
          </Button>
        </div>
      </form>
    </Card>
  {/if}

  <Card>
    <h2>Historial ({invoices.length})</h2>
    {#if invoices.length === 0}
      <p class="muted">No hay facturas emitidas.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Emisión</th>
              <th class="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each invoices as inv (inv.id)}
              <tr>
                <td class="mono">{inv.number}</td>
                <td>{inv.clientName}</td>
                <td class="meta">
                  {inv.operatorName || '—'}
                  {#if inv.unitName}<br />{inv.unitName}{/if}
                </td>
                <td class="num"><Money amount={inv.total} currency={inv.currency} /></td>
                <td>
                  <button
                    type="button"
                    class="link"
                    disabled={pdfBusyId === inv.id}
                    on:click={() => handlePdf(inv)}
                  >
                    {pdfBusyId === inv.id ? 'PDF…' : 'Descargar PDF'}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<style>
  .facturas { display: flex; flex-direction: column; gap: 14px; }
  .page-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  .head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  h1 { margin: 0; font-size: 1.25rem; }
  h2 { margin: 0 0 0.5rem; font-size: 0.95rem; }
  h3 { margin: 0; font-size: 0.85rem; }
  .sub, .hint { margin: 4px 0 0; font-size: 0.8rem; color: var(--color-text-muted); max-width: 62ch; }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .field-span { grid-column: 1 / -1; }
  .lbl { font-size: 0.68rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); }
  .req { color: var(--accent-red); }
  .field input, .field select {
    width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 10px;
    border: 1px solid var(--color-border); background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary); font-family: inherit; font-size: 0.88rem; min-height: 34px;
  }
  .lines-head { display: flex; justify-content: space-between; align-items: center; margin: 1rem 0 0.5rem; }
  .line-row {
    display: grid; grid-template-columns: 80px 1fr 56px 70px 84px 28px;
    gap: 8px; align-items: end; margin-bottom: 8px;
  }
  .remove { height: 34px; border-radius: 8px; border: 1px solid var(--color-border); background: transparent; cursor: pointer; }
  .totals { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0; font-size: 0.9rem; }
  .form-actions { margin-top: 8px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th { text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--color-border); }
  td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
  .num { text-align: right; }
  .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
  .meta { font-size: 0.75rem; color: var(--color-text-muted); }
  .link { border: none; background: none; color: var(--accent-cyan); font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.8rem; }
  .muted { color: var(--color-text-muted); font-size: 0.85rem; }
  .banner { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
  .banner.err { background: color-mix(in srgb, var(--accent-red) 12%, transparent); color: var(--accent-red); }
  .banner.ok { background: color-mix(in srgb, var(--accent-green) 12%, transparent); color: var(--accent-green); }
</style>
