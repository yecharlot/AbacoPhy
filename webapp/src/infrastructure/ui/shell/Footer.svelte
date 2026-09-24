<script lang="ts">
  import Brand from '../branding/Brand.svelte';

  interface Props {
    onSupport?: () => void;
  }

  let { onSupport }: Props = $props();

  const year = new Date().getFullYear();
</script>

<footer class="footer">
  <div class="brand-wrap"><Brand compact /></div>
  <div class="meta">
    <span>© {year} ÁbacoPhy</span>
    <span class="dot">•</span>
    <button type="button" onclick={() => onSupport?.()}>Soporte</button>
    <span class="dot">•</span>
    <span>Gestión empresarial</span>
  </div>
</footer>

<style>
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.2rem 1.5rem;
    border-top: 1px solid var(--border-subtle);
    color: var(--text-muted);
    font-size: .75rem;
  }
  .meta { display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; justify-content: flex-end; }
  button { border: 0; padding: 0; color: inherit; background: none; cursor: pointer; }
  button:hover { color: var(--text-primary); }
  .dot { opacity: .45; }
  @media (max-width: 640px) {
    .footer { align-items: flex-start; flex-direction: column; }
    .meta { justify-content: flex-start; }
  }
</style>
