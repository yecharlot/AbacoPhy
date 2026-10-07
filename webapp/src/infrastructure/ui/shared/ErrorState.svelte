<script lang="ts">
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';

  interface Props {
    title?: string;
    message?: string;
    retry?: () => void;
    retryLabel?: string;
  }

  let {
    title = 'No pudimos cargar esta sección',
    message = 'Comprueba la conexión y vuelve a intentarlo.',
    retry,
    retryLabel = 'Reintentar',
  }: Props = $props();
</script>

<section class="error-state" aria-live="assertive" role="alert">
  <div class="icon"><Icon name="help" size={22} /></div>
  <div class="body">
    <h2>{title}</h2>
    <p>{message}</p>
    {#if retry}
      <Button type="button" variant="secondary" size="sm" onclick={retry}>{retryLabel}</Button>
    {/if}
  </div>
</section>

<style>
  .error-state {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.1rem;
    border: 1px solid color-mix(in srgb, var(--accent-red, #e85d5d) 28%, var(--color-border, var(--ap-border)));
    border-radius: var(--radius-md, 14px);
    background: color-mix(in srgb, var(--accent-red, #e85d5d) 5%, var(--color-surface, var(--ap-bg-elevated)));
  }
  .icon {
    color: var(--accent-red, #e85d5d);
    flex-shrink: 0;
  }
  .body {
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }
  p {
    margin: 0.35rem 0 0.75rem;
    color: var(--color-text-muted, var(--ap-text-muted));
    font-size: 0.88rem;
  }
</style>
