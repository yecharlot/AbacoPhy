<script lang="ts">
  interface Props {
    message: string;
    visible?: boolean;
  }
  let { message, visible = true }: Props = $props();
</script>

{#if visible && message}
  <div class="toast" role="status">{message}</div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface-raised, var(--ap-bg-elevated));
    border: 1px solid var(--color-border, var(--ap-border));
    padding: 12px 18px;
    border-radius: var(--radius-md, 14px);
    z-index: 2000;
    max-width: 92vw;
    box-shadow: var(--shadow-float, var(--ap-shadow));
    color: var(--color-text-primary, var(--ap-text));
    font-size: 0.9rem;
  }
</style>
