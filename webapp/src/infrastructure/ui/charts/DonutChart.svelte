<script lang="ts">
  import {
    buildDonutSegments,
    formatAmount,
    sumValues,
    type ChartPoint,
    type DonutSegment,
  } from './chartTypes';

  export let points: ChartPoint[] = [];
  export let title = '';
  export let centerLabel = 'Total';
  export let currency = '';
  export let size = 190;
  export let thickness = 22;
  export let emptyText = 'Sin datos para graficar';

  const viewBox = 200;
  const radius = (viewBox - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let segments: DonutSegment[] = [];
  let total = 0;

  $: segments = buildDonutSegments(points, circumference);
  $: total = sumValues(points);
</script>

<div class="donut-block">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if points.length === 0 || total === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="layout">
      <div class="chart" style={`width:${size}px;height:${size}px`}>
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} role="img" aria-label={title || centerLabel}>
          <g transform={`rotate(-90 ${viewBox / 2} ${viewBox / 2})`}>
            {#each segments as segment (segment.label)}
              <circle
                cx={viewBox / 2}
                cy={viewBox / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                stroke-width={thickness}
                stroke-dasharray={segment.dash}
                stroke-dashoffset={segment.offset}
                stroke-linecap="butt"
              />
            {/each}
          </g>
        </svg>
        <div class="center">
          <span class="center-label">{centerLabel}</span>
          <strong>{formatAmount(total)}</strong>
          {#if currency}<span class="cur">{currency}</span>{/if}
        </div>
      </div>

      <ul class="legend">
        {#each segments as segment (segment.label)}
          <li>
            <span class="dot" style={`background:${segment.color}`}></span>
            <span class="name">{segment.label}</span>
            <span class="pct">{segment.pct.toFixed(0)}%</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .donut-block { width: 100%; }
  h3 {
    margin: 0 0 var(--space-4);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .layout {
    display: flex;
    gap: var(--space-5);
    align-items: center;
    flex-wrap: wrap;
  }
  .chart { position: relative; flex: 0 0 auto; }
  svg { width: 100%; height: 100%; display: block; }
  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  .center-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .center strong {
    font-size: 1.05rem;
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
  }
  .cur { font-size: 0.7rem; color: var(--color-text-muted); }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1 1 180px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: var(--space-2) var(--space-4);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }
  .dot { width: 8px; height: 8px; border-radius: 3px; flex: 0 0 auto; }
  .name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pct { font-weight: 600; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
  .empty { color: var(--color-text-muted); font-size: 0.85rem; margin: 0; }
</style>
