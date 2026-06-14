// HOSPITAL-CHART [Brief 8 · A] — the one-click PATIENT RECORDS chart: a persistent chart bar
// on the Patient Journey + slide-over drawers per tab. Present AND historical record, never a
// route change. PURE READ-ONLY aggregation over existing sources (see useHospitalChart) — zero
// new tables, zero mutations. Rides the journey's RBAC (mounted inside the doctor/admin-gated
// page) and the tenant scoping of every query. Light/dark + EN/BN via the hx theme + i18n.
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BedDouble, FileText, FlaskConical, Folder, HeartPulse,
  LayoutGrid, Pill, ScanLine, ShieldAlert, Slice, Stethoscope,
} from "lucide-react";
import { useHospitalT } from "./i18n";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { DEFAULT_THRESHOLDS, classifyVital, type VitalStatus } from "@/lib/clinic/vitalsThresholds";
import {
  useHospitalChart, chartCounts, groupConsultations, watchFlags, overviewStats, recentActivity,
  chartDocuments, medicationOrders, imagingResults, signedOpNotes, visitHasVitals,
  type ChartData, type ChartVisit,
} from "@/hooks/useHospitalChart";
import { statusChipClass, OperationTheatrePanel } from "./OperationTheatre";
import { ConsultationSummaryBox } from "./ConsultationSummary";
import { PrescriptionPanel } from "./Prescription";
import { VitalsCaptureDialog } from "@/components/hospital/VitalsCaptureDialog";
import { HeartPulse as HeartPulseIcon } from "lucide-react";
import { displayName } from "./hospitalShared";
import { SummaryPrintButton, composeSummaryText } from "./PatientSummaryPaper";
import { SendDocControl } from "./SendDoc";

type TabKey = "overview" | "consultations" | "labs" | "reports" | "medications" | "surgery" | "vitals" | "documents";

const TABS: { key: TabKey; labelKey: string; icon: any }[] = [
  { key: "overview", labelKey: "chart.tab.overview", icon: LayoutGrid },
  { key: "consultations", labelKey: "chart.tab.consultations", icon: Stethoscope },
  { key: "labs", labelKey: "chart.tab.labs", icon: FlaskConical },
  { key: "reports", labelKey: "chart.tab.reports", icon: ScanLine },
  { key: "medications", labelKey: "chart.tab.medications", icon: Pill },
  { key: "surgery", labelKey: "chart.tab.surgery", icon: Slice },
  { key: "vitals", labelKey: "chart.tab.vitals", icon: HeartPulse },
  { key: "documents", labelKey: "chart.tab.documents", icon: Folder },
];

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function patientAllergies(patient: any): string[] {
  const out: string[] = [];
  if (Array.isArray(patient?.allergies)) patient.allergies.forEach((a: any) => { const s = String(a || "").trim(); if (s) out.push(s); });
  const d = (patient?.medical_allergy_details || "").trim();
  if (d && !out.some((x) => x.toLowerCase() === d.toLowerCase())) out.push(d);
  return out;
}

/** [CHART-UNIFY] PatientChartBar now renders in two modes (zero new behaviour — the same record
 *  tabs and the same live working panels, just relocated so the chart shows ONE primary bar):
 *   • mode="strip"   — the persistent patient-CONTEXT banner (name · admitted · allergies · watch
 *                      flags · Print summary · Send). Always visible; NOT a tab row.
 *   • mode="records" — the Brief-8 RECORD view, reached from the unified stage bar's leading
 *                      "Records" segment: the 8 record tabs + the selected tab rendered INLINE as a
 *                      full-screen record view (was a slide-over drawer — identical content/actions). */
