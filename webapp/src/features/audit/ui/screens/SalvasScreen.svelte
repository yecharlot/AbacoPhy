<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { AuditState, AuditStore } from '../stores/auditStore';

  export let store: AuditStore;

  let state: AuditState = store.getState();
  let label = '';
  let restoreCid = '';
  let notice = '';

  onMount(() => {
    const unsub = store.subscribe((s: AuditState) => {
      state = s;
    });
    void store.loadAll();
    return unsub;
  });

  function formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CU');
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    notice = '';
    try {
      await store.saveBackup(label);
      label = '';
      notice = 'Salva creada correctamente.';
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleRestore(cid: string) {
    notice = '';
    if (!confirm('Restaurar esta salva sustituye el estado actual del negocio. ¿Continuar?')) return;
    try {
      await store.restore(cid);
      restoreCid = '';
      notice = 'Salva restaurada.';
    } catch {
      /* error en el estado del store */
    }
  }

  async function handleExport() {
    notice = '';
    try {
      const blob = await store.exportBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'abacophy-salva.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notice = 'Descarga iniciada.';
    } catch {
      /* error en el estado del store */
    }
  }
</script>

<Card>
  <div class="head">
    <h2>Salvas del negocio</h2>
    <Badge>rev {state.rev}</Badge>
  </div>

  {#if state.currentCid}
    <p class="muted">CID actual: <code>{state.currentCid}</code></p>
  {/if}

  <form on:submit={handleCreate}>
    <Input id="backup-label" label="Etiqueta de la salva" bind:value={label} placeholder="Cierre de mes" />
    <div class="actions">
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Trabajando…' : 'Crear salva'}
      </Button>
      <Button variant="secondary" disabled={state.saving} on:click={handleExport}>
        Exportar a disco (ZIP)
      </Button>
    </div>
  </form>

  {#if notice}
    <p class="ok">{notice}</p>
  {/if}
  {#if state.error}
    <p class="err">{state.error}</p>
  {/if}
</Card>

<Card>
  <h2>Restaurar por CID</h2>
  <Input id="restore-cid" label="CID de la salva" bind:value={restoreCid} placeholder="bafy…" />
  <Button variant="danger" disabled={state.saving || !restoreCid.trim()} on:click={() => handleRestore(restoreCid)}>
    Restaurar
  </Button>
</Card>

<Card>
  <h2>Salvas registradas</h2>
  {#if state.backups.length === 0}
    <p class="muted">Todavía no hay salvas guardadas.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Etiqueta</th>
            <th class="num">Rev</th>
            <th>Usuario</th>
            <th>CID</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each state.backups as backup (backup.cid + backup.createdAt)}
            <tr>
              <td class="nowrap">{formatDate(backup.createdAt)}</td>
              <td>{backup.label || '—'}</td>
              <td class="num">{backup.rev}</td>
              <td>{backup.username || '—'}</td>
              <td class="cid">{backup.cid}</td>
              <td>
                <Button variant="ghost" size="sm" disabled={state.saving} on:click={() => handleRestore(backup.cid)}>
                  Restaurar
                </Button>
              </td>
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
  .ok {
    color: var(--ap-ok);
    font-size: 0.82rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
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
  .nowrap {
    white-space: nowrap;
  }
  .cid {
    font-size: 0.72rem;
    word-break: break-all;
    max-width: 220px;
  }
</style>
