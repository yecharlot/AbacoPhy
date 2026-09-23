<script lang="ts">
  /**
   * Áreas superpuestas: ideal para ver cómo se comportan dos magnitudes
   * en el tiempo (p. ej. ingresos vs gastos) sin apilar.
   */
  import {
    buildMultiLineGeometry,
    formatCompact,
    type ChartSeries,
    type MultiLineGeometry,
  } from './chartTypes';

  export let series: ChartSeries[] = [];
  export let height = 220;
  export let emptyText = 'Sin datos para graficar';
  export let showDots = false;

  const viewWidth = 360;
  const viewHeight = 140;

  let geometry: MultiLineGeometry = { series: [], labels: [] };
  $: geometry = buildMultiLineGeometry(series, viewWidth, viewHeight, 12);

  const uid = `area-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="area-block">
  {#if series.length === 0 || geometry.labels.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="legend">
      {#each series as s (s.id)}
        <span class="leg">
          <i style={`background:${s.color}`}></i>
          {s.label}
        </span>
      {/each}
    </div>

    <div class="plot" style={`height:${height}px`}>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Comparación temporal"
      >
        <defs>
          {#each geometry.series as s (s.id)}
            <linearGradient id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color={s.color} stop-opacity="0.42" />
              <stop offset="100%" stop-color={s.color} stop-opacity="0.02" />
            </linearGradient>
          {/each}
        </defs>

        <!-- Áreas (detrás) -->
        {#each geometry.series as s (s.id)}
          <path d={s.area} fill={`url(#${uid}-${s.id})`} />
        {/each}

        <!-- Líneas -->
        {#each geometry.series as s (s.id)}
          <path
            d={s.line}
            fill="none"
            stroke={s.color}
            stroke-width="2.2"
            vector-effect="non-scaling-stroke"
          />
          {#if showDots}
            {#each s.dots as dot, i (`${s.id}-${i}`)}
              <circle
                cx={dot.x}
                cy={dot.y}
                r="2.4"
                fill={s.color}
                vector-effect="non-scaling-stroke"
              />
            {/each}
          {/if}
        {/each}
      </svg>
    </div>

    <div class="axis">
      {#each geometry.labels as label (label)}
        <span title={label}>{label}</span>
      {/each}
    </div>

    <div class="peaks">
      {#each series as s (s.id)}
        {@const vals = s.points.map((p) => p.value)}
        {@const max = vals.length ? Math.max(...vals) : 0}
        <span style={`color:${s.color}`}>
          {s.label}: máx {formatCompact(max)}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .area-block {
    width: 100%;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 10px;
  }
  .leg {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  .leg i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    display: inline-block;
  }
  .plot {
    width: 100%;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 6px;
  }
  .axis span {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 4.5rem;
  }
  .peaks {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }
  .empty {
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin: 0;
  }
</style>
