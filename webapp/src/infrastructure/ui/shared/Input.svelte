<script lang="ts">
  interface Props {
    id?: string;
    label?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    autocomplete?: string;
    disabled?: boolean;
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
  {oninput}
/>

<style>
  .lbl {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ap-text-muted);
    margin-bottom: 5px;
  }
  .inp {
    width: 100%;
    padding: 11px 13px;
    margin-bottom: 0.75rem;
    background: var(--ap-bg);
    border: 1px solid var(--ap-border);
    border-radius: 12px;
    color: var(--ap-text);
    font-family: inherit;
    font-size: 0.92rem;
  }
  .inp:focus {
    outline: none;
    border-color: var(--ap-primary);
  }
</style>
