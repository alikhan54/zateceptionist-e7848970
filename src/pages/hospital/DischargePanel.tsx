// HOSPITAL-DISCHARGE — the journey's closing beat. Deterministic readiness (green before go), a
// grounded bilingual discharge summary (MEDICA drafts the narrative; the medication list IS the
// signed Rx — med reconciliation), the doctor's signature, and on sign the episode closes + the bed
// frees through the EXISTING bed-board flow. Printable. 5th reuse of the Manual/Assisted toggle.
// Additive; reuses hx-* classes (light/dark + i18n automatic). Renders only for an admitted patient.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Sparkles, Loader2, AlertTriangle, CheckCircle2, Printer, PenLine, BedDouble, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import { fetchDischargeSummary, hxPrintCss, printHxBlock, type RxItem, type DischargeNarrative } from "./hospitalShared";
import { useHospitalDischarge } from "@/hooks/useHospitalDischarge";
import { DischargeBill } from "./HospitalPos";
import { computeReadiness, type ReadyCheck } from "@/lib/hospital/dischargeReadiness";

const EMPTY: DischargeNarrative = { reason_for_admission: "", procedure_performed: "", hospital_course: "", follow_up: "", danger_signs: "" };
const SECTIONS: { key: keyof DischargeNarrative; labelKey: string }[] = [
  { key: "reason_for_admission", labelKey: "discharge.reason" },
  { key: "procedure_performed", labelKey: "discharge.procedure" },
  { key: "hospital_course", labelKey: "discharge.course" },
  { key: "follow_up", labelKey: "discharge.followUp" },
  { key: "danger_signs", labelKey: "discharge.dangerSigns" },
];
const checkChip = (s: string) => (s === "green" ? "hx-chip--ok" : s === "amber" ? "hx-chip--warn" : "");

