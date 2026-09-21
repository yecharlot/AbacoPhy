<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger';
  type Size = 'md' | 'sm';

  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let fullWidth = false;

  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  function handleClick(e: MouseEvent) {
    // forward the native click event as a component event
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
    font-weight: 700;
    cursor: pointer;
    border-radius: var(--ap-radius-pill);
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .btn-md {
    padding: 10px 18px;
    font-size: 0.88rem;
  }
  .btn-sm {
    padding: 6px 11px;
    font-size: 0.74rem;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--ap-primary), var(--ap-primary-dark));
    color: #0a0a0a;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px var(--ap-primary-soft);
  }
  .btn-secondary {
    background: transparent;
    color: var(--ap-text);
    border: 1px solid var(--ap-border);
  }
  .btn-danger {
    background: var(--ap-danger);
    color: #fff;
  }
  .full {
    width: 100%;
  }
</style>
