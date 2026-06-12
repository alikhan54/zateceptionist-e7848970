// Shared hospital-vertical primitives: the industry gate + dark shell, the ECG motif,
// and the medica-brief Edge Function client. Importing this also loads the scoped theme.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
/** [ZATEOS A5] Proper-case patient names for DISPLAY everywhere (adeel → Adeel, rahul → Rahul).
 *  Short ALL-CAPS tokens (≤4 chars, e.g. UPS) are treated as acronyms and left alone.
 *  Display-level only — stored data is never mutated. */
export function displayName(name?: string | null): string {
  if (!name) return "";
  return name.split(/\s+/).map((w) =>
    w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)
      ? w
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  ).join(" ");
}

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

/** Structured consultation summary — the 5 SOAP-ish sections MEDICA drafts (Assisted mode). */
export interface ConsultationSummary {
  chief_complaint: string;
  history: string;
  examination: string;
  assessment: string;
  plan: string;
}

const EMPTY_SUMMARY: ConsultationSummary = { chief_complaint: "", history: "", examination: "", assessment: "", plan: "" };

/**
 * ASSISTED consultation summary [HOSPITAL-CONSULT] — rides the SAME medica-brief path (NO brain /
 * Edge Function change). MEDICA reads the doctor's free-text consultation notes (the authoritative
 * source) and structures them into chief complaint / history / examination / assessment / plan.
 * This is a DRAFT for the physician to review, edit and APPROVE before it is saved — the message
 * forbids inventing clinical facts not in the notes/record. `lang` puts the section PROSE in Bangla
 * (clinical terms, drug names, units and IDs stay standard English). Returns the 5 sections; throws
 * if the model returns nothing parseable.
 */
export async function fetchConsultationSummary(
  notes: string, patientName: string, patientId: string, lang: "en" | "bn" = "en",
  opts?: { doctorId?: string | null },
): Promise<ConsultationSummary> {
  // HOSPITAL-STYLE: this doctor's learned corrections ("" when none → message byte-identical to today)
  const styleBlock = await loadDoctorStyleBlock(opts?.doctorId, "consult");
  const message =
    `A clinician has written these consultation notes for the hospital patient '${patientName}' ` +
    `(patient id ${patientId}). Notes:\n"""\n${notes}\n"""\n` +
    `Summarize ONLY what these notes (and the patient's record) support into a structured consultation ` +
    `summary. Do NOT invent findings, diagnoses or plans that are not present. Return ONLY a JSON object ` +
    `(no prose, no markdown) with exactly these keys: ` +
    `{"chief_complaint":"…","history":"…","examination":"…","assessment":"…","plan":"…"}. ` +
    `Each value is concise clinical prose${lang === "bn" ? ", written in Bangla (বাংলা)" : ""}; use an empty string ` +
    `for a section the notes don't cover. Medical terms, drug names, units and IDs stay in standard English.` +
    styleBlock;
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No summary returned");
  const m = String(data.response).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the summary");
  let obj: any;
  try { obj = JSON.parse(m[0]); } catch { throw new Error("Could not read the summary"); }
  if (!obj || typeof obj !== "object") throw new Error("Could not read the summary");
  const s = (v: any) => String(v ?? "").trim();
  return {
    chief_complaint: s(obj.chief_complaint),
    history: s(obj.history),
    examination: s(obj.examination),
    assessment: s(obj.assessment),
    plan: s(obj.plan),
  };
}

export { EMPTY_SUMMARY };

/** One line of a prescription. name/dose are clinical (English); the rest may be localized. */
export interface RxItem { name: string; dose: string; frequency: string; duration: string; route: string; }
export interface PrescriptionDraft { items: RxItem[]; advice: string; follow_up: string; }

