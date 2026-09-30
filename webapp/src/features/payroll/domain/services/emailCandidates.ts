/** Extracción y priorización de emails candidatos (solo en memoria, no persistir). */

const EMAIL_RE =
  /[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+/gi;

const INVALID_LOCAL = /^(noreply|no-reply|donotreply|mailer-daemon|postmaster|abuse)$/i;

export type EmailCandidate = {
  email: string;
  source?: string;
  score: number;
};

export function extractEmailsFromText(text: string, source?: string): EmailCandidate[] {
  if (!text) return [];
  const found = text.match(EMAIL_RE) || [];
  return found.map((raw) => {
    const email = raw.trim().toLowerCase();
    return { email, source, score: 0 };
  });
}

export function normalizeAndDedup(
  candidates: EmailCandidate[],
  personName: string,
): EmailCandidate[] {
  const map = new Map<string, EmailCandidate>();
  const tokens = tokenizeName(personName);

  for (const c of candidates) {
    const email = (c.email || '').trim().toLowerCase();
    if (!isLikelyValidEmail(email)) continue;
    const local = email.split('@')[0] || '';
    if (INVALID_LOCAL.test(local)) continue;

    const score = scoreEmailAgainstName(email, tokens) + (c.score || 0);
    const prev = map.get(email);
    if (!prev || score > prev.score) {
      map.set(email, { email, source: c.source || prev?.source, score });
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

function tokenizeName(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function isLikelyValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (!email.includes('@')) return false;
  const [local, domain] = email.split('@');
  if (!local || !domain || local.length > 64) return false;
  if (!domain.includes('.')) return false;
  if (email.includes('..')) return false;
  return true;
}

function scoreEmailAgainstName(email: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const local = email.split('@')[0] || '';
  let score = 0;
  for (const t of tokens) {
    if (local.includes(t)) score += 3;
    if (local.startsWith(t)) score += 1;
  }
  // iniciales tipo j.perez
  if (tokens.length >= 2) {
    const initials = tokens.map((t) => t[0]).join('');
    if (local.includes(initials)) score += 1;
  }
  return score;
}
