<script lang="ts">
  /**
   * Botón DEV: vaciar / reiniciar datos vía POST /master/reset.
   * Requiere sesión master y confirmación "REINICIAR".
   */
  import { isDevSeedEnabled } from './isDev';
  import { RESET_CONFIRMATION } from './resetPlatform';

  interface Props {
    title?: string;
    description?: string;
    /** Ejecuta el reset (debe llamar a la API real). */
    onReset: () => Promise<string | void>;
    /** Tras éxito (p. ej. recargar stores o window.location.reload). */
    onDone?: () => void;
  }

  let {
    title = 'Limpiar base de datos (DEV)',
    description = 'Elimina datos cargados (seeds, asientos, stock de prueba) y restaura el estado inicial. Solo desarrollo. Login master o admin.',
    onReset,
    onDone,
  }: Props = $props();

  const enabled = isDevSeedEnabled();

  let open = $state(true);
  let confirmText = $state('');
  let busy = $state(false);
  let error = $state('');
  let log = $state('');

  async function run() {
    error = '';
    log = '';
    if (confirmText.trim() !== RESET_CONFIRMATION) {
      error = `Escribe exactamente ${RESET_CONFIRMATION} para confirmar`;
      return;
    }
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        '¿Reiniciar la plataforma? Se perderán los datos de prueba cargados.',
      )
    ) {
      return;
    }
    busy = true;
    try {
      const msg = await onReset();
      log = typeof msg === 'string' && msg ? msg : 'Reinicio completado';
      confirmText = '';
      onDone?.();
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : 'No se pudo resetear (¿sesión master?)';
    } finally {
      busy = false;
    }
  }
</script>

{#if enabled}
  <section class="reset" data-dev-reset>
    <button type="button" class="toggle" onclick={() => (open = !open)}>
      <span class="badge">DEV</span>
      <span class="title">{title}</span>
      <span class="chev">{open ? '▾' : '▸'}</span>
    </button>

    {#if open}
      <div class="body">
        <p class="desc">{description}</p>
        <label class="lbl" for="dev-reset-confirm">
          Confirmar escribiendo <code>{RESET_CONFIRMATION}</code>
        </label>
        <input
          id="dev-reset-confirm"
          type="text"
          bind:value={confirmText}
          placeholder={RESET_CONFIRMATION}
          autocomplete="off"
          spellcheck="false"
        />
        <div class="actions">
          <button
            type="button"
            class="btn danger"
            onclick={run}
            disabled={busy || confirmText.trim() !== RESET_CONFIRMATION}
          >
            {busy ? 'Reiniciando…' : 'Vaciar / reiniciar datos'}
          </button>
        </div>
        {#if error}
          <p class="err" role="alert">{error}</p>
        {/if}
        {#if log}
          <p class="ok" role="status">{log}</p>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .reset {
    margin: 0 0 16px;
    border: 1px dashed color-mix(in srgb, var(--accent-red, #f17b7b) 45%, var(--color-border));
    border-radius: var(--radius-md, 16px);
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 7%, transparent);
    overflow: hidden;
  }
  .toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .badge {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 3px 7px;
    border-radius: 6px;
    background: var(--accent-red, #f17b7b);
    color: #1a0505;
  }
  .title {
    flex: 1;
  }
  .chev {
    opacity: 0.6;
  }
  .body {
    padding: 0 14px 14px;
  }
  .desc {
    margin: 0 0 10px;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }
  .lbl {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 6px;
  }
  code {
    font-size: 0.75rem;
    color: var(--accent-red, #f17b7b);
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-bg, #050812);
    color: var(--color-text-primary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85rem;
  }
  .actions {
    margin-top: 10px;
  }
  .btn {
    border-radius: 999px;
    padding: 9px 16px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.danger {
    background: color-mix(in srgb, var(--accent-red, #f17b7b) 85%, #000);
    color: #fff;
  }
  .err {
    margin: 10px 0 0;
    color: var(--accent-red, #f17b7b);
    font-size: 0.8rem;
  }
  .ok {
    margin: 10px 0 0;
    color: var(--accent-green, #b7f56a);
    font-size: 0.8rem;
  }
</style>
