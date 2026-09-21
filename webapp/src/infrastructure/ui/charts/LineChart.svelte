<script lang="ts">
  import { buildLineGeometry, formatCompact, type ChartPoint, type LineGeometry } from './chartTypes';

  export let points: ChartPoint[] = [];
  export let title = '';
  export let height = 170;
  export let color = 'var(--accent-cyan)';
  export let showDots = true;
  export let emptyText = 'Sin datos para graficar';

  const viewWidth = 320;
  const viewHeight = 120;

  let geometry: LineGeometry = { line: '', area: '', dots: [] };
  $: geometry = buildLineGeometry(points, viewWidth, viewHeight, 10);

  const gradientId = `line-grad-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="line-block">
  {#if title}
    <h3>{title}</h3>
  {/if}

  {#if points.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="plot" style={`height:${height}px`}>
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" role="img" aria-label={title}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={color} stop-opacity="0.35" />
            <stop offset="100%" stop-color={color} stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d={geometry.area} fill={`url(#${gradientId})`} />
        <path d={geometry.line} fill="none" stroke={color} stroke-width="2" vector-effect="non-scaling-stroke" />
        {#if showDots}
          {#each geometry.dots as dot (dot.label)}
            <circle cx={dot.x} cy={dot.y} r="2.5" fill={color} vector-effect="non-scaling-stroke" />
          {/each}
        {/if}
      </svg>
    </div>
    <div class="axis">
      {#each points as point (point.label)}
        <span>{point.label}</span>
      {/each}
    </div>
    <p class="peak">Máximo del período: {formatCompact(Math.max(...points.map((p) => p.value)))}</p>
  {/if}
</div>

<style>
  .line-block { width: 100%; }
  h3 {
    margin: 0 0 var(--space-4);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .plot { width: 100%; }
  svg { width: 100%; height: 100%; display: block; }
  .axis {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .axis span {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .peak {
    margin: var(--space-2) 0 0;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }
  .empty { color: var(--color-text-muted); font-size: 0.85rem; margin: 0; }
</style>
