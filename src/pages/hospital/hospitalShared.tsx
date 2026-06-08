// Shared hospital-vertical primitives: the industry gate + dark shell, the ECG motif,
// and the medica-brief Edge Function client. Importing this also loads the scoped theme.
import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalT, HospitalLangToggle, withLang } from "./i18n";
import { useHospitalRole, HOSPITAL_ROLE_HOME, type HospitalRole } from "@/hooks/useHospitalRole";
import "./hospital.css";

/**
 * Industry gate. The /hospital/* routes are URL-reachable by any authed user (no
 * route-level guard), so a non-hospital tenant is HARD-REDIRECTED out. A hospital
 * tenant gets the dark `.hx` command surface wrapping the page.
 */
export function HospitalGate({ children, allow }: { children: React.ReactNode; allow?: HospitalRole[] }) {
  const { isHospital, isLoading, tenantConfig } = useTenant();
  const { t } = useHospitalT();
  const { hospitalRole, loading: roleLoading } = useHospitalRole();
  // Apply the persisted ECG-animation preference across every hospital page [FIX2].
  useEffect(() => {
    document.documentElement.classList.toggle("hx-ecg-off", localStorage.getItem("hx-ecg-off") === "1");
  }, []);
  const loadingShell = (
    <div className="hx" data-testid="hospital-surface">
      <div className="hx-rise" style={{ padding: "5rem 1rem", textAlign: "center" }}>
        <span className="hx-pulse-dot" style={{ display: "inline-block", marginBottom: 12 }} />
        <div className="hx-dim">{t("surface.loading")}</div>
      </div>
    </div>
  );
  // Do NOT redirect while the tenant/industry is still resolving — otherwise a refresh
  // or direct-nav onto a /hospital/* URL would bounce to /dashboard before industry loads.
  // `tenantConfig` is null until the config fetch completes; `isLoading` starts false, so
  // the null check is what actually covers the first-render window.
  if (isLoading || !tenantConfig) return loadingShell;
  if (!isHospital) return <Navigate to="/dashboard" replace />;
  // HOSPITAL-RBAC [8]: when a page declares `allow`, a role not in it is redirected to its OWN home
  // (never a broken page). Pages without `allow` are unchanged. admin/master_admin → 'admin' (in every
  // page's allow list) → never redirected. Resolve the role first to avoid flashing a disallowed page.
  if (allow) {
    if (roleLoading) return loadingShell;
    if (hospitalRole && !allow.includes(hospitalRole)) return <Navigate to={HOSPITAL_ROLE_HOME[hospitalRole]} replace />;
  }
  return <div className="hx" data-testid="hospital-surface"><HospitalBack />{children}</div>;
}

/** A small, consistent "Back" control + the hospital language toggle, on every page [15]. */
function HospitalBack() {
  const navigate = useNavigate();
  const { t } = useHospitalT();
  return (
    <div className="flex items-center justify-between gap-2" style={{ marginBottom: "0.85rem" }}>
      <button type="button" onClick={() => navigate(-1)} className="hx-btn hx-btn--ghost"
        style={{ padding: "0.28rem 0.65rem" }} data-testid="hx-back">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("common.back")}
      </button>
      <HospitalLangToggle />
    </div>
  );
}

/** Animated ECG trace — the clinical heartbeat motif. */
export function EcgLine({ className = "" }: { className?: string }) {
  // a repeating PQRST-ish trace across a wide viewBox; the `spark` dash travels along it
  const d =
    "M0 19 H60 l6 -2 6 4 H120 l10 0 4 -15 5 28 4 -13 H200 l6 -2 6 4 H320 l10 0 4 -15 5 28 4 -13 H400 " +
    "l6 -2 6 4 H520 l10 0 4 -15 5 28 4 -13 H600 l6 -2 6 4 H720 l10 0 4 -15 5 28 4 -13 H820";
  return (
    <svg className={`hx-ecg ${className}`} viewBox="0 0 820 38" preserveAspectRatio="none" aria-hidden="true">
      <path className="trace" d={d} />
      <path className="spark" d={d} />
    </svg>
  );
}

export interface MedicaBriefResult {
  response: string;
  agent_used: string;
  tenant_id?: string;
}

/**
 * Calls the medica-brief Edge Function. The Supabase client auto-attaches the user's
 * session JWT; tenant_id is derived SERVER-SIDE (never sent). The patient is identified
 * inside the natural-language message so MEDICA can ground in patient_360.
 */
export async function fetchMedicaBrief(patientName: string, patientId: string, lang: "en" | "bn" = "en"): Promise<MedicaBriefResult> {
  // lang rides INSIDE the message the caller already sends — no brain/Edge-Function change.
  const message = withLang(
    `A clinician is about to see the patient '${patientName}' (patient id ${patientId}). ` +
    `Anything I should know about this patient before the encounter? Give a concise, ` +
    `point-form pre-visit briefing grounded in the patient's record.`,
    lang,
  );
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No briefing returned");
  return data as MedicaBriefResult;
}

export interface MedRec { name: string; dose: string; rationale: string; }

/**
 * MEDICA medication recommendations [13] — rides the SAME medica-brief path (NO brain / Edge
 * Function change). Instructs MEDICA to return a STRUCTURED JSON array of suggestions grounded
 * in the patient record. These are DECISION-SUPPORT SUGGESTIONS for the physician to review &
 * approve — the message explicitly forbids prescribing / placing orders. `lang` puts the
 * rationale in Bangla (drug names + doses + units stay standard English). Throws if the model
 * returns nothing parseable; returns [] only for a genuinely empty list.
 */
export async function fetchMedicaRecommendations(patientName: string, patientId: string, lang: "en" | "bn" = "en"): Promise<MedRec[]> {
  const message =
    `For the hospital patient '${patientName}' (patient id ${patientId}), review their record ` +
    `(diagnosis, vitals, recent orders, history) and recommend appropriate medications for the physician to consider. ` +
    `Return ONLY a JSON array (no prose, no markdown) of up to 6 items, each exactly ` +
    `{"name":"<drug name>","dose":"<dose & frequency>","rationale":"<one short clinical reason` +
    `${lang === "bn" ? ", written in Bangla (বাংলা)" : ""}>"}. Drug names, doses and units stay in standard English. ` +
    `These are SUGGESTIONS for the physician to review and approve — do NOT prescribe, do NOT place orders.`;
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No recommendations returned");
  const m = String(data.response).match(/\[\s*{[\s\S]*}\s*\]/);
  if (!m) throw new Error("Could not read recommendations");
  let arr: any;
  try { arr = JSON.parse(m[0]); } catch { throw new Error("Could not read recommendations"); }
  if (!Array.isArray(arr)) throw new Error("Could not read recommendations");
  return arr
    .filter((r) => r && r.name)
    .map((r) => ({ name: String(r.name).trim(), dose: String(r.dose ?? "").trim(), rationale: String(r.rationale ?? "").trim() }))
    .slice(0, 8);
}
