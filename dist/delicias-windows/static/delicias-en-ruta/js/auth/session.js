const SK = 'delicias.session.v1';

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SK) || 'null');
    if (!s || !s.username) return null;
    return s;
  } catch { return null; }
}

export function setSession(user) {
  const s = { ...user, at: new Date().toISOString() };
  localStorage.setItem(SK, JSON.stringify(s));
  return s;
}

export function clearSession() {
  localStorage.removeItem(SK);
}
