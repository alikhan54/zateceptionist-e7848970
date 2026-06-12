import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, ArrowRight, Search, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useHospitalBeds } from "@/hooks/useHospitalBeds";
import { useHospitalRole } from "@/hooks/useHospitalRole";
import { HospitalAdmitDialog } from "@/components/hospital/HospitalAdmitDialog";
import { HospitalGate, displayName } from "./hospitalShared";
import { useHospitalT } from "./i18n";

function ageFrom(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.max(0, Math.floor((Date.now() - +d) / 31557600000));
}

function HospitalPatientsInner() {
  const navigate = useNavigate();
  const { t, ti } = useHospitalT();
  const [search, setSearch] = useState("");
  const [admitOpen, setAdmitOpen] = useState(false);
  const { patients, isLoading } = useClinicPatients(search);

  // HOSPITAL-RBAC [8]: a doctor sees ONLY their attending patients; admin sees all. Filtered in the page
  // (useClinicPatients byte-identical). Shares the react-query key with PatientJourney → one cached fetch.
  const { tenantId } = useTenant();
  const { hospitalRole, hrEmployeeId } = useHospitalRole();
  const doctorScoped = hospitalRole === "doctor" && !!hrEmployeeId;
  const { data: attendingSet } = useQuery({
    queryKey: ["hx-doctor-attending", tenantId, hrEmployeeId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_admissions" as any)
        .select("patient_id").eq("tenant_id", tenantId).eq("attending_staff_id", hrEmployeeId);
      return new Set(((data as any[]) || []).map((r) => r.patient_id as string));
    },
    enabled: doctorScoped && !!tenantId,
  });
  const visiblePatients = useMemo(
    () => (doctorScoped ? (patients as any[]).filter((p) => attendingSet?.has(p.id)) : patients),
    [patients, doctorScoped, attendingSet],
  );

  // [ZATEOS B2] complete row detail: ward·bed (occupied beds) + attending/dept/LOS (admissions)
  const { wards } = useHospitalBeds();
  const bedByPatient = useMemo(() => {
    const m = new Map<string, any>();
    wards.flatMap((w) => w.beds).forEach((b: any) => { if (b.patient_id) m.set(b.patient_id, b); });
    return m;
  }, [wards]);
  const { data: admByPatient } = useQuery({
    queryKey: ["hx-patients-admissions", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_admissions" as any)
        .select("patient_id,department_name,attending_name,status,created_at")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false });
      const m = new Map<string, any>();
      ((data as any[]) || []).forEach((a) => { if (!m.has(a.patient_id)) m.set(a.patient_id, a); });
      return m;
    },
    enabled: !!tenantId,
  });
  const losDays = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 86_400_000)) : null);

  return (
    <div data-testid="hx-patients">
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="hx-eyebrow">{t("patients.eyebrow")}</div>
            <h1 className="hx-h1">{t("patients.title")}</h1>
          </div>
          <button className="hx-btn hx-btn--primary" onClick={() => setAdmitOpen(true)} data-testid="hx-admit-patient">
            <UserPlus className="h-4 w-4" /> {t("patients.admit")}
          </button>
        </div>
      </div>

      <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "80ms" }}>
        <div className="hx-panel-h">
          <Search className="h-4 w-4 hx-dim" />
          <input className="hx-input" style={{ border: "none", background: "transparent", padding: 0 }}
            placeholder={t("patients.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="hx-patient-search" />
          <span className="ml-auto hx-chip">{ti("patients.count", { n: visiblePatients.length })}</span>
        </div>
        <div className="hx-panel-b">
          {isLoading ? (
            <p className="hx-dim text-sm">{t("common.loading")}</p>
          ) : visiblePatients.length === 0 ? (
            <p className="hx-dim text-sm">{t("patients.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left hx-faint" style={{ fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <th className="py-2">{t("patients.thPatient")}</th><th>{t("patients.thMrn")}</th><th>{t("patients.thAgeSex")}</th><th>{t("patients.thPhone")}</th><th>{t("patients.thWard", "Ward · Bed")}</th><th>{t("patients.thAttending", "Attending")}</th><th>{t("patients.thStatus", "Status")}</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePatients.map((p: any) => (
                    <tr key={p.id} className="border-t cursor-pointer hover:bg-white/[0.025]" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-patient-row"
                      onClick={() => navigate(`/hospital/journey?patient=${p.id}`)}>
                      <td className="py-2.5 font-medium">{displayName(p.full_name)}</td>
                      <td className="hx-mono hx-dim" data-testid="hx-patient-mrn">{p.file_number || String(p.id).slice(0, 8).toUpperCase()}</td>
                      <td className="hx-dim">{ageFrom(p.date_of_birth) ?? "—"}{p.gender ? ` · ${p.gender}` : ""}</td>
                      <td className="hx-mono hx-dim">{p.phone || "—"}</td>
                      <td className="hx-dim" data-testid="hx-patient-ward">{(() => { const b = bedByPatient.get(p.id); return b ? `${b.ward} · ${b.bed_label}` : "—"; })()}</td>
                      <td className="hx-dim">{admByPatient?.get(p.id)?.attending_name || "—"}</td>
                      <td>{(() => {
                        const a = admByPatient?.get(p.id);
                        if (!a) return <span className="hx-chip text-xs">OPD</span>;
                        const d = losDays(a.created_at);
                        return a.status === "admitted"
                          ? <span className="hx-chip hx-chip--accent text-xs">{t("patients.stAdmitted", "Admitted")}{d !== null ? ` · ${d}d` : ""}</span>
                          : <span className="hx-chip hx-chip--ok text-xs">{t("patients.stDischarged", "Discharged")}</span>;
                      })()}</td>
                      <td className="text-right">
                        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.7rem" }}
                          onClick={() => navigate(`/hospital/journey?patient=${p.id}`)} data-testid="hx-open-journey">
                          <Stethoscope className="h-3.5 w-3.5" /> {t("patients.journey")} <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <HospitalAdmitDialog open={admitOpen} onOpenChange={setAdmitOpen} onAdmitted={(r) => navigate(`/hospital/journey?patient=${r.patient_id}`)} />
    </div>
  );
}

export default function HospitalPatients() {
  return <HospitalGate allow={["doctor", "admin"]}><HospitalPatientsInner /></HospitalGate>;
}
