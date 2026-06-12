// HOSPITAL-CONSULT — the consultation summary box. Sits directly BELOW the MEDICA brief panel on
// the Patient Journey. Two modes via the reusable hospital autonomy toggle:
//   • MANUAL   — the doctor types/dictates the whole summary; nothing is AI-drafted.
//   • ASSISTED — MEDICA drafts a structured summary from the doctor's notes (via the proven
//                medica-brief MESSAGE path; brain + Edge Functions untouched); the doctor reviews,
//                edits and APPROVES before saving.
// Either way it persists to the additive per-encounter `hospital_consultation_notes` table.
// HOSPITAL-FLOW [Brief 9] additions (additive, deterministic UI — MEDICA only consumes):
//   • STRUCTURED INTAKE — common questions as yes/no + short-answer chips, with a collapsible
//     "more comments" free-text. Persists to the NEW `hospital_consult_intake` table (saved with
//     the consult save) and is composed into the notes handed to the MEDICA drafter (richer
//     grounding, same message path).
//   • PLAN DISPOSITION — Admit (routes into the existing admit/bed flow) · Refer to (department →
//     doctor + REQUIRED reason → a hospital_doctor_queue row, source='referral') · Other (manual).
// Additive, hospital-scoped; reuses only `hx-*` classes (light/dark + i18n automatic).
import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Loader2, AlertTriangle, CheckCircle2, Brain, ClipboardList, BedDouble, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useHospitalConsultation } from "@/hooks/useHospitalConsultation";
import { useHospitalConsultIntake, buildIntakeBlock, type IntakeAnswers, type Disposition, type YesNo } from "@/hooks/useHospitalConsultIntake";
import { useForwardToDoctor } from "@/hooks/useHospitalDoctorQueue";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalRole } from "@/hooks/useHospitalRole";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import {
  fetchConsultationSummary, captureStyleDeltas, useDoctorStyleCount,
  useHxCollapse, HxCollapseToggle,
  type ConsultationSummary as Summary, type StyleDelta,
} from "./hospitalShared";

const SECTIONS: { key: keyof Summary; labelKey: string }[] = [
  { key: "chief_complaint", labelKey: "consult.chiefComplaint" },
  { key: "history", labelKey: "consult.history" },
  { key: "examination", labelKey: "consult.examination" },
  { key: "assessment", labelKey: "consult.assessment" },
  { key: "plan", labelKey: "consult.plan" },
];

const EMPTY_ANSWERS: IntakeAnswers = {
  chest_pain: "", duration: "", breathlessness: "", prior_cardiac: "", smoking: "", allergies: "", current_meds: "",
};
const YN_KEYS: { key: keyof IntakeAnswers; labelKey: string }[] = [
  { key: "chest_pain", labelKey: "intake.chestPain" },
  { key: "breathlessness", labelKey: "intake.breathlessness" },
  { key: "prior_cardiac", labelKey: "intake.priorCardiac" },
  { key: "smoking", labelKey: "intake.smoking" },
];
const TEXT_KEYS: { key: keyof IntakeAnswers; labelKey: string; phKey: string }[] = [
  { key: "duration", labelKey: "intake.duration", phKey: "intake.durationPh" },
  { key: "allergies", labelKey: "intake.allergies", phKey: "intake.allergiesPh" },
  { key: "current_meds", labelKey: "intake.currentMeds", phKey: "intake.currentMedsPh" },
];

