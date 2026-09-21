<script lang="ts">
  import { formatAmount } from './chartTypes';

  type Variant = 'hero' | 'plain' | 'positive' | 'negative';

  export let label = '';
  export let amount = 0;
  export let currency = '';
  export let caption = '';
  export let delta: number | null = null;
  export let variant: Variant = 'plain';
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
    {formatAmount(amount)}<sup>{currency}</sup>
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
  .stat-hero .caption { color: rgba(8, 18, 26, 0.72); }
  .stat-hero .amount { color: #08121a; font-size: clamp(1.9rem, 4.6vw, 2.9rem); }
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
    font-size: clamp(1.4rem, 3.2vw, 1.9rem);
    font-weight: 700;
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    word-break: break-word;
  }
  .amount sup {
    font-size: 0.5em;
    margin-left: 3px;
    font-weight: 600;
    opacity: 0.75;
  }
  .stat-positive .amount { color: var(--accent-green); }
  .stat-negative .amount { color: var(--accent-red); }
  .caption {
    margin: 0;
    font-size: 0.74rem;
    color: var(--color-text-muted);
  }
</style>