/**
 * ASSISTED prescription draft [HOSPITAL-RX] — rides the SAME medica-brief path (NO brain / Edge
 * Function change). MEDICA structures the meds the doctor has ALREADY PLACED (`placedMeds`, the
 * authoritative source) into Rx lines {name,dose,frequency,duration,route} and drafts patient advice
 * + follow-up grounded in the consultation. HARD GUARDRAIL: it uses ONLY the supplied medications —
 * it must NOT add a drug the doctor didn't place (same grounding rule as the consult summary). The
 * order item text is free-form (e.g. "Amlodipine 5mg"), so MEDICA may fill a sensible dose /
 * frequency / duration / route where the order text doesn't state it — that structuring IS the
 * intelligence the incumbent lacks. `lang=bn` writes advice/follow-up + frequency/duration/route in
 * Bangla; drug names + doses stay standard English. This is an AI DRAFT — not valid until the doctor
 * signs. Returns empty items only for a genuinely empty placed-med list.
 */
export async function fetchPrescriptionDraft(
  placedMeds: string[], consultationContext: string, patientName: string, patientId: string, lang: "en" | "bn" = "en",
  opts?: { doctorId?: string | null },
): Promise<PrescriptionDraft> {
  // HOSPITAL-STYLE: this doctor's learned corrections ("" when none → message byte-identical to today)
  const styleBlock = await loadDoctorStyleBlock(opts?.doctorId, "rx");
  const medList = placedMeds.map((m, i) => `${i + 1}. ${m}`).join("\n");
  // Framed as FORMATTING assistance for meds the physician already decided + placed — NOT MEDICA
  // prescribing (which it refuses, by design). The physician reviews, edits and signs every line.
  const message =
    `The physician treating hospital patient '${patientName}' (patient id ${patientId}) has ALREADY ` +
    `selected and placed these medications — this is the physician's own clinical decision:\n` +
    `"""\n${medList}\n"""\n` +
    (consultationContext ? `Encounter context (for the advice / follow-up wording only):\n"""\n${consultationContext}\n"""\n` : "") +
    `Act as a FORMATTING assistant for the physician — you are NOT prescribing and NOT making clinical ` +
    `decisions; the physician will review, edit and SIGN every line. Organize the medications the physician ` +
    `already placed into a structured table for that review. For EACH placed medication output ` +
    `{name, dose, frequency, duration, route}: keep name and dose exactly as the physician placed them; for ` +
    `frequency/duration/route put the standard administration for that medication as an EDITABLE PLACEHOLDER ` +
    `the physician will confirm or change. Use ONLY the medications listed above — do not add, remove or ` +
    `substitute any. Also draft a brief patient advice line and a follow-up suggestion for the physician to review. ` +
    `Return ONLY a JSON object — no preamble, no prose, no markdown fences: ` +
    `{"items":[{"name":"","dose":"","frequency":"","duration":"","route":""}],"advice":"","follow_up":""}.` +
    (lang === "bn"
      ? ` Write "frequency", "duration", "route", "advice" and "follow_up" in Bangla (বাংলা); keep drug names, doses, units and IDs in standard English.`
      : ``) +
    styleBlock;
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No prescription draft returned");
  let raw = String(data.response);
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);   // tolerate ```json … ``` fences
  if (fence) raw = fence[1];
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the prescription draft");
  let obj: any;
  try { obj = JSON.parse(m[0]); } catch { throw new Error("Could not read the prescription draft"); }
  const s = (v: any) => String(v ?? "").trim();
  const modelItems: RxItem[] = Array.isArray(obj?.items)
    ? obj.items.filter((r: any) => r && r.name).map((r: any) => ({
        name: s(r.name), dose: s(r.dose), frequency: s(r.frequency), duration: s(r.duration), route: s(r.route),
      }))
    : [];

  // HARD GROUNDING GUARD (defense-in-depth) — the prompt asks for placed-meds-only, but a model can
  // still drift (add a STAT dose, a PRN adjunct, a duplicate) especially once style memory is in play.
  // So we ANCHOR the result to the doctor's PLACED meds: exactly ONE row per distinct placed drug,
  // taking its name+dose from what the doctor actually placed and pulling ONLY frequency/duration/route
  // (the structuring) from the best-matching model item. An invented drug therefore CANNOT reach the
  // doctor — this is structural, not prompt-dependent. Style memory shapes wording/defaults, never the
  // drug set.
  const baseName = (str: string) => {
    const t = str.trim();
    const cut = t.search(/\s\d/);          // first space-then-digit = start of the dose
    return (cut > 0 ? t.slice(0, cut) : t).trim();
  };
  const baseDose = (str: string) => {
    const t = str.trim();
    const cut = t.search(/\s\d/);
    return cut > 0 ? t.slice(cut + 1).trim() : "";
  };
  const norm = (str: string) => str.toLowerCase().replace(/\s+/g, " ").trim();

  const seen = new Set<string>();
  const items: RxItem[] = [];
  for (const placed of placedMeds) {
    // Dedupe by the FULL placed string (name+dose) so a real "Aspirin 75mg" and "Aspirin 300mg STAT"
    // both survive as distinct placed orders, while an exact case/spacing duplicate collapses.
    const fullKey = norm(placed);
    if (!fullKey || seen.has(fullKey)) continue;
    seen.add(fullKey);
    const nm = baseName(placed);
    const nameKey = norm(nm);
    // best model match for the STRUCTURING fields (freq/dur/route): exact base-name first, else contains
    const hit =
      modelItems.find((mi) => norm(baseName(mi.name)) === nameKey) ||
      modelItems.find((mi) => { const n = norm(mi.name); return n.includes(nameKey) || nameKey.includes(n); });
    items.push({
      name: nm,                                    // the placed drug name (authoritative — never invented)
      dose: baseDose(placed) || (hit?.dose ?? ""),  // the placed dose; model dose only if none was placed
      frequency: hit?.frequency ?? "",
      duration: hit?.duration ?? "",
      route: hit?.route ?? "",
    });
  }
  return { items, advice: s(obj?.advice), follow_up: s(obj?.follow_up) };
}

