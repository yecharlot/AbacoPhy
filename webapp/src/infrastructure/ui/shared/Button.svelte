<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type Size = 'md' | 'sm';

  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let fullWidth = false;
  export let onclick: ((e: MouseEvent) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  function handleClick(e: MouseEvent) {
    dispatch('click', e);
    onclick?.(e);
  }
</script>

<button
  class="btn btn-{variant} btn-{size}"
  class:full={fullWidth}
  {type}
  {disabled}
  on:click={handleClick}
>
  <slot />
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-sizing: border-box;
    border: none;
    margin: 0;
    font-family: inherit;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    /* pill suave, no óvalo vertical */
    border-radius: 10px;
    transition:
      transform 140ms ease-out,
      box-shadow 140ms ease-out,
      opacity 140ms ease-out,
      background 140ms ease-out;
    white-space: nowrap;
    /* evita que flex/grid padres estiren la altura */
    align-self: center;
    flex-shrink: 0;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .btn:focus-visible {
    outline: 2px solid var(--accent-cyan, #61e6e1);
    outline-offset: 2px;
  }

  /* md — compacto */
  .btn-md {
    min-height: 34px;
    height: 34px;
    padding: 0 14px;
    font-size: 0.84rem;
  }

  /* sm — más compacto */
  .btn-sm {
    min-height: 28px;
    height: 28px;
    padding: 0 10px;
    font-size: 0.75rem;
  }

  .btn-primary {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(97, 230, 225, 0.22);
  }
  .btn-secondary {
    background: var(--color-surface-soft, color-mix(in srgb, var(--ap-surface, #1a2220) 80%, transparent));
    color: var(--color-text-primary, var(--ap-text));
    border: 1px solid var(--color-border, var(--ap-border));
  }
  .btn-secondary:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-cyan, #61e6e1) 40%, var(--color-border, #333));
  }
  .btn-ghost {
    background: transparent;
    color: var(--color-text-secondary, var(--ap-text-secondary));
    border: 1px solid transparent;
  }
  .btn-ghost:hover:not(:disabled) {
    border-color: var(--color-border, var(--ap-border));
    color: var(--color-text-primary, var(--ap-text));
  }
  .btn-danger {
    background: var(--accent-red, var(--ap-danger, #f17b7b));
    color: #fff;
  }
  .full {
    width: 100%;
  }

  /* mobile: un poco más táctil sin volver a óvalos altos */
  @media (max-width: 599px) {
    .btn-md {
      min-height: 38px;
      height: 38px;
      padding: 0 16px;
    }
  }
</style>