export function ConsultationSummaryBox({
  patientId, patientName, visitId, onAdmitPatient,
}: { patientId?: string; patientName?: string; visitId?: string | null; onAdmitPatient?: () => void }) {
  const { t, ti, lang } = useHospitalT();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const { note, save } = useHospitalConsultation(visitId, patientId);
  const { intake, save: saveIntake } = useHospitalConsultIntake(visitId, patientId);
  const forward = useForwardToDoctor();
  const { doctors, byId } = useHospitalStaff();
  const { hrEmployeeId } = useHospitalRole();
  // HOSPITAL-STYLE: this doctor's identity (users.id, same as authored_by) + learned-count marker
  const { authUser } = useAuth();
  const { tenantId } = useTenant();
  const doctorId = authUser?.id ?? null;
  const { data: styleCount = 0 } = useDoctorStyleCount(doctorId);
  const aiDraftRef = useRef<Summary | null>(null);   // MEDICA's ORIGINAL draft (for the edit delta)

  const [notes, setNotes] = useState("");
  const [sum, setSum] = useState<Summary>({ chief_complaint: "", history: "", examination: "", assessment: "", plan: "" });
  const [dirty, setDirty] = useState(false);
  const [drafted, setDrafted] = useState(false);      // an Assisted draft is on screen (shows the disclaimer)
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiErr, setAiErr] = useState("");

  // intake questionnaire + disposition [Brief 9]
  const [answers, setAnswers] = useState<IntakeAnswers>({ ...EMPTY_ANSWERS });
  const [comments, setComments] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [dispo, setDispo] = useState<Disposition>("");
  const [referDept, setReferDept] = useState("");
  const [referDoctor, setReferDoctor] = useState("");
  const [referReason, setReferReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const { collapsed: intakeCollapsed, toggle: toggleIntake } = useHxCollapse("hx-collapse-intake");

  // Hydrate from the saved rows when the encounter (or its stored rows) change. A ref keeps a doctor's
  // in-progress edits from being clobbered by a background refetch of the same visit.
  const hydratedFor = useRef<string>("");
  useEffect(() => {
    const stamp = `${visitId || ""}:${note?.updated_at || ""}:${intake?.updated_at || ""}`;
    if (hydratedFor.current === stamp) return;
    hydratedFor.current = stamp;
    setNotes(note?.notes || "");
    setSum({
      chief_complaint: note?.chief_complaint || "",
      history: note?.history || "",
      examination: note?.examination || "",
      assessment: note?.assessment || "",
      plan: note?.plan || "",
    });
    setAnswers({ ...EMPTY_ANSWERS, ...(intake?.answers || {}) });
    setComments(intake?.comments || "");
    setDispo((intake?.disposition as Disposition) || "");
    const d = (intake?.disposition_detail || {}) as any;
    setReferDept(d.department_name || "");
    setReferDoctor(d.doctor_id || "");
    setReferReason(d.reason || "");
    setOtherText(d.note || "");
    setDirty(false);
    setDrafted(note?.summary_source === "assisted");
    setAiState("idle"); setAiErr("");
    aiDraftRef.current = null;   // a stored row is not a live draft — only a fresh MEDICA draft is diffable
  }, [visitId, note?.updated_at, note?.summary_source, intake?.updated_at]);

  const setField = (k: keyof Summary, v: string) => { setSum((p) => ({ ...p, [k]: v })); setDirty(true); };
  const setAnswer = (k: keyof IntakeAnswers, v: string) => { setAnswers((p) => ({ ...p, [k]: v })); setDirty(true); };

  // distinct departments that actually have a doctor (drives the refer dept → doctor selects)
  const referDepts = Array.from(new Set(doctors.map((d) => d.department).filter(Boolean))) as string[];
  const referDoctors = doctors.filter((d) => !referDept || d.department === referDept);

  const dispositionDetail = (): Record<string, unknown> | null => {
    if (dispo === "refer") {
      const doc = byId[referDoctor];
      return { doctor_id: referDoctor || null, doctor_name: doc?.name || null, department_name: referDept || doc?.department || null, reason: referReason.trim() || null };
    }
    if (dispo === "other") return { note: otherText.trim() || null };
    return null;
  };

  async function draftWithMedica() {
    if (!patientName || !patientId) return;
    if (!notes.trim()) { toast({ title: t("consult.needNotes"), variant: "destructive" }); return; }
    setAiState("loading"); setAiErr("");
    try {
      // [Brief 9] the structured intake rides INSIDE the notes the drafter already receives —
      // richer grounding, same message path; empty intake → notes byte-identical to today.
      const notesForDraft = notes + buildIntakeBlock(answers, comments);
      const s = await fetchConsultationSummary(notesForDraft, patientName, patientId, lang, { doctorId });
      aiDraftRef.current = { ...s };   // snapshot the ORIGINAL draft so the doctor's edits can be diffed at save
      setSum(s); setDrafted(true); setDirty(true); setAiState("idle");
    } catch (e: any) {
      setAiErr(e?.message || t("medica.down")); setAiState("error");
    }
  }

  async function onSave() {
    if (!visitId || !patientId) return;
    try {
      const assistedSave = isAssisted && drafted;
      await save.mutateAsync({
        notes,
        chief_complaint: sum.chief_complaint, history: sum.history, examination: sum.examination,
        assessment: sum.assessment, plan: sum.plan,
        summary_source: assistedSave ? "assisted" : "manual",
        lang,
      });
      // [Brief 9] persist the questionnaire + disposition WITH the consultation record
      await saveIntake.mutateAsync({ answers, comments, disposition: dispo, disposition_detail: dispositionDetail() });
      // HOSPITAL-STYLE capture — ASSISTED saves only, fire-and-forget AFTER the save succeeded
      // (a capture failure can never affect the save). Manual mode records nothing.
      if (assistedSave && aiDraftRef.current) {
        const drafted0 = aiDraftRef.current;
        const deltas: StyleDelta[] = (Object.keys(drafted0) as (keyof Summary)[])
          .filter((k) => (drafted0[k] || "").trim() !== (sum[k] || "").trim())
          .map((k) => ({ field_or_section: `consult.${k}`, drafted: drafted0[k] || "", final: sum[k] || "" }));
        captureStyleDeltas({ tenantId, doctorId, context: "consult", visitId, deltas });
        aiDraftRef.current = { ...sum };   // the saved state is the new baseline (no double-capture on re-save)
      }
      setDirty(false);
      toast({ title: t("consult.saved") });
    } catch (e: any) {
      toast({ title: t("consult.saveFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  // [Brief 9] REFER — requires a doctor + a reason; creates the queue row (source='referral') and
  // records the disposition. Never touches the admission's attending.
  async function onRefer() {
    if (!patientId) return;
    if (!referDoctor) { toast({ title: t("dispo.pickDoctor"), variant: "destructive" }); return; }
    if (!referReason.trim()) { toast({ title: t("dispo.reasonRequired"), variant: "destructive" }); return; }
    const doc = byId[referDoctor];
    try {
      const res = await forward.mutateAsync({
        patientId,
        doctorId: referDoctor,
        doctorName: doc?.name || null,
        departmentName: referDept || doc?.department || null,
        source: "referral",
        reason: referReason,
        referredByName: (hrEmployeeId && byId[hrEmployeeId]?.name) || null,
      });
      await saveIntake.mutateAsync({
        answers, comments, disposition: "refer",
        disposition_detail: { ...dispositionDetail(), queue_id: res.queueId },
      });
      toast({ title: res.duplicate ? t("flow.alreadyWaiting") : ti("dispo.referred", { doctor: doc?.name || "" }) });
    } catch (e: any) {
      toast({ title: t("flow.forwardFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  // [Brief 9] ADMIT — records the disposition + opens the EXISTING admit/bed flow (reused, never rebuilt)
  async function onAdmit() {
    try { await saveIntake.mutateAsync({ answers, comments, disposition: "admit", disposition_detail: null }); } catch { /* recorded best-effort */ }
    onAdmitPatient?.();
  }

  const noEncounter = !visitId;
  // Collapsible panel [Brief 8 addendum (a)] — same pattern as the MEDICA collapse; presentational only
  const { collapsed, toggle } = useHxCollapse("hx-collapse-consult");

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "140ms" }} data-testid="hx-consult" data-collapsed={collapsed ? "1" : "0"}>
      <div className="hx-panel-h" style={collapsed ? { borderBottom: "none" } : undefined}>
        <FileText className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
        <span className="font-semibold">{t("consult.title")}</span>
        {!collapsed && isAssisted && styleCount > 0 && (
          <span className="hx-chip hx-chip--accent" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-style-marker" title={t("style.learnedTitle")}>
            <Brain className="h-3 w-3" /> {ti("style.learned", { n: styleCount })}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {!collapsed && <HospitalModeToggle />}
          <HxCollapseToggle collapsed={collapsed} onToggle={toggle} testid="hx-consult-collapse" />
        </span>
      </div>
      {!collapsed && (
      <div className="hx-panel-b">
        {noEncounter ? (
          <p className="hx-dim text-sm" data-testid="hx-consult-empty">{t("consult.empty")}</p>
        ) : (
          <div className="space-y-3">
            <div className="hx-faint text-xs" data-testid="hx-consult-modehint">
              {isAssisted ? t("consult.hintAssisted") : t("consult.hintManual")}
            </div>

            {/* STRUCTURED INTAKE [Brief 9] — deterministic chips; collapsible; feeds the MEDICA draft */}
            <div className="hx-intake" data-testid="hx-intake" data-collapsed={intakeCollapsed ? "1" : "0"}>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
                <span className="hx-label" style={{ margin: 0 }}>{t("intake.title")}</span>
                <span className="ml-auto"><HxCollapseToggle collapsed={intakeCollapsed} onToggle={toggleIntake} testid="hx-intake-collapse" /></span>
              </div>
              {!intakeCollapsed && (
                <div className="mt-2 space-y-2.5">
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {YN_KEYS.map(({ key, labelKey }) => (
                      <div key={key} className="flex items-center gap-2" data-testid={`hx-intake-${key}`}>
                        <span className="text-xs hx-dim">{t(labelKey)}</span>
                        <span className="hx-yn">
                          {(["yes", "no"] as YesNo[]).map((v) => (
                            <button key={v} type="button"
                              className={`hx-yn-btn ${answers[key] === v ? "on" : ""}`}
                              onClick={() => setAnswer(key, answers[key] === v ? "" : v)}
                              data-testid={`hx-intake-${key}-${v}`} aria-pressed={answers[key] === v}>
                              {t(v === "yes" ? "intake.yes" : "intake.no")}
                            </button>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {TEXT_KEYS.map(({ key, labelKey, phKey }) => (
                      <div key={key}>
                        <label className="hx-label">{t(labelKey)}</label>
                        <input className="hx-input" value={(answers[key] as string) || ""}
                          onChange={(e) => setAnswer(key, e.target.value)}
                          placeholder={t(phKey)} data-testid={`hx-intake-${key}`} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.72rem" }}
                      onClick={() => setCommentsOpen((o) => !o)} data-testid="hx-intake-comments-toggle" aria-expanded={commentsOpen}>
                      {t("intake.comments")} {commentsOpen ? "▴" : "▾"}
                    </button>
                    {(commentsOpen || !!comments.trim()) && (
                      <textarea className="hx-input mt-1.5" rows={2} value={comments}
                        onChange={(e) => { setComments(e.target.value); setDirty(true); }}
                        placeholder={t("intake.commentsPh")} data-testid="hx-intake-comments" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* the doctor's raw consultation notes — input for Assisted, the record for Manual */}
            <div>
              <label className="hx-label">{t("consult.notes")}</label>
              <textarea className="hx-input" rows={3} value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                placeholder={t("consult.notesPh")} data-testid="hx-consult-notes" />
            </div>

            {/* ASSISTED: MEDICA drafts the structured summary from the notes (+ the intake block) */}
            {isAssisted && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }}
                  onClick={draftWithMedica} disabled={aiState === "loading" || !notes.trim()} data-testid="hx-consult-draft">
                  {aiState === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("consult.drafting")}</>
                    : <><Sparkles className="h-4 w-4" /> {t("consult.draft")}</>}
                </button>
                {drafted && (
                  <span className="hx-chip hx-chip--warn" style={{ display: "inline-flex" }} data-testid="hx-consult-disclaimer">
                    <AlertTriangle className="h-3 w-3" /> {t("consult.disclaimer")}
                  </span>
                )}
              </div>
            )}
            {aiState === "error" && (
              <p className="hx-dim text-sm" data-testid="hx-consult-ai-error">
                {aiErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={draftWithMedica}>{t("medica.retry")}</button>
              </p>
            )}

            {/* the 5 structured sections — editable in BOTH modes (doctor approves/edits before save) */}
            <div className="grid grid-cols-1 gap-2.5" data-testid="hx-consult-sections">
              {SECTIONS.map(({ key, labelKey }) => (
                <div key={key}>
                  <label className="hx-label">{t(labelKey)}</label>
                  <textarea className="hx-input" rows={2} value={sum[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={t("consult.sectionPh")} data-testid={`hx-consult-${key}`} />
                </div>
              ))}
            </div>

            {/* PLAN DISPOSITION [Brief 9] — deterministic; Admit reuses the existing flow; Refer
                requires a reason and creates the queue row; Other is a manual note */}
            <div className="hx-intake" data-testid="hx-dispo">
              <label className="hx-label">{t("dispo.title")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-3">
                  <select className="hx-select" value={dispo}
                    onChange={(e) => { setDispo(e.target.value as Disposition); setDirty(true); }} data-testid="hx-dispo-select">
                    <option value="">{t("dispo.none")}</option>
                    <option value="admit">{t("dispo.admit")}</option>
                    <option value="refer">{t("dispo.refer")}</option>
                    <option value="other">{t("dispo.other")}</option>
                  </select>
                </div>
                {dispo === "admit" && (
                  <div className="sm:col-span-9 flex items-center gap-2.5 flex-wrap">
                    <span className="hx-faint text-xs">{t("dispo.admitHint")}</span>
                    <button type="button" className="hx-btn hx-btn--primary" style={{ padding: "0.35rem 0.8rem" }}
                      onClick={onAdmit} data-testid="hx-dispo-admit">
                      <BedDouble className="h-3.5 w-3.5" /> {t("dispo.openAdmit")}
                    </button>
                  </div>
                )}
                {dispo === "refer" && (
                  <>
                    <div className="sm:col-span-3">
                      <label className="hx-label">{t("flow.department")}</label>
                      <select className="hx-select" value={referDept}
                        onChange={(e) => { setReferDept(e.target.value); setReferDoctor(""); setDirty(true); }} data-testid="hx-dispo-dept">
                        <option value="">{t("flow.selectDept")}</option>
                        {referDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="hx-label">{t("flow.doctor")}</label>
                      <select className="hx-select" value={referDoctor}
                        onChange={(e) => { setReferDoctor(e.target.value); setDirty(true); }} data-testid="hx-dispo-doctor">
                        <option value="">{t("flow.selectDoctor")}</option>
                        {referDoctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="hx-label">{t("flow.reason")}</label>
                      <input className="hx-input" value={referReason}
                        onChange={(e) => { setReferReason(e.target.value); setDirty(true); }}
                        placeholder={t("flow.reason")} data-testid="hx-dispo-reason" />
                    </div>
                  </>
                )}
                {dispo === "other" && (
                  <div className="sm:col-span-9">
                    <input className="hx-input" value={otherText}
                      onChange={(e) => { setOtherText(e.target.value); setDirty(true); }}
                      placeholder={t("dispo.otherPh")} data-testid="hx-dispo-other" />
                  </div>
                )}
              </div>
              {dispo === "refer" && (
                <div className="mt-2">
                  <button type="button" className="hx-btn hx-btn--primary" style={{ padding: "0.35rem 0.8rem" }}
                    onClick={onRefer} disabled={forward.isPending || saveIntake.isPending} data-testid="hx-dispo-refer-btn">
                    {forward.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {t("dispo.referBtn")}
                  </button>
                  {(intake?.disposition === "refer" && (intake?.disposition_detail as any)?.queue_id) && (
                    <span className="hx-chip hx-chip--accent ml-2" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-dispo-referred-chip">
                      {ti("dispo.referredChip", { doctor: ((intake?.disposition_detail as any)?.doctor_name as string) || "" })}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button className="hx-btn hx-btn--primary" onClick={onSave}
                disabled={!dirty || save.isPending || saveIntake.isPending} data-testid="hx-consult-save">
                {(save.isPending || saveIntake.isPending)
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.saving")}</>
                  : <><CheckCircle2 className="h-4 w-4" /> {t("consult.save")}</>}
              </button>
              {note?.updated_at && !dirty && (
                <span className="hx-faint text-xs" data-testid="hx-consult-savedmeta">
                  {t("consult.savedAt")} {new Date(note.updated_at).toLocaleString()}
                  {note.summary_source ? ` · ${t(`consult.src.${note.summary_source}`)}` : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
