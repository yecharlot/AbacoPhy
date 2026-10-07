/**
 * Feedback global uniforme (éxito / error / info).
 * Usar desde cualquier feature sin acoplar a App.svelte.
 */

export type ToastKind = 'ok' | 'err' | 'info';

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type Listener = (items: ToastItem[]) => void;

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const DEFAULT_MS = 3200;

function emit() {
  listeners.forEach((fn) => fn(items));
}

function dismiss(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  items = items.filter((x) => x.id !== id);
  emit();
}

function push(kind: ToastKind, message: string, durationMs = DEFAULT_MS) {
  const text = (message || '').trim();
  if (!text) return;
  const id = ++seq;
  items = [...items.slice(-4), { id, kind, message: text }];
  emit();
  if (durationMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), durationMs),
    );
  }
}

export const toastStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(items);
    return () => listeners.delete(fn);
  },
  getItems(): ToastItem[] {
    return items;
  },
  dismiss,
  show(message: string, kind: ToastKind = 'info', durationMs?: number) {
    push(kind, message, durationMs ?? DEFAULT_MS);
  },
  success(message: string, durationMs?: number) {
    push('ok', message, durationMs ?? DEFAULT_MS);
  },
  error(message: string, durationMs?: number) {
    push('err', message, durationMs ?? 4500);
  },
  info(message: string, durationMs?: number) {
    push('info', message, durationMs ?? DEFAULT_MS);
  },
};

/** Atajos para features */
export function notifyOk(message: string) {
  toastStore.success(message);
}
export function notifyErr(message: string) {
  toastStore.error(message);
}
export function notifyInfo(message: string) {
  toastStore.info(message);
}
