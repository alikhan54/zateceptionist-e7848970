// Hospital-scoped AUTONOMY MODE — a lightweight, self-contained Manual / Assisted (/ Autonomous-
// reserved) control for the HOSPITAL module ONLY. Mirrors the hospital i18n store (./i18n) and the
// ECG/theme persist pattern: a tiny external store (useSyncExternalStore, no provider) persisted in
// localStorage, so every consumer re-renders reactively when the mode flips.
//
// This is DELIBERATELY hospital-scoped and local. It does NOT touch the shared platform control
// plane (`tenant_config.ai_mode` / AIControlCenter), which is a per-tenant global across
// sales/marketing/hr — leaving it untouched keeps every other tenant byte-identical. The vocabulary
// (manual | assisted | autonomous) is kept identical to that platform control so the planned Phase-D
// "Hospital / MEDICA" AI-Control-Center module can later read this without a rename.
//
// Persistence is per-browser (localStorage `hx-mode`) — in the real deployment each clinician is on
// their own device/session, so this is per-doctor in practice for a single hospital tenant. Built as
// the REUSABLE primitive the consultation surface uses today and the OT / post-op / nursing stages
// will reuse.
import { useSyncExternalStore, useCallback } from "react";
import { Bot, Sparkles, PencilLine } from "lucide-react";
import { useHospitalT } from "./i18n";

// Autonomous is RESERVED for later (the toggle offers Manual / Assisted only); kept in the type so
// downstream consumers can branch on it the day it ships.
export type HxMode = "manual" | "assisted" | "autonomous";
const KEY = "hx-mode";
const VALID: HxMode[] = ["manual", "assisted", "autonomous"];
const DEFAULT_MODE: HxMode = "assisted"; // matches the platform AIControlCenter default

function read(): HxMode {
  try {
    const v = localStorage.getItem(KEY) as HxMode | null;
    return v && VALID.includes(v) ? v : DEFAULT_MODE;
  } catch { return DEFAULT_MODE; }
}
let current: HxMode = read();
const subs = new Set<() => void>();

export function setHospitalMode(next: HxMode) {
  current = VALID.includes(next) ? next : DEFAULT_MODE;
  try { localStorage.setItem(KEY, current); } catch { /* storage blocked — keep in-memory */ }
  subs.forEach((f) => f());
}
function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
function snapshot(): HxMode { return current; }

/** Non-hook read of the current hospital mode — for async callers / event handlers. */
export function getHospitalMode(): HxMode { return current; }

/** Reactive current hospital autonomy mode (re-renders consumers on change). */
export function useHospitalMode() {
  const mode = useSyncExternalStore(subscribe, snapshot, snapshot);
  const setMode = useCallback((m: HxMode) => setHospitalMode(m), []);
  return { mode, setMode, isManual: mode === "manual", isAssisted: mode === "assisted", isAutonomous: mode === "autonomous" };
}

/**
 * Reusable Manual / Assisted segmented control (Autonomous shown as a reserved, disabled segment so
 * the full Autonomous/Assisted/Manual story is visible). Drop it onto any hospital surface that
 * should honour the doctor's chosen autonomy level. Uses only existing `hx-*` classes/vars → adapts
 * to light/dark automatically; labels come from the hospital i18n layer (en/bn).
 */
export function HospitalModeToggle({ className = "" }: { className?: string }) {
  const { t } = useHospitalT();
  const { mode, setMode } = useHospitalMode();
  const seg = (m: HxMode, label: string, Icon: any) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`hx-btn ${mode === m ? "hx-btn--primary" : "hx-btn--ghost"}`}
      style={{ padding: "0.28rem 0.6rem" }}
      data-testid={`hx-mode-${m}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="group"
      aria-label={t("mode.label")}
      data-testid="hx-mode-toggle"
      data-mode={mode}
    >
      {seg("manual", t("mode.manual"), PencilLine)}
      {seg("assisted", t("mode.assisted"), Sparkles)}
      <button
        type="button"
        disabled
        className="hx-btn hx-btn--ghost"
        style={{ padding: "0.28rem 0.6rem", opacity: 0.5, cursor: "not-allowed" }}
        title={t("mode.autonomousSoon")}
        data-testid="hx-mode-autonomous"
      >
        <Bot className="h-3.5 w-3.5" /> {t("mode.autonomous")}
      </button>
    </div>
  );
}