export function DischargePanel({ patient }: { patient: any }) {
  const { t, lang } = useHospitalT();
  const { tenantId, tenantConfig } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const patientId = patient?.id as string | undefined;
  const { discharge: saved, save, retryCloseout } = useHospitalDischarge(patientId);

  // ---- the discharge context (grounding + readiness inputs) ----
  const { data: ctx } = useQueryCtx(tenantId, patientId);

  const readiness = useMemo(() => computeReadiness({
    ews: ctx?.episode ? { band: ctx.episode.latest_band, trend: ctx.episode.trend } : null,
    pendingTasks: ctx?.pendingTasks ?? 0,
    otCase: ctx?.otCase ? { exists: true, opNoteSigned: !!ctx.otCase.op_note_signed_at } : null,
    rx: ctx?.rx ? { exists: true, signed: ctx.rx.status === "signed" } : null,
  }), [ctx]);

  const [narr, setNarr] = useState<DischargeNarrative>({ ...EMPTY });
  const [meds, setMeds] = useState<RxItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiErr, setAiErr] = useState("");
  const [rNarr, setRNarr] = useState(""); const [rState, setRState] = useState<"idle" | "loading" | "error">("idle");

  // hydrate from the saved row, else seed the med list from the SIGNED Rx (med reconciliation)
  const hydratedFor = useRef<string>("");
  useEffect(() => {
    const stamp = `${patientId || ""}:${saved?.updated_at || ""}:${ctx?.rx?.id || ""}`;
    if (hydratedFor.current === stamp) return;
    hydratedFor.current = stamp;
    if (saved) {
      setNarr({ reason_for_admission: saved.reason_for_admission || "", procedure_performed: saved.procedure_performed || "", hospital_course: saved.hospital_course || "", follow_up: saved.follow_up || "", danger_signs: saved.danger_signs || "" });
      setMeds(Array.isArray(saved.discharge_meds) ? saved.discharge_meds : []);
      setDrafted(saved.source === "assisted");
    } else {
      setNarr({ ...EMPTY });
      setMeds(ctx?.rx?.status === "signed" && Array.isArray(ctx.rx.items) ? ctx.rx.items : []);  // med reconciliation
      setDrafted(false);
    }
    setDirty(false); setAiState("idle");
  }, [patientId, saved?.updated_at, ctx?.rx?.id, ctx?.rx?.status]);

  if (!ctx?.admission) return null;   // not an admitted patient → no discharge surface

  const isSigned = saved?.status === "signed";
  const closeoutPartial = isSigned && (!saved!.bed_freed || !saved!.episode_closed);

  async function draftWithMedica() {
    if (!patientId) return;
    setAiState("loading"); setAiErr("");
    try {
      const d = await fetchDischargeSummary({ patientName: patient.full_name, patientId, lang, record: ctx!.record });
      setNarr(d); setDrafted(true); setDirty(true); setAiState("idle");
    } catch (e: any) { setAiErr(e?.message || t("medica.down")); setAiState("error"); }
  }

  async function narrateReadiness() {
    setRState("loading");
    try {
      const lines = readiness.checks.map((c) => `${c.key}: ${c.state} (${c.detail})`).join("; ");
      const msg = `A discharge-readiness check for patient '${patient.full_name}' has ALREADY been computed: ${lines}. ` +
        `You are NOT deciding readiness — summarize it in ONE plain sentence for the doctor (green = ready, amber = needs attention before discharge), leading with any amber item.` +
        (lang === "bn" ? ` Write it in Bangla (বাংলা); keep clinical terms English.` : ``);
      const { data } = await supabase.functions.invoke("medica-brief", { body: { message: msg } });
      setRNarr(String(data?.response || "").replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").trim()); setRState("idle");
    } catch { setRState("error"); }
  }

  const setSection = (k: keyof DischargeNarrative, v: string) => { setNarr((p) => ({ ...p, [k]: v })); setDirty(true); };
  const setMed = (i: number, k: keyof RxItem, v: string) => { setMeds((p) => p.map((m, j) => (j === i ? { ...m, [k]: v } : m))); setDirty(true); };

  async function persist(sign: boolean) {
    if (!ctx?.admission) return;
    try {
      const res = await save.mutateAsync({
        admissionId: ctx.admission.id, otCaseId: ctx.otCase?.id ?? null,
        readiness: readiness.checks,
        reason_for_admission: narr.reason_for_admission, procedure_performed: narr.procedure_performed,
        hospital_course: narr.hospital_course, discharge_meds: meds.filter((m) => m.name.trim()),
        follow_up: narr.follow_up, danger_signs: narr.danger_signs,
        language: lang, source: isAssisted && drafted ? "assisted" : "manual", sign,
        bed: ctx.bed ?? null,
      });
      setDirty(false);
      if (sign) {
        const okClose = res.episodeClosed && (!ctx.bed || res.bedFreed);
        toast({ title: okClose ? t("discharge.signedClosed") : t("discharge.signedPartial"),
          variant: okClose ? undefined : "destructive" });
      } else toast({ title: t("discharge.savedDraft") });
    } catch (e: any) {
      toast({ title: t("discharge.failed"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  async function onRetry() {
    if (!saved) return;
    try { await retryCloseout.mutateAsync({ ...saved, bed: ctx?.bed ?? null }); toast({ title: t("discharge.retried") }); }
    catch (e: any) { toast({ title: t("discharge.failed"), description: e?.message, variant: "destructive" }); }
  }

  const signerName = authUser?.full_name || authUser?.email || t("rx.physician");
  const mrn = patient?.file_number || String(patient?.id || "").slice(0, 8).toUpperCase();

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "420ms" }} data-testid="hx-discharge">
      <div className="hx-panel-h">
        <LogOut className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
        <span className="font-semibold">{t("discharge.title")}</span>
        {isSigned && <span className="hx-chip hx-chip--ok" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-discharge-status"><CheckCircle2 className="h-3 w-3" /> {t("discharge.discharged")}</span>}
        <span className="ml-auto"><HospitalModeToggle /></span>
      </div>
      <div className="hx-panel-b space-y-3">
        {/* ---- readiness ---- */}
        <div data-testid="hx-readiness">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hx-label" style={{ margin: 0 }}>{t("discharge.readiness")}</span>
            {readiness.checks.map((c) => (
              <span key={c.key} className={`hx-chip ${checkChip(c.state)}`} style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-readiness-check" data-key={c.key} data-state={c.state} title={c.detail}>
                {c.state === "green" ? <CheckCircle2 className="h-3 w-3" /> : c.state === "amber" ? <AlertTriangle className="h-3 w-3" /> : null}
                {t(`discharge.check.${c.key}`)}
              </span>
            ))}
            <span className={`hx-chip ${readiness.allGreen ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-readiness-overall">
              {readiness.allGreen ? t("discharge.ready") : t("discharge.notReady")}
            </span>
          </div>
          {isAssisted && !isSigned && (
            <div className="mt-2">
              <button className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.6rem" }} onClick={narrateReadiness} disabled={rState === "loading"} data-testid="hx-readiness-narrate">
                {rState === "loading" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("discharge.assessing")}</> : <><Sparkles className="h-3.5 w-3.5" /> {t("discharge.assess")}</>}
              </button>
              {rNarr && <p className="hx-dim text-sm mt-1" data-testid="hx-readiness-narrative">{rNarr}</p>}
            </div>
          )}
        </div>

        {!isSigned && (
          <div className="hx-faint text-xs">{isAssisted ? t("discharge.hintAssisted") : t("discharge.hintManual")}</div>
        )}

        {/* ---- summary draft (assisted) ---- */}
        {isAssisted && !isSigned && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }} onClick={draftWithMedica} disabled={aiState === "loading"} data-testid="hx-discharge-draft">
              {aiState === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("discharge.drafting")}</> : <><Sparkles className="h-4 w-4" /> {t("discharge.draft")}</>}
            </button>
            {drafted && <span className="hx-chip hx-chip--warn" data-testid="hx-discharge-disclaimer"><AlertTriangle className="h-3 w-3" /> {t("discharge.disclaimer")}</span>}
          </div>
        )}
        {aiState === "error" && <p className="hx-dim text-sm" data-testid="hx-discharge-ai-error">{aiErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={draftWithMedica}>{t("medica.retry")}</button></p>}

        {/* ---- the editable summary (read-only once signed) ---- */}
        <div className="grid grid-cols-1 gap-2" data-testid="hx-discharge-sections">
          {SECTIONS.map(({ key, labelKey }) => (
            <div key={key}>
              <label className="hx-label">{t(labelKey)}</label>
              <textarea className="hx-input" rows={key === "hospital_course" || key === "danger_signs" ? 2 : 1} value={narr[key]} readOnly={isSigned}
                onChange={(e) => setSection(key, e.target.value)} placeholder={t("discharge.sectionPh")} data-testid={`hx-discharge-${key}`} />
            </div>
          ))}
        </div>

        {/* ---- med reconciliation (the discharge meds = the signed Rx) ---- */}
        <div data-testid="hx-discharge-meds">
          <label className="hx-label">{t("discharge.meds")} {meds.length === 0 && <span className="hx-faint">— {t("discharge.noMeds")}</span>}</label>
          {meds.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center mb-1" data-testid="hx-discharge-med">
              <input className="hx-input col-span-3" value={m.name} readOnly={isSigned} onChange={(e) => setMed(i, "name", e.target.value)} data-testid="hx-discharge-med-name" />
              <input className="hx-input col-span-2" value={m.dose} readOnly={isSigned} onChange={(e) => setMed(i, "dose", e.target.value)} />
              <input className="hx-input col-span-3" value={m.frequency} readOnly={isSigned} onChange={(e) => setMed(i, "frequency", e.target.value)} />
              <input className="hx-input col-span-2" value={m.duration} readOnly={isSigned} onChange={(e) => setMed(i, "duration", e.target.value)} />
              <input className="hx-input col-span-2" value={m.route} readOnly={isSigned} onChange={(e) => setMed(i, "route", e.target.value)} />
            </div>
          ))}
        </div>

        {/* ---- actions ---- */}
        {!isSigned ? (
          <div className="flex flex-wrap items-center gap-3">
            <button className="hx-btn hx-btn--ghost" onClick={() => persist(false)} disabled={!dirty || save.isPending} data-testid="hx-discharge-savedraft">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("discharge.saveDraft")}
            </button>
            <button className="hx-btn hx-btn--primary" onClick={() => persist(true)} disabled={save.isPending} data-testid="hx-discharge-sign">
              <PenLine className="h-4 w-4" /> {t("discharge.sign")}
            </button>
            {!readiness.allGreen && <span className="hx-faint text-xs" data-testid="hx-discharge-override">{t("discharge.overrideNote")}</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="hx-faint text-xs" data-testid="hx-discharge-signedmeta">
              {t("rx.signedBy")} {signerName} · {saved!.signed_at ? new Date(saved!.signed_at).toLocaleString() : ""}
            </span>
            <span className="hx-chip hx-chip--ok" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-discharge-bed"><BedDouble className="h-3 w-3" /> {saved!.bed_freed ? t("discharge.bedFreed") : t("discharge.bedPending")}</span>
            <span className="hx-chip hx-chip--ok" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-discharge-episode">{saved!.episode_closed ? t("discharge.episodeClosed") : t("discharge.episodePending")}</span>
            <button className="hx-btn hx-btn--ghost" onClick={() => printHxBlock("hx-discharge-print")} data-testid="hx-discharge-print-btn"><Printer className="h-4 w-4" /> {t("rx.print")}</button>
            {closeoutPartial && (
              <button className="hx-btn hx-btn--ghost" style={{ borderColor: "var(--hx-warn)", color: "var(--hx-warn)" }} onClick={onRetry} disabled={retryCloseout.isPending} data-testid="hx-discharge-retry">
                {retryCloseout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {t("discharge.retry")}
              </button>
            )}
          </div>
        )}

        {/* [Brief 11 · A] the thin discharge bill — STRICTLY post-sign (renders only on a signed
            row; the sign flow above is untouched) */}
        {isSigned && saved && <DischargeBill patient={patient} discharge={saved} />}

        {/* ---- the printable bilingual paper (the 3rd #hx-*-print block) ---- */}
        {isSigned && (
          <>
            <style>{hxPrintCss("hx-discharge-print")}</style>
            <div id="hx-discharge-print" data-testid="hx-discharge-paper"
              style={{ background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", fontSize: 13, lineHeight: 1.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{tenantConfig?.company_name || "Hospital"}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{t("discharge.title")}</div>
                </div>
                <LogOut style={{ width: 24, height: 24, color: "#111827" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                <span><b>{t("rx.patient")}:</b> {patient?.full_name}</span>
                <span><b>{t("journey.mrn")}:</b> {mrn}</span>
                <span><b>{t("rx.date")}:</b> {saved!.signed_at ? new Date(saved!.signed_at).toLocaleDateString() : ""}</span>
              </div>
              {SECTIONS.map(({ key, labelKey }) => (saved as any)[key] ? (
                <div key={key} style={{ fontSize: 12, margin: "7px 0" }}><b>{t(labelKey)}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{(saved as any)[key]}</span></div>
              ) : null)}
              {(saved!.discharge_meds || []).length > 0 && (
                <div style={{ margin: "8px 0" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{t("discharge.meds")}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ textAlign: "left", color: "#374151", borderBottom: "1px solid #d1d5db" }}>
                      <th style={{ padding: "3px 6px" }}>{t("rx.med")}</th><th style={{ padding: "3px 6px" }}>{t("rx.dose")}</th><th style={{ padding: "3px 6px" }}>{t("rx.frequency")}</th><th style={{ padding: "3px 6px" }}>{t("rx.duration")}</th><th style={{ padding: "3px 6px" }}>{t("rx.route")}</th>
                    </tr></thead>
                    <tbody>{(saved!.discharge_meds || []).map((m, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "3px 6px", fontWeight: 600 }}>{m.name}</td><td style={{ padding: "3px 6px" }}>{m.dose || "—"}</td><td style={{ padding: "3px 6px" }}>{m.frequency || "—"}</td><td style={{ padding: "3px 6px" }}>{m.duration || "—"}</td><td style={{ padding: "3px 6px" }}>{m.route || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 200, borderTop: "1px solid #111827", paddingTop: 4, fontSize: 12 }}>
                  {signerName}<br /><span style={{ fontSize: 10, color: "#6b7280" }}>{t("rx.signedDigital")} · {saved!.signed_at ? new Date(saved!.signed_at).toLocaleString() : ""}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// the discharge context — admission + grounding sources + readiness inputs + the open bed assignment
function useQueryCtx(tenantId?: string | null, patientId?: string | null) {
  return useQuery({
    queryKey: ["hospital_discharge_ctx", tenantId, patientId],
    queryFn: async () => {
      const [{ data: adm }, { data: ot }, { data: rx }, { data: consult }, { data: ep }, { count: pending }, { data: assign }] = await Promise.all([
        supabase.from("hospital_admissions" as any).select("id, status, department_name, created_at").eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "admitted").order("created_at", { ascending: false }).limit(1),
        supabase.from("hospital_ot_cases" as any).select("*").eq("tenant_id", tenantId).eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1),
        supabase.from("hospital_prescriptions" as any).select("*").eq("tenant_id", tenantId).eq("patient_id", patientId).order("updated_at", { ascending: false }).limit(1),
        supabase.from("hospital_consultation_notes" as any).select("chief_complaint, assessment, plan").eq("tenant_id", tenantId).eq("patient_id", patientId).order("updated_at", { ascending: false }).limit(1),
        supabase.from("hospital_postop_episodes" as any).select("*").eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "active").maybeSingle(),
        supabase.from("hospital_nurse_tasks" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "pending"),
        supabase.from("hospital_bed_assignments" as any).select("admission_id, bed_id").eq("tenant_id", tenantId).eq("patient_id", patientId).is("released_at", null).maybeSingle(),
      ]);
      const admission = (adm as any[])?.[0] ?? null;
      const otCase = (ot as any[])?.[0] ?? null;
      const prescription = (rx as any[])?.[0] ?? null;
      const c = (consult as any[])?.[0] ?? null;
      const episode = (ep as any) ?? null;
      const bed = (assign as any) ? { admissionId: (assign as any).admission_id, bedId: (assign as any).bed_id } : null;
      // the compact grounding strings for the summary drafter
      const record = {
        admission: admission ? `Admitted ${admission.created_at ? new Date(admission.created_at).toLocaleDateString() : ""}${admission.department_name ? `, ${admission.department_name}` : ""}` : "",
        procedure: otCase?.status === "completed" ? otCase.procedure_name : "",
        opNote: otCase?.op_note_signed_at ? [otCase.pre_op_diagnosis, otCase.procedure_performed, otCase.findings, otCase.complications, otCase.post_op_instructions].filter(Boolean).join(". ") : "",
        consult: c ? [c.chief_complaint && `CC: ${c.chief_complaint}`, c.assessment && `Assessment: ${c.assessment}`, c.plan && `Plan: ${c.plan}`].filter(Boolean).join(". ") : "",
        episode: episode ? `Post-op EWS ${episode.latest_score} (${episode.latest_band}), trend ${episode.trend}` : "",
      };
      return { admission, otCase, rx: prescription, episode, pendingTasks: pending ?? 0, bed, record };
    },
    enabled: !!tenantId && !!patientId,
  });
}
