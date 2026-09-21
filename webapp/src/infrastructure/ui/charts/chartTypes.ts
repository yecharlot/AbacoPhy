/**
 * Primitivas de gráficos — infraestructura de UI.
 * Sin dependencias npm: todo se dibuja con SVG/CSS y tokens del tema.
 * Aquí no hay reglas de negocio, solo geometría y formato.
 */

export type ChartPoint = {
  label: string;
  value: number;
  /** Color explícito; si falta se toma de la paleta por índice. */
  color?: string;
  /** Texto secundario opcional (fecha, código, etc.). */
  hint?: string;
};

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
  pct: number;
  dash: string;
  offset: number;
};

export type LineGeometry = {
  line: string;
  area: string;
  dots: Array<{ x: number; y: number; label: string; value: number }>;
};

export const CHART_PALETTE: string[] = [
  'var(--accent-cyan)',
  'var(--accent-purple)',
  'var(--accent-green)',
  'var(--accent-pink)',
  'var(--accent-blue)',
  'var(--accent-yellow)',
  'var(--accent-red)',
];

export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/** 12.345,6 → "12,3 K" (es-CU, para etiquetas de ejes). */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)} K`;
  return value.toFixed(abs < 10 && abs > 0 ? 2 : 0);
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat('es-CU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function sumValues(points: ChartPoint[]): number {
  return points.reduce((acc, point) => acc + point.value, 0);
}

export function maxValue(points: ChartPoint[]): number {
  return points.reduce((acc, point) => (point.value > acc ? point.value : acc), 0);
}

/** Porcentaje 0–100 con protección de división por cero. */
export function percentOf(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function buildDonutSegments(points: ChartPoint[], circumference: number): DonutSegment[] {
  const total = sumValues(points);
  let consumed = 0;

  return points.map((point, index) => {
    const pct = percentOf(point.value, total);
    const length = (pct / 100) * circumference;
    const segment: DonutSegment = {
      label: point.label,
      value: point.value,
      color: point.color ?? paletteColor(index),
      pct,
      dash: `${length} ${circumference - length}`,
      offset: -consumed,
    };
    consumed += length;
    return segment;
  });
}

/** Geometría de línea/área normalizada a un viewBox de width × height. */
export function buildLineGeometry(
  points: ChartPoint[],
  width: number,
  height: number,
  padding = 8,
): LineGeometry {
  if (points.length === 0) {
    return { line: '', area: '', dots: [] };
  }

  const top = padding;
  const bottom = height - padding;
  const usableHeight = bottom - top;
  const max = maxValue(points);
  const min = points.reduce((acc, point) => (point.value < acc ? point.value : acc), points[0].value);
  const span = max - min || 1;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const dots = points.map((point, index) => ({
    x: padding + step * index,
    y: bottom - ((point.value - min) / span) * usableHeight,
    label: point.label,
    value: point.value,
  }));

  const line = dots
    .map((dot, index) => `${index === 0 ? 'M' : 'L'}${dot.x.toFixed(2)},${dot.y.toFixed(2)}`)
    .join(' ');

  const first = dots[0];
  const last = dots[dots.length - 1];
  const area = `${line} L${last.x.toFixed(2)},${bottom} L${first.x.toFixed(2)},${bottom} Z`;

  return { line, area, dots };
}

/** Altura relativa (0–100 %) de cada barra respecto al mayor valor. */
export function barHeights(points: ChartPoint[]): number[] {
  const max = maxValue(points);
  if (max === 0) return points.map(() => 0);
  return points.map((point) => Math.max(2, (point.value / max) * 100));
}