// ===========================================================================================
// HOSPITAL-OT — print multiplexing + the consent / operative-note drafters.
// ===========================================================================================

/**
 * Print-CSS for ONE paper block, scoped by a body attribute so MULTIPLE printable papers can be
 * mounted on the same page without printing each other (the original Rx rule was unconditional —
 * `body *` hidden + its own block visible — which multi-prints once a second paper exists).
 * No attribute (manual Ctrl+P) → none of these rules fire → the page prints normally.
 */
export const hxPrintCss = (id: string) =>
  `@media print { body[data-hx-print] * { visibility: hidden !important; } ` +
  `body[data-hx-print="${id}"] #${id}, body[data-hx-print="${id}"] #${id} * { visibility: visible !important; } ` +
  `body[data-hx-print="${id}"] #${id} { position: absolute; left: 0; top: 0; width: 100%; } }`;

/** Print exactly one mounted paper block (sets the body discriminator, prints, then clears it). */
export function printHxBlock(id: string): void {
  try {
    document.body.setAttribute("data-hx-print", id);
    window.print();
  } finally {
    // window.print() blocks in most browsers; the timeout also covers async print dialogs
    setTimeout(() => document.body.removeAttribute("data-hx-print"), 500);
  }
}

export interface ConsentDraft { explanation: string; risks: string; }

/**
 * ASSISTED consent draft [HOSPITAL-OT] — DEMO_PLAN §5d formatting-assist framing. MEDICA writes the
 * plain-language explanation + STANDARD risks for a consent form, for the physician to review word
 * by word before the patient signs. Grounding: it must NOT invent patient-specific claims — anything
 * not supported by the record stays standard/generic. `lang=bn` writes the consent in Bangla (the
 * patient's language — the point of the feature); procedure/drug names may stay English.
 */
