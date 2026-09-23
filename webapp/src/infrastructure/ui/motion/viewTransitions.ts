/**
 * Transiciones de vista según dirección en el PillNav.
 *
 * direction < 0  → destino a la izquierda del activo actual
 *   salida R→L + fade out | entrada desde la derecha + fade in
 *
 * direction > 0  → destino a la derecha
 *   salida L→R + fade out | entrada desde la izquierda + fade in
 *
 * direction === 0 → solo fade
 */
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export type ViewDirection = -1 | 0 | 1;

/** Desplazamiento horizontal (px). Marcado pero contenido. */
const DIST = 48;
const DUR_IN = 320;
const DUR_OUT = 260;

function preferReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function viewIn(
  _node: Element,
  { direction = 0 as ViewDirection }: { direction?: ViewDirection } = {},
): TransitionConfig {
  if (preferReducedMotion()) {
    return {
      duration: 140,
      css: (t) => `opacity: ${t};`,
    };
  }
  const fromX = direction < 0 ? DIST : direction > 0 ? -DIST : 0;
  return {
    duration: DUR_IN,
    easing: cubicOut,
    css: (t) => {
      const x = (1 - t) * fromX;
      // Fade un poco más lento al inicio para que el slide se lea mejor
      const o = t * t * (3 - 2 * t);
      return `transform: translate3d(${x}px, 0, 0); opacity: ${o};`;
    },
  };
}

export function viewOut(
  _node: Element,
  { direction = 0 as ViewDirection }: { direction?: ViewDirection } = {},
): TransitionConfig {
  if (preferReducedMotion()) {
    return {
      duration: 120,
      css: (t) => `opacity: ${t};`,
    };
  }
  const toX = direction < 0 ? -DIST : direction > 0 ? DIST : 0;
  return {
    duration: DUR_OUT,
    easing: cubicOut,
    css: (t) => {
      const x = (1 - t) * toX;
      const o = t * t * (3 - 2 * t);
      return `transform: translate3d(${x}px, 0, 0); opacity: ${o};`;
    },
  };
}

export function navIndex(items: { id: string }[], id: string): number {
  return items.findIndex((i) => i.id === id);
}

export function directionBetween(fromIndex: number, toIndex: number): ViewDirection {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 0;
  return toIndex < fromIndex ? -1 : 1;
}
