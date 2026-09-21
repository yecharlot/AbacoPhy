<script lang="ts">
  type Tone = 'default' | 'ok' | 'off' | 'syncing';

  interface Props {
    tone?: Tone;
    children?: import('svelte').Snippet;
  }

  let { tone = 'default', children }: Props = $props();
</script>

<span class="badge" class:ok={tone === 'ok'} class:off={tone === 'off'} class:syncing={tone === 'syncing'}>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--ap-border);
    background: var(--ap-primary-soft);
    color: var(--ap-primary);
  }
  .badge.ok {
    color: var(--ap-ok);
    background: rgba(46, 125, 50, 0.1);
    border-color: rgba(46, 125, 50, 0.25);
  }
  .badge.off {
    color: var(--ap-danger);
    background: rgba(198, 40, 40, 0.08);
    border-color: rgba(198, 40, 40, 0.25);
  }
  .badge.syncing {
    background: rgba(201, 146, 10, 0.2);
  }
</style>