export async function fetchConsentDraft(
  procedureName: string, patientName: string, patientId: string, lang: "en" | "bn" = "en",
): Promise<ConsentDraft> {
  const message =
    `The physician has decided to perform '${procedureName}' for hospital patient '${patientName}' ` +
    `(patient id ${patientId}) and asks you to FORMAT the patient consent form for his review — you are ` +
    `NOT making clinical decisions; the physician reviews every word before the patient signs. Write: ` +
    `(1) "explanation" — a plain-language description of the procedure a patient with no medical background ` +
    `can understand (what happens, why it is done, what to expect); ` +
    `(2) "risks" — the STANDARD recognised risks of this procedure, stated honestly and calmly. ` +
    `You may use the patient's record for context, but do NOT invent patient-specific claims — any statement ` +
    `the record does not support stays standard/generic. ` +
    `Return ONLY a JSON object (no prose, no markdown fences): {"explanation":"…","risks":"…"}.` +
    (lang === "bn"
      ? ` Write both values in clear, natural Bangla (বাংলা) — the patient reads this; the procedure name and device/drug names may stay English.`
      : ``);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No consent draft returned");
  let raw = String(data.response);
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1];
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the consent draft");
  let obj: any;
  try { obj = JSON.parse(m[0]); } catch { throw new Error("Could not read the consent draft"); }
  const s = (v: any) => String(v ?? "").trim();
  return { explanation: s(obj?.explanation), risks: s(obj?.risks) };
}

export interface OpNoteDraft {
  pre_op_diagnosis: string; procedure_performed: string; findings: string;
  complications: string; post_op_instructions: string;
}

/**
 * ASSISTED operative-note draft [HOSPITAL-OT] — §5d framing. The surgeon's rough dictated findings
 * are STRUCTURED into the 5 operative-note sections. BLANK-RATHER-THAN-INVENT: a section the
 * surgeon's text does not support stays an empty string (procedure_performed may restate the
 * scheduled procedure). The surgeon reviews, edits and SIGNS — nothing is final until signed.
 */
export async function fetchOpNoteDraft(
  roughFindings: string, procedureName: string, patientName: string, patientId: string, lang: "en" | "bn" = "en",
): Promise<OpNoteDraft> {
  const message =
    `The operating surgeon has dictated rough operative findings for '${procedureName}' on hospital patient ` +
    `'${patientName}' (patient id ${patientId}):\n"""\n${roughFindings}\n"""\n` +
    `Act as a FORMATTING assistant — you are NOT making clinical decisions; the surgeon reviews, edits and ` +
    `SIGNS this note. Structure ONLY what the surgeon's text supports into a JSON object with exactly these ` +
    `keys: {"pre_op_diagnosis":"","procedure_performed":"","findings":"","complications":"","post_op_instructions":""}. ` +
    `A section the surgeon's text does not support stays an EMPTY STRING — do not invent. ` +
    `"procedure_performed" may restate the scheduled procedure. If the surgeon states there were no ` +
    `complications, write that; otherwise leave "complications" empty. ` +
    `Return ONLY the JSON object (no prose, no markdown fences).` +
    (lang === "bn"
      ? ` Write the section prose in Bangla (বাংলা); clinical terms, device names, drug names and measurements stay English.`
      : ``);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No operative-note draft returned");
  let raw = String(data.response);
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1];
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the operative-note draft");
  let obj: any;
  try { obj = JSON.parse(m[0]); } catch { throw new Error("Could not read the operative-note draft"); }
  const s = (v: any) => String(v ?? "").trim();
  return {
    pre_op_diagnosis: s(obj?.pre_op_diagnosis),
    procedure_performed: s(obj?.procedure_performed),
    findings: s(obj?.findings),
    complications: s(obj?.complications),
    post_op_instructions: s(obj?.post_op_instructions),
  };
}

// ===========================================================================================
// HOSPITAL-DISCHARGE — the discharge-summary drafter. §5d formatting-assist framing: MEDICA writes
// the narrative sections FROM the real record only (blank-rather-than-invent). It NEVER touches the
// medication list — discharge_meds is the signed prescription (med reconciliation), passed back to
// the caller untouched. lang=bn writes the patient-facing prose in Bangla.
// ===========================================================================================

export interface DischargeNarrative {
  reason_for_admission: string; procedure_performed: string; hospital_course: string;
  follow_up: string; danger_signs: string;
}

