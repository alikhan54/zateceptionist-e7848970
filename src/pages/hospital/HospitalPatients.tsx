import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowRight, Search, Stethoscope } from "lucide-react";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { PatientRegistrationDialog } from "@/components/clinic/PatientRegistrationDialog";
import { HospitalGate } from "./hospitalShared";

function ageFrom(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.max(0, Math.floor((Date.now() - +d) / 31557600000));
}

function HospitalPatientsInner() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [admitOpen, setAdmitOpen] = useState(false);
  const { patients, isLoading, createPatient } = useClinicPatients(search);

  return (
    <div data-testid="hx-patients">
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="hx-eyebrow">Hospital · Admissions</div>
            <h1 className="hx-h1">Admitted Patients</h1>
          </div>
          <button className="hx-btn hx-btn--primary" onClick={() => setAdmitOpen(true)} data-testid="hx-admit-patient">
            <UserPlus className="h-4 w-4" /> Admit Patient
          </button>
        </div>
      </div>

      <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "80ms" }}>
        <div className="hx-panel-h">
          <Search className="h-4 w-4 hx-dim" />
          <input className="hx-input" style={{ border: "none", background: "transparent", padding: 0 }}
            placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="hx-patient-search" />
          <span className="ml-auto hx-chip">{patients.length} admitted</span>
        </div>
        <div className="hx-panel-b">
          {isLoading ? (
            <p className="hx-dim text-sm">Loading…</p>
          ) : patients.length === 0 ? (
            <p className="hx-dim text-sm">No patients yet — admit the first patient to start the cardio pathway.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left hx-faint" style={{ fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <th className="py-2">Patient</th><th>MRN</th><th>Age / Sex</th><th>Phone</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p: any) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-patient-row">
                      <td className="py-2.5 font-medium">{p.full_name}</td>
                      <td className="hx-mono hx-dim">{String(p.id).slice(0, 8).toUpperCase()}</td>
                      <td className="hx-dim">{ageFrom(p.date_of_birth) ?? "—"}{p.gender ? ` · ${p.gender}` : ""}</td>
                      <td className="hx-mono hx-dim">{p.phone || "—"}</td>
                      <td className="text-right">
                        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.7rem" }}
                          onClick={() => navigate(`/hospital/journey?patient=${p.id}`)} data-testid="hx-open-journey">
                          <Stethoscope className="h-3.5 w-3.5" /> Journey <ArrowRight className="h-3.5 w-3.5" />
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

      <PatientRegistrationDialog open={admitOpen} onOpenChange={setAdmitOpen} onCreate={(p) => createPatient.mutateAsync(p as any)} />
    </div>
  );
}

export default function HospitalPatients() {
  return <HospitalGate><HospitalPatientsInner /></HospitalGate>;
}
