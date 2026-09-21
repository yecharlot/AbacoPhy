<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type Size = 'md' | 'sm';

  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let fullWidth = false;

  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  function handleClick(e: MouseEvent) {
    dispatch('click', e);
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
    gap: 7px;
    border: none;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--radius-pill, 999px);
    transition: transform 160ms ease-out, box-shadow 160ms ease-out, opacity 160ms ease-out;
    min-height: 40px;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .btn:focus-visible {
    outline: 2px solid var(--accent-cyan, #61e6e1);
    outline-offset: 2px;
  }
  .btn-md {
    padding: 10px 18px;
    font-size: 0.88rem;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 0.74rem;
    min-height: 32px;
  }
  .btn-primary {
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(97, 230, 225, 0.25);
  }
  .btn-secondary {
    background: var(--color-surface-soft, transparent);
    color: var(--color-text-primary, var(--ap-text));
    border: 1px solid var(--color-border, var(--ap-border));
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
    background: var(--accent-red, var(--ap-danger));
    color: #fff;
  }
  .full {
    width: 100%;
  }
  @media (max-width: 599px) {
    .btn-md {
      min-height: 44px;
    }
  }
</style>
