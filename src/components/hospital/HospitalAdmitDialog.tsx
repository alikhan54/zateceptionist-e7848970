// HospitalAdmitDialog — the REAL hospital intake (replaces the cosmique aesthetics
// form on the hospital surface only). Additive; the clinic's PatientRegistrationDialog
// is untouched. Dark-themed via a layout-neutralised `.hx` wrapper so all hx-* classes
// + CSS vars resolve inside the portal.
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  UserPlus, Stethoscope, ShieldCheck, Phone, CreditCard, IdCard, HeartPulse, Loader2, RefreshCw, AlertTriangle, BedDouble,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHospitalDepartments } from "@/hooks/useHospitalOrders";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalAdmissions, type AdmitInput } from "@/hooks/useHospitalAdmissions";
import { useHospitalBeds } from "@/hooks/useHospitalBeds";
import { useHospitalT } from "@/pages/hospital/i18n";

type F = AdmitInput & { existing_patient_id?: string | null };

const EMPTY: F = {
  full_name: "", phone: "", email: "", date_of_birth: "", gender: "male",
  nationality: "", address: "", id_doc_type: "national_id", id_doc_number: "",
  admission_type: "opd", admitting_complaint: "", department_id: "", ward: "",
  attending_staff_id: "", insurance_status: "self_pay", insurance_provider: "", insurance_number: "",
  next_of_kin_name: "", next_of_kin_phone: "", next_of_kin_relationship: "",
  payment_amount: undefined, payment_currency: "BDT", payment_method: "cash", payment_status: "pending",
  notes: "", existing_patient_id: null,
};

