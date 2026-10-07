<script lang="ts">
  import { onMount } from 'svelte';
  import { toastStore, type ToastItem } from './toastStore';

  /** Compat: App legada puede pasar message/visible; el host escucha el store siempre. */
  interface Props {
    message?: string;
    visible?: boolean;
  }
  let { message = '', visible = false }: Props = $props();

  let items: ToastItem[] = $state([]);

  onMount(() => {
    return toastStore.subscribe((list) => {
      items = list;
    });
  });

  // Bridge: si App sigue llamando showToast local → prop message
  $effect(() => {
    if (visible && message.trim()) {
      toastStore.info(message.trim());
    }
  });
</script>

<div class="toast-host" aria-live="polite" aria-relevant="additions">
  {#each items as t (t.id)}
    <div
      class="toast"
      class:ok={t.kind === 'ok'}
      class:err={t.kind === 'err'}
      class:info={t.kind === 'info'}
      role={t.kind === 'err' ? 'alert' : 'status'}
    >
      <span class="ico" aria-hidden="true">
        {#if t.kind === 'ok'}✓{:else if t.kind === 'err'}!{:else}i{/if}
      </span>
      <span class="msg">{t.message}</span>
      <button type="button" class="close" aria-label="Cerrar" onclick={() => toastStore.dismiss(t.id)}
        >×</button
      >
    </div>
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 4000;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.45rem;
    width: min(420px, 92vw);
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.75rem 0.85rem;
    border-radius: 14px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-raised, var(--ap-bg-elevated, #171b29));
    color: var(--color-text-primary, var(--ap-text));
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    font-size: 0.88rem;
    animation: toast-in 220ms ease;
  }
  .toast.ok {
    border-color: color-mix(in srgb, #3ecf8e 45%, var(--ap-border, #333));
  }
  .toast.err {
    border-color: color-mix(in srgb, #e85d5d 50%, var(--ap-border, #333));
  }
  .toast.info {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 35%, var(--ap-border, #333));
  }
  .ico {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 800;
  }
  .ok .ico {
    background: color-mix(in srgb, #3ecf8e 22%, transparent);
    color: #3ecf8e;
  }
  .err .ico {
    background: color-mix(in srgb, #e85d5d 22%, transparent);
    color: #e85d5d;
  }
  .info .ico {
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 18%, transparent);
    color: var(--accent-cyan, #61e6e1);
  }
  .msg {
    flex: 1;
    min-width: 0;
    line-height: 1.35;
  }
  .close {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--ap-text-muted, #888);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.15rem;
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
