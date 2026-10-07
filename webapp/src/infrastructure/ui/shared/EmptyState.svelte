<script lang="ts">
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: 'help' | 'catalog' | 'invoice' | 'accounts' | 'reports';
    actionLabel?: string;
    onAction?: () => void;
    /** compact = menos padding (listas internas) */
    compact?: boolean;
  }

  let {
    title,
    description,
    icon = 'help',
    actionLabel,
    onAction,
    compact = false,
  }: Props = $props();
</script>

<section class="empty-state" class:compact aria-live="polite">
  <div class="icon"><Icon name={icon} size={compact ? 20 : 24} /></div>
  <h2>{title}</h2>
  {#if description}<p>{description}</p>{/if}
  {#if actionLabel && onAction}
    <Button type="button" onclick={onAction}>{actionLabel}</Button>
  {/if}
</section>

<style>
  .empty-state {
    display: grid;
    justify-items: center;
    text-align: center;
    padding: 3rem 1.25rem;
    border: 1px dashed var(--color-border, var(--ap-border, var(--border-subtle)));
    border-radius: var(--radius-lg, 16px);
    background: color-mix(
      in srgb,
      var(--color-surface, var(--surface-1, var(--ap-bg-elevated))) 72%,
      transparent
    );
  }
  .empty-state.compact {
    padding: 1.5rem 0.75rem;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    margin-bottom: 0.85rem;
    border-radius: 1rem;
    color: var(--accent-cyan, #61e6e1);
    background: color-mix(in srgb, var(--accent-cyan, #61e6e1) 10%, transparent);
  }
  .compact .icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.5rem;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-primary, var(--ap-text));
  }
  p {
    max-width: 34rem;
    margin: 0.5rem 0 1rem;
    color: var(--color-text-muted, var(--ap-text-muted, var(--text-muted)));
    font-size: 0.88rem;
    line-height: 1.4;
  }
</style>
