<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { AuditState, AuditStore } from '../stores/auditStore';

  export let store: AuditStore;
  export let isMaster = false;

  let state: AuditState = store.getState();
  let search = '';
  let actionFilter = '';
  let since = '';
  let until = '';

  onMount(() => {
    const unsub = store.subscribe((s: AuditState) => {
      state = s;
    });
    void store.loadAll({ limit: 200 });
    if (isMaster) void store.loadSystemErrors();
    return unsub;
  });

  function applyFilters() {
    void store.loadTrail({
      q: search.trim() || undefined,
      action: actionFilter || undefined,
      since: since || undefined,
      until: until || undefined,
      limit: 200,
      offset: 0,
    });
  }

  function clearFilters() {
    search = '';
    actionFilter = '';
    since = '';
    until = '';
    void store.loadTrail({ limit: 200 });
  }

  function formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CU');
  }
</script>

<Card>
  <div class="head">
    <h2>Traza de operaciones</h2>
    <Badge>
      {state.events.length}
      {#if state.total > state.events.length}
        / {state.total}
      {/if}
      eventos
    </Badge>
  </div>

  {#if state.rootCid}
    <p class="muted">CID actual del negocio: <code>{state.rootCid}</code></p>
  {/if}

  <div class="filters">
    <Input
      id="audit-search"
      label="Buscar"
      bind:value={search}
      placeholder="Acción, detalle, usuario o ref"
    />
    <label class="field">
      <span class="lbl">Acción</span>
      <select bind:value={actionFilter}>
        <option value="">Todas</option>
        {#each state.actions || [] as act}
          <option value={act}>{act}</option>
        {/each}
      </select>
    </label>
    <Input id="audit-since" label="Desde" type="date" bind:value={since} />
    <Input id="audit-until" label="Hasta" type="date" bind:value={until} />
    <div class="filter-actions">
      <Button type="button" size="sm" onclick={() => applyFilters()}>Filtrar</Button>
      <Button type="button" size="sm" variant="ghost" onclick={() => clearFilters()}>Limpiar</Button>
    </div>
  </div>

  {#if state.status === 'loading'}
    <p class="muted">Cargando traza…</p>
  {:else if state.status === 'error'}
    <p class="err">{state.error}</p>
    <Button variant="secondary" onclick={() => store.loadAll({ limit: 200 })}>Reintentar</Button>
  {:else if state.events.length === 0}
    <p class="muted">No hay eventos que coincidan.</p>
  {:else}
    <div class="table-wrap ap-scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Acción</th>
            <th>Detalle</th>
            <th>Ref</th>
          </tr>
        </thead>
        <tbody>
          {#each state.events as event (event.id)}
            <tr>
              <td class="nowrap">{formatDate(event.createdAt)}</td>
              <td>{event.username || '—'}</td>
              <td class="nowrap muted-cell">{event.role || '—'}</td>
              <td class="nowrap"><code class="act">{event.action}</code></td>
              <td>{event.detail}</td>
              <td class="nowrap muted-cell">{event.ref || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>

{#if isMaster}
  <Card>
    <h2>Incidencias del sistema</h2>
    {#if state.systemErrors.length === 0}
      <p class="muted">Sin incidencias registradas.</p>
    {:else}
      <div class="table-wrap ap-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {#each state.systemErrors as incident (incident.id)}
              <tr>
                <td class="nowrap">{formatDate(incident.createdAt)}</td>
                <td class="nowrap">{incident.action}</td>
                <td>{incident.detail}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
{/if}

<style>
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .muted {
    color: var(--ap-text-muted);
    font-size: 0.82rem;
    word-break: break-all;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .filters {
    display: grid;
    grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr auto;
    gap: 0.6rem 0.75rem;
    align-items: end;
    margin: 0.75rem 0 1rem;
  }
  @media (max-width: 900px) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .lbl {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ap-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  select {
    width: 100%;
    padding: 0.45rem 0.55rem;
    border-radius: 8px;
    border: 1px solid var(--ap-border);
    background: var(--ap-bg-elevated, var(--color-surface));
    color: var(--ap-text);
    font-size: 0.85rem;
  }
  .filter-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .table-wrap {
    overflow-x: auto;
    max-height: min(60vh, 520px);
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
    position: sticky;
    top: 0;
    background: var(--ap-bg-elevated, var(--color-surface));
    z-index: 1;
  }
  td {
    padding: 0.55rem 0.6rem;
    border-bottom: 1px solid var(--ap-border);
    color: var(--ap-text-secondary);
  }
  .nowrap {
    white-space: nowrap;
  }
  .muted-cell {
    color: var(--ap-text-muted);
    font-size: 0.8rem;
  }
  .act {
    font-size: 0.78rem;
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 12%, transparent);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }
</style>
