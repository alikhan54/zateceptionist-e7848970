// HOSPITAL-PORTAL — /hospital/home: picks the role's home. Restricted roles land on THEIR home
// (composed on the existing walls — never weakened); admin gets a portal switcher. Roles whose
// portal home hasn't shipped yet are sent to their existing first page — nothing breaks mid-rollout.
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useHospitalRole, HOSPITAL_ROLE_PAGES, type HospitalRole } from "@/hooks/useHospitalRole";
import { HospitalGate } from "../hospitalShared";
import { useHospitalT } from "../i18n";
import { FrontDeskHome } from "./FrontDeskHome";
import { DoctorHome } from "./DoctorHome";
import { WardHome } from "./WardHome";
import { PharmacyHome, LabHome } from "./PharmacyLabHomes";

type PortalKey = "frontdesk" | "doctor" | "ward" | "pharmacy" | "lab";
const BUILT: PortalKey[] = ["frontdesk", "doctor", "ward", "pharmacy", "lab"];

function PortalBody() {
  const { hospitalRole, hrEmployeeId, loading } = useHospitalRole();
  const { t } = useHospitalT();
  const [adminPick, setAdminPick] = useState<PortalKey>("frontdesk");
  if (loading || !hospitalRole) return null;

  if (hospitalRole === "admin") {
    const switcher = (
      <select className="hxp-switch" value={adminPick} onChange={(e) => setAdminPick(e.target.value as PortalKey)} data-testid="hxp-switcher">
        {BUILT.map((k) => <option key={k} value={k}>{t(`portal.name.${k}`)}</option>)}
      </select>
    );
    if (adminPick === "doctor") return <DoctorHome hrEmployeeId={hrEmployeeId} switcher={switcher} />;
    if (adminPick === "ward") return <WardHome switcher={switcher} />;
    if (adminPick === "pharmacy") return <PharmacyHome switcher={switcher} />;
    if (adminPick === "lab") return <LabHome switcher={switcher} />;
    return <FrontDeskHome switcher={switcher} />;
  }
  if (hospitalRole === "doctor") return <DoctorHome hrEmployeeId={hrEmployeeId} />;
  if (hospitalRole === "opd_nurse") return <FrontDeskHome />;
  if (hospitalRole === "ward_nurse") return <WardHome />;
  if (hospitalRole === "pharmacy") return <PharmacyHome />;
  if (hospitalRole === "lab") return <LabHome />;
  // home not built yet for this role → its existing first page (never a dead end)
  const fallback = HOSPITAL_ROLE_PAGES[hospitalRole as HospitalRole]?.[0] || "/hospital/journey";
  return <Navigate to={fallback} replace />;
}

export default function PortalHome() {
  return (
    <HospitalGate>
      <PortalBody />
    </HospitalGate>
  );
}
