// Hospital-scoped i18n — a lightweight, self-contained language layer for the HOSPITAL
// module ONLY. Deliberately NOT wired to the platform-wide RE/RTL i18n (useRTL /
// useTranslation), which is region-driven and RE-only. This is a per-USER language
// CHOICE (English default, Bangla opt-in), persisted in localStorage — mirroring the
// ThemeToggle persist pattern — but exposed through a tiny external store so it
// re-renders reactively (incl. the shared sidebar's hospital section) with no provider.
// Other tenants never import this. Expandable to a global toggle later.
import { useSyncExternalStore, useCallback } from "react";
import { Languages } from "lucide-react";
import { EN } from "./strings.en";
import { BN } from "./strings.bn";

export type HxLang = "en" | "bn";
const KEY = "hx-lang";
const TABLES: Record<HxLang, Record<string, string>> = { en: EN, bn: BN };

function read(): HxLang {
  try { return localStorage.getItem(KEY) === "bn" ? "bn" : "en"; } catch { return "en"; }
}
let current: HxLang = read();
const subs = new Set<() => void>();

export function setHospitalLang(next: HxLang) {
  current = next === "bn" ? "bn" : "en";
  try { localStorage.setItem(KEY, current); } catch { /* storage blocked — keep in-memory */ }
  subs.forEach((f) => f());
}
function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
function snapshot(): HxLang { return current; }

/** Reactive current hospital language (re-renders consumers on change). */
export function useHospitalLang() {
  const lang = useSyncExternalStore(subscribe, snapshot, snapshot);
  const setLang = useCallback((l: HxLang) => setHospitalLang(l), []);
  const toggle = useCallback(() => setHospitalLang(current === "en" ? "bn" : "en"), []);
  return { lang, setLang, toggle };
}

/**
 * translate. `t(key, fallback?)` → current language string, falling back to English,
 * then to `fallback`, then the key (no breakage on a missing translation).
 * `ti(key, vars)` interpolates `{name}` placeholders AFTER lookup, so each language
 * keeps its own word order.
 */
export function useHospitalT() {
  const { lang } = useHospitalLang();
  const t = useCallback((key: string, fallback?: string): string => {
    const hit = TABLES[lang]?.[key];
    if (typeof hit === "string") return hit;
    const en = EN[key];
    if (typeof en === "string") return en;
    return fallback ?? key;
  }, [lang]);
  const ti = useCallback((key: string, vars: Record<string, string | number>, fallback?: string): string => {
    let s = t(key, fallback);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  }, [t]);
  return { t, ti, lang };
}

/** Small EN⇄BN toggle for the hospital surface — shows the language you'll switch TO. */
export function HospitalLangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useHospitalLang();
  return (
    <button
      type="button"
      className={`hx-btn hx-btn--ghost ${className}`}
      style={{ padding: "0.28rem 0.6rem" }}
      onClick={toggle}
      data-testid="hx-lang-toggle"
      aria-label="Switch language"
      title="Switch language / ভাষা পরিবর্তন করুন"
    >
      <Languages className="h-3.5 w-3.5" /> {lang === "en" ? "বাংলা" : "English"}
    </button>
  );
}
