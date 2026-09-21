<script lang="ts">
  type Tone = 'default' | 'ok' | 'off' | 'syncing';
  interface Props {
    tone?: Tone;
    children?: import('svelte').Snippet;
  }
  let { tone = 'default', children }: Props = $props();
</script>

<span class="badge" class:ok={tone === 'ok'} class:off={tone === 'off'} class:syncing={tone === 'syncing'}>
  {#if children}{@render children()}{/if}
</span>

<style>
  .badge {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--color-border, var(--ap-border));
    background: var(--color-surface-soft, var(--ap-primary-soft));
    color: var(--color-text-secondary, var(--ap-text-secondary));
  }
  .badge.ok {
    color: #0a1210;
    background: rgba(183, 245, 106, 0.2);
    border-color: rgba(183, 245, 106, 0.35);
  }
  .badge.off {
    color: #fff;
    background: rgba(241, 123, 123, 0.2);
    border-color: rgba(241, 123, 123, 0.35);
  }
  .badge.syncing {
    background: rgba(97, 230, 225, 0.15);
    color: var(--accent-cyan, #61e6e1);
  }
</style>
