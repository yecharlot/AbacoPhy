<script lang="ts">
  export let title = '';
  export let subtitle = '';
  export let tag = '';
  export let padded = true;
</script>

<section class="panel" class:padded>
  {#if title || tag}
    <header>
      <div>
        <h2>{title}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      {#if tag}<span class="tag">{tag}</span>{/if}
      <slot name="actions" />
    </header>
  {/if}
  <slot />
</section>

<style>
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-soft);
    overflow: hidden;
  }
  .panel.padded { padding: var(--space-5); }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  header p {
    margin: 4px 0 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  .tag {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    background: var(--color-surface-soft);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
</style>