export async function fetchDischargeSummary(args: {
  patientName: string; patientId: string; lang?: "en" | "bn";
  record: { admission?: string; procedure?: string; opNote?: string; consult?: string; episode?: string };
}): Promise<DischargeNarrative> {
  const { patientName, patientId, lang = "en", record } = args;
  const ctx = [
    record.admission && `Admission: ${record.admission}`,
    record.procedure && `Procedure: ${record.procedure}`,
    record.opNote && `Operative note: ${record.opNote}`,
    record.consult && `Consultation: ${record.consult}`,
    record.episode && `Post-op course: ${record.episode}`,
  ].filter(Boolean).join("\n");
  const message =
    `Write a discharge summary for hospital patient '${patientName}' (patient id ${patientId}), FROM this ` +
    `recorded clinical information ONLY:\n"""\n${ctx || "(limited record)"}\n"""\n` +
    `You are a FORMATTING assistant — not making clinical decisions; the physician reviews, edits and SIGNS. ` +
    `Return ONLY a JSON object (no prose, no markdown fences) with exactly: ` +
    `{"reason_for_admission":"","procedure_performed":"","hospital_course":"","follow_up":"","danger_signs":""}. ` +
    `Ground every section in the record above — a section the record does not support stays an EMPTY STRING; ` +
    `do NOT invent events, findings, dates or instructions. "danger_signs" lists the warning signs that should ` +
    `bring the patient back. Do NOT include a medication list (the prescription is handled separately). ` +
    `Each value is concise patient-readable prose` +
    (lang === "bn" ? `, written in clear Bangla (বাংলা); clinical/drug/device names + measurements stay standard English.` : `.`);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No discharge summary returned");
  let raw = String(data.response);
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1];
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not read the discharge summary");
  let obj: any;
  try { obj = JSON.parse(m[0]); } catch { throw new Error("Could not read the discharge summary"); }
  const s = (v: any) => String(v ?? "").trim();
  return {
    reason_for_admission: s(obj?.reason_for_admission),
    procedure_performed: s(obj?.procedure_performed),
    hospital_course: s(obj?.hospital_course),
    follow_up: s(obj?.follow_up),
    danger_signs: s(obj?.danger_signs),
  };
}

// ===========================================================================================
// HOSPITAL-NURSE — the MEDICA shift brief. The worklist is deterministic; MEDICA only summarizes
// it into one short paragraph for the nurse starting her shift (§5d framing) — it decides nothing,
// orders nothing, and the deteriorating patient is surfaced first from the post-op EWS.
// ===========================================================================================

export async function fetchShiftBrief(args: {
  nurseName: string;
  items: { patient: string; ews?: string | null; pending: number; overdue: number; nextDue?: string | null; tasks: string[] }[];
  lang?: "en" | "bn";
}): Promise<string> {
  const { nurseName, items, lang = "en" } = args;
  const lines = items.map((p) =>
    `- ${p.patient}${p.ews ? ` [post-op EWS ${p.ews}]` : ""}: ${p.pending} pending` +
    `${p.overdue ? `, ${p.overdue} OVERDUE` : ""}${p.nextDue ? `, next due ${p.nextDue}` : ""}` +
    `${p.tasks.length ? ` — ${p.tasks.slice(0, 4).join("; ")}` : ""}`,
  ).join("\n");
  const message =
    `The nursing worklist for ${nurseName}'s shift has ALREADY been computed (deterministically). ` +
    `You are NOT deciding clinical priority or ordering anything — you summarize this list for the nurse ` +
    `starting her shift. The list (patients with their pending/overdue tasks; a HIGH or deteriorating ` +
    `post-op EWS means see them first):\n"""\n${lines || "(no tasks)"}\n"""\n` +
    `Write ONE short plain-language paragraph (3-4 sentences) telling her who needs her first and what is ` +
    `due or overdue, leading with any high/deteriorating post-op patient. Do not invent tasks not listed; ` +
    `do not add clinical orders or recommendations.` +
    (lang === "bn" ? ` Write the paragraph in clear, natural Bangla (বাংলা); patient names, EWS values and times stay English.` : ``);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No shift brief returned");
  return String(data.response).replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").trim();
}

// ===========================================================================================
// HOSPITAL-POSTOP — the early-warning NARRATIVE. The NEWS2-style score is deterministic math
// computed by src/lib/hospital/news2.ts; MEDICA only puts it into one plain sentence for the
// ward team (§5d formatting-assist framing). It NEVER alters the score, never acts, never orders.
// ===========================================================================================

