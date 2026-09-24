<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: 'help' | 'catalog' | 'invoice' | 'accounts' | 'reports';
    actionLabel?: string;
    onAction?: () => void;
  }

  let {
    title,
    description,
    icon = 'help',
    actionLabel,
    onAction
  }: Props = $props();
</script>

<section class="empty-state" aria-live="polite">
  <div class="icon"><Icon name={icon} size={24} /></div>
  <h2>{title}</h2>
  {#if description}<p>{description}</p>{/if}
  {#if actionLabel && onAction}
    <button type="button" onclick={onAction}>{actionLabel}</button>
  {/if}
</section>

<style>
  .empty-state {
    display: grid;
    justify-items: center;
    text-align: center;
    padding: 3.5rem 1.5rem;
    border: 1px dashed var(--border-subtle);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface-1) 72%, transparent);
  }
  .icon {
    display: grid;
    place-items: center;
    width: 3.25rem;
    height: 3.25rem;
    margin-bottom: 1rem;
    border-radius: 1rem;
    color: var(--accent-cyan);
    background: color-mix(in srgb, var(--accent-cyan) 10%, var(--surface-2));
  }
  h2 { margin: 0; font-size: 1rem; }
  p { max-width: 34rem; margin: .55rem 0 1.2rem; color: var(--text-muted); }
  button {
    border: 0;
    border-radius: var(--radius-sm);
    padding: .65rem 1rem;
    color: var(--button-primary-text);
    background: var(--button-primary);
    cursor: pointer;
  }
</style>
