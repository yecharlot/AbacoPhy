<script lang="ts">
  /**
   * Panel de carga masiva JSON — solo desarrollo.
   * Cada feature pasa un ejemplo y un handler que llama a la API.
   */
  import { isDevSeedEnabled } from './isDev';

  interface Props {
    title?: string;
    description?: string;
    /** JSON de ejemplo (objeto o array). */
    sample: unknown;
    /** Ejecuta la carga; recibe el valor parseado del textarea. */
    onSeed: (data: unknown) => Promise<{ ok: number; fail: number; message?: string }>;
    /** Placeholder del textarea. */
    hint?: string;
  }

  let {
    title = 'Seed (solo desarrollo)',
    description = 'Pega JSON y carga datos reales vía API. No disponible en producción.',
    sample,
    onSeed,
    hint = 'Array o objeto JSON…',
  }: Props = $props();

  const enabled = isDevSeedEnabled();

  let open = $state(false);
  let text = $state('');
  let busy = $state(false);
  let log = $state('');
  let error = $state('');

  $effect(() => {
    if (enabled && !text) {
      text = JSON.stringify(sample, null, 2);
    }
  });

  function resetSample() {
    text = JSON.stringify(sample, null, 2);
    error = '';
    log = '';
  }

  async function run() {
    error = '';
    log = '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      error = e instanceof Error ? e.message : 'JSON inválido';
      return;
    }
    busy = true;
    try {
      const result = await onSeed(parsed);
      log = result.message ?? `OK: ${result.ok} · fallos: ${result.fail}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }
</script>

{#if enabled}
  <div class="seed" data-dev-seed>
    <button type="button" class="seed-toggle" onclick={() => (open = !open)}>
      <span class="badge">DEV</span>
      {title}
      <span class="chev">{open ? '▾' : '▸'}</span>
    </button>

    {#if open}
      <div class="seed-body">
        <p class="desc">{description}</p>
        <textarea rows="12" bind:value={text} {hint} spellcheck="false"></textarea>
        <div class="actions">
          <button type="button" class="btn secondary" onclick={resetSample} disabled={busy}>
            Restaurar ejemplo
          </button>
          <button type="button" class="btn primary" onclick={run} disabled={busy}>
            {busy ? 'Cargando…' : 'Cargar en API'}
          </button>
        </div>
        {#if error}
          <p class="err">{error}</p>
        {/if}
        {#if log}
          <p class="ok">{log}</p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .seed {
    margin: 12px 0 16px;
    border: 1px dashed color-mix(in srgb, var(--accent-yellow, #ffe35a) 45%, var(--color-border));
    border-radius: var(--radius-md, 16px);
    background: color-mix(in srgb, var(--accent-yellow, #ffe35a) 6%, transparent);
    overflow: hidden;
  }
  .seed-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }
  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--accent-yellow, #ffe35a);
    color: #1a1500;
  }
  .chev {
    margin-left: auto;
    opacity: 0.7;
  }
  .seed-body {
    padding: 0 14px 14px;
  }
  .desc {
    margin: 0 0 8px;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem;
    line-height: 1.4;
    padding: 10px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    resize: vertical;
    min-height: 160px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .btn {
    border-radius: var(--radius-pill, 999px);
    padding: 8px 14px;
    font-size: 0.78rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid var(--color-border);
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn.secondary {
    background: transparent;
    color: var(--color-text-secondary);
  }
  .btn.primary {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
    border-color: transparent;
  }
  .err {
    margin: 8px 0 0;
    color: var(--accent-red, #f17b7b);
    font-size: 0.78rem;
  }
  .ok {
    margin: 8px 0 0;
    color: var(--accent-green, #b7f56a);
    font-size: 0.78rem;
  }
</style>
