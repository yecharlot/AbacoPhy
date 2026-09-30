/**
 * Genera propuestas de username a partir de nombre + apellidos.
 * Las 3 opciones expuestas deben estar libres (comprobadas contra usernames existentes).
 */

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

export function slugUsernamePart(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
}

/** Partes: nombre, resto como apellidos. */
export function splitPersonName(full: string): { first: string; rest: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', rest: '' };
  if (parts.length === 1) return { first: parts[0], rest: '' };
  return { first: parts[0], rest: parts.slice(1).join(' ') };
}

function candidatesFromName(fullName: string): string[] {
  const { first, rest } = splitPersonName(fullName);
  const f = slugUsernamePart(first);
  const r = slugUsernamePart(rest);
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };
  if (f && r) {
    push(`${f}.${r}`);
    push(`${f}.${r.split('.')[0] || r}`);
    const initials = r
      .split('.')
      .filter(Boolean)
      .map((p) => p[0])
      .join('');
    if (initials) push(`${f}.${initials}`);
    push(`${f[0] || ''}${r}`.replace(/^\./, ''));
    push(`${f}_${r}`);
  } else if (f) {
    push(f);
    push(`${f}.1`);
    push(`${f}.user`);
  }
  // más variantes numéricas
  const base = out[0] || 'user';
  for (let i = 1; i <= 20; i++) push(`${base}${i}`);
  for (let i = 1; i <= 20; i++) push(`${base}.${i}`);
  return out;
}

/**
 * Devuelve exactamente `count` usernames disponibles (no en taken, case-insensitive).
 */
export function suggestAvailableUsernames(
  fullName: string,
  takenUsernames: string[],
  count = 3,
): string[] {
  const taken = new Set(takenUsernames.map((u) => u.trim().toLowerCase()).filter(Boolean));
  const suggestions: string[] = [];
  for (const c of candidatesFromName(fullName)) {
    if (taken.has(c.toLowerCase())) continue;
    suggestions.push(c);
    if (suggestions.length >= count) break;
  }
  // fallback absoluto
  let n = 1;
  while (suggestions.length < count) {
    const u = `user.${Date.now().toString(36)}.${n}`;
    if (!taken.has(u)) suggestions.push(u);
    n += 1;
  }
  return suggestions;
}
