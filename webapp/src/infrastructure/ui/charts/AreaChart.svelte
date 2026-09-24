<script lang="ts">
  /**
   * Áreas superpuestas: puntos elegantes, animación de trazo y pan horizontal.
   */
  import {
    buildMultiLineGeometry,
    formatAmount,
    formatCompact,
    type ChartSeries,
    type MultiLineGeometry,
  } from './chartTypes';

  export let series: ChartSeries[] = [];
  export let height = 260;
  export let emptyText = 'Sin datos para graficar';
  export let showDots = true;

  /** Ancho lógico por punto (más puntos → más scroll horizontal). */
  const PX_PER_POINT = 36;
  const MIN_VIEW_WIDTH = 360;
  const viewHeight = 150;
  const pad = 14;

  let geometry: MultiLineGeometry = { series: [], labels: [] };
  let viewWidth = MIN_VIEW_WIDTH;

  $: {
    const n = series.find((s) => s.points.length)?.points.length ?? 0;
    viewWidth = Math.max(MIN_VIEW_WIDTH, n * PX_PER_POINT);
    geometry = buildMultiLineGeometry(series, viewWidth, viewHeight, pad);
  }

  const uid = `area-${Math.random().toString(36).slice(2, 8)}`;

  let hoverIndex: number | null = null;
  let tipX = 0;
  let tipY = 0;
  let plotEl: HTMLDivElement | null = null;
  let scrollEl: HTMLDivElement | null = null;
  let animKey = 0;

  // Re-trigger line draw animation when series identity changes
  $: seriesSignature = series.map((s) => `${s.id}:${s.points.length}`).join('|');
  $: if (seriesSignature) {
    animKey += 1;
  }

  function nearestIndex(clientX: number): number | null {
    if (!plotEl || !geometry.labels.length || !scrollEl) return null;
    const rect = plotEl.getBoundingClientRect();
    if (rect.width <= 0) return null;
    // plot is stretched to scroll content width
    const contentWidth = plotEl.offsetWidth;
    const rel = (clientX - rect.left + scrollEl.scrollLeft) / contentWidth;
    const xView = rel * viewWidth;
    const first = geometry.series[0];
    if (!first?.dots.length) return null;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < first.dots.length; i++) {
      const dist = Math.abs(first.dots[i].x - xView);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function onMove(e: MouseEvent) {
    const idx = nearestIndex(e.clientX);
    hoverIndex = idx;
    if (plotEl && idx !== null && scrollEl) {
      const first = geometry.series[0];
      const dot = first?.dots[idx];
      if (dot) {
        const contentWidth = plotEl.offsetWidth;
        tipX = (dot.x / viewWidth) * contentWidth - scrollEl.scrollLeft;
        tipY = (dot.y / viewHeight) * (plotEl.offsetHeight || height);
      }
    }
  }

  function onLeave() {
    hoverIndex = null;
  }

  function pan(dir: -1 | 1) {
    if (!scrollEl) return;
    scrollEl.scrollBy({ left: dir * Math.max(120, scrollEl.clientWidth * 0.35), behavior: 'smooth' });
  }

  $: canScroll =
    scrollEl != null && scrollEl.scrollWidth > scrollEl.clientWidth + 4;

  $: tipRows =
    hoverIndex === null
      ? []
      : series.map((s) => {
          const pt = s.points[hoverIndex!];
          return {
            id: s.id,
            label: s.label,
            color: s.color,
            value: pt?.value ?? 0,
          };
        });

  $: tipLabel =
    hoverIndex !== null && geometry.labels[hoverIndex]
      ? geometry.labels[hoverIndex]
      : '';

  // Approximate path length for stroke animation (viewBox units)
  $: pathLen = Math.max(200, viewWidth * 1.4);
</script>

<div class="area-block">
  {#if series.length === 0 || geometry.labels.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="toolbar">
      <div class="legend">
        {#each series as s (s.id)}
          <span class="leg">
            <i style={`background:${s.color}`}></i>
            {s.label}
          </span>
        {/each}
      </div>
      <div class="pan" class:visible={canScroll || (series[0]?.points.length ?? 0) > 8}>
        <button type="button" class="pan-btn" aria-label="Desplazar izquierda" on:click={() => pan(-1)}>
          ‹
        </button>
        <button type="button" class="pan-btn" aria-label="Desplazar derecha" on:click={() => pan(1)}>
          ›
        </button>
      </div>
    </div>

    <div class="scroll" bind:this={scrollEl}>
      <div
        class="plot"
        style={`height:${height}px; width: max(100%, ${viewWidth}px)`}
        bind:this={plotEl}
        on:mousemove={onMove}
        on:mouseleave={onLeave}
        role="img"
        aria-label="Comparación temporal"
      >
        {#key animKey}
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            preserveAspectRatio="none"
            class="chart-svg"
          >
            <defs>
              {#each geometry.series as s (s.id)}
                <linearGradient id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color={s.color} stop-opacity="0.38" />
                  <stop offset="100%" stop-color={s.color} stop-opacity="0.02" />
                </linearGradient>
                <filter id={`${uid}-glow-${s.id}`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="1.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              {/each}
            </defs>

            <!-- Áreas -->
            {#each geometry.series as s, si (s.id)}
              <path
                class="area-path"
                d={s.area}
                fill={`url(#${uid}-${s.id})`}
                style={`animation-delay: ${si * 90}ms`}
              />
            {/each}

            <!-- Líneas con draw-on -->
            {#each geometry.series as s, si (s.id)}
              <path
                class="line-path"
                d={s.line}
                fill="none"
                stroke={s.color}
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
                style={`
                  stroke-dasharray: ${pathLen};
                  stroke-dashoffset: ${pathLen};
                  animation-delay: ${120 + si * 110}ms;
                  --path-len: ${pathLen};
                `}
              />
            {/each}

            <!-- Puntos -->
            {#if showDots}
              {#each geometry.series as s, si (s.id)}
                {#each s.dots as dot, i (`${s.id}-${i}`)}
                  <g transform={`translate(${dot.x}, ${dot.y})`}>
                    <g
                      class="dot-g"
                      class:active={hoverIndex === i}
                      style={`animation-delay: ${280 + si * 80 + Math.min(i, 40) * 12}ms`}
                    >
                      <circle class="dot-ring" r="6.5" fill={s.color} />
                      <circle class="dot-core" r="2.75" fill="var(--color-surface, #0b1020)" stroke={s.color} stroke-width="2" />
                      <circle class="dot-hit" r="11" fill="transparent" />
                    </g>
                  </g>
                {/each}
              {/each}
            {/if}

            {#if hoverIndex !== null && geometry.series[0]?.dots[hoverIndex]}
              {@const gx = geometry.series[0].dots[hoverIndex].x}
              <line
                class="guide"
                x1={gx}
                x2={gx}
                y1="0"
                y2={viewHeight}
                vector-effect="non-scaling-stroke"
              />
            {/if}
          </svg>
        {/key}

        {#if hoverIndex !== null && tipRows.length}
          <div
            class="tooltip"
            style={`left:${tipX}px; top:${Math.max(10, tipY - 14)}px`}
            role="tooltip"
          >
            <div class="tip-date">{tipLabel}</div>
            {#each tipRows as row (row.id)}
              <div class="tip-row">
                <span class="tip-dot" style={`background:${row.color}`}></span>
                <span class="tip-name">{row.label}</span>
                <span class="tip-val">{formatAmount(row.value)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="axis-scroll">
      <div class="axis" style={`width: max(100%, ${viewWidth}px)`}>
        {#each geometry.labels as label, i (label + '-' + i)}
          <span title={label}>{label}</span>
        {/each}
      </div>
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

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
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

  .pan {
    display: none;
    gap: 6px;
  }
  .pan.visible {
    display: inline-flex;
  }
  .pan-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
  }
  .pan-btn:hover {
    background: var(--color-surface-raised, var(--color-surface));
  }

  .scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    border-radius: 12px;
  }
  .scroll::-webkit-scrollbar {
    height: 6px;
  }
  .scroll::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-text-muted) 40%, transparent);
    border-radius: 99px;
  }

  .plot {
    position: relative;
    cursor: crosshair;
    min-width: 100%;
  }
  .chart-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Área: fade in */
  .area-path {
    opacity: 0;
    animation: area-in 700ms ease forwards;
  }
  @keyframes area-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Línea: dibujo progresivo */
  .line-path {
    animation: draw-line 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes draw-line {
    to {
      stroke-dashoffset: 0;
    }
  }

  /* Puntos */
  .dot-g {
    opacity: 0;
    animation: dot-in 420ms cubic-bezier(0.22, 1.2, 0.36, 1) forwards;
  }
  @keyframes dot-in {
    from {
      opacity: 0;
      transform: scale(0.35);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .dot-g.active {
    transform: scale(1.25);
  }
  .dot-ring {
    opacity: 0.18;
    transition: opacity 160ms ease, r 160ms ease;
  }
  .dot-core {
    transition: r 160ms ease;
  }
  .dot-g.active .dot-ring {
    opacity: 0.35;
  }
  .dot-g.active .dot-ring {
    opacity: 0.4;
  }

  .guide {
    stroke: var(--color-text-muted);
    stroke-opacity: 0.4;
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }

  .tooltip {
    position: absolute;
    z-index: 6;
    transform: translate(-50%, -100%);
    min-width: 148px;
    padding: 9px 11px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--color-surface, #12182a) 92%, transparent);
    backdrop-filter: blur(10px);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-soft, 0 14px 40px rgba(0, 0, 0, 0.35));
    pointer-events: none;
    font-size: 0.72rem;
  }
  .tip-date {
    font-weight: 700;
    margin-bottom: 6px;
    color: var(--color-text-primary);
  }
  .tip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }
  .tip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: 0 0 auto;
  }
  .tip-name {
    flex: 1;
    color: var(--color-text-secondary);
  }
  .tip-val {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .axis-scroll {
    overflow: hidden;
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
    max-width: 3.2rem;
    flex: 1 1 0;
    text-align: center;
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

  @media (prefers-reduced-motion: reduce) {
    .area-path,
    .line-path,
    .dot-g {
      animation: none !important;
      opacity: 1 !important;
      stroke-dashoffset: 0 !important;
    }
  }
</style>
