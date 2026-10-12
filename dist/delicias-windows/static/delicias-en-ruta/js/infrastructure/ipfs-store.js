/**
 * Persistencia offline estilo IPFS: cada save genera un CID local (hash)
 * y encadena el estado. Todo en localStorage — sin servidor.
 */
const KEY = 'delicias.ipfs.v2';
const HIST = 'delicias.ipfs.history.v2';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class IpfsBusinessStore {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const pack = JSON.parse(raw);
      return pack.state || pack;
    } catch {
      return null;
    }
  }

  async save(state) {
    const payload = JSON.stringify(state);
    const cid = await sha256(payload + '|' + Date.now());
    const prev = localStorage.getItem(KEY);
    let prevCid = null;
    try { prevCid = prev ? JSON.parse(prev).cid : null; } catch {}
    const pack = { cid, prevCid, ts: new Date().toISOString(), state };
    localStorage.setItem(KEY, JSON.stringify(pack));
    const hist = JSON.parse(localStorage.getItem(HIST) || '[]');
    hist.unshift({ cid, prevCid, ts: pack.ts, size: payload.length });
    localStorage.setItem(HIST, JSON.stringify(hist.slice(0, 100)));
    return state;
  }

  async history() {
    return JSON.parse(localStorage.getItem(HIST) || '[]');
  }

  async exportSnapshot() {
    return localStorage.getItem(KEY);
  }

  async importSnapshot(raw) {
    const pack = typeof raw === 'string' ? JSON.parse(raw) : raw;
    localStorage.setItem(KEY, JSON.stringify(pack));
    return pack.state;
  }
}
