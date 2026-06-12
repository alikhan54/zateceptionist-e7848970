// HOSPITAL-PORTAL — /hospital/home: picks the role's home. Restricted roles land on THEIR home
// (composed on the existing walls — never weakened); admin gets a portal switcher. Roles whose
// portal home hasn't shipped yet are sent to their existing first page — nothing breaks mid-rollout.
import { Navigate, useSearchParams } from "react-router-dom";
import { useHospitalRole, HOSPITAL_ROLE_PAGES, type HospitalRole } from "@/hooks/useHospitalRole";
import { HospitalGate } from "../hospitalShared";
import { useHospitalT } from "../i18n";
import { FrontDeskHome } from "./FrontDeskHome";
import { DoctorHome } from "./DoctorHome";
import { WardHome } from "./WardHome";
import { PharmacyHome, LabHome } from "./PharmacyLabHomes";
import { OtHome, TriageHome, HodHome } from "./OtTriageHodHomes";

// THE PATIENT JOURNEY IS THE PORTAL SEQUENCE — switcher in journey order, HOD LAST (end of the
// chain). Front Desk is the demo's opening stage and the admin default.
type PortalKey = "frontdesk" | "triage" | "doctor" | "pharmacy" | "lab" | "ward" | "ot" | "hod";
const BUILT: PortalKey[] = ["frontdesk", "triage", "doctor", "pharmacy", "lab", "ward", "ot", "hod"];

function PortalBody() {
  const { hospitalRole, hrEmployeeId, loading } = useHospitalRole();
  const { t } = useHospitalT();
  // the picked portal lives in the URL (?portal=hod) so router HISTORY keeps the stage —
  // Back from a sub-page (e.g. HOD → Bed Board → Back) returns to the SAME portal, never Front Desk
  const [params, setParams] = useSearchParams();
  const raw = params.get("portal") as PortalKey | null;
  const adminPick: PortalKey = raw && BUILT.includes(raw) ? raw : "frontdesk";
  const setAdminPick = (k: PortalKey) => setParams(k === "frontdesk" ? {} : { portal: k });
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
    if (adminPick === "ot") return <OtHome switcher={switcher} />;
    if (adminPick === "triage") return <TriageHome switcher={switcher} />;
    if (adminPick === "hod") return <HodHome switcher={switcher} />;
    return <FrontDeskHome switcher={switcher} />;
  }
  if (hospitalRole === "doctor") return <DoctorHome hrEmployeeId={hrEmployeeId} />;
  if (hospitalRole === "opd_nurse") return <TriageHome />;
  if (hospitalRole === "ward_nurse") return <WardHome />;
  if (hospitalRole === "pharmacy") return <PharmacyHome />;
  if (hospitalRole === "lab") return <LabHome />;
  if (hospitalRole === "ot_nurse") return <OtHome />;
  if (hospitalRole === "surgeon") return <OtHome surgeonHrId={hrEmployeeId} />;
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
