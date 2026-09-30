/**
 * Cliente Gravatar (solo frontend).
 *
 * DESARROLLO: VITE_GRAVATAR_API_KEY expuesta al cliente (temporal).
 * PRODUCCIÓN: la clave debe vivir en backend — NO implementar esa migración aquí.
 *
 * Avatares públicos: https://www.gravatar.com/avatar/{sha256}?d=404
 * Perfiles (opcional): https://api.gravatar.com/v3/profiles/{sha256} + Bearer
 */

export type GravatarPhotoHit = {
  email: string;
  avatarUrl: string;
  displayName?: string;
  profileUrl?: string;
  source: 'gravatar-avatar' | 'gravatar-profile';
};

function getApiKey(): string | undefined {
  try {
    const k = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_GRAVATAR_API_KEY;
    return k && String(k).trim() ? String(k).trim() : undefined;
  } catch {
    return undefined;
  }
}

export function isGravatarApiKeyConfigured(): boolean {
  return Boolean(getApiKey());
}

/** SHA-256 hex del email en minúsculas (requisito Gravatar). */
export async function gravatarHash(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function avatarUrlForHash(hash: string, size = 200): string {
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404&r=g`;
}

/**
 * Comprueba si hay avatar real (no default).
 * No requiere API key.
 */
export async function hasGravatarAvatar(
  email: string,
  signal?: AbortSignal,
): Promise<GravatarPhotoHit | null> {
  const hash = await gravatarHash(email);
  const url = avatarUrlForHash(hash, 200);
  try {
    const res = await fetch(url, { method: 'GET', signal, mode: 'cors' });
    if (!res.ok) return null;
    return {
      email,
      avatarUrl: url,
      source: 'gravatar-avatar',
    };
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return null;
  }
}

/**
 * Enriquece con perfil (display_name) si hay API key.
 * Si no hay clave, solo se usa hasGravatarAvatar.
 */
export async function fetchGravatarProfile(
  email: string,
  signal?: AbortSignal,
): Promise<GravatarPhotoHit | null> {
  const key = getApiKey();
  const hash = await gravatarHash(email);

  if (!key) {
    return hasGravatarAvatar(email, signal);
  }

  try {
    const res = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`, {
      method: 'GET',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      // fallback a avatar estático
      return hasGravatarAvatar(email, signal);
    }
    const profile = (await res.json()) as {
      display_name?: string;
      profile_url?: string;
      avatar_url?: string;
    };
    const avatarUrl =
      profile.avatar_url ||
      avatarUrlForHash(hash, 200);
    // Verificar que no sea 404 default
    const probe = await fetch(avatarUrlForHash(hash, 80), { method: 'GET', signal, mode: 'cors' });
    if (!probe.ok) return null;
    return {
      email,
      avatarUrl,
      displayName: profile.display_name,
      profileUrl: profile.profile_url,
      source: 'gravatar-profile',
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return hasGravatarAvatar(email, signal);
  }
}
