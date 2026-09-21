<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input, Money } from '../../../../infrastructure/ui/shared';
  import {
    BarChart,
    DonutChart,
    PanelCard,
    StatCard,
    type ChartPoint,
  } from '../../../../infrastructure/ui/charts';
  import type { CommerceState, CommerceStore } from '../stores/commerceStore';
  import {
    orderedAmountByStatus,
    ordersByStatus,
    topRequestedProducts,
  } from '../viewmodels/commerceCharts';
  import {
    ORDER_STATUSES,
    orderStatusLabel,
    type CreateOnlineOrderLineInput,
    type OrderStatus,
  } from '../../domain/entities/OnlineOrder';

  export let store: CommerceStore;

  type DraftLine = {
    productId: string;
    qty: string;
    unitPrice: string;
  };

  let state: CommerceState = store.getState();

  let customer = '';
  let phone = '';
  let address = '';
  let notes = '';
  let lines: DraftLine[] = [{ productId: '', qty: '1', unitPrice: '' }];
  let formError = '';
  let filter: 'all' | OrderStatus = 'all';

  onMount(() => {
    const unsub = store.subscribe((s: CommerceState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function priceOf(productId: string): number {
    return state.products.find((p) => p.id === productId)?.priceSale ?? 0;
  }

  let statusCount: ChartPoint[] = [];
  let statusAmount: ChartPoint[] = [];
  let requested: ChartPoint[] = [];

  $: statusCount = ordersByStatus(state.orders);
  $: statusAmount = orderedAmountByStatus(state.orders);
  $: requested = topRequestedProducts(state.orders);
  $: pipelineTotal = state.orders.reduce((acc, order) => acc + order.total, 0);
  $: pendingTotal = state.orders
    .filter((order) => order.status === 'pending')
    .reduce((acc, order) => acc + order.total, 0);
  $: orderCurrency = state.orders.length > 0 ? state.orders[0].currency : '';

  $: visibleOrders =
    filter === 'all' ? state.orders : state.orders.filter((order) => order.status === filter);

  $: estimated = lines.reduce((acc, line) => {
    const price = parseFloat(line.unitPrice) || priceOf(line.productId);
    return acc + (parseFloat(line.qty) || 0) * price;
  }, 0);

  function addLine() {
    lines = [...lines, { productId: '', qty: '1', unitPrice: '' }];
  }

  function removeLine(index: number) {
    lines = lines.filter((_, i) => i !== index);
    if (lines.length === 0) addLine();
  }

  function toneFor(status: string): 'ok' | 'off' | 'default' {
    if (status === 'delivered') return 'ok';
    if (status === 'cancelled') return 'off';
    return 'default';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    formError = '';

    if (!customer.trim()) {
      formError = 'Indique el nombre del cliente';
      return;
    }

    const payload: CreateOnlineOrderLineInput[] = lines
      .filter((line) => line.productId !== '')
      .map((line) => ({
        productId: line.productId,
        qty: parseFloat(line.qty) || 0,
        unitPrice: line.unitPrice === '' ? undefined : parseFloat(line.unitPrice),
      }));

    if (payload.length === 0) {
      formError = 'Seleccione al menos un producto';
      return;
    }

    try {
      await store.addOrder({
        customer: customer.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: payload,
      });
      customer = '';
      phone = '';
      address = '';
      notes = '';
      lines = [{ productId: '', qty: '1', unitPrice: '' }];
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleStatus(id: string, status: OrderStatus) {
    try {
      await store.changeStatus(id, status);
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<section class="analytics">
  <div class="stats">
    <StatCard
      variant="hero"
      label="Importe total pedido"
      amount={pipelineTotal}
      currency={orderCurrency}
      caption={`${state.orders.length} pedidos recibidos`}
    />
    <StatCard
      label="Pendiente de confirmar"
      amount={pendingTotal}
      currency={orderCurrency}
      caption="Pedidos en estado pendiente"
    />
  </div>

  <div class="charts">
    <PanelCard title="Pedidos por estado" subtitle="Cantidad de pedidos" tag="Estado">
      <DonutChart points={statusCount} centerLabel="Pedidos" />
    </PanelCard>
    <PanelCard title="Importe por estado" subtitle="Dinero comprometido en cada etapa" tag="Importe">
      <BarChart points={statusAmount} height={170} highlightLast={false} />
    </PanelCard>
  </div>

  {#if requested.length > 0}
    <PanelCard title="Productos más pedidos" subtitle="Importe solicitado por producto" tag="Top 6">
      <BarChart points={requested} height={160} highlightLast={false} />
    </PanelCard>
  {/if}
</section>

<Card>
  <h2>Nuevo pedido online</h2>
  <form on:submit={handleSubmit}>
    <div class="grid">
      <Input id="ord-customer" label="Cliente" bind:value={customer} placeholder="Nombre y apellidos" />
      <Input id="ord-phone" label="Teléfono" bind:value={phone} placeholder="Opcional" />
      <Input id="ord-address" label="Dirección de entrega" bind:value={address} placeholder="Opcional" />
      <Input id="ord-notes" label="Notas" bind:value={notes} placeholder="Opcional" />
    </div>

    {#each lines as line, index (index)}
      <div class="line">
        <div class="field">
          <label class="lbl" for={`ord-prod-${index}`}>Producto</label>
          <select id={`ord-prod-${index}`} class="sel" bind:value={line.productId}>
            <option value="">Seleccione producto</option>
            {#each state.products as product (product.id)}
              <option value={product.id}>{product.code} · {product.name}</option>
            {/each}
          </select>
        </div>
        <Input id={`ord-qty-${index}`} label="Cantidad" type="number" step="0.01" bind:value={line.qty} placeholder="1" />
        <Input
          id={`ord-price-${index}`}
          label="Precio"
          type="number"
          step="0.01"
          bind:value={line.unitPrice}
          placeholder={priceOf(line.productId).toFixed(2)}
        />
        <button type="button" class="drop" aria-label="Quitar línea" on:click={() => removeLine(index)}>✕</button>
      </div>
    {/each}

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
        {state.saving ? 'Guardando…' : 'Registrar pedido'}
      </Button>
    </div>
  </form>
</Card>

<Card>
  <div class="head">
    <h2>Pedidos recibidos</h2>
    <div class="field filter">
      <label class="lbl" for="ord-filter">Filtrar por estado</label>
      <select id="ord-filter" class="sel" bind:value={filter}>
        <option value="all">Todos</option>
        {#each ORDER_STATUSES as status (status)}
          <option value={status}>{orderStatusLabel(status)}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if visibleOrders.length === 0}
    <p class="muted">No hay pedidos para este filtro.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Contacto</th>
            <th class="num">Líneas</th>
            <th class="num">Total</th>
            <th>Estado</th>
            <th>Cambiar a</th>
          </tr>
        </thead>
        <tbody>
          {#each visibleOrders as order (order.id)}
            <tr>
              <td>{order.number}</td>
              <td>{order.customer}</td>
              <td>{order.phone || '—'}</td>
              <td class="num">{order.lines.length}</td>
              <td class="num"><Money amount={order.total} currency={order.currency} /></td>
              <td><Badge tone={toneFor(order.status)}>{orderStatusLabel(order.status)}</Badge></td>
              <td>
                <div class="btns">
                  {#each ORDER_STATUSES as status (status)}
                    {#if status !== order.status}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={state.saving}
                        on:click={() => handleStatus(order.id, status)}
                      >
                        {orderStatusLabel(status)}
                      </Button>
                    {/if}
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

<style>
  .analytics {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    margin-bottom: var(--dashboard-gap, 12px);
  }
  .stats,
  .charts {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dashboard-gap, 12px);
  }
  @media (min-width: 900px) {
    .stats { grid-template-columns: 1.4fr 1fr; }
    .charts { grid-template-columns: 1fr 1.2fr; }
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .filter {
    min-width: 190px;
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
  .btns {
    display: flex;
    gap: 0.3rem;
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
  @media (max-width: 760px) {
    .line {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
