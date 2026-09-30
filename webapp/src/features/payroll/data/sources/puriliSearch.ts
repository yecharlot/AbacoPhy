/**
 * Búsqueda web de persona para obtener texto con posibles emails.
 *
 * Proveedor primario: Purili (si VITE_PURILI_API_URL está configurada y CORS permite).
 * Fallback: DuckDuckGo Instant Answer (JSON público, sin API key).
 *
 * Los resultados son evidencia pública candidata, no identidad confirmada.
 */

export type WebSearchHit = {
  title: string;
  snippet: string;
  url?: string;
  provider: 'purili' | 'duckduckgo';
};

export type WebSearchResult = {
  query: string;
  hits: WebSearchHit[];
  /** Texto agregado para extracción de emails */
  corpus: string;
  provider: string;
};

function env(name: string): string | undefined {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name];
    return v && String(v).trim() ? String(v).trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Búsqueda Purili si hay endpoint configurado.
 * Contrato flexible: espera JSON con results[] o items[] con title/snippet/body/url.
 */
async function searchPurili(
  query: string,
  signal?: AbortSignal,
): Promise<WebSearchResult | null> {
  const base = env('VITE_PURILI_API_URL');
  if (!base) return null;

  const url = new URL(base);
  url.searchParams.set('q', query);
  const key = env('VITE_PURILI_API_KEY');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(url.toString(), { signal, headers, mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Purili respondió ${res.status}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const rows = (data.results || data.items || data.hits || []) as Record<string, unknown>[];
  const hits: WebSearchHit[] = rows.map((r) => ({
    title: String(r.title || r.name || ''),
    snippet: String(r.snippet || r.description || r.body || r.content || ''),
    url: r.url ? String(r.url) : r.link ? String(r.link) : undefined,
    provider: 'purili' as const,
  }));
  const corpus = hits.map((h) => `${h.title}\n${h.snippet}\n${h.url || ''}`).join('\n');
  return { query, hits, corpus, provider: 'purili' };
}

/** Fallback: DuckDuckGo Instant Answer API (sin clave). */
async function searchDuckDuckGo(
  query: string,
  signal?: AbortSignal,
): Promise<WebSearchResult> {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_redirect', '1');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');

  const res = await fetch(url.toString(), { signal, mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Búsqueda web falló (${res.status})`);
  }
  const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
    Results?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const hits: WebSearchHit[] = [];
  if (data.AbstractText) {
    hits.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      url: data.AbstractURL,
      provider: 'duckduckgo',
    });
  }
  const flatten = (
    topics: Array<{ Text?: string; FirstURL?: string; Topics?: unknown[] }> | undefined,
  ) => {
    if (!topics) return;
    for (const t of topics) {
      if (t.Text) {
        hits.push({
          title: t.Text.slice(0, 80),
          snippet: t.Text,
          url: t.FirstURL,
          provider: 'duckduckgo',
        });
      }
      if (Array.isArray(t.Topics)) {
        flatten(t.Topics as typeof topics);
      }
    }
  };
  flatten(data.RelatedTopics);
  for (const r of data.Results || []) {
    if (r.Text) {
      hits.push({
        title: r.Text.slice(0, 80),
        snippet: r.Text,
        url: r.FirstURL,
        provider: 'duckduckgo',
      });
    }
  }

  const corpus = hits.map((h) => `${h.title}\n${h.snippet}\n${h.url || ''}`).join('\n');
  return { query, hits, corpus, provider: 'duckduckgo' };
}

export async function searchPersonWeb(
  fullName: string,
  signal?: AbortSignal,
): Promise<WebSearchResult> {
  const query = fullName.trim();
  if (!query) throw new Error('Nombre vacío para búsqueda');

  try {
    const purili = await searchPurili(query, signal);
    if (purili && (purili.hits.length > 0 || purili.corpus.trim())) {
      return purili;
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    // continuar con fallback
  }

  return searchDuckDuckGo(query, signal);
}
