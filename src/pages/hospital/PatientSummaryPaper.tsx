// HOSPITAL-POS [Brief 11 · B] — the printable "Full Journey Summary": one paper composed from
// the EXISTING chart sources (admission · consultations dept→doctor→date · signed Rx · labs ·
// procedures · discharge). READ-ONLY composition over useHospitalChart — duplicates nothing.
// Prints via the body-attr multiplexed pattern (`hx-summary-print` — the 6th discriminator);
// save-as-PDF rides the browser print dialog like every other paper. EN or Bangla via hx-lang.
import { Printer } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import {
  groupConsultations, signedRx, signedOpNotes, signedDischarges, visitHasVitals,
  type ChartData,
} from "@/hooks/useHospitalChart";
import { hxPrintCss, printHxBlock } from "./hospitalShared";
import { useHospitalT } from "./i18n";

const d = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");
const S: Record<string, React.CSSProperties> = {
  h: { fontWeight: 700, fontSize: 13, borderBottom: "1px solid #d1d5db", margin: "10px 0 4px", paddingBottom: 2 },
  row: { fontSize: 12, margin: "2px 0" },
  faint: { color: "#6b7280" },
};

/** The print button — mounts in the chart bar; the paper renders hidden alongside. */
export function SummaryPrintButton({ patient, chart }: { patient: any; chart?: ChartData }) {
  const { t } = useHospitalT();
  if (!patient || !chart) return null;
  return (
    <>
      <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.22rem 0.55rem" }}
        onClick={() => printHxBlock("hx-summary-print")} data-testid="hx-summary-print-btn"
        title={t("summary.title")}>
        <Printer className="h-3.5 w-3.5" /> {t("summary.btn")}
      </button>
      <SummaryPaper patient={patient} chart={chart} />
    </>
  );
}

function SummaryPaper({ patient, chart }: { patient: any; chart: ChartData }) {
  const { t } = useHospitalT();
  const { tenantConfig } = useTenant();
  const admission = chart.admissions.find((a) => a.status === "admitted") || chart.admissions[0];
  const groups = groupConsultations(chart);
  const rx = signedRx(chart)[0];
  const opnotes = signedOpNotes(chart);
  const discharge = signedDischarges(chart)[0];
  const mrn = patient.file_number || String(patient.id).slice(0, 8).toUpperCase();
  return (
    <>
      <style>{hxPrintCss("hx-summary-print")}</style>
      <div id="hx-summary-print" aria-hidden="true" data-testid="hx-summary-paper"
        style={{ position: "absolute", left: -10000, top: 0, width: 720, background: "#fff", color: "#111827", padding: "22px 26px", fontFamily: "ui-sans-serif, system-ui", lineHeight: 1.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{(tenantConfig as any)?.company_name || "Hospital"}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{t("summary.title")}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280" }}>{d(new Date().toISOString())}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
          <span><b>{t("rx.patient")}:</b> {patient.full_name}</span>
          <span><b>{t("journey.mrn")}:</b> {mrn}</span>
          {patient.gender && <span><b>{t("rx.sex")}:</b> {patient.gender}</span>}
          {patient.phone && <span>{patient.phone}</span>}
        </div>

        {admission && (
          <section data-testid="hx-summary-admission">
            <div style={S.h}>{t("summary.admission")}</div>
            <div style={S.row}>
              {d(admission.created_at)} · {admission.department_name || "—"}
              {admission.attending_name ? ` · ${admission.attending_name}` : ""}
              {admission.ward ? ` · ${admission.ward}` : ""}
            </div>
            {admission.admitting_complaint && <div style={{ ...S.row, ...S.faint }}>{admission.admitting_complaint}</div>}
          </section>
        )}

        {groups.length > 0 && (
          <section data-testid="hx-summary-consults">
            <div style={S.h}>{t("chart.tab.consultations")}</div>
            {groups.map((g) => (
              <div key={g.department} style={{ marginBottom: 4 }}>
                <div style={{ ...S.row, fontWeight: 600 }}>{g.department}</div>
                {g.doctors.map((doc) => (
                  <div key={doc.doctor} style={{ paddingLeft: 10 }}>
                    <div style={{ ...S.row, ...S.faint }}>{doc.doctor}</div>
                    {doc.entries.map((e) => (
                      <div key={e.visit.id} style={{ ...S.row, paddingLeft: 10 }}>
                        <b>{d(e.visit.visit_date || e.visit.created_at)}</b>
                        {e.visit.diagnosis ? ` — ${e.visit.diagnosis}` : ""}
                        {e.note?.assessment ? ` · ${e.note.assessment}` : e.note?.chief_complaint ? ` · ${e.note.chief_complaint}` : ""}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {rx && (
          <section data-testid="hx-summary-meds">
            <div style={S.h}>{t("summary.meds")}</div>
            {(rx.items || []).map((m: any, i: number) => (
              <div key={i} style={S.row}>{m.name} {m.dose} — {[m.frequency, m.duration, m.route].filter(Boolean).join(" · ")}</div>
            ))}
            {rx.advice && <div style={{ ...S.row, ...S.faint }}>{t("rx.advice")}: {rx.advice}</div>}
          </section>
        )}

        {chart.labs.length > 0 && (
          <section data-testid="hx-summary-labs">
            <div style={S.h}>{t("chart.tab.labs")}</div>
            {chart.labs.map((l) => {
              const flagged = (l.findings || []).filter((f: any) => (f.flag || "").trim());
              return (
                <div key={l.id} style={S.row}>
                  <b>{d(l.created_at)}</b> — {l.file_name || t("chart.doc.labpdf")}
                  {flagged.length > 0 ? ` · ${flagged.map((f: any) => `${f.test} ${f.value}${f.unit ? ` ${f.unit}` : ""} (${f.flag})`).join(", ")}` : ""}
                  {l.takeaway ? <span style={S.faint}> — {l.takeaway}</span> : null}
                </div>
              );
            })}
          </section>
        )}

        {chart.otCases.length > 0 && (
          <section data-testid="hx-summary-procedures">
            <div style={S.h}>{t("summary.procedures")}</div>
            {chart.otCases.map((o) => (
              <div key={o.id} style={S.row}>
                <b>{d(o.scheduled_at || o.created_at)}</b> — {o.procedure_name} · {t(`ot.status.${o.status}`, o.status)}
                {opnotes.some((x) => x.id === o.id) && o.findings ? <span style={S.faint}> — {o.findings}</span> : null}
              </div>
            ))}
          </section>
        )}

        {discharge && (
          <section data-testid="hx-summary-discharge">
            <div style={S.h}>{t("discharge.title")}</div>
            {discharge.reason_for_admission && <div style={S.row}><b>{t("discharge.reason")}:</b> {discharge.reason_for_admission}</div>}
            <div style={S.row}><b>{t("rx.date")}:</b> {d(discharge.signed_at || discharge.created_at)}</div>
          </section>
        )}

        <div style={{ marginTop: 14, fontSize: 10, color: "#9ca3af", borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
          {t("summary.footer")} · {t("chart.tab.vitals")}: {chart.visits.filter(visitHasVitals).length} · {t("chart.tab.documents")}
        </div>
      </div>
    </>
  );
}
