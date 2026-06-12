// HOSPITAL-PORTAL — DOCTOR home. His live queue (the Brief-9 data; click = open the journey,
// which marks seen exactly as the existing strip does), referred-in count, signed-today counts
// (his hospital_prescriptions + clinic_visits). Links into the existing Patient Journey.
import { Link } from "react-router-dom";
import { Stethoscope, ArrowRight } from "lucide-react";
import { useDoctorQueue } from "@/hooks/useHospitalDoctorQueue";
import { PortalShell, Stat, type RailItem } from "./PortalShell";
import { useMyDayCounts, usePatientNames } from "./usePortalData";
import { useHospitalT } from "../i18n";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function DoctorHome({ hrEmployeeId, switcher }: { hrEmployeeId: string | null; switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { queue } = useDoctorQueue(hrEmployeeId);
  const { data: day } = useMyDayCounts();
  const { data: names } = usePatientNames();

  const waiting = queue.filter((q) => q.status === "waiting");
  const referred = waiting.filter((q) => q.source === "referral");

  const rail: RailItem[] = waiting.map((w) => ({
    key: w.id,
    title: names?.get(w.patient_id) || "…",
    sub: `${w.source === "referral" ? t("portal.src.referral") : t("portal.src.nurse")} · ${hhmm(w.queued_at)}`,
    to: `/hospital/journey?patient=${w.patient_id}`,
  }));

  const medica = ti("portal.dr.medica", {
    w: waiting.length, r: referred.length, s: (day?.signedRx ?? 0) + (day?.consults ?? 0),
  });

  return (
    <PortalShell testid="hxp-doctor" identity={t("portal.dr.identity")} switcher={switcher}
      tabs={[
        { label: t("portal.tab.journey"), to: "/hospital/journey" },
        { label: t("portal.tab.patients"), to: "/hospital/patients" },
        { label: t("portal.tab.lab"), to: "/hospital/lab" },
        { label: t("portal.tab.pharmacy"), to: "/hospital/pharmacy" },
        { label: t("portal.tab.routines"), to: "/hospital/routines" },
      ]}
      railTitle={t("portal.dr.rail")} railItems={rail} railEmpty={t("portal.dr.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-dr-waiting" label={t("portal.dr.waiting")} value={waiting.length} sub={t("portal.dr.openOnClick")} />
        <Stat testid="hxp-dr-referred" label={t("portal.dr.referred")} value={referred.length} sub={t("portal.src.referral")} />
        <Stat testid="hxp-dr-signedrx" label={t("portal.dr.signedRx")} value={day?.signedRx ?? 0} sub={t("portal.today")} />
        <Stat testid="hxp-dr-consults" label={t("portal.dr.consults")} value={day?.consults ?? 0} sub={t("portal.today")} />
      </div>

      <div className="hxp-panel">
        <div className="hxp-panel-h"><Stethoscope className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.dr.queueTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-dr-queue">
          {waiting.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.dr.railEmpty")}</div>}
          {waiting.map((w) => (
            <Link key={w.id} to={`/hospital/journey?patient=${w.patient_id}`} className="hxp-row" style={{ textDecoration: "none", color: "inherit" }}>
              <span className={`hxp-mono${w.source === "referral" ? " crit" : ""}`}>{w.source === "referral" ? t("portal.src.referral") : t("portal.src.nurse")}</span>
              <span>{names?.get(w.patient_id) || "…"}</span>
              {w.reason && <span style={{ color: "var(--hxp-dim)", fontSize: "0.78rem" }}>— {w.reason}</span>}
              <span className="hxp-time">{hhmm(w.queued_at)}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/journey">{t("portal.dr.goJourney")}<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </PortalShell>
  );
}