export function PatientChartBar({ patient, currentBed, mode = "strip" }:
  { patient: any; currentBed?: { ward: string; bed_label: string } | null; mode?: "strip" | "records" }) {
  const { t } = useHospitalT();
  const { chart, refetch } = useHospitalChart(patient?.id);
  // records view: which tab is open (defaults to overview — the records "home"); strip mode ignores it
  const [openTab, setOpenTab] = useState<TabKey>("overview");
  const [vitalsOpen, setVitalsOpen] = useState(false);

  // patient switch → re-default to overview; the data re-keys (no stale bleed by construction)
  useEffect(() => { setOpenTab("overview"); }, [patient?.id]);

  const counts = useMemo(() => (chart ? chartCounts(chart) : null), [chart]);
  const flags = useMemo(() => (chart ? watchFlags(chart, DEFAULT_THRESHOLDS) : []), [chart]);
  const allergies = useMemo(() => patientAllergies(patient), [patient]);
  const activeAdmission = chart?.admissions.find((a) => a.status === "admitted") || null;
  // [FIX-B] the LIVE working panels mount inside the tabs — same shared components as the profile
  const latestVisit = useMemo(() => {
    const vs = (chart?.visits || []) as any[];
    return [...vs].sort((a, b) => +new Date(b.visit_date || b.created_at) - +new Date(a.visit_date || a.created_at))[0] || null;
  }, [chart]);
  const placedMeds = useMemo(() => ((chart?.orders || []) as any[])
    .filter((o) => o.order_type === "medication" && (!latestVisit?.id || o.visit_id === latestVisit.id || !o.visit_id))
    .map((o) => (o.details as any)?.item).filter(Boolean) as string[], [chart, latestVisit?.id]);

  if (!patient) return null;

  const badge = (k: TabKey): number | null => (!counts || k === "overview" ? null : (counts as any)[k === "labs" ? "labs" : k] ?? null);

  // ---------- strip mode: the persistent patient-context banner ----------
  if (mode === "strip") {
    return (
      <div data-testid="hx-chart">
        <div className="hx-panel hx-chartbar hx-rise" style={{ animationDelay: "40ms" }} data-testid="hx-chart-bar">
          {/* [CHART-UNIFY] patient-SAFETY + actions strip — allergies/watch always visible, plus
              Summary/Send. Identity (name·MRN·age) lives in the header above; not repeated here. */}
          <div className="hx-chartbar-id" style={{ paddingBottom: 0, borderTop: "none" }}>
            <span className="hx-eyebrow" style={{ whiteSpace: "nowrap" }} data-testid="hx-chart-name">{t("chart.safety", "Allergies & alerts")}</span>
            {activeAdmission && (
              <span className="hx-chip hx-chip--accent" style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-chart-admitted">
                <BedDouble className="h-3 w-3" />
                {t("chart.admitted")} {fmtDate(activeAdmission.created_at)}
                {currentBed ? ` · ${currentBed.ward} ${currentBed.bed_label}` : activeAdmission.ward ? ` · ${activeAdmission.ward}` : ""}
              </span>
            )}
            {allergies.length === 0 ? (
              <span className="hx-chip hx-chip--muted" style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-chart-nka">{t("chart.nka")}</span>
            ) : (
              allergies.slice(0, 2).map((a) => (
                <span key={a} className="hx-chip hx-chip--crit" style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-chart-allergy">
                  <ShieldAlert className="h-3 w-3" /> {a}
                </span>
              ))
            )}
            {flags.slice(0, 2).map((f) => (
              <span key={`${f.label}`} className={`hx-chip ${f.status === "critical" ? "hx-chip--crit" : "hx-chip--warn"}`}
                style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-chart-watch">
                <AlertTriangle className="h-3 w-3" /> {f.label} {f.value}
              </span>
            ))}
            {flags.length > 2 && <span className="hx-chip hx-chip--warn" style={{ padding: "0.05rem 0.5rem" }}>+{flags.length - 2}</span>}
            {/* [Brief 11 · B/C] the Full Journey Summary paper + Send-to-patient delivery */}
            <span className="ml-auto inline-flex items-center gap-1.5">
              <SummaryPrintButton patient={patient} chart={chart} />
              {chart && (
                <SendDocControl testid="hx-send-summary"
                  defaultPhone={patient.phone} defaultEmail={patient.email}
                  subject="Bangladesh Specialized Hospital — your journey summary"
                  composeText={() => composeSummaryText(patient, chart)} />
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---------- records mode: the full-screen record view (reached from the unified bar) ----------
  return (
    <div className="hx-record-view space-y-4" data-testid="hx-record-view">
      <div className="hx-record-tabs hx-rise" role="tablist" data-testid="hx-chart-bar">
        {TABS.map(({ key, labelKey, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={openTab === key}
            className={`hx-tab ${openTab === key ? "active" : ""}`}
            onClick={() => { setOpenTab(key); refetch(); }}
            data-testid={`hx-chart-tab-${key}`}>
            <Icon className="h-3.5 w-3.5" />
            <span>{t(labelKey)}</span>
            {badge(key) != null && <span className="hx-tab-badge" data-testid={`hx-chart-count-${key}`}>{badge(key)}</span>}
          </button>
        ))}
      </div>

      <div className="hx-panel hx-rise" data-testid="hx-chart-content" data-tab={openTab}>
        <div className="hx-drawer-h" style={{ position: "static", padding: "0.9rem 1.1rem" }}>
          <div className="min-w-0">
            <div className="hx-eyebrow">{t("chart.eyebrow")}</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ fontSize: "1.1rem" }} data-testid="hx-chart-drawer-title">{t(`chart.tab.${openTab}`)}</span>
              {badge(openTab) != null && <span className="hx-chip hx-chip--accent" style={{ padding: "0.05rem 0.5rem" }}>{badge(openTab)}</span>}
            </div>
            <div className="hx-dim text-xs mt-0.5" data-testid="hx-chart-drawer-patient">
              {patient.full_name}{patient.file_number ? ` · ${patient.file_number}` : ""}
            </div>
          </div>
        </div>
        <div className="hx-drawer-b" data-testid="hx-chart-tabbody" style={{ overflow: "visible", padding: "0 1.1rem 1.2rem" }}>
          {!chart ? (
            <p className="hx-dim text-sm">{t("common.loading")}</p>
          ) : openTab === "overview" ? <OverviewTab chart={chart} allergies={allergies} flags={flags} />
            : openTab === "consultations" ? (
              <div className="space-y-4" data-testid="hx-tab-live-consult">
                <ConsultationSummaryBox patientId={patient.id} patientName={patient.full_name} visitId={latestVisit?.id ?? null} startOpen />
                <div className="hx-eyebrow">{t("chart.history", "History")}</div>
                <ConsultationsTab chart={chart} />
              </div>
            )
            : openTab === "labs" ? <LabsTab chart={chart} />
            : openTab === "reports" ? <ReportsTab chart={chart} />
            : openTab === "medications" ? (
              <div className="space-y-4" data-testid="hx-tab-live-rx">
                <PrescriptionPanel patient={patient} visitId={latestVisit?.id ?? null} placedMeds={placedMeds} />
                <div className="hx-eyebrow">{t("chart.history", "History")}</div>
                <MedicationsTab chart={chart} />
              </div>
            )
            : openTab === "surgery" ? (
              <div className="space-y-4" data-testid="hx-tab-live-ot">
                <OperationTheatrePanel patient={patient} visitId={latestVisit?.id ?? null} />
                <div className="hx-eyebrow">{t("chart.history", "History")}</div>
                <SurgeryTab chart={chart} />
              </div>
            )
            : openTab === "vitals" ? (
              <div className="space-y-4" data-testid="hx-tab-live-vitals">
                <button className="hx-btn hx-btn--primary" style={{ padding: "0.4rem 0.9rem" }} onClick={() => setVitalsOpen(true)} data-testid="hx-tab-capture-vitals">
                  <HeartPulseIcon className="h-4 w-4" /> {t("vitals.capture")}
                </button>
                <VitalsTab chart={chart} />
              </div>
            )
            : <DocumentsTab chart={chart} />}
        </div>
      </div>
      <VitalsCaptureDialog open={vitalsOpen} onOpenChange={setVitalsOpen} patientId={patient?.id} patientName={patient?.full_name} visitId={latestVisit?.id} />
    </div>
  );
}

// ============================== tab bodies ==============================

function Empty({ k }: { k?: TabKey }) {
  const { t } = useHospitalT();
  return (
    <div className="hx-tab-empty" data-testid="hx-chart-empty">
      <Folder className="h-7 w-7" style={{ color: "var(--hx-faint)" }} />
      <p className="font-medium mt-2">{t("chart.empty")}</p>
      {k && <p className="hx-dim text-sm mt-1" data-testid="hx-chart-empty-hint">{t(`chart.empty.${k}`)}</p>}
    </div>
  );
}


function OverviewTab({ chart, allergies, flags }: { chart: ChartData; allergies: string[]; flags: ReturnType<typeof watchFlags> }) {
  const { t } = useHospitalT();
  const stats = overviewStats(chart, DEFAULT_THRESHOLDS);
  const activity = recentActivity(chart, 10);
  const cards: { key: string; labelKey: string; value: number; hot?: boolean }[] = [
    { key: "diagnosis", labelKey: "chart.stat.diagnosis", value: stats.activeDiagnosis },
    { key: "watch", labelKey: "chart.stat.watch", value: stats.openWatchFlags, hot: stats.openWatchFlags > 0 },
    { key: "meds", labelKey: "chart.stat.meds", value: stats.activeMedications },
    { key: "pending", labelKey: "chart.stat.pending", value: stats.pendingResults },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5" data-testid="hx-chart-stats">
        {cards.map((c) => (
          <div key={c.key} className="hx-vital" data-testid={`hx-chart-stat-${c.key}`}>
            <div className="v" style={c.hot ? { color: "var(--hx-warn)" } : undefined}>{c.value}</div>
            <div className="l">{t(c.labelKey)}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="hx-group-h"><Activity className="h-3.5 w-3.5" /> {t("chart.recent")}</div>
        {activity.length === 0 ? <Empty k="overview" /> : (
          <ul className="space-y-1.5" data-testid="hx-chart-activity">
            {activity.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-sm" data-testid="hx-chart-activity-row">
                <span className="hx-faint hx-mono text-xs" style={{ minWidth: 84 }}>{fmtDate(e.at)}</span>
                <span className="hx-chip" style={{ padding: "0.05rem 0.45rem" }}>{t(`chart.ev.${e.kind}`, e.kind)}</span>
                <span className="truncate hx-dim text-xs">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="hx-group-h"><ShieldAlert className="h-3.5 w-3.5" /> {t("chart.watchAllergies")}</div>
        <div className="flex flex-wrap gap-1.5" data-testid="hx-chart-wa">
          {allergies.length === 0
            ? <span className="hx-chip hx-chip--muted">{t("chart.nka")}</span>
            : allergies.map((a) => <span key={a} className="hx-chip hx-chip--crit"><ShieldAlert className="h-3 w-3" /> {a}</span>)}
          {flags.map((f, i) => (
            <span key={i} className={`hx-chip ${f.status === "critical" ? "hx-chip--crit" : "hx-chip--warn"}`}>
              <AlertTriangle className="h-3 w-3" /> {f.label} {f.value}
            </span>
          ))}
          {flags.length === 0 && <span className="hx-chip hx-chip--ok">{t("chart.noWatch")}</span>}
        </div>
      </div>
    </div>
  );
}

function ConsultationsTab({ chart }: { chart: ChartData }) {
  const { t } = useHospitalT();
  const groups = groupConsultations(chart);
  if (groups.length === 0) return <Empty k="consultations" />;
  return (
    <div className="space-y-4" data-testid="hx-chart-consults">
      {groups.map((g) => (
        <div key={g.department} data-testid="hx-chart-consult-dept" data-dept={g.department}>
          <div className="hx-group-h"><Stethoscope className="h-3.5 w-3.5" /> {g.department}
            <span className="hx-tab-badge" style={{ marginLeft: 6 }}>{g.total}</span></div>
          {g.doctors.map((d) => (
            <div key={d.doctor} style={{ paddingLeft: 10 }} data-testid="hx-chart-consult-doctor" data-doctor={d.doctor}>
              <div className="hx-dim text-xs font-semibold mt-1.5 mb-1">{d.doctor}</div>
              <ul className="space-y-2">
                {d.entries.map((e) => (
                  <li key={e.visit.id} className="hx-entry" data-testid="hx-chart-consult-entry">
                    <div className="flex items-center gap-2">
                      <span className="hx-mono text-xs" style={{ color: "var(--hx-accent)" }}>{fmtDate(e.visit.visit_date || e.visit.created_at)}</span>
                      {e.note?.summary_source && (
                        <span className="hx-chip" style={{ padding: "0 0.4rem" }}>{t(`consult.src.${e.note.summary_source}`, e.note.summary_source)}</span>
                      )}
                    </div>
                    {e.visit.diagnosis && <div className="text-sm mt-0.5"><span className="hx-faint">{t("remarks.diagnosis")}:</span> {e.visit.diagnosis}</div>}
                    {e.note?.chief_complaint && <div className="text-sm mt-0.5"><span className="hx-faint">{t("consult.chiefComplaint")}:</span> {e.note.chief_complaint}</div>}
                    {e.note?.assessment && <div className="text-sm mt-0.5"><span className="hx-faint">{t("consult.assessment")}:</span> {e.note.assessment}</div>}
                    {e.note?.plan && <div className="text-sm mt-0.5"><span className="hx-faint">{t("consult.plan")}:</span> {e.note.plan}</div>}
                    {e.visit.doctor_notes && <div className="hx-dim text-xs mt-0.5"><span className="hx-faint">{t("chart.remark")}:</span> {e.visit.doctor_notes}</div>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LabsTab({ chart }: { chart: ChartData }) {
  const { t, ti } = useHospitalT();
  if (chart.labs.length === 0) return <Empty k="labs" />;
  const flagClass = (f?: string) => {
    const x = (f || "").toUpperCase();
    return ["CRITICAL", "CRIT"].includes(x) ? "hx-chip--crit" : ["H", "L", "HIGH", "LOW", "ABN", "*", "A"].includes(x) ? "hx-chip--warn" : "";
  };
  return (
    <div className="space-y-3" data-testid="hx-chart-labs">
      {chart.labs.map((l) => {
        const flagged = (l.findings || []).filter((f: any) => (f.flag || "").trim());
        return (
          <div key={l.id} className="hx-entry" data-testid="hx-chart-lab-entry">
            <div className="flex items-center gap-2 flex-wrap">
              <FlaskConical className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
              <span className="font-medium text-sm">{l.file_name || t("chart.doc.labpdf")}</span>
              <span className="hx-mono hx-faint text-xs">{fmtDate(l.created_at)}</span>
              {flagged.length > 0 && <span className="hx-chip hx-chip--warn" style={{ padding: "0 0.45rem" }}>{ti("lab.flagsN", { n: flagged.length })}</span>}
            </div>
            {l.takeaway && <div className="hx-dim text-xs mt-1">{l.takeaway}</div>}
            {(l.findings || []).length > 0 && (
              <table className="hx-mini-table mt-1.5">
                <tbody>
                  {(l.findings || []).map((f: any, i: number) => (
                    <tr key={i} data-testid="hx-chart-lab-finding">
                      <td>{f.test}</td>
                      <td className="hx-mono">{f.value}{f.unit ? ` ${f.unit}` : ""}</td>
                      <td className="hx-faint">{f.ref_range || ""}</td>
                      <td>{(f.flag || "").trim() && <span className={`hx-chip ${flagClass(f.flag)}`} style={{ padding: "0 0.4rem" }}>{f.flag}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportsTab({ chart }: { chart: ChartData }) {
  const { t } = useHospitalT();
  const opnotes = signedOpNotes(chart);
  const imaging = imagingResults(chart);
  const any = opnotes.length + chart.consents.length + chart.discharges.length + imaging.length > 0;
  if (!any) return <Empty k="reports" />;
  return (
    <div className="space-y-4" data-testid="hx-chart-reports">
      {opnotes.length > 0 && (
        <div>
          <div className="hx-group-h"><FileText className="h-3.5 w-3.5" /> {t("chart.reports.opnotes")}</div>
          <ul className="space-y-2">
            {opnotes.map((o) => (
              <li key={o.id} className="hx-entry" data-testid="hx-chart-report-opnote">
                <div className="flex items-center gap-2"><span className="font-medium text-sm">{o.procedure_name}</span>
                  <span className="hx-mono hx-faint text-xs">{fmtDate(o.op_note_signed_at)}</span>
                  <span className="hx-chip hx-chip--ok" style={{ padding: "0 0.45rem" }}>{t("rx.signedChip")}</span></div>
                {o.findings && <div className="hx-dim text-xs mt-0.5">{o.findings}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {chart.consents.length > 0 && (
        <div>
          <div className="hx-group-h"><ShieldAlert className="h-3.5 w-3.5" /> {t("chart.reports.consents")}</div>
          <ul className="space-y-2">
            {chart.consents.map((c) => (
              <li key={c.id} className="hx-entry" data-testid="hx-chart-report-consent">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm">{c.procedure || "—"}</span>
                  <span className="hx-mono hx-faint text-xs">{fmtDate(c.signed_at || c.created_at)}</span>
                  {c.language && <span className="hx-chip" style={{ padding: "0 0.4rem" }}>{c.language}</span>}</div>
                <div className="hx-dim text-xs mt-0.5">{t("chart.by")} {c.consented_by_name || "—"}{c.witnessed_by ? ` · ${t("ot.consent.witness")}: ${c.witnessed_by}` : ""}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {chart.discharges.length > 0 && (
        <div>
          <div className="hx-group-h"><FileText className="h-3.5 w-3.5" /> {t("chart.reports.discharges")}</div>
          <ul className="space-y-2">
            {chart.discharges.map((d) => (
              <li key={d.id} className="hx-entry" data-testid="hx-chart-report-discharge">
                <div className="flex items-center gap-2"><span className="font-medium text-sm">{t("discharge.title")}</span>
                  <span className="hx-mono hx-faint text-xs">{fmtDate(d.signed_at || d.created_at)}</span>
                  <span className={`hx-chip ${d.status === "signed" ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0 0.45rem" }}>
                    {d.status === "signed" ? t("rx.signedChip") : t("rx.draftChip")}</span></div>
                {d.reason_for_admission && <div className="hx-dim text-xs mt-0.5">{d.reason_for_admission}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {imaging.length > 0 && (
        <div>
          <div className="hx-group-h"><ScanLine className="h-3.5 w-3.5" /> {t("chart.reports.imaging")}</div>
          <ul className="space-y-2">
            {imaging.map((o) => (
              <li key={o.id} className="hx-entry" data-testid="hx-chart-report-imaging">
                <div className="flex items-center gap-2"><span className="font-medium text-sm">{(o.details as any)?.item || "—"}</span>
                  <span className="hx-mono hx-faint text-xs">{fmtDate(o.created_at)}</span>
                  <span className="hx-chip hx-chip--ok" style={{ padding: "0 0.45rem" }}>{t(`ostatus.${o.status}`, o.status)}</span></div>
                {(o.details as any)?.note && <div className="hx-dim text-xs mt-0.5">{(o.details as any).note}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MedicationsTab({ chart }: { chart: ChartData }) {
  const { t, ti } = useHospitalT();
  const medOrders = medicationOrders(chart);
  if (chart.prescriptions.length === 0 && medOrders.length === 0) return <Empty k="medications" />;
  return (
    <div className="space-y-4" data-testid="hx-chart-meds">
      {chart.prescriptions.map((p) => (
        <div key={p.id} className="hx-entry" data-testid="hx-chart-rx">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
            <span className="font-medium text-sm">{t("rx.title")}</span>
            <span className="hx-mono hx-faint text-xs">{fmtDate(p.signed_at || p.created_at)}</span>
            <span className={`hx-chip ${p.status === "signed" ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0 0.45rem" }}>
              {p.status === "signed" ? t("rx.signedChip") : t("rx.draftChip")}</span>
          </div>
          {(p.items || []).length > 0 && (
            <table className="hx-mini-table mt-1.5">
              <tbody>
                {(p.items || []).map((it: any, i: number) => (
                  <tr key={i} data-testid="hx-chart-rx-item">
                    <td className="font-medium">{it.name}</td>
                    <td className="hx-mono">{it.dose}</td>
                    <td className="hx-faint">{[it.frequency, it.duration, it.route].filter(Boolean).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {p.advice && <div className="hx-dim text-xs mt-1">{t("rx.advice")}: {p.advice}</div>}
          {p.follow_up && <div className="hx-dim text-xs mt-0.5">{t("rx.followUp")}: {p.follow_up}</div>}
        </div>
      ))}
      {medOrders.length > 0 && (
        <div>
          <div className="hx-group-h"><Pill className="h-3.5 w-3.5" /> {t("chart.meds.orders")}</div>
          <ul className="space-y-1.5">
            {medOrders.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-sm" data-testid="hx-chart-med-order">
                <span className="hx-mono hx-faint text-xs" style={{ minWidth: 84 }}>{fmtDate(o.created_at)}</span>
                <span className="truncate">{(o.details as any)?.item || "—"}</span>
                <span className={`hx-chip ${["dispensed"].includes(o.status) ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0 0.4rem", marginLeft: "auto" }}>
                  {t(`ostatus.${o.status}`, o.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SurgeryTab({ chart }: { chart: ChartData }) {
  const { t } = useHospitalT();
  const { byId } = useHospitalStaff();
  if (chart.otCases.length === 0) return <Empty k="surgery" />;
  return (
    <div className="space-y-3" data-testid="hx-chart-surgery">
      {chart.otCases.map((o) => (
        <div key={o.id} className="hx-entry" data-testid="hx-chart-ot-case">
          <div className="flex items-center gap-2 flex-wrap">
            <Slice className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
            <span className="font-medium text-sm">{o.procedure_name}</span>
            <span className={`hx-chip ${statusChipClass(o.status as any)}`} style={{ padding: "0 0.45rem" }}>{t(`ot.status.${o.status}`, o.status)}</span>
            <span className="hx-mono hx-faint text-xs">{fmtDate(o.scheduled_at || o.created_at)}</span>
          </div>
          <div className="hx-dim text-xs mt-0.5">
            {t("chart.surgery.surgeon")}: {o.surgeon_id ? (byId[o.surgeon_id]?.name || "—") : "—"}
            {o.op_note_signed_at ? ` · ${t("rx.signedChip")} ${fmtDate(o.op_note_signed_at)}` : ""}
          </div>
          {o.pre_op_diagnosis && <div className="text-sm mt-1"><span className="hx-faint">{t("ot.note.preOp")}:</span> {o.pre_op_diagnosis}</div>}
          {o.findings && <div className="text-sm mt-0.5"><span className="hx-faint">{t("ot.note.findings")}:</span> {o.findings}</div>}
          {o.complications && <div className="text-sm mt-0.5"><span className="hx-faint">{t("ot.note.complications")}:</span> {o.complications}</div>}
          {o.post_op_instructions && <div className="text-sm mt-0.5"><span className="hx-faint">{t("ot.note.postOp")}:</span> {o.post_op_instructions}</div>}
        </div>
      ))}
    </div>
  );
}

function VitalRow({ visit }: { visit: ChartVisit }) {
  const cells: { label: string; value: string; status: VitalStatus }[] = [];
  const th = DEFAULT_THRESHOLDS;
  const sys = classifyVital("blood_pressure_systolic", visit.blood_pressure_systolic, th);
  const dia = classifyVital("blood_pressure_diastolic", visit.blood_pressure_diastolic, th);
  if (visit.blood_pressure_systolic != null || visit.blood_pressure_diastolic != null)
    cells.push({ label: "BP", value: `${visit.blood_pressure_systolic ?? "—"}/${visit.blood_pressure_diastolic ?? "—"}`, status: [sys, dia].includes("critical") ? "critical" : [sys, dia].includes("warning") ? "warning" : "normal" });
  const singles: [string, keyof ChartVisit][] = [["Pulse", "heart_rate"], ["SpO₂", "spo2"], ["Temp", "temperature"], ["Resp", "respiratory_rate"], ["Sugar", "sugar"]];
  for (const [label, key] of singles) {
    const v = visit[key];
    if (v == null) continue;
    cells.push({ label, value: String(v), status: classifyVital(key as any, v as any, th) });
  }
  return (
    <div className="hx-entry" data-testid="hx-chart-vital-row">
      <div className="hx-mono text-xs mb-1" style={{ color: "var(--hx-accent)" }}>{fmtDateTime(visit.visit_date || visit.created_at)}</div>
      <div className="flex flex-wrap gap-1.5">
        {cells.map((c) => (
          <span key={c.label} className={`hx-chip ${c.status === "critical" ? "hx-chip--crit" : c.status === "warning" ? "hx-chip--warn" : "hx-chip--ok"}`}
            data-testid={`hx-chart-vital-${c.label}`}>{c.label} {c.value}</span>
        ))}
      </div>
    </div>
  );
}

function VitalsTab({ chart }: { chart: ChartData }) {
  const { t, ti } = useHospitalT();
  const withVitals = chart.visits.filter(visitHasVitals);
  const ep = chart.episodes.find((e) => e.status === "active") || chart.episodes[0];
  if (withVitals.length === 0 && !ep) return <Empty k="vitals" />;
  return (
    <div className="space-y-3" data-testid="hx-chart-vitals">
      {ep && Array.isArray(ep.score_history) && ep.score_history.length > 0 && (
        <div className="hx-entry" data-testid="hx-chart-ews">
          <div className="hx-group-h" style={{ marginBottom: 4 }}><Activity className="h-3.5 w-3.5" /> {t("chart.vitals.ews")}</div>
          <div className="flex flex-wrap gap-1.5">
            {ep.score_history.map((h: any, i: number) => (
              <span key={i} className={`hx-chip ${h.band === "high" ? "hx-chip--crit" : h.band === "medium" ? "hx-chip--warn" : "hx-chip--ok"}`}>
                {fmtDate(h.at)} · {ti("postop.score", { n: h.score })}
              </span>
            ))}
          </div>
        </div>
      )}
      {withVitals.map((v) => <VitalRow key={v.id} visit={v} />)}
    </div>
  );
}

function DocumentsTab({ chart }: { chart: ChartData }) {
  const { t, ti } = useHospitalT();
  const docs = chartDocuments(chart);
  if (docs.length === 0) return <Empty k="documents" />;
  return (
    <ul className="space-y-2" data-testid="hx-chart-docs">
      {docs.map((d, i) => (
        <li key={i} className="hx-entry flex items-center gap-2" data-testid="hx-chart-doc" data-kind={d.kind}>
          <Folder className="h-3.5 w-3.5" style={{ color: "var(--hx-accent2)" }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {t(`chart.doc.${d.kind}`)}
              {d.kind === "rx" ? ` · ${ti("chart.itemsN", { n: d.title })}` : d.title ? ` · ${d.title}` : ""}
            </div>
            <div className="hx-faint text-xs">{fmtDate(d.at)}{d.meta ? ` · ${d.meta}` : ""}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
