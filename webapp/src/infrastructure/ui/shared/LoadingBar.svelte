<script lang="ts">
  interface Props { active?: boolean; }
  let { active = false }: Props = $props();
</script>

{#if active}
  <div class="loading-bar" aria-label="Cargando" role="progressbar"></div>
{/if}

<style>
  .loading-bar {
    position: fixed;
    z-index: 1000;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-lime), var(--accent-purple));
    transform-origin: left;
    animation: loading 1.35s ease-in-out infinite;
  }
  @keyframes loading {
    0% { transform: scaleX(.05); opacity: .45; }
    50% { transform: scaleX(.72); opacity: 1; }
    100% { transform: scaleX(.05); opacity: .45; }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-bar { animation: none; }
  }
</style>
