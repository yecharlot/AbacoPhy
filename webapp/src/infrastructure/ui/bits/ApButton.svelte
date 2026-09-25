<script lang="ts">
  import { Button } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type Size = 'md' | 'sm';

  interface Props {
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    fullWidth?: boolean;
    href?: string;
    children?: Snippet;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    fullWidth = false,
    href,
    children,
    onclick,
  }: Props = $props();

  const cls = $derived(
    [
      'ap-btn',
      `ap-btn-${variant}`,
      size === 'sm' ? 'ap-btn-sm' : '',
      fullWidth ? 'ap-btn-full' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
</script>

{#if href}
  <Button.Root class={cls} {href} {disabled}>
    {#if children}{@render children()}{/if}
  </Button.Root>
{:else}
  <Button.Root class={cls} {type} {disabled} {onclick}>
    {#if children}{@render children()}{/if}
  </Button.Root>
{/if}

<style>
  :global(.ap-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-sizing: border-box;
    margin: 0;
    border: none;
    font-family: inherit;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    border-radius: 10px;
    white-space: nowrap;
    align-self: center;
    flex-shrink: 0;
    min-height: 34px;
    height: 34px;
    padding: 0 14px;
    font-size: 0.84rem;
    text-decoration: none;
  }
  :global(.ap-btn-sm) {
    min-height: 28px;
    height: 28px;
    padding: 0 10px;
    font-size: 0.75rem;
  }
  :global(.ap-btn-full) { width: 100%; }
  :global(.ap-btn-primary) {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
  }
  :global(.ap-btn-secondary) {
    background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }
  :global(.ap-btn-ghost) {
    background: transparent;
    color: var(--color-text-secondary);
  }
  :global(.ap-btn-danger) {
    background: var(--accent-red, #f17b7b);
    color: #fff;
  }
  :global(.ap-btn:disabled) { opacity: 0.55; cursor: not-allowed; }
</style>
