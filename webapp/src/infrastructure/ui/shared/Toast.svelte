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
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--ap-bg-elevated);
    border: 1px solid var(--ap-border);
    padding: 11px 16px;
    border-radius: 14px;
    z-index: 2000;
    max-width: 92vw;
    box-shadow: var(--ap-shadow);
  }
</style>
