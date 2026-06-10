// HOSPITAL-OT — the Operation Theatre panel on the Patient Journey (doctor/admin-gated page →
// nurse/lab never reach an OT write). The arc: plan → CONSENT (the gate; bilingual, printable)
// → start theatre (DB-trigger-enforced) → the surgeon's OPERATIVE NOTE (rough text → structured,
// blank-rather-than-invent) → sign & complete. Third reuse of the Manual/Assisted toggle; both
// drafters use the DEMO_PLAN §5d formatting-assist framing. Papers print via the body-attr
// multiplexed #hx-*-print pattern. Additive; reuses hx-* classes (light/dark + i18n automatic).
import { useEffect, useRef, useState } from "react";
import {
  Slice, Sparkles, Loader2, AlertTriangle, CheckCircle2, Printer, PenLine, ShieldCheck, Play, Plus,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHospitalOT, type OTStatus } from "@/hooks/useHospitalOT";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import { fetchConsentDraft, fetchOpNoteDraft, hxPrintCss, printHxBlock, type OpNoteDraft } from "./hospitalShared";

const EMPTY_NOTE: OpNoteDraft = { pre_op_diagnosis: "", procedure_performed: "", findings: "", complications: "", post_op_instructions: "" };
const NOTE_SECTIONS: { key: keyof OpNoteDraft; labelKey: string }[] = [
  { key: "pre_op_diagnosis", labelKey: "ot.note.preOp" },
  { key: "procedure_performed", labelKey: "ot.note.procedure" },
  { key: "findings", labelKey: "ot.note.findings" },
  { key: "complications", labelKey: "ot.note.complications" },
  { key: "post_op_instructions", labelKey: "ot.note.postOp" },
];

export function statusChipClass(s: OTStatus) {
  return s === "completed" ? "hx-chip--ok" : s === "in_theatre" ? "hx-chip--crit" : s === "consented" ? "hx-chip--accent" : "hx-chip--warn";
}

