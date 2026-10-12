/**
 * Persistencia orientada a IPFS (clean architecture — infrastructure).
 * - Si existe un nodo/API IPFS (window.__IPFS_API__), usa add/cat HTTP.
 * - Si no, content-addressing local (SHA-256) + localStorage, compatible con el
 *   mismo contrato (CID + payload) para no romper el dominio.
 */
import { BusinessRepository } from '../domain/repository.js';
import { createEmptyState } from '../domain/entities.js';

const NS = 'delicias-en-ruta:v1';
const KEY_STATE = NS + ':state';
const KEY_HIST = NS + ':history';

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toHexString?.() || b.toString(16).padStart(2, '0')).join('');
}

function toCid(hex) {
  return 'bafy' + hex.slice(0, 46);
}

export class IpfsBusinessStore extends BusinessRepository {
  constructor(apiBase) {
    super();
    this.apiBase = apiBase || (typeof window !== 'undefined' && window.__IPFS_API__) || '';
  }

  async _putRemote(json) {
    if (!this.apiBase) return null;
    try {
      const res = await fetch(this.apiBase.replace(/\/$/, '') + '/api/v0/add', {
        method: 'POST',
        body: (() => {
          const fd = new FormData();
          fd.append('file', new Blob([json], { type: 'application/json' }));
          return fd;
        })(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.Hash || data.cid || null;
    } catch {
      return null;
    }
  }

  async save(state) {
    const payload = JSON.stringify({ ...state, meta: { ...state.meta, updatedAt: new Date().toISOString() } });
    let cid = await this._putRemote(payload);
    if (!cid) {
      const hex = await sha256Hex(payload);
      cid = toCid(hex);
    }
    const next = JSON.parse(payload);
    next.meta = { ...(next.meta || {}), lastCid: cid, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEY_STATE, JSON.stringify(next));
    const hist = JSON.parse(localStorage.getItem(KEY_HIST) || '[]');
    hist.unshift({ cid, at: next.meta.updatedAt });
    localStorage.setItem(KEY_HIST, JSON.stringify(hist.slice(0, 50)));
    return next;
  }

  async load() {
    const raw = localStorage.getItem(KEY_STATE);
    if (!raw) return createEmptyState();
    try {
      return { ...createEmptyState(), ...JSON.parse(raw) };
    } catch {
      return createEmptyState();
    }
  }

  async history() {
    try {
      return JSON.parse(localStorage.getItem(KEY_HIST) || '[]');
    } catch {
      return [];
    }
  }
}
