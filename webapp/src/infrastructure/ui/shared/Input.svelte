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
    /** list id for datalist suggestions */
    list?: string;
    oninput?: (e: Event) => void;
    class?: string;
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
    list,
    oninput,
    class: className = '',
  }: Props = $props();
</script>

<!-- Un solo nodo raíz: evita que label e input ocupen celdas distintas en CSS Grid -->
<div class="field {className}">
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
    {list}
    {oninput}
  />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    width: 100%;
  }
  .lbl {
    display: block;
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted, var(--ap-text-muted));
    margin: 0;
  }
  .inp {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    margin: 0;
    background: var(--color-surface-soft, var(--ap-bg));
    border: 1px solid var(--color-border, var(--ap-border));
    border-radius: var(--radius-md, 12px);
    color: var(--color-text-primary, var(--ap-text));
    font-family: inherit;
    font-size: 0.9rem;
  }
  .inp:focus {
    outline: none;
    border-color: var(--accent-cyan, var(--ap-primary));
  }
  .inp:disabled {
    opacity: 0.6;
  }
</style>