export async function fetchEwsNarrative(args: {
  patientName: string; patientId: string;
  score: number; band: string; trend: string;
  missing: string[]; drivers: { label: string; value: number; points: number }[];
  checks: number; lang?: "en" | "bn";
}): Promise<string> {
  const { patientName, patientId, score, band, trend, missing, drivers, checks, lang = "en" } = args;
  const driverTxt = drivers.map((d) => `${d.label} ${d.value} (${d.points} pts)`).join(", ") || "none above 0";
  const message =
    `The hospital's monitoring system has ALREADY computed a deterministic early-warning result for ` +
    `post-operative patient '${patientName}' (patient id ${patientId}) — you are NOT scoring, NOT making ` +
    `clinical decisions, NOT ordering anything; the ward team reviews the patient. The computed result: ` +
    `partial NEWS2 total ${score} (parameters not captured: ${missing.join(", ") || "none"}), band ${band.toUpperCase()}, ` +
    `trend ${trend} over ${checks} recorded check${checks === 1 ? "" : "s"}; driving parameters: ${driverTxt}. ` +
    `Write EXACTLY ONE plain-language sentence for the ward board telling the team why this patient needs ` +
    `review now, citing the driving vitals and the trend. Do not add recommendations, orders, or anything ` +
    `beyond that one sentence.` +
    (lang === "bn" ? ` Write the sentence in clear, natural Bangla (বাংলা); vital names, values and units stay English.` : ``);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "No narrative returned");
  // strip the agent banner + any wrapping quotes/markdown; keep the one sentence
  return String(data.response).replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
}

// ===========================================================================================
// HOSPITAL-STYLE — per-doctor MEDICA style-memory.
// CAPTURE: when a doctor saves/signs an ASSISTED draft he edited, the deltas (drafted → final)
// are recorded fire-and-forget, scoped (tenant_id, doctor_id). Manual mode captures nothing.
// CONDITION: the two drafters load THIS doctor's recent corrections (bounded) and append a
// style block to the message they already send — empty block when none → the prompt is
// BYTE-IDENTICAL to today (no regression). Learned preferences shape STYLE among valid options
// only — the grounding guardrails and the physician's review/sign remain untouched.
// ===========================================================================================

export interface StyleDelta { field_or_section: string; drafted: string; final: string; }

const STYLE_VAL_MAX = 160;   // per-value truncation (keeps the injection compact)
const STYLE_ROWS_MAX = 12;   // corrections loaded per draft (newest first)
const STYLE_CAPTURE_MAX = 8; // deltas captured per save/sign (anti-spam)
const trunc = (v: string) => (v.length > STYLE_VAL_MAX ? v.slice(0, STYLE_VAL_MAX) + "…" : v);

/**
 * Fire-and-forget capture of a doctor's edits to an Assisted draft. NEVER throws, NEVER awaited
 * by callers on the critical path — a capture failure must not affect the save/sign.
 */
export function captureStyleDeltas(args: {
  tenantId: string | null | undefined;
  doctorId: string | null | undefined;
  context: "consult" | "rx";
  visitId?: string | null;
  deltas: StyleDelta[];
}): void {
  const { tenantId, doctorId, context, visitId } = args;
  const deltas = (args.deltas || [])
    .filter((d) => d && d.field_or_section && d.drafted.trim() !== d.final.trim())
    .slice(0, STYLE_CAPTURE_MAX);
  if (!tenantId || !doctorId || deltas.length === 0) return;
  const rows = deltas.map((d) => ({
    tenant_id: tenantId,
    doctor_id: doctorId,
    context,
    source_visit_id: visitId ?? null,
    delta: { field_or_section: d.field_or_section, drafted: trunc(d.drafted.trim()), final: trunc(d.final.trim()) },
  }));
  // intentionally not awaited by callers; all failures swallowed (non-blocking by design)
  supabase.from("hospital_doctor_style" as any).insert(rows as any).then(({ error }: any) => {
    if (error) console.warn("[hx-style] capture skipped (non-blocking):", error?.message);
  }, (e: any) => console.warn("[hx-style] capture skipped (non-blocking):", e?.message));
}

