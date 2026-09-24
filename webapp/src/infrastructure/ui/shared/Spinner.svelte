<script lang="ts">
  interface Props {
    size?: number;
  }
  let { size = 18 }: Props = $props();
</script>

<span class="spinner" style:width={`${size}px`} style:height={`${size}px`} role="status" aria-label="Cargando"></span>

<style>
  .spinner {
    display: inline-block;
    border: 2px solid color-mix(in srgb, currentColor 18%, transparent);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation-duration: 1.5s; }
  }
</style>
