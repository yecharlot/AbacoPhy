<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    title?: string;
    message?: string;
    retry?: () => void;
  }

  let {
    title = 'No pudimos cargar esta sección',
    message = 'Comprueba la conexión y vuelve a intentarlo.',
    retry
  }: Props = $props();
</script>

<section class="error-state" aria-live="assertive">
  <div class="icon"><Icon name="help" size={22} /></div>
  <div>
    <h2>{title}</h2>
    <p>{message}</p>
    {#if retry}
      <button type="button" onclick={retry}>Reintentar</button>
    {/if}
  </div>
</section>

<style>
  .error-state {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.1rem;
    border: 1px solid color-mix(in srgb, var(--accent-red) 28%, var(--border-subtle));
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--accent-red) 5%, var(--surface-1));
  }
  .icon { color: var(--accent-red); }
  h2 { margin: 0; font-size: .95rem; }
  p { margin: .35rem 0 .75rem; color: var(--text-muted); }
  button {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: .5rem .75rem;
    background: var(--surface-2);
    color: var(--text-primary);
    cursor: pointer;
  }
</style>
