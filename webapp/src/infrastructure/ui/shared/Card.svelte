<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();
</script>

<div class="card">
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .card {
    background: var(--ap-bg-elevated);
    border: 1px solid var(--ap-border);
    border-radius: var(--ap-radius);
    padding: 1.1rem;
    margin-bottom: 0.9rem;
    box-shadow: var(--ap-shadow);
  }
</style>
