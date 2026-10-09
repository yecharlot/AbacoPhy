<script lang="ts">
  import { onMount } from 'svelte';
  import { exportAccountsCsv, exportAccountsPdf } from '../export/accountingReportsExport';
  import { Button, Card, EmptyState, Input, Money } from '../../../../infrastructure/ui/shared';
  import type { AccountingStore, AccountingState } from '../stores/accountingStore';
  import type { AccountType } from '../../domain/entities/Account';
  import { typeLabel } from '../viewmodels/entryList';

  export let store: AccountingStore;

  let state: AccountingState = store.getState();
  let searchQ = '';
  let typeFilter: 'all' | AccountType = 'all';
  let sortBy: 'code' | 'name' | 'balance_desc' | 'balance_asc' = 'code';

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.loadAccounts();
    return unsub;
  });

  $: filtered = (() => {
    const q = searchQ.trim().toLowerCase();
    let list = state.accounts.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${a.code} ${a.name} ${a.type}`.toLowerCase();
      return hay.includes(q);
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'balance_desc':
          return (b.balance || 0) - (a.balance || 0);
        case 'balance_asc':
          return (a.balance || 0) - (b.balance || 0);
        case 'code':
        default:
          return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
      }
    });
    return list;
  })();

  $: byType = {
    asset: state.accounts.filter((a) => a.type === 'asset').length,
    liability: state.accounts.filter((a) => a.type === 'liability').length,
    equity: state.accounts.filter((a) => a.type === 'equity').length,
    income: state.accounts.filter((a) => a.type === 'income').length,
    expense: state.accounts.filter((a) => a.type === 'expense').length,
  };

  $: sumAbs = filtered.reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  $: currency = state.accounts.find((a) => a.currency)?.currency || '';
</script>

<section class="acc-page">
  <div class="stats-rail">
    <div class="stat-chip" title="Total de cuentas en el plan">
      <span class="stat-ico" aria-hidden="true">📒</span>
      <div>
        <p class="stat-val">{state.accounts.length}</p>
        <p class="stat-lbl">Cuentas</p>
      </div>
    </div>
    <div class="stat-chip" title="Activos">
      <div>
        <p class="stat-val">{byType.asset}</p>
        <p class="stat-lbl">Activo</p>
      </div>
    </div>
    <div class="stat-chip" title="Pasivos">
      <div>
        <p class="stat-val">{byType.liability}</p>
        <p class="stat-lbl">Pasivo</p>
      </div>
    </div>
    <div class="stat-chip" title="Patrimonio">
      <div>
        <p class="stat-val">{byType.equity}</p>
        <p class="stat-lbl">Patrimonio</p>
      </div>
    </div>
    <div class="stat-chip" title="Ingresos + gastos">
      <div>
        <p class="stat-val">{byType.income + byType.expense}</p>
        <p class="stat-lbl">Ing. / Gasto</p>
      </div>
    </div>
  </div>

  <div class="list-toolbar">
    <div class="field" style="display:flex;gap:0.4rem;align-items:flex-end">
      <Button type="button" variant="secondary" size="sm" disabled={filtered.length === 0}
        onclick={() => exportAccountsCsv(filtered)}>CSV</Button>
      <Button type="button" variant="secondary" size="sm" disabled={filtered.length === 0}
        onclick={() => { try { exportAccountsPdf(filtered); } catch (e) { /* popup */ } }}>PDF</Button>
    </div>

    <Input id="acc-search" label="Buscar" bind:value={searchQ} placeholder="Código o nombre…" />
    <div class="field">
      <label class="lbl" for="acc-type">Tipo</label>
      <select id="acc-type" class="sel" bind:value={typeFilter}>
        <option value="all">Todos</option>
        <option value="asset">Activo</option>
        <option value="liability">Pasivo</option>
        <option value="equity">Patrimonio</option>
        <option value="income">Ingreso</option>
        <option value="expense">Gasto</option>
      </select>
    </div>
    <div class="field">
      <label class="lbl" for="acc-sort">Orden</label>
      <select id="acc-sort" class="sel" bind:value={sortBy}>
        <option value="code">Código</option>
        <option value="name">Nombre</option>
        <option value="balance_desc">Mayor saldo</option>
        <option value="balance_asc">Menor saldo</option>
      </select>
    </div>
    <div class="toolbar-actions">
      <Button type="button" variant="secondary" onclick={() => store.loadAccounts()} disabled={state.status === 'loading'}
        >Actualizar</Button
      >
    </div>
  </div>

  {#if state.status === 'loading' && state.accounts.length === 0}
    <Card><p class="muted">Cargando plan de cuentas…</p></Card>
  {:else if state.status === 'error' && state.accounts.length === 0}
    <Card>
      <p class="err" role="alert">{state.error}</p>
      <Button type="button" variant="secondary" onclick={() => store.loadAccounts()}>Reintentar</Button>
    </Card>
  {:else if filtered.length === 0}
    <EmptyState
      icon="accounts"
      title={state.accounts.length === 0 ? 'Sin plan de cuentas' : 'Sin coincidencias'}
      description={state.accounts.length === 0
        ? 'Las cuentas se generan con el bootstrap del negocio o desde el backend.'
        : 'Pruebe otro tipo o limpie la búsqueda.'}
      actionLabel={state.accounts.length === 0 ? undefined : 'Limpiar filtros'}
      onAction={state.accounts.length === 0
        ? undefined
        : () => {
            searchQ = '';
            typeFilter = 'all';
          }}
    />
  {:else}
    <div class="list-scroll">
      <ul class="acc-list">
        {#each filtered as a (a.id)}
          <li class="acc-card">
            <div class="acc-main">
              <span class="code">{a.code}</span>
              <strong>{a.name}</strong>
              <span class="type-badge">{typeLabel(a.type)}</span>
            </div>
            <div class="acc-bal">
              <Money amount={a.balance} currency={a.currency || currency} />
            </div>
          </li>
        {/each}
      </ul>
      <p class="foot muted">
        {filtered.length} cuenta{filtered.length === 1 ? '' : 's'}
        {#if searchQ || typeFilter !== 'all'}
          · filtradas de {state.accounts.length}
        {/if}
      </p>
    </div>
  {/if}
</section>

<style>
  .acc-page {
    display: flex;
    flex-direction: column;
    gap: var(--dashboard-gap, 12px);
    min-height: 0;
  }
  .stats-rail {
    display: flex;
    gap: 0.65rem;
    overflow-x: auto;
  }
  .stat-chip {
    flex: 1 0 auto;
    min-width: 100px;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .stat-val {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
  }
  .stat-lbl {
    margin: 0.05rem 0 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ap-text-muted);
  }
  .list-toolbar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
    align-items: end;
  }
  @media (min-width: 720px) {
    .list-toolbar {
      grid-template-columns: 1.4fr 1fr 1fr auto;
    }
  }
  .toolbar-actions {
    display: flex;
    align-items: end;
    padding-bottom: 0.15rem;
  }
  .field {
    min-width: 0;
  }
  .lbl {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ap-text-secondary);
    margin-bottom: 0.25rem;
  }
  .sel {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated);
    color: var(--ap-text);
    font-family: inherit;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger, #e85d5d);
  }
  .empty {
    padding: 1.25rem 0.5rem;
    text-align: center;
  }
  .empty-title {
    margin: 0 0 0.35rem;
    font-weight: 700;
  }
  .list-scroll {
    max-height: var(--scroll-panel-xl);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .acc-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .acc-card {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, var(--color-surface));
  }
  .acc-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.55rem;
    min-width: 0;
  }
  .code {
    font-family: ui-monospace, monospace;
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--ap-text-muted);
  }
  .type-badge {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.12rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 14%, transparent);
  }
  .acc-bal {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .foot {
    margin: 0.65rem 0 0;
  }
</style>
