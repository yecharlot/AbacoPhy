<script lang="ts">
  import { isDevSeedEnabled } from './isDev';

  interface Props {
    title?: string;
    description?: string;
    sample: unknown;
    onSeed: (data: unknown) => Promise<{ ok: number; fail: number; message?: string }>;
  }

  let {
    title = 'Carga masiva (desarrollo)',
    description = 'Edita el JSON y pulsa Cargar. Se envía a la API real (POST). Solo en entorno de prueba.',
    sample,
    onSeed,
  }: Props = $props();

  const enabled = isDevSeedEnabled();

  let open = $state(true);
  let busy = $state(false);
  let log = $state('');
  let error = $state('');

  // Texto del textarea derivado del sample (evita state_referenced_locally)
  let text = $state('');
  $effect(() => {
    text = JSON.stringify(sample, null, 2);
  });

  const placeholder = `{\n  "entries": [\n    {\n      "type": "income",\n      "amount": 1500,\n      "concept": "Ejemplo venta",\n      "date": "2026-09-20",\n      "currency": "CUP"\n    }\n  ]\n}`;

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
      error = e instanceof Error ? `JSON inválido: ${e.message}` : 'JSON inválido';
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
  <section class="seed" data-dev-seed aria-label={title}>
    <header class="seed-head">
      <button type="button" class="seed-toggle" onclick={() => (open = !open)}>
        <span class="badge">DEV</span>
        <span class="title">{title}</span>
        <span class="chev">{open ? '▾' : '▸'}</span>
      </button>
    </header>

    {#if open}
      <div class="seed-body">
        <p class="desc">{description}</p>
        <label class="lbl" for="dev-seed-json">JSON a cargar</label>
        <textarea
          id="dev-seed-json"
          rows="14"
          bind:value={text}
          placeholder={placeholder}
          spellcheck="false"
        ></textarea>
        <div class="actions">
          <button type="button" class="btn secondary" onclick={resetSample} disabled={busy}>
            Restaurar ejemplo
          </button>
          <button type="button" class="btn primary" onclick={run} disabled={busy}>
            {busy ? 'Cargando…' : 'Cargar en API'}
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
  .seed {
    margin: 0 0 16px;
    border: 1px dashed color-mix(in srgb, var(--accent-yellow, #ffe35a) 50%, var(--color-border));
    border-radius: var(--radius-md, 16px);
    background: color-mix(in srgb, var(--accent-yellow, #ffe35a) 8%, var(--color-surface, transparent));
    overflow: hidden;
  }
  .seed-toggle {
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
    background: var(--accent-yellow, #ffe35a);
    color: #1a1500;
  }
  .title {
    flex: 1;
  }
  .chev {
    opacity: 0.6;
  }
  .seed-body {
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
  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem;
    line-height: 1.45;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-bg, #050812);
    color: var(--color-text-primary);
    resize: vertical;
    min-height: 200px;
  }
  textarea::placeholder {
    color: var(--color-text-muted);
    opacity: 0.85;
    white-space: pre-wrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .btn {
    border-radius: 999px;
    padding: 9px 16px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid var(--color-border);
  }
  .btn:disabled {
    opacity: 0.55;
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
