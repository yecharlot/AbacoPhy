/** Cliente HTTP hacia API ÁbacoPhy (gemelo funcional de main). Fallback offline si falla. */
const BASE = '';

export async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json', 'X-AbacoPhy-Client': 'delicias-en-ruta' }, opts.headers || {});
  const token = localStorage.getItem('delicias.token');
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(BASE + path, { ...opts, headers, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const err = new Error((data && (data.error || data.message)) || r.statusText || 'error');
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function probeBackend() {
  try {
    const j = await api('/api/v1/health');
    return !!(j && j.ok);
  } catch {
    return false;
  }
}

export async function login(username, password) {
  const j = await api('/api/v1/auth/login', { method: 'POST', body: { username, password } });
  if (j && (j.token || j.access_token)) {
    localStorage.setItem('delicias.token', j.token || j.access_token);
  }
  if (j && j.user) localStorage.setItem('delicias.user', JSON.stringify(j.user));
  return j;
}

export function logout() {
  localStorage.removeItem('delicias.token');
  localStorage.removeItem('delicias.user');
  return api('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem('delicias.user') || 'null'); } catch { return null; }
}
