<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props {
    id?: string;
    label?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    disabled?: boolean;
    step?: string;
    oninput?: (e: Event) => void;
  }

  let {
    id,
    label,
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    required = false,
    autocomplete,
    disabled = false,
    step,
    oninput,
  }: Props = $props();
</script>

{#if label}
  <label class="lbl" for={id}>{label}</label>
{/if}
<input
  class="inp"
  {id}
  {type}
  bind:value
  {placeholder}
  {required}
  {autocomplete}
  {disabled}
  {step}
  {oninput}
/>

<style>
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    margin-bottom: 6px;
  }
  .inp {
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 0.75rem;
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: var(--radius-md, 12px);
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.92rem;
  }
  .inp:focus {
    outline: none;
    border-color: var(--accent-cyan, var(--ap-primary));
  }
  .inp:disabled {
    opacity: 0.6;
  }
</style>
