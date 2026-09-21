<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Button } from '../../../../infrastructure/ui/shared';
  import type { SyncStore, SyncState } from '../stores/syncStore';

  export let store: SyncStore;

  let state: SyncState = store.getState();

  onMount(() => {
    const unsub = store.subscribe((s) => {
      state = s;
    });
    void store.bootstrap();
    return unsub;
  });
</script>

<Card>
  <h2 style="margin-top:0">Sincronización</h2>
  <p class="muted">
    Cola offline local. Al recuperar red, empuja operaciones pendientes a
    <code>POST /sync/push</code>.
  </p>

  <div class="stats">
    <div>
      <span class="lbl">Estado red</span>
      <strong>{state.online ? 'En línea' : 'Sin conexión'}</strong>
    </div>
    <div>
      <span class="lbl">Pendientes</span>
      <strong>{state.pendingCount}</strong>
    </div>
    <div>
      <span class="lbl">Última rev</span>
      <strong>{state.lastRev ?? '—'}</strong>
    </div>
  </div>

  {#if state.error}
    <p class="err" role="alert">{state.error}</p>
  {/if}
  {#if state.message}
    <p class="ok">{state.message}</p>
  {/if}

  <div class="actions">
    <Button
      disabled={!state.online || state.status === 'syncing'}
      on:click={() => store.push()}
    >
      {state.status === 'syncing' ? 'Sincronizando…' : 'Empujar cola'}
    </Button>
    <Button
      variant="secondary"
      disabled={!state.online || state.status === 'syncing'}
      on:click={() => store.pull()}
    >
      Descargar snapshot
    </Button>
    <Button variant="secondary" on:click={() => store.refresh()}>Actualizar lista</Button>
  </div>
</Card>

{#if state.pending.length > 0}
  <Card>
    <h3 style="margin-top:0">Cola local</h3>
    <ul class="list">
      {#each state.pending as op (op.id)}
        <li>
          <span class="kind">{op.kind}</span>
          <span class="meta">{op.createdAt}</span>
          <code class="id">{op.id.slice(0, 8)}</code>
        </li>
      {/each}
    </ul>
  </Card>
{/if}

<style>
  .muted {
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.88rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }
  .lbl {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted, var(--ap-text-muted));
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .err {
    color: var(--accent-red, var(--ap-danger));
    font-size: 0.88rem;
  }
  .ok {
    color: var(--accent-green, var(--ap-ok));
    font-size: 0.88rem;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .list li {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--color-border, var(--ap-border));
    font-size: 0.85rem;
  }
  .kind {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.7rem;
    color: var(--accent-cyan, var(--ap-primary));
  }
  .meta {
    color: var(--color-text-muted, var(--ap-text-muted));
    flex: 1;
  }
  .id {
    font-size: 0.75rem;
    opacity: 0.7;
  }
</style>
