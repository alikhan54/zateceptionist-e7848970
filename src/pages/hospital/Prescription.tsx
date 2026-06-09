// HOSPITAL-RX — the patient-facing prescription. Sits at the bottom of the Patient Journey right
// column (after order entry / queues). Two modes via the reusable hospital autonomy toggle:
//   • MANUAL   — the doctor adds Rx lines (name/dose/frequency/duration/route) + advice + follow-up.
//   • ASSISTED — MEDICA drafts the Rx FROM the meds the doctor ALREADY PLACED (via the proven
//                medica-brief MESSAGE path; brain + Edge Functions untouched) — it never conjures a
//                drug the doctor didn't place. The doctor edits, then SIGNS.
// SIGN (draft → signed) stamps authored_by + signed_at; only a SIGNED Rx is printable. Print uses the
// platform @media-print isolation pattern (a light `#hx-rx-print` paper block). Bangla puts the
// patient instructions (advice/follow-up + frequency/duration/route) in Bangla; drug names/doses stay
// standard English. Additive, hospital-scoped; reuses `hx-*` classes (light/dark + i18n automatic).
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Sparkles, Loader2, AlertTriangle, CheckCircle2, Printer, Plus, Trash2, PenLine } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useHospitalPrescription } from "@/hooks/useHospitalPrescription";
import { useHospitalConsultation } from "@/hooks/useHospitalConsultation";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import { fetchPrescriptionDraft, type RxItem } from "./hospitalShared";

const EMPTY_ITEM: RxItem = { name: "", dose: "", frequency: "", duration: "", route: "" };
const ageFrom = (dob?: string | null) => {
  if (!dob) return null; const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.max(0, Math.floor((Date.now() - +d) / 31557600000));
};

