<script lang="ts">
  import { formatAmount, formatCompact, type ChartSeries } from './chartTypes';

  export let series: ChartSeries[] = [];
  export let height = 260;
  export let emptyText = 'Sin datos para graficar';
  export let showDots = true;

  const PX_PER_POINT = 46;
  const MIN_VIEW_WIDTH = 420;
  const VIEW_HEIGHT = 170;
  const PAD_X = 18;
  const PAD_Y = 14;

  let visible: Record<string, boolean> = {};
  let hoverIndex: number | null = null;
  let plotEl: HTMLDivElement | null = null;
  let scrollEl: HTMLDivElement | null = null;
  let tipX = 0;
  let tipY = 0;

  $: seriesKey = series.map((s) => s.id).join('|');
  $: {
    const next: Record<string, boolean> = {};
    for (const s of series) next[s.id] = visible[s.id] !== false;
    visible = next;
  }

  $: activeSeries = series.filter((s) => visible[s.id] !== false);
  $: labels = series.find((s) => s.points.length)?.points.map((p) => p.label) ?? [];
  $: viewWidth = Math.max(MIN_VIEW_WIDTH, Math.max(labels.length, 1) * PX_PER_POINT);
  $: allValues = activeSeries.flatMap((s) => s.points.map((p) => p.value));
  $: rawMin = allValues.length ? Math.min(...allValues) : 0;
  $: rawMax = allValues.length ? Math.max(...allValues) : 1;
  $: minValue = Math.min(0, rawMin);
  $: maxValue = Math.max(0, rawMax);
  $: valueSpan = maxValue - minValue || 1;
  $: stepX = labels.length > 1 ? (viewWidth - PAD_X * 2) / (labels.length - 1) : 0;
  $: plotHeight = Math.max(1, height);

  function valueAt(s: ChartSeries, index: number): number {
    const byLabel = s.points.find((p) => p.label === labels[index]);
    return byLabel?.value ?? s.points[index]?.value ?? 0;
  }

  function pointY(value: number): number {
    return PAD_Y + ((maxValue - value) / valueSpan) * (VIEW_HEIGHT - PAD_Y * 2);
  }

  function pointX(index: number): number {
    return labels.length === 1 ? viewWidth / 2 : PAD_X + stepX * index;
  }

  function smoothPath(points: Array<{ x: number; y: number }>): string {
    if (!points.length) return '';
    if (points.length === 1) return 'M' + points[0].x.toFixed(2) + ',' + points[0].y.toFixed(2);

    let d = 'M' + points[0].x.toFixed(2) + ',' + points[0].y.toFixed(2);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = (curr.x - prev.x) / 3;
      d +=
        ' C' +
        (prev.x + dx).toFixed(2) + ',' + prev.y.toFixed(2) +
        ' ' +
        (curr.x - dx).toFixed(2) + ',' + curr.y.toFixed(2) +
        ' ' +
        curr.x.toFixed(2) + ',' + curr.y.toFixed(2);
    }
    return d;
  }

  function geometryFor(s: ChartSeries) {
    const dots = labels.map((_, i) => ({
      x: pointX(i),
      y: pointY(valueAt(s, i)),
      value: valueAt(s, i),
    }));
    const line = smoothPath(dots);
    const baseY = pointY(0);
    const first = dots[0];
    const last = dots[dots.length - 1];
    const area = dots.length
      ? line + ' L' + last.x.toFixed(2) + ',' + baseY.toFixed(2) +
        ' L' + first.x.toFixed(2) + ',' + baseY.toFixed(2) + ' Z'
      : '';
    return { id: s.id, color: s.color, line, area, dots };
  }

  $: geometries = activeSeries.map(geometryFor);
  $: zeroY = pointY(0);
  $: pathLength = Math.max(300, viewWidth * 1.7);
  $: canScroll = !!scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth + 4;

  function toggleSeries(id: string) {
    if (visible[id] !== false && activeSeries.length === 1) return;
    visible = { ...visible, [id]: visible[id] === false };
    hoverIndex = null;
  }

  function nearestIndex(clientX: number): number | null {
    if (!plotEl || !labels.length || !scrollEl) return null;
    const rect = plotEl.getBoundingClientRect();
    const contentWidth = plotEl.offsetWidth;
    if (!contentWidth) return null;
    const x = ((clientX - rect.left + scrollEl.scrollLeft) / contentWidth) * viewWidth;
    let best = 0;
    let distance = Infinity;
    for (let i = 0; i < labels.length; i++) {
      const d = Math.abs(pointX(i) - x);
      if (d < distance) {
        distance = d;
        best = i;
      }
    }
    return best;
  }

  function onMove(event: MouseEvent) {
    const index = nearestIndex(event.clientX);
    hoverIndex = index;
    if (index === null || !plotEl || !scrollEl) return;
    const contentWidth = plotEl.offsetWidth;
    tipX = (pointX(index) / viewWidth) * contentWidth - scrollEl.scrollLeft;
    tipY = (pointY(valueAt(activeSeries[0], index)) / VIEW_HEIGHT) * plotEl.offsetHeight;
  }

  function pan(direction: -1 | 1) {
    scrollEl?.scrollBy({
      left: direction * Math.max(140, (scrollEl.clientWidth || 360) * 0.42),
      behavior: 'smooth'
    });
  }

  function formatAxis(value: number): string {
    return formatCompact(value);
  }