export function HospitalAdmitDialog({
  open, onOpenChange, onAdmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdmitted?: (r: { patient_id: string; visit_id: string; mrn: string }) => void;
}) {
  const { toast } = useToast();
  const { t, ti } = useHospitalT();
  const { data: departments = [] } = useHospitalDepartments();
  const { doctors } = useHospitalStaff();
  const { admit, findByPhone } = useHospitalAdmissions();
  const { availableBeds, assign } = useHospitalBeds();   // HOSPITAL-BEDS: optional bed-pick on admit
  const [f, setF] = useState<F>(EMPTY);
  const [bedId, setBedId] = useState("");
  const [returning, setReturning] = useState<{ id: string; full_name: string; date_of_birth: string | null; gender: string | null } | null>(null);
  const set = (patch: Partial<F>) => setF((s) => ({ ...s, ...patch }));
  const debounce = useRef<any>(null);

  useEffect(() => { if (open) { setF(EMPTY); setReturning(null); setBedId(""); } }, [open]);

  // returning-patient routing [14]: debounced phone lookup → offer the existing record
  useEffect(() => {
    if (f.existing_patient_id) return;
    if (debounce.current) clearTimeout(debounce.current);
    const phone = f.phone;
    debounce.current = setTimeout(async () => {
      const hit = phone && phone.replace(/\D/g, "").length >= 6 ? await findByPhone(phone) : null;
      setReturning(hit && hit.id !== f.existing_patient_id ? hit : null);
    }, 500);
    return () => debounce.current && clearTimeout(debounce.current);
  }, [f.phone, f.existing_patient_id]);

  const useReturning = () => {
    if (!returning) return;
    set({ existing_patient_id: returning.id, full_name: returning.full_name,
          date_of_birth: returning.date_of_birth || "", gender: returning.gender || f.gender });
    setReturning(null);
  };
  const clearReturning = () => set({ existing_patient_id: null });

  const deptName = useMemo(() => departments.find((d) => d.id === f.department_id)?.name, [departments, f.department_id]);
  const deptCode = useMemo(() => departments.find((d) => d.id === f.department_id)?.code ?? undefined, [departments, f.department_id]);
  const attName = useMemo(() => doctors.find((d) => d.id === f.attending_staff_id)?.name, [doctors, f.attending_staff_id]);
  const insured = f.insurance_status === "insured" || f.insurance_status === "corporate";

  async function submit() {
    if (!f.full_name.trim()) { toast({ title: t("admit.nameReq"), variant: "destructive" }); return; }
    if (!f.phone.trim()) { toast({ title: t("admit.phoneReq"), variant: "destructive" }); return; }
    if (!f.admitting_complaint.trim()) { toast({ title: t("admit.complaintReq"), variant: "destructive" }); return; }
    try {
      const r = await admit.mutateAsync({
        ...f,
        department_name: deptName, department_code: deptCode, attending_name: attName,
        payment_amount: f.payment_amount === undefined || (f.payment_amount as any) === "" ? null : Number(f.payment_amount),
      });
      // HOSPITAL-BEDS: optional bed-pick — assign the chosen bed to this admission. A bed failure
      // does NOT fail the admit (the admission already succeeded); it just toasts a warning.
      if (bedId && (r as any).admission?.id) {
        try { await assign.mutateAsync({ admissionId: (r as any).admission.id, patientId: r.patient_id, bedId, reason: "admit" }); }
        catch (be: any) { toast({ title: t("beds.actionFail"), description: be?.message, variant: "destructive" }); }
      }
      toast({ title: f.existing_patient_id ? t("admit.readmitted") : t("admit.admitted"),
              description: `${f.full_name.trim()} · ${t("journey.mrn")} ${r.mrn}${attName ? ` · ${attName}` : ""}` });
      onAdmitted?.({ patient_id: r.patient_id, visit_id: r.visit_id, mrn: r.mrn });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("admit.fail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  const L = ({ children }: { children: any }) => <label className="hx-label">{children}</label>;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent
        className="hx-dialog max-w-3xl max-h-[92vh] overflow-y-auto border p-0"
        style={{ background: "var(--hx-dialog-bg)", borderColor: "var(--hx-dialog-border)", color: "var(--hx-text)" }}
      >
        <DialogTitle className="sr-only">{t("admit.title")}</DialogTitle>
        <div className="hx" style={{ margin: 0, minHeight: 0, padding: "1.4rem 1.5rem 1.6rem", background: "transparent" }} data-testid="hx-admit-dialog">
          {/* header */}
          <div className="flex items-center gap-3 mb-1">
            <UserPlus className="h-5 w-5" style={{ color: "var(--hx-accent)" }} />
            <div>
              <div className="hx-eyebrow">{t("admit.eyebrow")}</div>
              <div className="hx-h1" style={{ fontSize: "1.25rem" }}>{t("admit.title")}</div>
            </div>
          </div>
          <p className="hx-dim text-sm mb-4">{t("admit.sub")}</p>

          {/* returning-patient banner [14] */}
          {returning && !f.existing_patient_id && (
            <div className="hx-panel hx-panel--accent mb-4" style={{ padding: "0.7rem 0.9rem" }} data-testid="hx-admit-returning">
              <div className="flex items-center gap-2 flex-wrap">
                <RefreshCw className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
                <span className="text-sm">{ti("admit.returning", { name: returning.full_name })}</span>
                <button type="button" className="hx-btn hx-btn--primary ml-auto" style={{ padding: "0.3rem 0.7rem" }} onClick={useReturning} data-testid="hx-admit-use-returning">{t("admit.useRecord")}</button>
              </div>
            </div>
          )}
          {f.existing_patient_id && (
            <div className="hx-chip hx-chip--ok mb-4" data-testid="hx-admit-isreturning"><RefreshCw className="h-3 w-3" /> {t("admit.readmitting")}
              <button type="button" className="underline ml-2" style={{ color: "var(--hx-accent)" }} onClick={clearReturning}>{t("admit.newInstead")}</button>
            </div>
          )}

          {/* Identity */}
          <Section icon={IdCard} title={t("admit.secIdentity")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><L>{t("admit.fullName")} *</L>
                <input className="hx-input" value={f.full_name} disabled={!!f.existing_patient_id} onChange={(e) => set({ full_name: e.target.value })} placeholder={t("admit.phName")} data-testid="hx-admit-name" /></div>
              <div><L>{t("admit.phone")} *</L>
                <input className="hx-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder={t("admit.phPhone")} data-testid="hx-admit-phone" /></div>
              <div><L>{t("admit.email")}</L>
                <input className="hx-input" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder={t("admit.optional")} /></div>
              <div><L>{t("admit.dob")}</L>
                <input type="date" className="hx-input" value={f.date_of_birth} disabled={!!f.existing_patient_id} onChange={(e) => set({ date_of_birth: e.target.value })} data-testid="hx-admit-dob" /></div>
              <div><L>{t("admit.sex")}</L>
                <select className="hx-select" value={f.gender} onChange={(e) => set({ gender: e.target.value })} data-testid="hx-admit-gender">
                  <option value="male">{t("admit.male")}</option><option value="female">{t("admit.female")}</option><option value="other">{t("admit.other")}</option></select></div>
              <div><L>{t("admit.idDoc")}</L>
                <select className="hx-select" value={f.id_doc_type} onChange={(e) => set({ id_doc_type: e.target.value })} data-testid="hx-admit-idtype">
                  <option value="national_id">{t("admit.nid")}</option><option value="passport">{t("admit.passport")}</option>
                  <option value="birth_certificate">{t("admit.birthCert")}</option><option value="other">{t("admit.other")}</option></select></div>
              <div><L>{t("admit.idNumber")}</L>
                <input className="hx-input" value={f.id_doc_number} onChange={(e) => set({ id_doc_number: e.target.value })} placeholder={t("admit.phIdNum")} data-testid="hx-admit-idnum" /></div>
            </div>
          </Section>

          {/* Admission */}
          <Section icon={Stethoscope} title={t("admit.secAdmission")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><L>{t("admit.admissionType")}</L>
                <select className="hx-select" value={f.admission_type} onChange={(e) => set({ admission_type: e.target.value })} data-testid="hx-admit-type">
                  <option value="opd">{t("admit.opd")}</option><option value="emergency">{t("admit.emergency")}</option>
                  <option value="inpatient">{t("admit.inpatient")}</option><option value="daycare">{t("admit.daycare")}</option></select></div>
              <div><L>{t("admit.ward")}</L>
                <input className="hx-input" value={f.ward} onChange={(e) => set({ ward: e.target.value })} placeholder={t("admit.phWard")} /></div>
              <div className="sm:col-span-2"><L>{t("admit.complaint")} *</L>
                <textarea className="hx-input" rows={2} value={f.admitting_complaint} onChange={(e) => set({ admitting_complaint: e.target.value })} placeholder={t("admit.phComplaint")} data-testid="hx-admit-complaint" /></div>
              <div><L>{t("admit.department")}</L>
                <select className="hx-select" value={f.department_id} onChange={(e) => set({ department_id: e.target.value })} data-testid="hx-admit-dept">
                  <option value="">{t("admit.select")}</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><L>{t("admit.attending")}</L>
                <select className="hx-select" value={f.attending_staff_id} onChange={(e) => set({ attending_staff_id: e.target.value })} data-testid="hx-admit-attending">
                  <option value="">{t("admit.select")}</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.job_title ? ` · ${d.job_title}` : ""}</option>)}</select></div>
              <div><L>{t("beds.bedOptional")}</L>
                <select className="hx-select" value={bedId} onChange={(e) => setBedId(e.target.value)} data-testid="hx-admit-bed">
                  <option value="">{t("beds.selectBed")}</option>
                  {availableBeds.map((b) => <option key={b.id} value={b.id}>{b.ward} · {b.bed_label}</option>)}</select></div>
            </div>
          </Section>

          {/* Insurance + Next of kin */}
          <Section icon={ShieldCheck} title={t("admit.secInsurance")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><L>{t("admit.payer")}</L>
                <select className="hx-select" value={f.insurance_status} onChange={(e) => set({ insurance_status: e.target.value })} data-testid="hx-admit-payer">
                  <option value="self_pay">{t("admit.selfPay")}</option><option value="insured">{t("admit.insured")}</option><option value="corporate">{t("admit.corporate")}</option></select></div>
              {insured ? (<>
                <div><L>{t("admit.insurer")}</L><input className="hx-input" value={f.insurance_provider} onChange={(e) => set({ insurance_provider: e.target.value })} placeholder={t("admit.phInsurer")} /></div>
                <div><L>{t("admit.policyNo")}</L><input className="hx-input" value={f.insurance_number} onChange={(e) => set({ insurance_number: e.target.value })} /></div>
              </>) : <div className="hidden sm:block" />}
              <div><L>{t("admit.nokName")}</L><input className="hx-input" value={f.next_of_kin_name} onChange={(e) => set({ next_of_kin_name: e.target.value })} /></div>
              <div><L>{t("admit.nokPhone")}</L><input className="hx-input" value={f.next_of_kin_phone} onChange={(e) => set({ next_of_kin_phone: e.target.value })} placeholder={t("admit.phPhone")} /></div>
              <div><L>{t("admit.relationship")}</L>
                <select className="hx-select" value={f.next_of_kin_relationship} onChange={(e) => set({ next_of_kin_relationship: e.target.value })}>
                  <option value="">{t("admit.select")}</option>{["Spouse", "Parent", "Sibling", "Child", "Guardian", "Friend", "Other"].map((r) => <option key={r} value={r}>{t(`rel.${r}`, r)}</option>)}</select></div>
            </div>
          </Section>

          {/* Payment */}
          <Section icon={CreditCard} title={t("admit.secPayment")}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><L>{t("admit.amount")}</L>
                <div className="flex items-center gap-1.5">
                  <span className="hx-faint text-sm">{f.payment_currency}</span>
                  <input type="number" className="hx-input" value={f.payment_amount as any ?? ""} onChange={(e) => set({ payment_amount: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="0" data-testid="hx-admit-amount" /></div></div>
              <div><L>{t("admit.method")}</L>
                <select className="hx-select" value={f.payment_method} onChange={(e) => set({ payment_method: e.target.value })} data-testid="hx-admit-paymethod">
                  <option value="cash">{t("method.cash")}</option><option value="card">{t("method.card")}</option><option value="bank_transfer">{t("method.bank_transfer")}</option>
                  <option value="insurance">{t("method.insurance")}</option><option value="waived">{t("method.waived")}</option></select></div>
              <div><L>{t("admit.statusLabel")}</L>
                <select className="hx-select" value={f.payment_status} onChange={(e) => set({ payment_status: e.target.value })} data-testid="hx-admit-paystatus">
                  <option value="pending">{t("pstatus.pending")}</option><option value="paid">{t("pstatus.paid")}</option><option value="partial">{t("pstatus.partial")}</option><option value="waived">{t("pstatus.waived")}</option></select></div>
              <div><L>{t("admit.reference")}</L><input className="hx-input" value={f.payment_reference} onChange={(e) => set({ payment_reference: e.target.value })} placeholder={t("admit.receiptNo")} /></div>
            </div>
          </Section>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 mt-5">
            <button type="button" className="hx-btn hx-btn--ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</button>
            <button type="button" className="hx-btn hx-btn--primary" onClick={submit} disabled={admit.isPending} data-testid="hx-admit-submit">
              {admit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("admit.admitting")}</> : <><HeartPulse className="h-4 w-4" /> {t("admit.submit")}</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: any }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2" style={{ color: "var(--hx-dim)" }}>
        <Icon className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
        <span className="text-xs font-semibold uppercase" style={{ letterSpacing: "0.06em" }}>{title}</span>
        <span className="flex-1 h-px" style={{ background: "var(--hx-border)" }} />
      </div>
      {children}
    </div>
  );
}
