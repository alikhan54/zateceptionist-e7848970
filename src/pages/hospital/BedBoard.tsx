// HOSPITAL-BEDS [Phase 2] — the live inpatient bed board. Role-gated to ward-ops (nurse + admin).
// The inpatient command surface: instant occupancy truth, LOS at a glance, the foundation the MEDICA
// discharge-readiness flag + the AM/PM vitals early-warning will sit on top of.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, ArrowRightLeft, LogOut, Sparkles, AlertTriangle, UserPlus, Activity, X, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHospitalBeds, type BedRow, LONG_STAY_DAYS } from "@/hooks/useHospitalBeds";
import { usePostopBoard, isAlertState } from "@/hooks/useHospitalPostop";
import { useDischargeReadyMap } from "@/hooks/useHospitalRoutines";
import { HospitalGate } from "./hospitalShared";
import { useHospitalT } from "./i18n";

const STATUS_CLASS: Record<string, string> = {
  available: "hx-chip--ok", occupied: "hx-chip--accent", cleaning: "hx-chip--warn", blocked: "hx-chip--muted",
};

function BedBoardInner() {
  const { t, ti } = useHospitalT();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { wards, unassigned, availableBeds, kpis, isLoading, assign, transfer, discharge, setStatus } = useHospitalBeds();
  // HOSPITAL-POSTOP (additive, read-only): patient → early-warning state for the occupied-tile flag
  const { data: ewsByPatient } = usePostopBoard();
  // HOSPITAL-ROLES [Brief 10 · D] (additive, read-only): discharge-readiness per occupied patient —
  // the chip + deep-link only; the existing bed Discharge button + the sign flow are untouched.
  const occupiedIds = useMemo(
    () => Array.from(new Set(wards.flatMap((w) => w.beds).map((b) => b.patient_id).filter(Boolean))) as string[],
    [wards],
  );
  const { data: readyMap } = useDischargeReadyMap(occupiedIds);
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});
  const [transferFor, setTransferFor] = useState<string | null>(null);

  const doAssign = async (admissionId: string, patientId: string) => {
    const bedId = assignSel[admissionId];
    if (!bedId) { toast({ title: t("beds.pickBed"), variant: "destructive" }); return; }
    try { await assign.mutateAsync({ admissionId, patientId, bedId, reason: "admit" }); toast({ title: t("beds.assigned") }); setAssignSel((s) => ({ ...s, [admissionId]: "" })); }
    catch (e: any) { toast({ title: t("beds.actionFail"), description: e?.message, variant: "destructive" }); }
  };
  const doTransfer = async (b: BedRow, toBedId: string) => {
    if (!toBedId || !b.admission_id) return;
    try { await transfer.mutateAsync({ admissionId: b.admission_id, patientId: b.patient_id, fromBedId: b.id, toBedId }); toast({ title: t("beds.transferred") }); setTransferFor(null); }
    catch (e: any) { toast({ title: t("beds.actionFail"), description: e?.message, variant: "destructive" }); }
  };
  const doDischarge = async (b: BedRow) => {
    if (!b.admission_id) return;
    try { await discharge.mutateAsync({ admissionId: b.admission_id, bedId: b.id }); toast({ title: t("beds.dischargedBed") }); }
    catch (e: any) { toast({ title: t("beds.actionFail"), description: e?.message, variant: "destructive" }); }
  };
  const doReady = async (b: BedRow) => {
    try { await setStatus.mutateAsync({ bedId: b.id, status: "available" }); toast({ title: t("beds.bedReady") }); }
    catch (e: any) { toast({ title: t("beds.actionFail"), description: e?.message, variant: "destructive" }); }
  };

  return (
    <div data-testid="hx-bed-board">
      {/* header + KPIs */}
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BedDouble className="h-6 w-6" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">{t("beds.eyebrow")}</div>
                <h1 className="hx-h1">{t("beds.title")}</h1>
                <p className="hx-dim text-sm mt-0.5">{t("beds.sub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap" data-testid="hx-bed-kpis">
              <span className="hx-stat" data-testid="hx-bed-kpi-occupancy">
                <span className="hx-stat-n">{kpis.occupied}/{kpis.total}</span>
                <span className="hx-stat-l">{ti("beds.kpiOccupied", { pct: kpis.occupancyPct })}</span>
              </span>
              <span className="hx-stat"><span className="hx-stat-n">{kpis.available}</span><span className="hx-stat-l">{t("beds.kpiAvailable")}</span></span>
              <span className="hx-stat"><span className="hx-stat-n">{kpis.cleaning}</span><span className="hx-stat-l">{t("beds.kpiCleaning")}</span></span>
              <span className="hx-stat" data-testid="hx-bed-kpi-longstay"><span className="hx-stat-n" style={kpis.longStay ? { color: "var(--hx-crit)" } : undefined}>{kpis.longStay}</span><span className="hx-stat-l">{ti("beds.kpiLongStay", { d: LONG_STAY_DAYS })}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* unassigned inpatients */}
      {unassigned.length > 0 && (
        <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "60ms" }}>
          <div className="hx-panel-h"><UserPlus className="h-4 w-4 hx-dim" /> <span className="hx-eyebrow">{t("beds.unassignedTitle")}</span>
            <span className="ml-auto hx-chip hx-chip--warn">{unassigned.length}</span></div>
          <div className="hx-panel-b" style={{ display: "grid", gap: "0.5rem" }}>
            {unassigned.map((p) => (
              <div key={p.admission_id} className="flex flex-wrap items-center gap-2" data-testid="hx-bed-unassigned-row">
                <Activity className="h-3.5 w-3.5" style={{ color: "var(--hx-accent)" }} />
                <span className="font-medium text-sm">{p.patient_name}</span>
                {p.department_name && <span className="hx-dim text-xs">· {p.department_name}</span>}
                {p.attending_name && <span className="hx-dim text-xs">· {p.attending_name}</span>}
                <span className="hx-chip text-xs">{ti("beds.losDays", { n: p.los_days })}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <select className="hx-select" style={{ width: "auto", minWidth: 150 }} value={assignSel[p.admission_id] || ""} onChange={(e) => setAssignSel((s) => ({ ...s, [p.admission_id]: e.target.value }))} data-testid="hx-bed-assign-select">
                    <option value="">{t("beds.selectBed")}</option>
                    {availableBeds.map((b) => <option key={b.id} value={b.id}>{b.ward} · {b.bed_label}</option>)}
                  </select>
                  <button className="hx-btn hx-btn--primary" style={{ padding: "0.3rem 0.7rem" }} onClick={() => doAssign(p.admission_id, p.patient_id)} disabled={assign.isPending} data-testid="hx-bed-assign-btn">
                    <BedDouble className="h-3.5 w-3.5" /> {t("beds.assign")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ward grids */}
      {isLoading ? <p className="hx-dim text-sm mt-4">{t("common.loading")}</p> : wards.map((w, wi) => (
        <div key={w.ward} className="hx-panel hx-rise mt-4" style={{ animationDelay: `${100 + wi * 50}ms` }} data-testid="hx-ward-section">
          <div className="hx-panel-h">
            <span className="hx-eyebrow">{w.ward}</span>
            <span className="ml-auto hx-chip" data-testid="hx-ward-occupancy">{ti("beds.wardOcc", { occ: w.occupied, tot: w.total, pct: w.occupancyPct })}</span>
          </div>
          <div className="hx-panel-b">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.7rem" }}>
              {w.beds.map((b) => (
                <div key={b.id} className={`hx-panel ${b.long_stay ? "hx-panel--crit" : ""}`} style={{ padding: "0.7rem 0.8rem", borderColor: b.status === "occupied" ? "var(--hx-border-strong)" : "var(--hx-border)" }} data-testid="hx-bed-tile" data-bed={b.bed_label} data-status={b.status}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="hx-mono font-semibold">{b.bed_label}</span>
                    <span className={`hx-chip ${STATUS_CLASS[b.status] || ""}`} style={{ fontSize: "0.62rem", padding: "0.05rem 0.4rem" }}>{t(`beds.status.${b.status}`)}</span>
                  </div>
                  <div className="hx-faint text-xs mt-0.5">{t(`beds.type.${b.bed_type}`, b.bed_type)}</div>
                  {b.status === "occupied" ? (
                    <div className="mt-1.5">
                      {/* [Brief 10 · C] click-through: the patient opens their care-routines view */}
                      <button type="button" className="font-medium text-sm hover:underline text-left" style={{ color: "var(--hx-text)" }}
                        onClick={() => navigate(`/hospital/routines?patient=${b.patient_id}`)} data-testid="hx-bed-patient">
                        {b.patient_name}
                      </button>
                      {b.attending_name && <div className="hx-dim text-xs">{b.attending_name}</div>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="hx-chip text-xs" data-testid="hx-bed-los">{ti("beds.losDays", { n: b.los_days ?? 0 })}</span>
                        {b.long_stay && <span className="hx-chip hx-chip--crit text-xs" data-testid="hx-bed-longstay"><AlertTriangle className="h-3 w-3" /> {t("beds.longStay")}</span>}
                        {(() => {
                          // HOSPITAL-POSTOP flag — deterministic early-warning on the ward board
                          const ews = b.patient_id ? ewsByPatient?.get(b.patient_id) : undefined;
                          if (!ews || !isAlertState(ews.band, ews.trend)) return null;
                          return (
                            <span className={`hx-chip text-xs ${ews.band === "high" ? "hx-chip--crit" : "hx-chip--warn"}`}
                              data-testid="hx-bed-ews" data-band={ews.band || ""} data-trend={ews.trend || ""}>
                              <Activity className="h-3 w-3" /> {ti("postop.bedFlag", { n: ews.score ?? "—" })}
                              {ews.trend === "deteriorating" ? " ↑" : ""}
                            </span>
                          );
                        })()}
                      </div>
                      {/* [Brief 10 · D] readiness chip + deep-link to the journey's EXISTING discharge
                          panel (the board never signs; the bed Discharge button below is untouched) */}
                      {b.patient_id && readyMap?.get(b.patient_id) && (
                        <div className="flex items-center gap-1.5 mt-1.5" data-testid="hx-bed-ready">
                          <span className="hx-chip hx-chip--ok text-xs"><CheckCircle2 className="h-3 w-3" /> {t("discharge.ready")}</span>
                          <button className="hx-btn hx-btn--ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem" }}
                            onClick={() => navigate(`/hospital/journey?patient=${b.patient_id}#discharge`)} data-testid="hx-bed-discharge-link">
                            {t("discharge.title")} <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {transferFor === b.id ? (
                        // [Brief 8 addendum (d)] opening Transfer must be escapable — visible Cancel + Esc
                        <div className="flex items-center gap-1.5 mt-2">
                          <select className="hx-select" value="" onChange={(e) => doTransfer(b, e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setTransferFor(null)} data-testid="hx-bed-transfer-select">
                            <option value="">{t("beds.transferTo")}</option>
                            {availableBeds.map((ab) => <option key={ab.id} value={ab.id}>{ab.ward} · {ab.bed_label}</option>)}
                          </select>
                          <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.55rem", fontSize: "0.72rem" }}
                            onClick={() => setTransferFor(null)} data-testid="hx-bed-transfer-cancel">
                            <X className="h-3 w-3" /> {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-2">
                          <button className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }} onClick={() => setTransferFor(b.id)} disabled={!availableBeds.length} data-testid="hx-bed-transfer-btn"><ArrowRightLeft className="h-3 w-3" /> {t("beds.transfer")}</button>
                          <button className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }} onClick={() => doDischarge(b)} disabled={discharge.isPending} data-testid="hx-bed-discharge-btn"><LogOut className="h-3 w-3" /> {t("beds.discharge")}</button>
                        </div>
                      )}
                    </div>
                  ) : b.status === "cleaning" ? (
                    <button className="hx-btn hx-btn--ghost mt-2" style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }} onClick={() => doReady(b)} disabled={setStatus.isPending} data-testid="hx-bed-ready-btn"><Sparkles className="h-3 w-3" /> {t("beds.markReady")}</button>
                  ) : (
                    <div className="hx-faint text-xs mt-2">{b.status === "blocked" ? t("beds.blockedNote") : t("beds.openNote")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BedBoard() {
  // [Brief 10] ward_nurse ADDED (additive); legacy nurse unchanged
  return <HospitalGate allow={["nurse", "ward_nurse", "admin"]}><BedBoardInner /></HospitalGate>;
}
