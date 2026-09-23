<script lang="ts">
  interface Props {
    variant?: 'text' | 'title' | 'avatar' | 'card' | 'table-row';
    width?: string;
    height?: string;
  }

  let { variant = 'text', width, height }: Props = $props();
</script>

<span
  class="skeleton {variant}"
  style:width={width}
  style:height={height}
  aria-hidden="true"
></span>

<style>
  .skeleton {
    display: block;
    position: relative;
    overflow: hidden;
    background: color-mix(in srgb, var(--surface-2) 82%, transparent);
    border-radius: var(--radius-sm);
  }
  .skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, color-mix(in srgb, white 8%, transparent), transparent);
    animation: shimmer 1.5s ease-in-out infinite;
  }
  .text { width: 55%; height: .8rem; }
  .title { width: 35%; height: 1.25rem; border-radius: .35rem; }
  .avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; }
  .card { width: 100%; min-height: 8rem; border-radius: var(--radius-md); }
  .table-row { width: 100%; height: 2.75rem; }
  @keyframes shimmer { to { transform: translateX(100%); } }
  @media (prefers-reduced-motion: reduce) {
    .skeleton::after { animation: none; }
  }
</style>
