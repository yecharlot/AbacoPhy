<script lang="ts">
  import { barHeights, formatCompact, paletteColor, type ChartPoint } from './chartTypes';

  export let points: ChartPoint[] = [];
  export let title = '';
  export let height = 180;
  export let highlightLast = true;
  export let showValues = true;
  export let emptyText = 'Sin datos para graficar';

  let heights: number[] = [];
  $: heights = barHeights(points);
</script>

<div class="bar-block">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if points.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="bars" style={`height:${height}px`}>
      {#each points as point, index (point.label + index)}
        <div class="col">
          {#if showValues}
            <span class="val">{formatCompact(point.value)}</span>
          {/if}
          <div
            class="bar"
            class:active={highlightLast && index === points.length - 1}
            style={`height:${heights[index]}%;--bar-color:${point.color ?? paletteColor(index)}`}
            title={`${point.label}: ${point.value}`}
          ></div>
          <span class="lbl">{point.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .bar-block { width: 100%; }
  h3 {
    margin: 0 0 var(--space-4);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .bars {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
    width: 100%;
  }
  .col {
    flex: 1 1 0;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
  }
  .bar {
    width: 100%;
    border-radius: var(--radius-md) var(--radius-md) 6px 6px;
    background: color-mix(in srgb, var(--bar-color) 26%, transparent);
    border: 1px solid color-mix(in srgb, var(--bar-color) 34%, transparent);
    transition: background var(--motion-fast);
    min-height: 4px;
  }
  .bar.active {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--bar-color) 70%, transparent),
      color-mix(in srgb, var(--bar-color) 22%, transparent)
    );
    border-color: var(--bar-color);
  }
  .val {
    font-size: 0.68rem;
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .lbl {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .empty { color: var(--color-text-muted); font-size: 0.85rem; margin: 0; }
  @media (max-width: 599px) {
    .val { display: none; }
  }
</style>
