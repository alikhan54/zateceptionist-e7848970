import { useState, useEffect, useRef, useCallback } from "react";

export interface ChSearchMatch {
  company_number: string | null;
  title: string | null;
  company_status: string | null;
  address_snippet: string | null;
  company_type: string | null;
  date_of_creation: string | null;
}

// Same self-healing URL pattern as useTriggerCompaniesHouseSync.
function buildSearchUrl(): string {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: { VITE_N8N_WEBHOOK_URL?: string } }).env
      : undefined;
  const base = env?.VITE_N8N_WEBHOOK_URL?.replace(/\/+$/, "");
  if (!base) return "https://webhooks.zatesystems.com/webhook/companies-house-search";
  return /\/webhook$/.test(base) ? `${base}/companies-house-search` : `${base}/webhook/companies-house-search`;
}
const SEARCH_URL = buildSearchUrl();

/**
 * Wave 2b Phase B — debounced Companies House name search. Calls the server-side
 * /companies-house-search webhook (CH key never leaves the server). Returns
 * matches for the current query; safe to wire to an autocomplete dropdown.
 */
export function useCompaniesHouseSearch(query: string, opts: { minChars?: number; debounceMs?: number } = {}) {
  const minChars = opts.minChars ?? 2;
  const debounceMs = opts.debounceMs ?? 400;
  const [matches, setMatches] = useState<ChSearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (q: string) => {
    const mySeq = ++seq.current;
    setLoading(true); setError(null);
    try {
      const resp = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await resp.json().catch(() => ({}));
      if (mySeq !== seq.current) return; // a newer query superseded this one
      if (!resp.ok || json.ok === false) {
        setMatches([]); setError(json.message || `Search HTTP ${resp.status}`);
      } else {
        setMatches(Array.isArray(json.matches) ? json.matches : []);
      }
    } catch (e) {
      if (mySeq !== seq.current) return;
      setMatches([]); setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < minChars) { setMatches([]); setLoading(false); setError(null); return; }
    const t = setTimeout(() => run(q), debounceMs);
    return () => clearTimeout(t);
  }, [query, minChars, debounceMs, run]);

  return { matches, loading, error, clear: () => setMatches([]) };
}
