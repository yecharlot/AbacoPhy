<script lang="ts">
  import { onMount } from 'svelte';
  import { Badge, Button, Card, Input } from '../../../../infrastructure/ui/shared';
  import type { AuditState, AuditStore } from '../stores/auditStore';

  export let store: AuditStore;

  let state: AuditState = store.getState();
  let label = '';
  let restoreCid = '';
  let notice = '';
  let fileInput: HTMLInputElement | null = null;

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
      /* error en store */
    }
  }

  async function handleRestoreCid(cid: string) {
    notice = '';
    if (!confirm('Restaurar esta salva sustituye el estado actual del negocio. ¿Continuar?')) return;
    try {
      await store.restore(cid);
      restoreCid = '';
      notice = 'Salva restaurada. Integridad verificada en el servidor.';
    } catch {
      /* error en store */
    }
  }

    async function handleExport() {
    notice = '';
    console.info('[Abaco.Salvas.UI] click Exportar a disco');
    try {
      const blob = await store.exportBackup();
      console.info('[Abaco.Salvas.UI] blob recibido', { size: blob?.size, type: blob?.type });
      if (!blob || blob.size < 32) {
        throw new Error(`ZIP inválido (size=${blob?.size ?? 0})`);
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `abacophy-salva-rev${state.rev || 'x'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notice = `Descarga iniciada (${Math.round(blob.size / 1024)} KB).`;
      console.info('[Abaco.Salvas.UI] descarga disparada', notice);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Abaco.Salvas.UI] export FAIL', e);
      notice = '';
      // state.error ya lo pone el store; refuerzo visible
      if (!state.error) {
        // el store debería haber seteado error; si no, forzar lectura
        console.warn('[Abaco.Salvas.UI] store no dejó error; mensaje local:', msg);
      }
    }
  }


  function openFilePicker() {
    fileInput?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    notice = '';
    if (!confirm(`Restaurar desde «${file.name}» sustituye el estado actual del negocio. ¿Continuar?`)) {
      return;
    }
    try {
      await store.importBackup(file);
      notice = `Restauración desde disco completada (${file.name}).`;
    } catch {
      /* error en store */
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

  <form onsubmit={handleCreate}>
    <Input id="backup-label" label="Etiqueta de la salva" bind:value={label} placeholder="Cierre de mes" />
    <div class="actions">
      <Button type="submit" disabled={state.saving}>
        {state.saving ? 'Trabajando…' : 'Crear salva'}
      </Button>
      <Button type="button" variant="secondary" disabled={state.saving} onclick={() => handleExport()}>
        Exportar a disco (ZIP)
      </Button>
      <Button type="button" variant="secondary" disabled={state.saving} onclick={() => openFilePicker()}>
        Restaurar desde disco
      </Button>
      <input
        bind:this={fileInput}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        class="file-hidden"
        onchange={handleFileChange}
      />
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
  <p class="muted">Usa una salva ya registrada en el servidor (mismo negocio).</p>
  <Input id="restore-cid" label="CID de la salva" bind:value={restoreCid} placeholder="bafkrei…" />
  <Button
    type="button"
    variant="danger"
    disabled={state.saving || !restoreCid.trim()}
    onclick={() => handleRestoreCid(restoreCid)}
  >
    Restaurar por CID
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
            <th>SHA</th>
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
              <td class="nowrap muted">
                <code>{backup.contentSha ? backup.contentSha.slice(0, 12) : '—'}</code>
              </td>
              <td class="nowrap"><code class="cid">{backup.cid.slice(0, 16)}…</code></td>
              <td>
                <Button type="button" size="sm" variant="ghost" onclick={() => handleRestoreCid(backup.cid)}>
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
    color: var(--ap-success, #3ecf8e);
    font-size: 0.85rem;
  }
  .err {
    color: var(--ap-danger);
    font-size: 0.82rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .file-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .table-wrap {
    overflow-x: auto;
    max-height: min(50vh, 420px);
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
    font-size: 0.75rem;
  }
</style>
