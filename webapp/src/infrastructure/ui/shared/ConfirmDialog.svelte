<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    title?: string;
    message?: string;
    /** Texto del botón confirmar */
    confirmLabel?: string;
    cancelLabel?: string;
    /** danger = acción irreversible */
    variant?: 'danger' | 'warning' | 'default';
    /** Exige motivo no vacío */
    requireReason?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    busy?: boolean;
    onConfirm?: (payload: { reason: string }) => void | Promise<void>;
    onCancel?: () => void;
  }

  let {
    open = false,
    title = 'Confirmar acción',
    message = '¿Desea continuar?',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    requireReason = false,
    reasonLabel = 'Motivo',
    reasonPlaceholder = 'Describa el motivo…',
    busy = false,
    onConfirm,
    onCancel,
  }: Props = $props();

  let reason = $state('');
  let localError = $state('');
  let panelEl: HTMLDivElement | null = $state(null);

  $effect(() => {
    if (open) {
      reason = '';
      localError = '';
      requestAnimationFrame(() => {
        const focusable = panelEl?.querySelector<HTMLElement>(
          requireReason ? 'textarea, input' : '.cd-actions button:last-child',
        );
        focusable?.focus();
      });
    }
  });

  function onKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape' && !busy) {
      e.preventDefault();
      onCancel?.();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function handleConfirm() {
    localError = '';
    if (requireReason && !reason.trim()) {
      localError = 'Indique un motivo para continuar.';
      return;
    }
    await onConfirm?.({ reason: reason.trim() });
  }

  function backdropClick(e: MouseEvent) {
    if (busy) return;
    if (e.target === e.currentTarget) onCancel?.();
  }
</script>

{#if open}
  <div
    class="cd-backdrop"
    role="presentation"
    onclick={backdropClick}
  >
    <div
      class="cd-panel"
      class:danger={variant === 'danger'}
      class:warning={variant === 'warning'}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cd-title"
      aria-describedby="cd-msg"
      bind:this={panelEl}
    >
      <div class="cd-icon" aria-hidden="true">
        {#if variant === 'danger'}!
        {:else if variant === 'warning'}⚠
        {:else}?{/if}
      </div>
      <h2 id="cd-title">{title}</h2>
      <p id="cd-msg" class="cd-msg">{message}</p>

      {#if requireReason}
        <label class="cd-reason">
          <span>{reasonLabel}</span>
          <textarea
            rows="3"
            placeholder={reasonPlaceholder}
            bind:value={reason}
            disabled={busy}
          ></textarea>
        </label>
      {/if}

      {#if localError}
        <p class="cd-err" role="alert">{localError}</p>
      {/if}

      <div class="cd-actions">
        <Button type="button" variant="ghost" disabled={busy} onclick={() => onCancel?.()}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant === 'default' ? 'primary' : 'primary'}
          disabled={busy}
          onclick={() => void handleConfirm()}
        >
          {busy ? 'Procesando…' : confirmLabel}
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cd-backdrop {
    position: fixed;
    inset: 0;
    z-index: 5000;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: color-mix(in srgb, #000 55%, transparent);
    backdrop-filter: blur(2px);
  }
  .cd-panel {
    width: min(420px, 100%);
    padding: 1.25rem 1.35rem;
    border-radius: 16px;
    border: 1px solid var(--ap-border, var(--color-border, #333));
    background: var(--ap-bg-elevated, var(--color-surface-raised, #171b29));
    color: var(--ap-text, var(--color-text-primary, #eee));
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
    animation: cd-in 160ms ease;
  }
  .cd-panel.danger {
    border-color: color-mix(in srgb, #e85d5d 40%, var(--ap-border, #333));
  }
  .cd-panel.warning {
    border-color: color-mix(in srgb, #e8a35d 40%, var(--ap-border, #333));
  }
  .cd-icon {
    width: 2.25rem;
    height: 2.25rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-weight: 800;
    margin-bottom: 0.65rem;
    background: color-mix(in srgb, #e85d5d 18%, transparent);
    color: #e85d5d;
  }
  .cd-panel.warning .cd-icon {
    background: color-mix(in srgb, #e8a35d 18%, transparent);
    color: #e8a35d;
  }
  h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 750;
  }
  .cd-msg {
    margin: 0.45rem 0 0.9rem;
    font-size: 0.88rem;
    color: var(--ap-text-muted, #9aa3b5);
    line-height: 1.4;
  }
  .cd-reason {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
    font-size: 0.78rem;
    font-weight: 650;
  }
  .cd-reason textarea {
    width: 100%;
    resize: vertical;
    min-height: 4.5rem;
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
    border: 1px solid var(--ap-border, #444);
    background: var(--ap-bg, #0f1219);
    color: inherit;
    font: inherit;
    font-weight: 400;
  }
  .cd-err {
    margin: 0 0 0.65rem;
    color: #e85d5d;
    font-size: 0.82rem;
  }
  .cd-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  @keyframes cd-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