export function PrescriptionPanel({
  patient, visitId, placedMeds,
}: { patient: any; visitId?: string | null; placedMeds: string[] }) {
  const { t, lang } = useHospitalT();
  const { tenantConfig } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const patientId = patient?.id as string | undefined;
  const { rx, save } = useHospitalPrescription(visitId, patientId);
  const { note: consult } = useHospitalConsultation(visitId, patientId);

  const [items, setItems] = useState<RxItem[]>([]);
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [dirty, setDirty] = useState(false);
  const [drafted, setDrafted] = useState(false);       // an Assisted draft is on screen (shows disclaimer)
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiErr, setAiErr] = useState("");

  // Hydrate from the saved row when the encounter (or its stored row) changes; ref-guarded so a
  // background refetch never clobbers in-progress edits.
  const hydratedFor = useRef<string>("");
  useEffect(() => {
    const stamp = `${visitId || ""}:${rx?.updated_at || ""}`;
    if (hydratedFor.current === stamp) return;
    hydratedFor.current = stamp;
    setItems(Array.isArray(rx?.items) && rx!.items.length ? rx!.items : []);
    setAdvice(rx?.advice || "");
    setFollowUp(rx?.follow_up || "");
    setDirty(false);
    setDrafted(rx?.source === "assisted");
    setAiState("idle"); setAiErr("");
  }, [visitId, rx?.updated_at, rx?.source]);

  const setItem = (i: number, k: keyof RxItem, v: string) => {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, [k]: v } : it))); setDirty(true);
  };
  const addItem = () => { setItems((prev) => [...prev, { ...EMPTY_ITEM }]); setDirty(true); };
  const removeItem = (i: number) => { setItems((prev) => prev.filter((_, j) => j !== i)); setDirty(true); };

  const consultContext = useMemo(() => {
    if (!consult) return "";
    return [
      consult.chief_complaint && `Chief complaint: ${consult.chief_complaint}`,
      consult.assessment && `Assessment: ${consult.assessment}`,
      consult.plan && `Plan: ${consult.plan}`,
    ].filter(Boolean).join("\n");
  }, [consult]);

  async function draftWithMedica() {
    if (!patientId) return;
    if (placedMeds.length === 0) { toast({ title: t("rx.needMeds"), variant: "destructive" }); return; }
    setAiState("loading"); setAiErr("");
    try {
      const d = await fetchPrescriptionDraft(placedMeds, consultContext, patient.full_name, patientId, lang);
      setItems(d.items.length ? d.items : []); setAdvice(d.advice); setFollowUp(d.follow_up);
      setDrafted(true); setDirty(true); setAiState("idle");
    } catch (e: any) {
      setAiErr(e?.message || t("medica.down")); setAiState("error");
    }
  }

  const cleanItems = () => items.map((it) => ({
    name: it.name.trim(), dose: it.dose.trim(), frequency: it.frequency.trim(),
    duration: it.duration.trim(), route: it.route.trim(),
  })).filter((it) => it.name);

  async function persist(status: "draft" | "signed") {
    if (!visitId || !patientId) return;
    const final = cleanItems();
    if (status === "signed" && final.length === 0) { toast({ title: t("rx.needItem"), variant: "destructive" }); return; }
    try {
      await save.mutateAsync({
        items: final, advice, follow_up: followUp,
        source: isAssisted && drafted ? "assisted" : "manual",
        status, lang,
      });
      setItems(final); setDirty(false);
      toast({ title: status === "signed" ? t("rx.signed") : t("rx.savedDraft") });
    } catch (e: any) {
      toast({ title: t("rx.saveFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  const noEncounter = !visitId;
  const isSigned = rx?.status === "signed";
  const canPrint = isSigned && !dirty;
  const signerName = authUser?.full_name || authUser?.email || t("rx.physician");
  const age = ageFrom(patient?.date_of_birth);
  const mrn = patient?.file_number || (patient?.id ? String(patient.id).slice(0, 8).toUpperCase() : "—");

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "300ms" }} data-testid="hx-rx">
      {/* print isolation — only the Rx paper prints (platform POS pattern) */}
      <style>{`@media print { body * { visibility: hidden !important; } #hx-rx-print, #hx-rx-print * { visibility: visible !important; } #hx-rx-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      <div className="hx-panel-h">
        <FileText className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
        <span className="font-semibold">{t("rx.title")}</span>
        {rx && (
          <span className={`hx-chip ${isSigned ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-rx-status">
            {isSigned ? <CheckCircle2 className="h-3 w-3" /> : null}{isSigned ? t("rx.signedChip") : t("rx.draftChip")}
          </span>
        )}
        <span className="ml-auto"><HospitalModeToggle /></span>
      </div>

      <div className="hx-panel-b">
        {noEncounter ? (
          <p className="hx-dim text-sm" data-testid="hx-rx-empty">{t("rx.empty")}</p>
        ) : (
          <div className="space-y-3">
            <div className="hx-faint text-xs" data-testid="hx-rx-modehint">
              {isAssisted ? t("rx.hintAssisted") : t("rx.hintManual")}
            </div>

            {/* ASSISTED: MEDICA drafts the Rx from the placed meds */}
            {isAssisted && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }}
                  onClick={draftWithMedica} disabled={aiState === "loading" || placedMeds.length === 0} data-testid="hx-rx-draft">
                  {aiState === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("rx.drafting")}</>
                    : <><Sparkles className="h-4 w-4" /> {t("rx.draft")}</>}
                </button>
                {placedMeds.length === 0
                  ? <span className="hx-faint text-xs" data-testid="hx-rx-nomeds">{t("rx.noPlacedMeds")}</span>
                  : <span className="hx-faint text-xs">{placedMeds.length === 1 ? t("rx.onePlaced") : `${placedMeds.length} ${t("rx.placedMeds")}`}</span>}
                {drafted && (
                  <span className="hx-chip hx-chip--warn" style={{ display: "inline-flex" }} data-testid="hx-rx-disclaimer">
                    <AlertTriangle className="h-3 w-3" /> {t("rx.disclaimer")}
                  </span>
                )}
              </div>
            )}
            {aiState === "error" && (
              <p className="hx-dim text-sm" data-testid="hx-rx-ai-error">
                {aiErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={draftWithMedica}>{t("medica.retry")}</button>
              </p>
            )}

            {/* editable Rx lines */}
            <div className="space-y-2" data-testid="hx-rx-items">
              {items.length === 0 && <p className="hx-faint text-xs">{t("rx.noItems")}</p>}
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end" data-testid="hx-rx-item">
                  <div className="col-span-12 sm:col-span-3">
                    <label className="hx-label">{t("rx.med")}</label>
                    <input className="hx-input" value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder={t("rx.medPh")} data-testid="hx-rx-name" />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="hx-label">{t("rx.dose")}</label>
                    <input className="hx-input" value={it.dose} onChange={(e) => setItem(i, "dose", e.target.value)} placeholder={t("rx.dosePh")} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="hx-label">{t("rx.frequency")}</label>
                    <input className="hx-input" value={it.frequency} onChange={(e) => setItem(i, "frequency", e.target.value)} placeholder={t("rx.frequencyPh")} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="hx-label">{t("rx.duration")}</label>
                    <input className="hx-input" value={it.duration} onChange={(e) => setItem(i, "duration", e.target.value)} placeholder={t("rx.durationPh")} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <label className="hx-label">{t("rx.route")}</label>
                    <input className="hx-input" value={it.route} onChange={(e) => setItem(i, "route", e.target.value)} placeholder={t("rx.routePh")} />
                  </div>
                  <div className="col-span-1 sm:col-span-1">
                    <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.4rem" }} onClick={() => removeItem(i)} aria-label={t("rx.remove")} data-testid="hx-rx-remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.7rem" }} onClick={addItem} data-testid="hx-rx-add">
                <Plus className="h-3.5 w-3.5" /> {t("rx.addMed")}
              </button>
            </div>

            {/* advice + follow-up (the patient-facing instructions — the Bangla win) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="hx-label">{t("rx.advice")}</label>
                <textarea className="hx-input" rows={2} value={advice} onChange={(e) => { setAdvice(e.target.value); setDirty(true); }} placeholder={t("rx.advicePh")} data-testid="hx-rx-advice" />
              </div>
              <div>
                <label className="hx-label">{t("rx.followUp")}</label>
                <textarea className="hx-input" rows={2} value={followUp} onChange={(e) => { setFollowUp(e.target.value); setDirty(true); }} placeholder={t("rx.followUpPh")} data-testid="hx-rx-followup" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="hx-btn hx-btn--ghost" onClick={() => persist("draft")} disabled={!dirty || save.isPending} data-testid="hx-rx-savedraft">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("rx.saveDraft")}
              </button>
              <button className="hx-btn hx-btn--primary" onClick={() => persist("signed")} disabled={save.isPending || cleanItems().length === 0} data-testid="hx-rx-sign">
                <PenLine className="h-4 w-4" /> {t("rx.sign")}
              </button>
              {canPrint && (
                <button className="hx-btn hx-btn--ghost" onClick={() => window.print()} data-testid="hx-rx-print-btn">
                  <Printer className="h-4 w-4" /> {t("rx.print")}
                </button>
              )}
              {isSigned && !dirty && rx?.signed_at && (
                <span className="hx-faint text-xs" data-testid="hx-rx-signedmeta">
                  {t("rx.signedBy")} {signerName} · {new Date(rx.signed_at).toLocaleString()}
                </span>
              )}
              {isSigned && dirty && <span className="hx-faint text-xs" data-testid="hx-rx-resign">{t("rx.editedResign")}</span>}
            </div>

            {/* printable paper preview — renders the SAVED, SIGNED Rx (light, black-on-white) */}
            {isSigned && (
              <div id="hx-rx-print" className="hx-rx-paper" data-testid="hx-rx-paper"
                style={{ marginTop: "0.5rem", background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 10, padding: "18px 20px", fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111827", paddingBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{tenantConfig?.company_name || "Hospital"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{t("rx.title")}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>℞</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                  <span><b>{t("rx.patient")}:</b> {patient?.full_name}</span>
                  <span><b>{t("journey.mrn")}:</b> {mrn}</span>
                  {age != null && <span><b>{t("rx.age")}:</b> {age}</span>}
                  {patient?.gender && <span style={{ textTransform: "capitalize" }}><b>{t("rx.sex")}:</b> {patient.gender}</span>}
                  <span><b>{t("rx.date")}:</b> {rx?.signed_at ? new Date(rx.signed_at).toLocaleDateString() : ""}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0", fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#374151", borderBottom: "1px solid #d1d5db" }}>
                      <th style={{ padding: "4px 6px", width: 22 }}>#</th>
                      <th style={{ padding: "4px 6px" }}>{t("rx.med")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("rx.dose")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("rx.frequency")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("rx.duration")}</th>
                      <th style={{ padding: "4px 6px" }}>{t("rx.route")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rx?.items || []).map((it, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "4px 6px", color: "#6b7280" }}>{i + 1}</td>
                        <td style={{ padding: "4px 6px", fontWeight: 600 }}>{it.name}</td>
                        <td style={{ padding: "4px 6px" }}>{it.dose || "—"}</td>
                        <td style={{ padding: "4px 6px" }}>{it.frequency || "—"}</td>
                        <td style={{ padding: "4px 6px" }}>{it.duration || "—"}</td>
                        <td style={{ padding: "4px 6px" }}>{it.route || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rx?.advice && <div style={{ fontSize: 12, margin: "4px 0" }}><b>{t("rx.advice")}:</b> {rx.advice}</div>}
                {rx?.follow_up && <div style={{ fontSize: 12, margin: "4px 0" }}><b>{t("rx.followUp")}:</b> {rx.follow_up}</div>}
                <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ textAlign: "center", minWidth: 200, borderTop: "1px solid #111827", paddingTop: 4, fontSize: 12 }}>
                    {signerName}<br /><span style={{ fontSize: 10, color: "#6b7280" }}>{t("rx.signedDigital")} · {rx?.signed_at ? new Date(rx.signed_at).toLocaleString() : ""}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
