/**
 * Bus reactivo Delicias en Ruta
 * - notify(event, detail) tras mutaciones de dominio
 * - subscribe(fn) → unsubscribe
 * - Sincroniza pestañas del mismo origen (storage + BroadcastChannel)
 */
const listeners = new Set();
const CHANNEL = 'delicias.reactive.v1';
let bc = null;

try {
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev) => {
      const msg = ev.data || {};
      if (msg.source === 'delicias') emitLocal(msg.type || 'state', msg.detail || {}, false);
    };
  }
} catch (_) { /* ignore */ }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'delicias.ipfs.v2' || e.key === 'delicias.reactive.ping') {
      emitLocal('state', { reason: 'storage', key: e.key }, false);
    }
  });
}

function emitLocal(type, detail, broadcast) {
  const payload = { type, detail, at: Date.now() };
  listeners.forEach((fn) => {
    try { fn(payload); } catch (err) { console.error('[delicias.reactive]', err); }
  });
  if (broadcast && bc) {
    try { bc.postMessage({ source: 'delicias', type, detail }); } catch (_) {}
  }
  if (broadcast && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('delicias.reactive.ping', String(Date.now()));
    } catch (_) {}
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(type = 'state', detail = {}) {
  emitLocal(type, detail, true);
}

export function notifyLocal(type = 'state', detail = {}) {
  emitLocal(type, detail, false);
}