</script>

<div class="area-block">
  {#if series.length === 0 || labels.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div class="toolbar">
      <div class="legend" aria-label="Series del gráfico">
        {#each series as s (s.id)}
          <button
            type="button"
            class:inactive={visible[s.id] === false}
            class="legend-item"
            aria-pressed={visible[s.id] !== false}
            onclick={() => toggleSeries(s.id)}
          >
            <span class="legend-mark" style={'--series-color:' + s.color}></span>
            <span>{s.label}</span>
          </button>
        {/each}
      </div>

      {#if canScroll || labels.length > 9}
        <div class="pan">
          <button type="button" class="pan-btn" aria-label="Desplazar izquierda" onclick={() => pan(-1)}>‹</button>
          <button type="button" class="pan-btn" aria-label="Desplazar derecha" onclick={() => pan(1)}>›</button>
        </div>
      {/if}
    </div>

    <div class="chart-shell">
      <div class="y-axis">
        <span>{formatAxis(maxValue)}</span>
        <span>{formatAxis((maxValue + minValue) / 2)}</span>
        <span>{formatAxis(minValue)}</span>
      </div>

      <div class="scroll" bind:this={scrollEl}>
        <div
          class="plot"
          bind:this={plotEl}
          style={'height:' + height + 'px; width:max(100%, ' + viewWidth + 'px)'}
          onmousemove={onMove}
          onmouseleave={() => (hoverIndex = null)}
          role="img"
          aria-label="Evolución de ingresos, gastos y ganancia neta"
        >
          <svg
            class="chart-svg"
            viewBox={'0 0 ' + viewWidth + ' ' + VIEW_HEIGHT}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              {#each activeSeries as s (s.id)}
                <linearGradient id={'area-' + s.id + '-' + seriesKey} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color={s.color} stop-opacity="0.20" />
                  <stop offset="100%" stop-color={s.color} stop-opacity="0" />
                </linearGradient>
              {/each}
            </defs>

            <g class="grid">
              <line x1={PAD_X} x2={viewWidth - PAD_X} y1={PAD_Y} y2={PAD_Y} />
              <line x1={PAD_X} x2={viewWidth - PAD_X} y1={VIEW_HEIGHT / 2} y2={VIEW_HEIGHT / 2} />
              <line x1={PAD_X} x2={viewWidth - PAD_X} y1={VIEW_HEIGHT - PAD_Y} y2={VIEW_HEIGHT - PAD_Y} />
              {#if minValue < 0 && maxValue > 0}
                <line class="zero" x1={PAD_X} x2={viewWidth - PAD_X} y1={zeroY} y2={zeroY} />
              {/if}
            </g>

            {#each geometries as g, index (g.id)}
              {#if index === 0}
                <path class="area-path" d={g.area} fill={'url(#area-' + g.id + '-' + seriesKey + ')'} />
              {/if}
            {/each}

            {#each geometries as g, index (g.id)}
              <path
                class:net-line={g.id === 'net'}
                class="line-path"
                d={g.line}
                fill="none"
                stroke={g.color}
                stroke-width={g.id === 'net' ? 3 : 2.2}
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
                style={'--delay:' + (index * 110) + 'ms; --path-length:' + pathLength}
              />
            {/each}

            {#if hoverIndex !== null}
              <line
                class="guide"
                x1={pointX(hoverIndex)}
                x2={pointX(hoverIndex)}
                y1="0"
                y2={VIEW_HEIGHT}
                vector-effect="non-scaling-stroke"
              />
            {/if}

            {#if showDots}
              {#each geometries as g (g.id)}
                {#each g.dots as dot, index (g.id + '-' + index)}
                  <g class:active={hoverIndex === index} class="dot" transform={'translate(' + dot.x + ',' + dot.y + ')'}>
                    <circle r="7" fill={g.color} opacity="0.12" />
                    <circle r="3.1" fill="var(--color-surface, #101624)" stroke={g.color} stroke-width="1.8" />
                  </g>
                {/each}
              {/each}
            {/if}
          </svg>

          {#if hoverIndex !== null && activeSeries.length > 0}
            <div
              class="tooltip"
              style={'left:' + tipX + 'px; top:' + Math.max(10, tipY - 18) + 'px'}
              role="tooltip"
            >
              <div class="tip-date">{labels[hoverIndex]}</div>
              {#each activeSeries as s (s.id)}
                <div class="tip-row">
                  <span class="tip-dot" style={'background:' + s.color}></span>
                  <span class="tip-name">{s.label}</span>
                  <strong>{formatAmount(valueAt(s, hoverIndex))}</strong>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="axis-scroll">
      <div class="axis" style={'width:max(100%, ' + viewWidth + 'px)'}>
        {#each labels as label, index (label + '-' + index)}
          <span>{label}</span>
        {/each}
      </div>
    </div>

    <div class="peaks">
      {#each series as s (s.id)}
        {@const values = s.points.map((p) => p.value)}
        {@const max = values.length ? Math.max(...values) : 0}
        <span style={'color:' + s.color}>{s.label}: máx {formatCompact(max)}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .area-block { width: 100%; }

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
    gap: 7px;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 5px 10px;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .legend-item:hover {
    transform: translateY(-1px);
    border-color: var(--color-text-muted);
  }

  .legend-item.inactive {
    opacity: 0.45;
  }

  .legend-mark {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--series-color);
    box-shadow: 0 0 10px color-mix(in srgb, var(--series-color) 35%, transparent);
  }

  .pan {
    display: inline-flex;
    gap: 6px;
  }

  .pan-btn {
    width: 30px;
    height: 30px;
    border: 1px solid var(--color-border);
    border-radius: 9px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
  }

  .chart-shell {
    display: flex;
    min-width: 0;
  }

  .y-axis {
    width: 42px;
    flex: 0 0 42px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 3px 6px 3px 0;
    color: var(--color-text-muted);
    font-size: 0.62rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .scroll {
    min-width: 0;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-text-muted) 35%, transparent) transparent;
  }

  .scroll::-webkit-scrollbar { height: 5px; }
  .scroll::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-text-muted) 35%, transparent);
    border-radius: 99px;
  }

  .plot {
    position: relative;
    min-width: 100%;
    cursor: crosshair;
  }

  .chart-svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .grid line {
    stroke: var(--color-border);
    stroke-opacity: 0.55;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    stroke-dasharray: 3 5;
  }

  .grid .zero {
    stroke: var(--color-text-muted);
    stroke-opacity: 0.55;
    stroke-dasharray: 5 4;
  }

  .area-path {
    opacity: 0;
    animation: area-in 700ms ease forwards;
  }

  .line-path {
    stroke-dasharray: var(--path-length);
    stroke-dashoffset: var(--path-length);
    animation: draw-line 950ms cubic-bezier(0.22, 1, 0.36, 1) var(--delay) forwards;
    filter: drop-shadow(0 2px 5px color-mix(in srgb, currentColor 16%, transparent));
  }

  .dot {
    opacity: 0;
    transform-origin: center;
    animation: dot-in 360ms cubic-bezier(0.22, 1.2, 0.36, 1) forwards;
    transition: opacity 140ms ease;
  }

  .dot.active {
    opacity: 1;
  }

  .dot.active circle:first-child {
    opacity: 0.28;
  }

  .guide {
    stroke: var(--color-text-muted);
    stroke-opacity: 0.42;
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }

  .tooltip {
    position: absolute;
    z-index: 5;
    min-width: 168px;
    transform: translate(-50%, -100%);
    padding: 9px 11px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-soft, 0 14px 38px rgba(0,0,0,.28));
    pointer-events: none;
    font-size: 0.71rem;
  }

  .tip-date {
    margin-bottom: 6px;
    color: var(--color-text-primary);
    font-weight: 750;
  }

  .tip-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }

  .tip-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
  }

  .tip-name {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .tip-row strong {
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
  }

  .axis-scroll {
    margin-left: 42px;
    overflow: hidden;
  }

  .axis {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 6px;
  }

  .axis span {
    flex: 1 1 0;
    max-width: 4.2rem;
    overflow: hidden;
    color: var(--color-text-muted);
    font-size: 0.62rem;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .peaks {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
    margin-left: 42px;
    color: var(--color-text-muted);
    font-size: 0.69rem;
  }

  .empty {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  @keyframes area-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes draw-line {
    to { stroke-dashoffset: 0; }
  }

  @keyframes dot-in {
    from { opacity: 0; transform: scale(.45); }
    to { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 640px) {
    .toolbar { align-items: flex-start; }
    .legend { gap: 5px; }
    .legend-item { padding: 5px 8px; }
    .y-axis { width: 36px; flex-basis: 36px; }
    .axis-scroll, .peaks { margin-left: 36px; }
    .tooltip { min-width: 150px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .area-path, .line-path, .dot {
      animation: none !important;
      opacity: 1 !important;
      stroke-dashoffset: 0 !important;
    }

    .legend-item { transition: none; }
  }
</style>
