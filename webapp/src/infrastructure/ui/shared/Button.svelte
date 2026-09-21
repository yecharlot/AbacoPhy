<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'danger';
  type Size = 'md' | 'sm';

  interface Props {
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    fullWidth?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    fullWidth = false,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  class="btn btn-{variant} btn-{size}"
  class:full={fullWidth}
  {type}
  {disabled}
  {onclick}
>
  {#if children}
    {@render children()}
  {/if}
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
