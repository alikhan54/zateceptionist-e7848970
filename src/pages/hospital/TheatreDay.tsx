// HOSPITAL-ROLES [Brief 10 · B] — /hospital/ot: the theatre-day list + the WHO-style PRE-OP
// checklist per case. ot_nurse records (checkbox items + note, recorded_by + timestamps);
// the SURGEON sees his own cases with the checklist READ-ONLY. RECORDS readiness only — the
// consent DB trigger remains the sole gate; nothing here changes case status.
import { useMemo, useState } from "react";
import { Slice, ClipboardCheck, Loader2, CheckCircle2, CalendarClock, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useHospitalRole } from "@/hooks/useHospitalRole";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalPreop, useTheatreCases, PREOP_ITEMS, type PreopItems, type TheatreCase } from "@/hooks/useHospitalPreop";
import { HospitalGate, EcgLine } from "./hospitalShared";
import { statusChipClass } from "./OperationTheatre";
import { useHospitalT } from "./i18n";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function PreopChecklist({ otCase, patientName, readOnly }: { otCase: TheatreCase; patientName: string; readOnly: boolean }) {
  const { t } = useHospitalT();
  const { toast } = useToast();
  const { hrEmployeeId } = useHospitalRole();
  const { byId } = useHospitalStaff();
  const { checklist, save } = useHospitalPreop(otCase.id, otCase.patient_id);
  const [draft, setDraft] = useState<PreopItems | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const items: PreopItems = draft ?? (checklist?.items || {});
  const note = noteDraft ?? (checklist?.note || "");
  const dirty = draft !== null || noteDraft !== null;
  const doneCount = PREOP_ITEMS.filter((k) => items[k]).length;

  async function onSave() {
    try {
      await save.mutateAsync({
        items, note,
        recordedByName: (hrEmployeeId && byId[hrEmployeeId]?.name) || null,
      });
      setDraft(null); setNoteDraft(null);
      toast({ title: t("preop.saved") });
    } catch (e: any) {
      toast({ title: t("preop.saveFail"), description: e?.message, variant: "destructive" });
    }
  }

  return (
    <div className="hx-intake mt-2.5" data-testid="hx-preop" data-case={otCase.id}>
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
        <span className="hx-label" style={{ margin: 0 }}>{t("preop.title")}</span>
        <span className="hx-tab-badge" data-testid="hx-preop-count">{doneCount}/{PREOP_ITEMS.length}</span>
        {readOnly && <span className="hx-chip" style={{ padding: "0 0.45rem" }} data-testid="hx-preop-readonly">{t("preop.readonly")}</span>}
      </div>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {PREOP_ITEMS.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm" data-testid={`hx-preop-${k}`} data-done={items[k] ? "1" : "0"}>
            <input type="checkbox" checked={!!items[k]} disabled={readOnly}
              onChange={(e) => setDraft({ ...items, [k]: e.target.checked })} />
            <span className={items[k] ? "" : "hx-dim"}>{t(`preop.item.${k}`)}</span>
          </label>
        ))}
      </div>
      <div className="mt-2">
        {readOnly ? (
          note && <p className="hx-dim text-xs" data-testid="hx-preop-note-ro">{t("preop.note")}: {note}</p>
        ) : (
          <input className="hx-input" value={note} placeholder={t("preop.notePh")}
            onChange={(e) => setNoteDraft(e.target.value)} data-testid="hx-preop-note" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2.5 flex-wrap">
        {!readOnly && (
          <button className="hx-btn hx-btn--primary" style={{ padding: "0.32rem 0.75rem" }}
            onClick={onSave} disabled={!dirty || save.isPending} data-testid="hx-preop-save">
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t("common.save")}
          </button>
        )}
        {checklist?.updated_at && (
          <span className="hx-faint text-xs" data-testid="hx-preop-meta">
            {t("preop.recordedBy")} {checklist.recorded_by_name || "—"} · {fmt(checklist.updated_at)}
          </span>
        )}
      </div>
    </div>
  );
}

function TheatreDayInner() {
  const { t, ti } = useHospitalT();
  const { tenantId } = useTenant();
  const { hospitalRole, hrEmployeeId } = useHospitalRole();
  const surgeonView = hospitalRole === "surgeon";
  const { data: cases = [], isLoading } = useTheatreCases(surgeonView ? hrEmployeeId : null);
  const { byId } = useHospitalStaff();

  const patientIds = useMemo(() => Array.from(new Set(cases.map((c) => c.patient_id))), [cases]);
  const { data: names } = useQuery({
    queryKey: ["hx-theatre-names", tenantId, patientIds.sort().join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("clinic_patients" as any)
        .select("id,full_name").eq("tenant_id", tenantId).in("id", patientIds);
      return new Map(((data as any[]) || []).map((p) => [p.id, p.full_name as string]));
    },
    enabled: !!tenantId && patientIds.length > 0,
  });

  return (
    <div data-testid="hx-theatre">
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Slice className="h-6 w-6" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">{t("theatre.eyebrow")}</div>
                <h1 className="hx-h1">{t("theatre.title")}</h1>
                <p className="hx-dim text-sm mt-0.5">{surgeonView ? t("theatre.subSurgeon") : t("theatre.subNurse")}</p>
              </div>
            </div>
            <span className="hx-chip hx-chip--accent" data-testid="hx-theatre-count">{ti("theatre.casesN", { n: cases.length })}</span>
          </div>
          <EcgLine className="mt-3" />
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {isLoading ? <p className="hx-dim text-sm">{t("common.loading")}</p>
          : cases.length === 0 ? (
            <div className="hx-panel"><div className="hx-panel-b"><p className="hx-dim text-sm" data-testid="hx-theatre-empty">{t("theatre.empty")}</p></div></div>
          ) : cases.map((c, i) => (
            <div key={c.id} className="hx-panel hx-rise" style={{ animationDelay: `${60 + i * 40}ms` }} data-testid="hx-theatre-case" data-status={c.status}>
              <div className="hx-panel-h">
                <CalendarClock className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
                <span className="font-semibold" data-testid="hx-theatre-patient">{names?.get(c.patient_id) || "—"}</span>
                <span className="hx-dim text-sm">· {c.procedure_name}</span>
                <span className={`hx-chip ${statusChipClass(c.status as any)}`} style={{ padding: "0.05rem 0.5rem" }}>{t(`ot.status.${c.status}`, c.status)}</span>
                <span className="ml-auto hx-mono hx-faint text-xs">{fmt(c.scheduled_at)}</span>
              </div>
              <div className="hx-panel-b" style={{ paddingTop: "0.7rem" }}>
                <div className="hx-dim text-xs flex items-center gap-2 flex-wrap">
                  <span>{t("ot.surgeon")}: {(c.surgeon_id && byId[c.surgeon_id]?.name) || "—"}</span>
                  {c.op_note_signed_at && <span className="hx-chip hx-chip--ok" style={{ padding: "0 0.45rem" }}><FileText className="h-3 w-3" /> {t("rx.signedChip")}</span>}
                </div>
                <PreopChecklist otCase={c} patientName={names?.get(c.patient_id) || ""} readOnly={surgeonView} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function TheatreDay() {
  return <HospitalGate allow={["ot_nurse", "surgeon", "admin"]}><TheatreDayInner /></HospitalGate>;
}