/**
 * Load THIS doctor's recent corrections (RLS additionally enforces tenant + doctor) and build the
 * compact style block appended to the drafter messages. Returns "" when there are none, on any
 * error, or when no doctorId is supplied — so the no-corrections prompt is byte-identical to today.
 */
export async function loadDoctorStyleBlock(doctorId: string | null | undefined, context: "consult" | "rx"): Promise<string> {
  if (!doctorId) return "";
  try {
    const { data, error } = await supabase
      .from("hospital_doctor_style" as any)
      .select("delta")
      .eq("doctor_id", doctorId)
      .eq("context", context)
      .order("captured_at", { ascending: false })
      .limit(STYLE_ROWS_MAX);
    if (error || !data || data.length === 0) return "";
    const lines = (data as any[])
      .map((r) => r?.delta)
      .filter((d) => d && d.field_or_section)
      .map((d) => `- ${d.field_or_section}: "${trunc(String(d.drafted ?? ""))}" → physician changed to "${trunc(String(d.final ?? ""))}"`);
    if (lines.length === 0) return "";
    return (
      `\n\n[Physician style memory — this physician has previously adjusted your drafts as follows:\n` +
      lines.join("\n") +
      `\nMirror this physician's style, phrasing and defaults where clinically appropriate. These preferences ` +
      `shape STYLE and wording among valid options ONLY — they NEVER override the source material or clinical ` +
      `grounding above, and the physician still reviews, edits and signs every output. You are NOT making ` +
      `clinical decisions.]`
    );
  } catch {
    return ""; // fail-open to no-style; drafting must never break on the memory layer
  }
}

// ===========================================================================================
// HOSPITAL-CHART [Brief 8 · B] — collapsible-panel primitive. Pure presentational: a panel's
// content/logic is untouched; collapsed shows the one-line header + an expand control. The
// state persists per panel in localStorage (mirrors the hx-lang / hx-ecg persist pattern).
// ===========================================================================================

/** [ZATEOS B1] Stage-focused section: the patient profile shows ONLY the current stage's panel
 *  expanded — every other section is a one-line header until clicked. `open` is the stage-driven
 *  default and re-drives when the stage (or patient) changes; the user can still toggle freely. */
/** [FIX-1] ONE collapse layer. Collapsed = a one-line header. Expanded:
 *  - default: the wrapper renders the FULL header (title + optional `actions`) and the children
 *    render HEADERLESS inside it (inner panels drop their own header row);
 *  - `bare`: for children that keep their own native titled header (Prescription/OT/Discharge),
 *    the wrapper renders only a slim chevron-strip — no duplicate title, one chevron total. */
export function StageSection({ title, open, children, testid, icon: Icon, actions, bare }: {
  title: string; open: boolean; children: React.ReactNode; testid: string; icon?: any;
  actions?: React.ReactNode; bare?: boolean;
}) {
  const [expanded, setExpanded] = useState(open);
  useEffect(() => { setExpanded(open); }, [open]);
  if (!expanded) {
    return (
      <button type="button" className="hx-stage-row hx-rise" onClick={() => setExpanded(true)} data-testid={`${testid}-collapsed`}>
        {Icon && <Icon className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />}
        <span className="font-semibold">{title}</span>
        <ChevronDown className="h-4 w-4 ml-auto hx-dim" />
      </button>
    );
  }
  if (bare) {
    return (
      <div data-testid={`${testid}-open`}>
        <button type="button" className="hx-stage-strip" onClick={() => setExpanded(false)} data-testid={`${testid}-collapse`}
          title={title} aria-label={title}>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>
    );
  }
  return (
    <div className="hx-panel hx-rise" data-testid={`${testid}-open`}>
      <div className="hx-panel-h">
        {Icon && <Icon className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />}
        <span className="font-semibold">{title}</span>
        {actions && <span className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</span>}
        <button type="button" className={actions ? "ml-2" : "ml-auto"} onClick={() => setExpanded(false)} data-testid={`${testid}-collapse`}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--hx-dim)", display: "inline-flex" }}>
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      <div className="hx-panel-b">{children}</div>
    </div>
  );
}

