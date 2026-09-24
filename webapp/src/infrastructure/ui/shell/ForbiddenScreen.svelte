<script lang="ts">
  export let message = 'No tienes permiso para ver esta sección.';
  export let onGoHome: (() => void) | undefined = undefined;
</script>

<section class="forbidden" role="alert">
  <h2>Acceso restringido</h2>
  <p>{message}</p>
  {#if onGoHome}
    <button type="button" class="btn" onclick={onGoHome}>Ir al inicio permitido</button>
  {/if}
</section>

<style>
  .forbidden {
    max-width: 420px;
    margin: 2rem auto;
    padding: 1.5rem;
    border-radius: var(--radius-lg, 16px);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    text-align: center;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }
  p {
    margin: 0 0 1rem;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }
  .btn {
    border: none;
    border-radius: 999px;
    padding: 0.55rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--gradient-primary-btn, linear-gradient(135deg, #61e6e1, #b7f56a));
    color: #0a1210;
    font-family: inherit;
  }
</style>