export function OperationTheatrePanel({ patient, visitId }:
  { patient: any; visitId?: string | null }) {
  const { t, lang } = useHospitalT();
  const { tenantConfig, tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const { byId, doctors } = useHospitalStaff();
  const patientId = patient?.id as string | undefined;
  const { otCase, consent, createCase, recordConsent, startTheatre, saveOpNote } = useHospitalOT(patientId);

  // ---- plan a new case (minimal) ----
  const [planOpen, setPlanOpen] = useState(false);
  const [planProc, setPlanProc] = useState("");
  const [planSurgeon, setPlanSurgeon] = useState("");
  const [planWhen, setPlanWhen] = useState("");

  // ---- consent state ----
  const [explanation, setExplanation] = useState("");
  const [risks, setRisks] = useState("");
  const [consentName, setConsentName] = useState("");
  const [consentRel, setConsentRel] = useState<"self" | "guardian">("self");
  const [witness, setWitness] = useState("");
  const [consentAiState, setConsentAiState] = useState<"idle" | "loading" | "error">("idle");
  const [consentAiErr, setConsentAiErr] = useState("");
  const [consentDrafted, setConsentDrafted] = useState(false);

  // ---- op-note state ----
  const [rough, setRough] = useState("");
  const [note, setNote] = useState<OpNoteDraft>({ ...EMPTY_NOTE });
  const [noteDrafted, setNoteDrafted] = useState(false);
  const [noteAiState, setNoteAiState] = useState<"idle" | "loading" | "error">("idle");
  const [noteAiErr, setNoteAiErr] = useState("");

  // hydrate the op-note fields from the stored case (ref-guarded against background refetch)
  const hydratedFor = useRef<string>("");
  useEffect(() => {
    const stamp = `${otCase?.id || ""}:${otCase?.updated_at || ""}`;
    if (hydratedFor.current === stamp) return;
    hydratedFor.current = stamp;
    setNote({
      pre_op_diagnosis: otCase?.pre_op_diagnosis || "",
      procedure_performed: otCase?.procedure_performed || "",
      findings: otCase?.findings || "",
      complications: otCase?.complications || "",
      post_op_instructions: otCase?.post_op_instructions || "",
    });
    setNoteDrafted(otCase?.op_note_source === "assisted");
    setConsentDrafted(false); setConsentAiState("idle"); setNoteAiState("idle");
    if (patient?.full_name && !consentName) setConsentName(patient.full_name);
  }, [otCase?.id, otCase?.updated_at, patient?.full_name]);

  const surgeonName = (otCase?.surgeon_id && byId[otCase.surgeon_id]?.name) || null;
  const status = otCase?.status as OTStatus | undefined;
  // the signature line shows the ACTUAL signer: the current user only if HE signed; else the case surgeon
  const signerName = (!otCase?.op_note_authored_by || otCase.op_note_authored_by === authUser?.id)
    ? (authUser?.full_name || authUser?.email || t("rx.physician"))
    : (surgeonName || t("rx.physician"));

  async function draftConsent() {
    if (!otCase || !patientId) return;
    setConsentAiState("loading"); setConsentAiErr("");
    try {
      const d = await fetchConsentDraft(otCase.procedure_name, patient.full_name, patientId, lang);
      setExplanation(d.explanation); setRisks(d.risks); setConsentDrafted(true); setConsentAiState("idle");
    } catch (e: any) {
      setConsentAiErr(e?.message || t("medica.down")); setConsentAiState("error");
    }
  }

  // the exact text shown/printed — snapshotted onto the consent row
  const consentText = () =>
    `${t("ot.consent.title")} — ${otCase?.procedure_name}\n\n${t("ot.consent.explanation")}:\n${explanation.trim()}\n\n${t("ot.consent.risks")}:\n${risks.trim()}`;

  async function onRecordConsent() {
    if (!explanation.trim() || !risks.trim()) { toast({ title: t("ot.consent.needText"), variant: "destructive" }); return; }
    if (!consentName.trim()) { toast({ title: t("ot.consent.needName"), variant: "destructive" }); return; }
    try {
      await recordConsent.mutateAsync({
        procedure: otCase!.procedure_name,
        risks_explained: risks.trim(),
        language: lang,
        consented_by_name: consentName.trim(),
        consented_by_relationship: consentRel,
        consent_text_snapshot: consentText(),
        witnessed_by: witness.trim(),
      });
      toast({ title: t("ot.consent.recorded") });
    } catch (e: any) {
      toast({ title: t("ot.consent.failed"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  async function onStart() {
    try {
      await startTheatre.mutateAsync();
      toast({ title: t("ot.started") });
    } catch (e: any) {
      // the DB gate's message surfaces here if anything slipped past the UI gate
      toast({ title: t("ot.startFailed"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  async function draftNote() {
    if (!otCase || !patientId) return;
    if (!rough.trim()) { toast({ title: t("ot.note.needRough"), variant: "destructive" }); return; }
    setNoteAiState("loading"); setNoteAiErr("");
    try {
      const d = await fetchOpNoteDraft(rough, otCase.procedure_name, patient.full_name, patientId, lang);
      setNote(d); setNoteDrafted(true); setNoteAiState("idle");
    } catch (e: any) {
      setNoteAiErr(e?.message || t("medica.down")); setNoteAiState("error");
    }
  }

  async function onSignNote() {
    if (!Object.values(note).some((v) => v.trim())) { toast({ title: t("ot.note.needContent"), variant: "destructive" }); return; }
    try {
      await saveOpNote.mutateAsync({ ...note, source: isAssisted && noteDrafted ? "assisted" : "manual", lang, sign: true });
      toast({ title: t("ot.note.signed") });
    } catch (e: any) {
      toast({ title: t("ot.note.failed"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  async function onPlan() {
    if (!planProc.trim()) return;
    try {
      // best-effort: tie the case to the patient's OPEN admission (an operation belongs to the stay)
      let admissionId: string | null = null;
      try {
        const { data: adm } = await supabase
          .from("hospital_admissions" as any).select("id")
          .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "admitted")
          .order("created_at", { ascending: false }).limit(1);
        admissionId = (adm as any[])?.[0]?.id ?? null;
      } catch { /* keep null — visit/patient keys still tie the case */ }
      await createCase.mutateAsync({
        procedure_name: planProc.trim(),
        scheduled_at: planWhen ? new Date(planWhen).toISOString() : null,
        admission_id: admissionId, visit_id: visitId ?? null,
        surgeon_id: planSurgeon || null,
      });
      setPlanOpen(false); setPlanProc(""); setPlanWhen("");
      toast({ title: t("ot.planned") });
    } catch (e: any) {
      toast({ title: t("ot.planFailed"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  const isSignedNote = !!otCase?.op_note_signed_at;

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "340ms" }} data-testid="hx-ot">
      <div className="hx-panel-h">
        <Slice className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
        <span className="font-semibold">{t("ot.title")}</span>
        {status && (
          <span className={`hx-chip ${statusChipClass(status)}`} style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-ot-status">
            {t(`ot.status.${status}`)}
          </span>
        )}
        <span className="ml-auto"><HospitalModeToggle /></span>
      </div>
      <div className="hx-panel-b">
        {!otCase ? (
          <div className="space-y-3" data-testid="hx-ot-empty">
            <p className="hx-dim text-sm">{t("ot.empty")}</p>
            {!planOpen ? (
              <button className="hx-btn hx-btn--ghost" onClick={() => setPlanOpen(true)} data-testid="hx-ot-plan-open">
                <Plus className="h-4 w-4" /> {t("ot.plan")}
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-5">
                  <label className="hx-label">{t("ot.procedure")}</label>
                  <input className="hx-input" value={planProc} onChange={(e) => setPlanProc(e.target.value)} placeholder={t("ot.procedurePh")} data-testid="hx-ot-plan-proc" />
                </div>
                <div className="sm:col-span-3">
                  <label className="hx-label">{t("ot.surgeon")}</label>
                  <select className="hx-select" value={planSurgeon} onChange={(e) => setPlanSurgeon(e.target.value)} data-testid="hx-ot-plan-surgeon">
                    <option value="">—</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="hx-label">{t("ot.scheduled")}</label>
                  <input className="hx-input" type="date" value={planWhen} onChange={(e) => setPlanWhen(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <button className="hx-btn hx-btn--primary w-full" onClick={onPlan} disabled={!planProc.trim() || createCase.isPending} data-testid="hx-ot-plan-save">
                    {createCase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ot.planSave")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* case card */}
            <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="hx-ot-case">
              <span style={{ color: "var(--hx-strong)", fontWeight: 600 }}>{otCase.procedure_name}</span>
              {surgeonName && <><span className="hx-faint">·</span><span className="hx-dim">{t("ot.surgeon")}: {surgeonName}</span></>}
              {otCase.scheduled_at && <><span className="hx-faint">·</span><span className="hx-dim hx-mono">{new Date(otCase.scheduled_at).toLocaleDateString()}</span></>}
            </div>

            {/* ---------- CONSENT (the gate) ---------- */}
            {status === "planned" && (
              <div className="space-y-2.5" data-testid="hx-consent">
                <div className="hx-faint text-xs">{isAssisted ? t("ot.consent.hintAssisted") : t("ot.consent.hintManual")}</div>
                {isAssisted && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }}
                      onClick={draftConsent} disabled={consentAiState === "loading"} data-testid="hx-consent-draft">
                      {consentAiState === "loading"
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("ot.consent.drafting")}</>
                        : <><Sparkles className="h-4 w-4" /> {t("ot.consent.draftBtn")}</>}
                    </button>
                    {consentDrafted && (
                      <span className="hx-chip hx-chip--warn" data-testid="hx-consent-disclaimer">
                        <AlertTriangle className="h-3 w-3" /> {t("ot.consent.disclaimer")}
                      </span>
                    )}
                  </div>
                )}
                {consentAiState === "error" && (
                  <p className="hx-dim text-sm" data-testid="hx-consent-ai-error">
                    {consentAiErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={draftConsent}>{t("medica.retry")}</button>
                  </p>
                )}
                <div>
                  <label className="hx-label">{t("ot.consent.explanation")}</label>
                  <textarea className="hx-input" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder={t("ot.consent.explanationPh")} data-testid="hx-consent-explanation" />
                </div>
                <div>
                  <label className="hx-label">{t("ot.consent.risks")}</label>
                  <textarea className="hx-input" rows={3} value={risks} onChange={(e) => setRisks(e.target.value)} placeholder={t("ot.consent.risksPh")} data-testid="hx-consent-risks" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="hx-label">{t("ot.consent.byName")}</label>
                    <input className="hx-input" value={consentName} onChange={(e) => setConsentName(e.target.value)} data-testid="hx-consent-name" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="hx-label">{t("ot.consent.relationship")}</label>
                    <select className="hx-select" value={consentRel} onChange={(e) => setConsentRel(e.target.value as any)} data-testid="hx-consent-rel">
                      <option value="self">{t("ot.consent.self")}</option>
                      <option value="guardian">{t("ot.consent.guardian")}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="hx-label">{t("ot.consent.witness")}</label>
                    <input className="hx-input" value={witness} onChange={(e) => setWitness(e.target.value)} placeholder={t("ot.consent.witnessPh")} data-testid="hx-consent-witness" />
                  </div>
                  <div className="sm:col-span-2">
                    <button className="hx-btn hx-btn--primary w-full" onClick={onRecordConsent} disabled={recordConsent.isPending} data-testid="hx-consent-record">
                      {recordConsent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /> {t("ot.consent.record")}</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* recorded consent summary + print */}
            {consent && (
              <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="hx-consent-summary">
                <span className="hx-chip hx-chip--ok"><ShieldCheck className="h-3 w-3" /> {t("ot.consent.chip")}</span>
                <span className="hx-dim">{consent.consented_by_name} ({t(`ot.consent.${consent.consented_by_relationship}`)}) · {new Date(consent.signed_at).toLocaleString()} · {consent.language === "bn" ? "বাংলা" : "English"}</span>
                <button className="hx-btn hx-btn--ghost" style={{ padding: "0.2rem 0.55rem" }} onClick={() => printHxBlock("hx-consent-print")} data-testid="hx-consent-print-btn">
                  <Printer className="h-3.5 w-3.5" /> {t("rx.print")}
                </button>
              </div>
            )}

            {/* ---------- START THEATRE (UI gate mirrors the DB trigger) ---------- */}
            {(status === "planned" || status === "consented") && (
              <div className="flex flex-wrap items-center gap-2">
                <button className="hx-btn hx-btn--primary" onClick={onStart}
                  disabled={status !== "consented" || startTheatre.isPending} data-testid="hx-ot-start">
                  {startTheatre.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> {t("ot.start")}</>}
                </button>
                {status === "planned" && (
                  <span className="hx-chip hx-chip--warn" data-testid="hx-ot-gate-reason">
                    <AlertTriangle className="h-3 w-3" /> {t("ot.gateReason")}
                  </span>
                )}
              </div>
            )}

            {/* ---------- OPERATIVE NOTE ---------- */}
            {(status === "in_theatre" || status === "completed") && (
              <div className="space-y-2.5" data-testid="hx-opnote">
                <div className="hx-faint text-xs">{isAssisted ? t("ot.note.hintAssisted") : t("ot.note.hintManual")}</div>
                {isAssisted && !isSignedNote && (
                  <>
                    <div>
                      <label className="hx-label">{t("ot.note.rough")}</label>
                      <textarea className="hx-input" rows={2} value={rough} onChange={(e) => setRough(e.target.value)} placeholder={t("ot.note.roughPh")} data-testid="hx-opnote-rough" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }}
                        onClick={draftNote} disabled={noteAiState === "loading" || !rough.trim()} data-testid="hx-opnote-draft">
                        {noteAiState === "loading"
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("ot.note.drafting")}</>
                          : <><Sparkles className="h-4 w-4" /> {t("ot.note.draftBtn")}</>}
                      </button>
                      {noteDrafted && (
                        <span className="hx-chip hx-chip--warn" data-testid="hx-opnote-disclaimer">
                          <AlertTriangle className="h-3 w-3" /> {t("ot.note.disclaimer")}
                        </span>
                      )}
                    </div>
                  </>
                )}
                {noteAiState === "error" && (
                  <p className="hx-dim text-sm" data-testid="hx-opnote-ai-error">
                    {noteAiErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={draftNote}>{t("medica.retry")}</button>
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2" data-testid="hx-opnote-sections">
                  {NOTE_SECTIONS.map(({ key, labelKey }) => (
                    <div key={key}>
                      <label className="hx-label">{t(labelKey)}</label>
                      <textarea className="hx-input" rows={key === "findings" ? 2 : 1} value={note[key]} readOnly={isSignedNote}
                        onChange={(e) => setNote((p) => ({ ...p, [key]: e.target.value }))} data-testid={`hx-opnote-${key}`} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!isSignedNote ? (
                    <button className="hx-btn hx-btn--primary" onClick={onSignNote} disabled={saveOpNote.isPending} data-testid="hx-opnote-sign">
                      {saveOpNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PenLine className="h-4 w-4" /> {t("ot.note.sign")}</>}
                    </button>
                  ) : (
                    <>
                      <span className="hx-faint text-xs" data-testid="hx-opnote-signedmeta">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" style={{ color: "var(--hx-ok)" }} />
                        {t("rx.signedBy")} {signerName} · {otCase.op_note_signed_at ? new Date(otCase.op_note_signed_at).toLocaleString() : ""}
                      </span>
                      <button className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.6rem" }} onClick={() => printHxBlock("hx-opnote-print")} data-testid="hx-opnote-print-btn">
                        <Printer className="h-3.5 w-3.5" /> {t("rx.print")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ---------- printable papers (body-attr multiplexed) ---------- */}
            {consent && (
              <>
                <style>{hxPrintCss("hx-consent-print")}</style>
                <div id="hx-consent-print" data-testid="hx-consent-paper"
                  style={{ background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{tenantConfig?.company_name || "Hospital"}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{t("ot.consent.title")}</div>
                    </div>
                    <ShieldCheck style={{ width: 26, height: 26, color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                    <span><b>{t("rx.patient")}:</b> {patient?.full_name}</span>
                    <span><b>{t("journey.mrn")}:</b> {patient?.file_number || String(patient?.id || "").slice(0, 8).toUpperCase()}</span>
                    <span><b>{t("ot.procedure")}:</b> {consent.procedure}</span>
                    <span><b>{t("rx.date")}:</b> {new Date(consent.signed_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 12, padding: "10px 0" }}>{consent.consent_text_snapshot}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 26 }}>
                    <div style={{ textAlign: "center", minWidth: 180, borderTop: "1px solid #111827", paddingTop: 4, fontSize: 12 }}>
                      {consent.consented_by_name}<br />
                      <span style={{ fontSize: 10, color: "#6b7280" }}>{t(`ot.consent.${consent.consented_by_relationship}`)} · {new Date(consent.signed_at).toLocaleString()}</span>
                    </div>
                    {consent.witnessed_by && (
                      <div style={{ textAlign: "center", minWidth: 180, borderTop: "1px solid #111827", paddingTop: 4, fontSize: 12 }}>
                        {consent.witnessed_by}<br /><span style={{ fontSize: 10, color: "#6b7280" }}>{t("ot.consent.witness")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {isSignedNote && (
              <>
                <style>{hxPrintCss("hx-opnote-print")}</style>
                <div id="hx-opnote-print" data-testid="hx-opnote-paper"
                  style={{ background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{tenantConfig?.company_name || "Hospital"}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{t("ot.note.title")}</div>
                    </div>
                    <Slice style={{ width: 24, height: 24, color: "#111827" }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                    <span><b>{t("rx.patient")}:</b> {patient?.full_name}</span>
                    <span><b>{t("journey.mrn")}:</b> {patient?.file_number || String(patient?.id || "").slice(0, 8).toUpperCase()}</span>
                    <span><b>{t("ot.procedure")}:</b> {otCase.procedure_name}</span>
                    {surgeonName && <span><b>{t("ot.surgeon")}:</b> {surgeonName}</span>}
                    <span><b>{t("rx.date")}:</b> {otCase.op_note_signed_at ? new Date(otCase.op_note_signed_at).toLocaleDateString() : ""}</span>
                  </div>
                  {NOTE_SECTIONS.map(({ key, labelKey }) => (otCase as any)[key] ? (
                    <div key={key} style={{ fontSize: 12, margin: "7px 0" }}>
                      <b>{t(labelKey)}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{(otCase as any)[key]}</span>
                    </div>
                  ) : null)}
                  <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ textAlign: "center", minWidth: 200, borderTop: "1px solid #111827", paddingTop: 4, fontSize: 12 }}>
                      {signerName}<br />
                      <span style={{ fontSize: 10, color: "#6b7280" }}>{t("rx.signedDigital")} · {otCase.op_note_signed_at ? new Date(otCase.op_note_signed_at).toLocaleString() : ""}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
