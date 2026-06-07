// Shared hospital-vertical primitives: the industry gate + dark shell, the ECG motif,
// and the medica-brief Edge Function client. Importing this also loads the scoped theme.
import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import "./hospital.css";

/**
 * Industry gate. The /hospital/* routes are URL-reachable by any authed user (no
 * route-level guard), so a non-hospital tenant is HARD-REDIRECTED out. A hospital
 * tenant gets the dark `.hx` command surface wrapping the page.
 */
export function HospitalGate({ children }: { children: React.ReactNode }) {
  const { isHospital, isLoading, tenantConfig } = useTenant();
  // Apply the persisted ECG-animation preference across every hospital page [FIX2].
  useEffect(() => {
    document.documentElement.classList.toggle("hx-ecg-off", localStorage.getItem("hx-ecg-off") === "1");
  }, []);
  // Do NOT redirect while the tenant/industry is still resolving — otherwise a refresh
  // or direct-nav onto a /hospital/* URL would bounce to /dashboard before industry loads.
  // `tenantConfig` is null until the config fetch completes; `isLoading` starts false, so
  // the null check is what actually covers the first-render window.
  if (isLoading || !tenantConfig) {
    return (
      <div className="hx" data-testid="hospital-surface">
        <div className="hx-rise" style={{ padding: "5rem 1rem", textAlign: "center" }}>
          <span className="hx-pulse-dot" style={{ display: "inline-block", marginBottom: 12 }} />
          <div className="hx-dim">Loading clinical surface…</div>
        </div>
      </div>
    );
  }
  if (!isHospital) return <Navigate to="/dashboard" replace />;
  return <div className="hx" data-testid="hospital-surface"><HospitalBack />{children}</div>;
}

/** A small, consistent "Back" control across the hospital flow [15]. */
function HospitalBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)} className="hx-btn hx-btn--ghost"
      style={{ padding: "0.28rem 0.65rem", marginBottom: "0.85rem" }} data-testid="hx-back">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
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
export async function fetchMedicaBrief(patientName: string, patientId: string): Promise<MedicaBriefResult> {
  const message =
    `A clinician is about to see the patient '${patientName}' (patient id ${patientId}). ` +
    `Anything I should know about this patient before the encounter? Give a concise, ` +
    `point-form pre-visit briefing grounded in the patient's record.`;
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No briefing returned");
  return data as MedicaBriefResult;
}
