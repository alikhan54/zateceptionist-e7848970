// The Laboratory page (/hospital/lab) — [ZATEOS C2] the reference's TAB system: Worklist
// (pending lab orders, patient-grouped) · Patient Reports (patient-wise: expand a patient →
// all their reports with flagged findings + takeaways) · Document Intelligence (the existing
// MEDICA PDF reader). Centered 1160px; every existing flow untouched — tabs re-arrange only.
import { useMemo, useState } from "react";
import { FlaskConical, FileText, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { HospitalGate, EcgLine, displayName } from "./hospitalShared";
import { LabReportPanel } from "./LabReportPanel";
import { OrderQueueInner } from "./OrderQueueView";
import { useHospitalT } from "./i18n";
import { useHospitalOrders } from "@/hooks/useHospitalOrders";

type LabTab = "worklist" | "reports" | "doc";

function PatientReports() {
  const { t, ti } = useHospitalT();
  const { tenantId } = useTenant();
  const { patients } = useClinicPatients();
  const [open, setOpen] = useState<string | null>(null);
  const { data: reports = [] } = useQuery({
    queryKey: ["hx-lab-reports-all", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_lab_reports" as any)
        .select("id,patient_id,file_name,status,findings,takeaway,created_at")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    (patients as any[]).forEach((p) => { m[p.id] = displayName(p.full_name); });
    return m;
  }, [patients]);
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    reports.forEach((r) => { if (!m.has(r.patient_id)) m.set(r.patient_id, []); m.get(r.patient_id)!.push(r); });
    return Array.from(m.entries());
  }, [reports]);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="hx-panel hx-rise" data-testid="hx-lab-patient-reports">
      <div className="hx-panel-h"><FileText className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} /><span className="font-semibold">{t("lab.tab.reports", "Patient Reports")}</span></div>
      <div className="hx-panel-b space-y-2">
        {groups.length === 0 && <p className="hx-dim text-sm">{t("lab.noReports", "No reports yet")}</p>}
        {groups.map(([pid, rs]) => {
          const isOpen = open === pid;
          const flaggedN = rs.reduce((a, r) => a + ((r.findings || []).filter((f: any) => (f.flag || "").trim()).length), 0);
          return (
            <div key={pid}>
              <button type="button" className="hx-stage-row" onClick={() => setOpen(isOpen ? null : pid)} data-testid="hx-lab-patient-row" data-expanded={isOpen ? "1" : "0"}>
                <span className="font-semibold">{nameById[pid] || "—"}</span>
                <span className="hx-chip text-xs">{ti("lab.reportsN", { n: rs.length })}</span>
                {flaggedN > 0 && <span className="hx-chip hx-chip--warn text-xs">{ti("lab.flaggedN", { n: flaggedN })}</span>}
                {isOpen ? <ChevronUp className="h-4 w-4 ml-auto hx-dim" /> : <ChevronDown className="h-4 w-4 ml-auto hx-dim" />}
              </button>
              {isOpen && (
                <ul className="mt-1 ml-2" data-testid="hx-lab-patient-reportlist">
                  {rs.map((r) => {
                    const flagged = (r.findings || []).filter((f: any) => (f.flag || "").trim());
                    return (
                      <li key={r.id} className="py-2.5 border-t" style={{ borderColor: "var(--hx-border)" }}>
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-medium">{r.file_name || t("chart.doc.labpdf", "Lab report")}</span>
                          <span className="hx-faint text-xs">{fmt(r.created_at)}</span>
                          {flagged.map((f: any, i: number) => (
                            <span key={i} className="hx-chip hx-chip--warn text-xs">{f.test} {f.value}{f.unit ? ` ${f.unit}` : ""} ({f.flag})</span>
                          ))}
                        </div>
                        {r.takeaway && <p className="hx-dim text-xs mt-1">{r.takeaway}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaboratoryInner() {
  const { t } = useHospitalT();
  const { orders } = useHospitalOrders({ orderType: "lab" });
  const [tab, setTab] = useState<LabTab>("worklist");
  const TabBtn = ({ k, label, icon: Icon }: { k: LabTab; label: string; icon: any }) => (
    <button type="button" className={`hx-btn ${tab === k ? "hx-btn--primary" : "hx-btn--ghost"}`}
      style={{ padding: "0.35rem 0.9rem" }} onClick={() => setTab(k)} data-testid={`hx-lab-tab-${k}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
  return (
    <div data-testid="hx-laboratory">
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6" style={{ color: "var(--hx-accent)" }} />
            <div>
              <div className="hx-eyebrow">{t("page.lab.eyebrow")}</div>
              <h1 className="hx-h1">{t("page.lab.title")}</h1>
            </div>
          </div>
          <EcgLine className="mt-3" />
          <div className="flex items-center gap-2 flex-wrap mt-3" data-testid="hx-lab-tabs">
            <TabBtn k="worklist" label={t("lab.tab.worklist", "Worklist")} icon={FlaskConical} />
            <TabBtn k="reports" label={t("lab.tab.reports", "Patient Reports")} icon={FileText} />
            <TabBtn k="doc" label={t("lab.tab.doc", "Document Intelligence")} icon={Sparkles} />
          </div>
        </div>
      </div>
      <div className="mt-4">
        {tab === "worklist" && (
          <OrderQueueInner type="lab" title={t("page.lab.title")} eyebrow={t("page.lab.eyebrow")} icon={FlaskConical} actionLabel={t("page.lab.action")} embedded />
        )}
        {tab === "reports" && <PatientReports />}
        {tab === "doc" && <LabReportPanel labOrders={orders} />}
      </div>
    </div>
  );
}

export default function Laboratory() {
  return <HospitalGate allow={["doctor", "lab", "admin"]}><LaboratoryInner /></HospitalGate>;
}
