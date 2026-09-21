<script lang="ts">
  interface Props {
    variant?: 'default' | 'hero' | 'raised';
    children?: import('svelte').Snippet;
  }
  let { variant = 'default', children }: Props = $props();
</script>

<div class="card" class:hero={variant === 'hero'} class:raised={variant === 'raised'}>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .card {
    background: var(--color-surface, var(--ap-bg-elevated));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: var(--radius-lg, var(--ap-radius));
    padding: var(--space-5, 1.1rem);
    margin-bottom: var(--dashboard-gap, 0.9rem);
    box-shadow: none;
  }
  .raised {
    background: var(--color-surface-raised, var(--ap-bg-elevated));
  }
  .hero {
    position: relative;
    overflow: hidden;
    background: var(--gradient-hero, linear-gradient(135deg, #61e6e1, #d6f56e));
    border: none;
    border-radius: var(--radius-xl, 28px);
    color: #0a1210;
    padding: var(--space-6, 1.5rem);
  }
  .hero :global(h2),
  .hero :global(h3) {
    color: #0a1210;
  }
  @media (max-width: 599px) {
    .card {
      padding: var(--space-4, 1rem);
    }
  }
</style>
