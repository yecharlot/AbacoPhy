<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { AuditState, AuditStore } from '../stores/auditStore';

  export let store: AuditStore;
  export let isMaster = false;

  let state: AuditState = store.getState();
  let search = '';

  onMount(() => {
    const unsub = store.subscribe((s: AuditState) => {
      state = s;
    });
    void store.loadAll();
    if (isMaster) void store.loadSystemErrors();
    return unsub;
  });

  $: filtered = search.trim()
    ? state.events.filter((event) => {
        const needle = search.trim().toLowerCase();
        return (
          event.action.toLowerCase().includes(needle) ||
          event.detail.toLowerCase().includes(needle) ||
          event.username.toLowerCase().includes(needle)
        );
      })
    : state.events;

  function formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CU');
  }
</script>

<Card>
  <div class="head">
    <h2>Traza de operaciones</h2>
    <Badge>{state.events.length} eventos</Badge>
  </div>

  {#if state.rootCid}
    <p class="muted">CID actual del negocio: <code>{state.rootCid}</code></p>
  {/if}

  <Input id="audit-search" label="Buscar" bind:value={search} placeholder="Acción, detalle o usuario" />

  {#if state.status === 'loading'}
    <p class="muted">Cargando traza…</p>
  {:else if state.status === 'error'}
    <p class="err">{state.error}</p>
    <Button variant="secondary" on:click={() => store.loadAll()}>Reintentar</Button>
  {:else if filtered.length === 0}
    <p class="muted">No hay eventos que coincidan.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as event (event.id)}
            <tr>
              <td class="nowrap">{formatDate(event.createdAt)}</td>
              <td>{event.username || '—'}</td>
              <td class="nowrap">{event.action}</td>
              <td>{event.detail}</td>
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
      <div class="table-wrap">
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
  .nowrap {
    white-space: nowrap;
  }
</style>
