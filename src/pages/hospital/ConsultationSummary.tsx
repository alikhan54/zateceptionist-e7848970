// HOSPITAL-CONSULT — the consultation summary box. Sits directly BELOW the MEDICA brief panel on
// the Patient Journey. Two modes via the reusable hospital autonomy toggle:
//   • MANUAL   — the doctor types/dictates the whole summary; nothing is AI-drafted.
//   • ASSISTED — MEDICA drafts a structured summary from the doctor's notes (via the proven
//                medica-brief MESSAGE path; brain + Edge Functions untouched); the doctor reviews,
//                edits and APPROVES before saving.
// Either way it persists to the additive per-encounter `hospital_consultation_notes` table.
// Additive, hospital-scoped; reuses only `hx-*` classes (light/dark + i18n automatic).
import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHospitalConsultation } from "@/hooks/useHospitalConsultation";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import { fetchConsultationSummary, type ConsultationSummary as Summary } from "./hospitalShared";

const SECTIONS: { key: keyof Summary; labelKey: string }[] = [
  { key: "chief_complaint", labelKey: "consult.chiefComplaint" },
  { key: "history", labelKey: "consult.history" },
  { key: "examination", labelKey: "consult.examination" },
  { key: "assessment", labelKey: "consult.assessment" },
  { key: "plan", labelKey: "consult.plan" },
];

export function ConsultationSummaryBox({
  patientId, patientName, visitId,
}: { patientId?: string; patientName?: string; visitId?: string | null }) {
  const { t, lang } = useHospitalT();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const { note, save } = useHospitalConsultation(visitId, patientId);

  const [notes, setNotes] = useState("");
  const [sum, setSum] = useState<Summary>({ chief_complaint: "", history: "", examination: "", assessment: "", plan: "" });
  const [dirty, setDirty] = useState(false);
  const [drafted, setDrafted] = useState(false);      // an Assisted draft is on screen (shows the disclaimer)
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiErr, setAiErr] = useState("");

  // Hydrate from the saved row when the encounter (or its stored row) changes. A ref keeps a doctor's
  // in-progress edits from being clobbered by a background refetch of the same visit.
  const hydratedFor = useRef<string>("");
  useEffect(() => {
    const stamp = `${visitId || ""}:${note?.updated_at || ""}`;
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
    setDirty(false);
    setDrafted(note?.summary_source === "assisted");
    setAiState("idle"); setAiErr("");
  }, [visitId, note?.updated_at, note?.summary_source]);

  const setField = (k: keyof Summary, v: string) => { setSum((p) => ({ ...p, [k]: v })); setDirty(true); };

  async function draftWithMedica() {
    if (!patientName || !patientId) return;
    if (!notes.trim()) { toast({ title: t("consult.needNotes"), variant: "destructive" }); return; }
    setAiState("loading"); setAiErr("");
    try {
      const s = await fetchConsultationSummary(notes, patientName, patientId, lang);
      setSum(s); setDrafted(true); setDirty(true); setAiState("idle");
    } catch (e: any) {
      setAiErr(e?.message || t("medica.down")); setAiState("error");
    }
  }

  async function onSave() {
    if (!visitId || !patientId) return;
    try {
      await save.mutateAsync({
        notes,
        chief_complaint: sum.chief_complaint, history: sum.history, examination: sum.examination,
        assessment: sum.assessment, plan: sum.plan,
        summary_source: isAssisted && drafted ? "assisted" : "manual",
        lang,
      });
      setDirty(false);
      toast({ title: t("consult.saved") });
    } catch (e: any) {
      toast({ title: t("consult.saveFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  const noEncounter = !visitId;

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "140ms" }} data-testid="hx-consult">
      <div className="hx-panel-h">
        <FileText className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
        <span className="font-semibold">{t("consult.title")}</span>
        <span className="ml-auto"><HospitalModeToggle /></span>
      </div>
      <div className="hx-panel-b">
        {noEncounter ? (
          <p className="hx-dim text-sm" data-testid="hx-consult-empty">{t("consult.empty")}</p>
        ) : (
          <div className="space-y-3">
            <div className="hx-faint text-xs" data-testid="hx-consult-modehint">
              {isAssisted ? t("consult.hintAssisted") : t("consult.hintManual")}
            </div>

            {/* the doctor's raw consultation notes — input for Assisted, the record for Manual */}
            <div>
              <label className="hx-label">{t("consult.notes")}</label>
              <textarea className="hx-input" rows={3} value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                placeholder={t("consult.notesPh")} data-testid="hx-consult-notes" />
            </div>

            {/* ASSISTED: MEDICA drafts the structured summary from the notes */}
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

            <div className="flex items-center gap-3">
              <button className="hx-btn hx-btn--primary" onClick={onSave}
                disabled={!dirty || save.isPending} data-testid="hx-consult-save">
                {save.isPending
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
    </div>
  );
}