export function useHxCollapse(storageKey: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? defaultCollapsed : v === "1";
    } catch { return defaultCollapsed; }
  });
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* storage blocked */ }
    return next;
  });
  return { collapsed, toggle };
}

/** The chevron expand/collapse control for a panel header. */
export function HxCollapseToggle({ collapsed, onToggle, testid }: { collapsed: boolean; onToggle: () => void; testid?: string }) {
  const { t } = useHospitalT();
  return (
    <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.22rem 0.5rem" }}
      onClick={onToggle} data-testid={testid} aria-expanded={!collapsed}
      title={collapsed ? t("common.expand") : t("common.collapse")}>
      {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
    </button>
  );
}

// ===========================================================================================
// HOSPITAL-CHART [Brief 8 · C] — type-ahead pick-list input. A convenience layer over a plain
// input: suggestions come from a STATIC in-code list (src/lib/hospital/pickLists.ts — NOT a
// DB catalog); free text is ALWAYS allowed and a custom entry is never blocked. Enter with a
// highlighted suggestion picks it; Enter otherwise falls through to `onEnter` (so the order
// placement flow is unchanged).
// ===========================================================================================

export interface HxPickOption { value: string; hint?: string }

export function HxPickInput({ value, onChange, options, placeholder, onEnter, testid }: {
  value: string;
  onChange: (v: string) => void;
  options: HxPickOption[];
  placeholder?: string;
  onEnter?: () => void;
  testid?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);          // highlighted suggestion index (-1 = none)
  const wrapRef = useRef<HTMLDivElement>(null);
  // [FIX-3] the menu PORTALS to <body> (fixed, z 70) so it floats above every panel/tab/drawer
  // stacking context — same body-portal pattern as the chart drawers (.hx-portal carries the vars).
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const measure = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  };
  useEffect(() => { if (open) measure(); }, [open, value]);
  const q = value.trim().toLowerCase();
  const matches = (q
    ? options.filter((o) => o.value.toLowerCase().includes(q) || (o.hint || "").toLowerCase().includes(q))
    : options
  ).slice(0, 8);

  // close on an outside click (blur alone would race the suggestion onMouseDown)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (wrapRef.current && !wrapRef.current.contains(t) && !t.closest?.(".hx-pick-menu")) { setOpen(false); setHi(-1); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setHi(-1); };

  return (
    <div ref={wrapRef} style={{ position: "relative" }} data-testid={testid ? `${testid}-wrap` : undefined}>
      <input
        className="hx-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && matches.length) { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp" && matches.length) { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)); }
          else if (e.key === "Escape") { setOpen(false); setHi(-1); }
          else if (e.key === "Enter") {
            if (open && hi >= 0 && matches[hi]) { e.preventDefault(); pick(matches[hi].value); }
            else { setOpen(false); onEnter?.(); }
          }
        }}
        data-testid={testid}
        autoComplete="off"
      />
      {open && matches.length > 0 && rect && createPortal(
        <div className="hx-portal">
        <div className="hx-pick-menu hx-pick-menu--portal" style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 70 }}
          data-testid={testid ? `${testid}-menu` : undefined} role="listbox">
          {matches.map((o, i) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={i === hi}
              className={`hx-pick-item ${i === hi ? "is-hi" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setHi(i)}
              data-testid={testid ? `${testid}-option` : undefined}
            >
              <span>{o.value}</span>
              {o.hint && <span className="hx-pick-hint">{o.hint}</span>}
            </button>
          ))}
        </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** This doctor's learned-correction count — drives the "MEDICA has learned N of your preferences" marker. */
export function useDoctorStyleCount(doctorId: string | null | undefined) {
  return useQuery({
    queryKey: ["hx-style-count", doctorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hospital_doctor_style" as any)
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", doctorId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!doctorId,
    staleTime: 30_000,
  });
}
