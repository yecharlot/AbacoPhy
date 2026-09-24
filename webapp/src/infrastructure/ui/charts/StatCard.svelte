<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formatAmount } from './chartTypes';

  type Variant = 'hero' | 'plain' | 'positive' | 'negative';

  export let label = '';
  export let amount = 0;
  export let currency = '';
  export let caption = '';
  export let delta: number | null = null;
  export let variant: Variant = 'plain';
  /** Duración de la animación count-up (ms). */
  export let durationMs = 1000;

  let display = 0;
  let raf = 0;
  let from = 0;
  let to = 0;
  let startTs = 0;

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function tick(now: number) {
    const t = Math.min(1, (now - startTs) / durationMs);
    display = from + (to - from) * easeOutCubic(t);
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      display = to;
    }
  }

  function animateTo(next: number) {
    cancelAnimationFrame(raf);
    from = display;
    to = Number.isFinite(next) ? next : 0;
    // Si es el primer valor y partimos de 0, animar desde 0
    if (from === 0 && to !== 0) {
      from = 0;
    }
    startTs = performance.now();
    raf = requestAnimationFrame(tick);
  }

  $: animateTo(amount);

  onDestroy(() => cancelAnimationFrame(raf));
</script>

<div class={`stat stat-${variant}`}>
  <div class="top">
    <span class="label">{label}</span>
    {#if delta !== null}
      <span class="delta" class:down={delta < 0}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
      </span>
    {/if}
  </div>

  <p class="amount">
    {formatAmount(display)}<sup>{currency}</sup>
  </p>

  {#if caption}
    <p class="caption">{caption}</p>
  {/if}

  <slot />
</div>

<style>
  .stat {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-height: 130px;
    box-shadow: var(--shadow-soft);
  }
  .stat-hero {
    background: var(--gradient-hero);
    border-color: transparent;
    color: #08121a;
    min-height: 200px;
    justify-content: space-between;
  }
  .stat-hero .label,
  .stat-hero .caption {
    color: rgba(8, 18, 26, 0.72);
  }
  .stat-hero .amount {
    color: #08121a;
    font-size: clamp(1.9rem, 4.6vw, 2.9rem);
  }
  .stat-positive .amount {
    color: var(--accent-green);
  }
  .stat-negative .amount {
    color: var(--accent-pink, var(--accent-red));
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .label {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .delta {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--accent-green) 22%, transparent);
    color: var(--accent-green);
    white-space: nowrap;
  }
  .delta.down {
    background: color-mix(in srgb, var(--accent-red) 20%, transparent);
    color: var(--accent-red);
  }
  .amount {
    margin: 0;
    font-size: clamp(1.35rem, 2.8vw, 1.85rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-primary);
    line-height: 1.15;
  }
  .amount sup {
    font-size: 0.45em;
    margin-left: 4px;
    font-weight: 600;
    opacity: 0.75;
    vertical-align: super;
  }
  .caption {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .amount {
      transition: none;
    }
  }
</style>
