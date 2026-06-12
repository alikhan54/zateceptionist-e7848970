import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, HeartPulse, Stethoscope, FlaskConical, Pill, ScanLine, Sparkles, Plus, Slice, LogOut,
  ClipboardList, CheckCircle2, Clock, Loader2, UserPlus, AlertTriangle, BedDouble,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicVisits } from "@/hooks/useClinicVisits";
import { useHospitalRole } from "@/hooks/useHospitalRole";
import { useDoctorQueue, useDoctorQueueAccess, type DoctorQueueRow } from "@/hooks/useHospitalDoctorQueue";
import {
  useHospitalOrders, useHospitalDepartments, ORDER_TYPE_LABEL, STATUS_LABEL, NEXT_STATUS,
  type HospitalOrderType,
} from "@/hooks/useHospitalOrders";
import { VITAL_FIELDS, classifyVital, summarizeVitals, DEFAULT_THRESHOLDS, type VitalStatus } from "@/lib/clinic/vitalsThresholds";
import { HospitalAdmitDialog } from "@/components/hospital/HospitalAdmitDialog";
import { VitalsCaptureDialog } from "@/components/hospital/VitalsCaptureDialog";
import { useToast } from "@/hooks/use-toast";
import {
  HospitalGate, EcgLine, fetchMedicaBrief, fetchMedicaRecommendations, type MedRec,
  useHxCollapse, HxCollapseToggle, HxPickInput, displayName, StageSection,
} from "./hospitalShared";
import { CARDIAC_MEDS, LAB_PANELS, IMAGING_STUDIES } from "@/lib/hospital/pickLists";
import { PatientChartBar } from "./PatientChartBar";
import { ConsultationSummaryBox } from "./ConsultationSummary";
import { PrescriptionPanel } from "./Prescription";
import { OperationTheatrePanel, statusChipClass } from "./OperationTheatre";
import { PostOpPanel } from "./PostOpPanel";
import { usePostopEpisode } from "@/hooks/useHospitalPostop";
import { DischargePanel } from "./DischargePanel";
import { useHospitalOT } from "@/hooks/useHospitalOT";
import { useHospitalT } from "./i18n";

const PATHWAY_KEYS = ["pathway.registered", "pathway.triaged", "pathway.inConsult", "pathway.ordersPlaced", "pathway.inTreatment", "pathway.resultsReady", "pathway.discharged"];

// Key vitals to surface on the command surface (subset of the clinic floor vitals).
const KEY_VITALS = ["temperature", "heart_rate", "spo2", "respiratory_rate", "sugar"] as const;

function initials(name?: string) {
  return (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?";
}
function ageFrom(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.max(0, Math.floor((Date.now() - +d) / 31557600000));
}

/** Minimal, safe markdown-lite renderer for the MEDICA brief (no raw HTML). */
function renderBrief(text: string) {
  const cleaned = text.replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").trim();
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>);
  return cleaned.split("\n").map((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) return <div key={i} style={{ fontWeight: 650, color: "var(--hx-strong)", marginTop: i ? 10 : 0 }}>{inline(h[1])}</div>;
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (b) return <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 2 }}><span style={{ color: "var(--hx-accent)" }}>•</span><span>{inline(b[1])}</span></div>;
    return <div key={i}>{inline(line)}</div>;
  });
}

function PatientJourneyInner() {
  const { tenantId } = useTenant();
  const { t, ti, lang } = useHospitalT();
  const { toast } = useToast();
  const { patients, isLoading: patientsLoading } = useClinicPatients();
  const { visits } = useClinicVisits();
  const { data: departments = [] } = useHospitalDepartments();

  // HOSPITAL-RBAC [8]: a doctor sees ONLY patients where they are the attending clinician; admin sees all.
  // Filtered HERE in the page — useClinicPatients stays byte-identical (shared with the clinic floor).
  const { hospitalRole, hrEmployeeId } = useHospitalRole();
  const doctorScoped = hospitalRole === "doctor" && !!hrEmployeeId;
  // HOSPITAL-ROLES [Brief 10] — the SURGEON sees his SURGICAL patients' journeys: patients with an
  // OT case where he is the surgeon (plus any queue rows, like every scoped clinician). Composed the
  // same way as Brief 9 — the attending/doctor logic is untouched.
  const surgeonScoped = hospitalRole === "surgeon" && !!hrEmployeeId;
  const scoped = doctorScoped || surgeonScoped;
  const { data: attendingSet } = useQuery({
    queryKey: ["hx-doctor-attending", tenantId, hrEmployeeId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_admissions" as any)
        .select("patient_id").eq("tenant_id", tenantId).eq("attending_staff_id", hrEmployeeId);
      return new Set(((data as any[]) || []).map((r) => r.patient_id as string));
    },
    enabled: doctorScoped && !!tenantId,
  });
  const { data: surgeonSet } = useQuery({
    queryKey: ["hx-surgeon-cases", tenantId, hrEmployeeId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_ot_cases" as any)
        .select("patient_id").eq("tenant_id", tenantId).eq("surgeon_id", hrEmployeeId);
      return new Set(((data as any[]) || []).map((r) => r.patient_id as string));
    },
    enabled: surgeonScoped && !!tenantId,
  });
  // HOSPITAL-FLOW [Brief 9] — HISTORY-ON-REFERRAL: a queue row (triage forward or referral) for THIS
  // clinician grants access to that patient, COMPOSED on top of the base filter (attending/surgical
  // OR queue-row — the base rule itself is untouched). A clinician with neither sees nothing.
  const { data: queueAccessSet } = useDoctorQueueAccess(hrEmployeeId, scoped);
  const accessSet = useMemo(() => {
    if (!scoped) return undefined;
    const base = doctorScoped ? attendingSet : surgeonSet;
    if (!base && !queueAccessSet) return undefined;   // still resolving → keep today's "empty until loaded"
    return new Set<string>([...(base ?? []), ...(queueAccessSet ?? [])]);
  }, [scoped, doctorScoped, attendingSet, surgeonSet, queueAccessSet]);
  const allowPatient = (id?: string | null) => !scoped || (!!id && (accessSet?.has(id) ?? false));
  const visiblePatients = useMemo(
    () => (scoped ? (patients as any[]).filter((p) => accessSet?.has(p.id)) : patients),
    [patients, scoped, accessSet],
  );

  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patient");
  // Honor the ?patient= deep-link as the source of truth from the FIRST render — even before the
  // patients list has loaded the (possibly JUST-created) patient — so we NEVER fall back to patients[0].
  const [selectedId, setSelectedId] = useState<string>(urlPatientId || "");
  const appliedUrlRef = useRef<string | null>(urlPatientId); // last URL id applied; lets the dropdown override without the URL re-forcing
  const [admitOpen, setAdmitOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);

  useEffect(() => {
    // A NEW ?patient= (deep-link / in-app nav) wins. This does NOT fire on a manual dropdown switch
    // (which leaves the URL unchanged), so the patient-switcher is never clobbered.
    if (urlPatientId && urlPatientId !== appliedUrlRef.current) {
      appliedUrlRef.current = urlPatientId;
      setSelectedId(urlPatientId);
    } else if (!urlPatientId && !selectedId && visiblePatients.length) {
      setSelectedId(visiblePatients[0].id); // no deep-link → default to the first (visible) patient once the list arrives
    }
  }, [urlPatientId, visiblePatients, selectedId]);

  // RBAC guard: if a clinician's selected patient isn't one of theirs (e.g. a stale deep-link), fall back to their first.
  useEffect(() => {
    if (scoped && accessSet && selectedId && !accessSet.has(selectedId)) {
      setSelectedId(visiblePatients[0]?.id || "");
    }
  }, [scoped, accessSet, selectedId, visiblePatients]);

  const inList = useMemo(() => visiblePatients.some((p: any) => p.id === selectedId), [visiblePatients, selectedId]);

  // The selected patient may not be in the list yet (just admitted → list still refreshing). Fetch that
  // ONE patient directly so the journey shows the RIGHT patient immediately, never patients[0].
  const { data: directPatient, isFetched: directFetched } = useQuery({
    queryKey: ["clinic_patient_one", tenantId, selectedId],
    queryFn: async () => {
      const { data } = await supabase.from("clinic_patients" as any).select("*").eq("tenant_id", tenantId).eq("id", selectedId).maybeSingle();
      return (data as any) ?? null;
    },
    enabled: !!tenantId && !!selectedId && !inList,
  });

  const patient = useMemo(
    () => (!allowPatient(selectedId) ? undefined
      : (visiblePatients as any[]).find((p: any) => p.id === selectedId) || (directPatient && (directPatient as any).id === selectedId ? (directPatient as any) : undefined)),
    [visiblePatients, selectedId, directPatient, doctorScoped, accessSet],
  );
  // HOSPITAL-FLOW [Brief 9] — this clinician's waiting queue (triage forwards + referrals)
  const { queue, markSeen } = useDoctorQueue(scoped ? hrEmployeeId : null);

  // [Brief 10 · D] the bed board's discharge deep-link (#discharge) scrolls to the EXISTING
  // discharge panel once the journey renders — the panel itself is untouched.
  useEffect(() => {
    if (window.location.hash !== "#discharge" || !patient) return;
    const tm = setTimeout(() => {
      document.querySelector('[data-testid="hx-discharge"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 900);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);
  const { orders, createOrder, updateOrderStatus } = useHospitalOrders({ patientId: selectedId || undefined });

  // HOSPITAL-OT: the patient's latest operation case — drives the additive OT status chip in the
  // header + the OT panel (same query key as the panel → one fetch).
  const { otCase } = useHospitalOT(selectedId || undefined);

  // HOSPITAL-BEDS [Phase 2]: read-only ward/bed context for the current patient (additive).
  // [FIX-D] latest admission detail for the collapsible Admission & Bed section
  const { data: admDetail } = useQuery({
    queryKey: ["hx-adm-detail", tenantId, selectedId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_admissions" as any)
        .select("department_name,attending_name,created_at,admitting_complaint,status")
        .eq("tenant_id", tenantId).eq("patient_id", selectedId)
        .order("created_at", { ascending: false }).limit(1);
      return (data as any[])?.[0] || null;
    },
    enabled: !!tenantId && !!selectedId,
  });
  const { data: postopEp } = usePostopEpisode(selectedId);

  const { data: currentBed } = useQuery({
    queryKey: ["hx-patient-bed", tenantId, selectedId],
    queryFn: async () => {
      const { data: a } = await supabase.from("hospital_bed_assignments" as any)
        .select("bed_id").eq("tenant_id", tenantId).eq("patient_id", selectedId).is("released_at", null).maybeSingle();
      const bedId = (a as any)?.bed_id;
      if (!bedId) return null;
      const { data: b } = await supabase.from("hospital_beds" as any).select("ward,bed_label").eq("id", bedId).maybeSingle();
      return (b as any) || null;
    },
    enabled: !!tenantId && !!selectedId,
  });

  // latest visit (with vitals) for this patient
  const latestVisit = useMemo(() => {
    const mine = (visits as any[]).filter((v) => v.patient_id === selectedId);
    mine.sort((a, b) => +new Date(b.visit_date || b.created_at) - +new Date(a.visit_date || a.created_at));
    return mine[0];
  }, [visits, selectedId]);

  // HOSPITAL-RX: the meds the doctor has ALREADY PLACED for this encounter — the grounding source for
  // the Assisted prescription draft (the draft must never introduce a drug not in this list).
  const rxMeds = useMemo(
    () => orders
      .filter((o) => o.order_type === "medication" && (!latestVisit?.id || o.visit_id === latestVisit.id || !o.visit_id))
      .map((o) => (o.details as any)?.item).filter(Boolean) as string[],
    [orders, latestVisit?.id],
  );

  const thresholds = DEFAULT_THRESHOLDS;
  const vitalsSummary = useMemo(
    () => (latestVisit ? summarizeVitals(latestVisit, thresholds) : { worst: "empty" as VitalStatus, warnings: [], criticals: [] }),
    [latestVisit, thresholds],
  );

  // ---- MEDICA brief state ----
  const [briefState, setBriefState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [brief, setBrief] = useState<string>("");
  const [briefErr, setBriefErr] = useState<string>("");
  useEffect(() => { setBriefState("idle"); setBrief(""); setBriefErr(""); }, [selectedId]);
  // Collapsible MEDICA panel [Brief 8 · B] — persisted like hx-lang/hx-ecg
  // [FIX-1] default-collapsed (fresh key so stale localStorage from older sessions can't re-open it)
  const { collapsed: medicaCollapsed, toggle: toggleMedica } = useHxCollapse("hx-collapse-medica.v2", true);

  // ---- Doctor's diagnosis + remarks → clinic_visits.diagnosis / .doctor_notes [FIX2/FIX3] ----
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState("");
  const [remarksDirty, setRemarksDirty] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisDirty, setDiagnosisDirty] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  useEffect(() => {
    setRemarks(latestVisit?.doctor_notes || "");
    setDiagnosis(latestVisit?.diagnosis || "");
    setRemarksDirty(false); setDiagnosisDirty(false);
  }, [latestVisit?.id, latestVisit?.doctor_notes, latestVisit?.diagnosis]);
  async function saveRemarks() {
    if (!latestVisit?.id) return;
    setSavingRemarks(true);
    try {
      const { error } = await supabase.from("clinic_visits" as any)
        .update({ diagnosis: diagnosis.trim() || null, doctor_notes: remarks.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", latestVisit.id).eq("tenant_id", tenantId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["clinic_visits", tenantId] });
      setRemarksDirty(false); setDiagnosisDirty(false);
      toast({ title: t("remarks.saved") });
    } catch (e: any) {
      toast({ title: t("remarks.saveFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    } finally { setSavingRemarks(false); }
  }

  async function askMedica() {
    if (!patient) return;
    setBriefState("loading"); setBriefErr("");
    try {
      const r = await fetchMedicaBrief(patient.full_name, patient.id, lang);
      setBrief(r.response); setBriefState("done");
    } catch (e: any) {
      setBriefErr(e?.message || t("medica.down")); setBriefState("error");
    }
  }

  // ---- order entry (medication supports adding several meds in one go [FIX3]) ----
  const [orderType, setOrderType] = useState<HospitalOrderType>("medication");
  const [orderDetail, setOrderDetail] = useState("");
  const [orderDept, setOrderDept] = useState("");
  const [meds, setMeds] = useState<string[]>([]);   // queued medications (medication type only)
  const deptForType = (t: HospitalOrderType) =>
    departments.find((d) => (t === "medication" ? d.kind === "pharmacy" : t === "lab" ? d.kind === "lab" : d.kind === "radiology"));
  useEffect(() => { setOrderDept(deptForType(orderType)?.id || ""); }, [orderType, departments]);
  // Never carry a queued-med list across a patient switch or a type change.
  useEffect(() => { setMeds([]); }, [selectedId, orderType]);

  // localized routing-department label for the order toast
  const routeKey = (ot: HospitalOrderType) => (ot === "medication" ? "queue.pharmacy" : ot === "lab" ? "queue.laboratory" : "queue.diagnostics");

  // Queue another medication (as a chip) without leaving the form.
  function addMed() {
    const v = orderDetail.trim();
    if (orderType !== "medication" || !v) return;
    setMeds((prev) => [...prev, v]);
    setOrderDetail("");
  }

  async function placeOrder() {
    if (!patient) return;
    // medication: queued chips + whatever is still in the box → ONE order each; lab/imaging: single.
    const items = orderType === "medication"
      ? [...meds, orderDetail].map((s) => s.trim()).filter(Boolean)
      : (orderDetail.trim() ? [orderDetail.trim()] : []);
    if (items.length === 0) return;
    try {
      for (const item of items) {
        await createOrder.mutateAsync({
          patient_id: patient.id,
          visit_id: latestVisit?.id ?? null,
          order_type: orderType,
          department_id: orderDept || null,
          status: "ordered",
          details: { item },
        });
      }
      toast({
        title: items.length > 1 ? ti("order.placedN", { n: items.length }) : t("order.placed"),
        description: ti("order.routedDesc", { type: t(`order.${orderType}`), items: items.join(", "), dept: t(routeKey(orderType)) }),
      });
      setOrderDetail(""); setMeds([]);
    } catch (e: any) {
      toast({ title: t("order.placeFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  // ---- MEDICA medication recommendations [13] (suggest → doctor APPROVES → pre-fill; never auto-place) ----
  const [recState, setRecState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recs, setRecs] = useState<MedRec[]>([]);
  const [recErr, setRecErr] = useState("");
  useEffect(() => { setRecState("idle"); setRecs([]); setRecErr(""); }, [selectedId]);
  async function askRecommend() {
    if (!patient) return;
    setRecState("loading"); setRecErr("");
    try {
      const list = await fetchMedicaRecommendations(patient.full_name, patient.id, lang);
      setRecs(list); setRecState("done");
    } catch (e: any) {
      setRecErr(e?.message || t("medica.down")); setRecState("error");
    }
  }
  // Accept a suggestion → PRE-FILL the medication order entry. The doctor still Places it (nothing auto-placed).
  function acceptRec(rec: MedRec) {
    const med = `${rec.name}${rec.dose ? ` ${rec.dose}` : ""}`.trim();
    setOrderType("medication");
    const cur = orderDetail.trim();
    if (cur) setMeds((prev) => [...prev, cur]);   // stack a med already in the box so several accepts queue
    setOrderDetail(med);
    toast({ title: t("rec.accepted"), description: med });
  }

  // derived pathway stage
  const stageIndex = useMemo(() => {
    if (!patient) return 0;
    if (orders.some((o) => ["resulted", "dispensed", "reviewed"].includes(o.status))) return 5;
    if (orders.length) return 3;
    if (latestVisit?.vitals_completed) return 2;
    if (latestVisit) return 1;
    return 0;
  }, [patient, orders, latestVisit]);

  // [ZATEOS B1] STAGE FOCUS — only the current stage's panel opens; everything else is a
  // one-line header until clicked. consult ≤2 · treatment 3-4 · closing ≥5 (deep-link forces discharge).
  const inConsult = stageIndex <= 2;
  const inTreatment = stageIndex === 3 || stageIndex === 4;
  const closing = stageIndex >= 5;
  const dischargeHash = typeof window !== "undefined" && window.location.hash.includes("discharge");

  const queues: { type: HospitalOrderType; titleKey: string; icon: any }[] = [
    { type: "medication", titleKey: "queue.pharmacy", icon: Pill },
    { type: "lab", titleKey: "queue.laboratory", icon: FlaskConical },
    { type: "imaging", titleKey: "queue.diagnostics", icon: ScanLine },
  ];

  if (!patient) {
    // Selected patient still resolving (list refreshing or the direct single-patient fetch in flight)
    // → brief loading state, NOT the "no patients" admit prompt (which would mis-read a just-admitted
    // deep-link as an empty register and is exactly how the wrong-patient race used to surface).
    if (patientsLoading || (!!selectedId && !inList && !directFetched)) {
      return (
        <div className="max-w-xl mx-auto pt-24 text-center hx-rise" data-testid="hx-journey-loading">
          <span className="hx-pulse-dot" style={{ display: "inline-block", marginBottom: 12 }} />
          <div className="hx-dim">{t("journey.loadingPatient")}</div>
        </div>
      );
    }
    return (
      <div className="max-w-xl mx-auto pt-16 text-center hx-rise">
        <div className="hx-eyebrow mb-3">{t("journey.eyebrow")}</div>
        <h1 className="hx-h1 mb-2">{t("journey.emptyTitle")}</h1>
        <p className="hx-dim mb-6">{t("journey.emptySub")}</p>
        <button className="hx-btn hx-btn--primary mx-auto" onClick={() => setAdmitOpen(true)} data-testid="hx-admit-empty">
          <UserPlus className="h-4 w-4" /> {t("journey.admitPatient")}
        </button>
        <HospitalAdmitDialog open={admitOpen} onOpenChange={setAdmitOpen} onAdmitted={(r) => setSelectedId(r.patient_id)} />
      </div>
    );
  }

  const age = ageFrom(patient.date_of_birth);

  return (
    <div data-testid="hx-patient-journey">
      {/* ---------- HEADER ---------- */}
      <div className="hx-panel hx-panel--accent hx-rise" style={{ animationDelay: "0ms" }}>
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center rounded-2xl"
                style={{ width: 56, height: 56, background: "linear-gradient(135deg, rgba(34,211,238,.18), rgba(45,212,191,.12))", border: "1px solid var(--hx-border-strong)", fontWeight: 700, fontSize: 18 }}>
                {initials(patient.full_name)}
              </div>
              <div>
                <div className="hx-eyebrow">{t("journey.eyebrow")}</div>
                <div className="hx-h1" data-testid="hx-patient-name">{displayName(patient.full_name)}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm hx-dim">
                  <span className="hx-mono" data-testid="hx-journey-mrn">{t("journey.mrn")} {patient.file_number || String(patient.id).slice(0, 8).toUpperCase()}</span>
                  {age != null && <><span className="hx-faint">·</span><span>{age}y</span></>}
                  {patient.gender && <><span className="hx-faint">·</span><span className="capitalize">{patient.gender}</span></>}
                  {patient.phone && <><span className="hx-faint">·</span><span className="hx-mono">{patient.phone}</span></>}
                  {currentBed && <span className="hx-chip hx-chip--accent" style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-journey-bed"><BedDouble className="h-3 w-3" /> {currentBed.ward} · {currentBed.bed_label}</span>}
                  {otCase && <span className={`hx-chip ${statusChipClass(otCase.status)}`} style={{ padding: "0.05rem 0.5rem" }} data-testid="hx-journey-ot">OT · {t(`ot.status.${otCase.status}`)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visiblePatients.length > 1 && (
                <select className="hx-select" style={{ width: "auto", minWidth: 180 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)} data-testid="hx-patient-select">
                  {visiblePatients.map((p: any) => <option key={p.id} value={p.id}>{displayName(p.full_name)}</option>)}
                </select>
              )}
              <EcgToggle />
              <button className="hx-btn hx-btn--ghost" onClick={() => setAdmitOpen(true)} data-testid="hx-admit">
                <UserPlus className="h-4 w-4" /> {t("journey.admit")}
              </button>
            </div>
          </div>

          {/* pathway stepper */}
          <div className="hx-path mt-5">
            {PATHWAY_KEYS.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className={`hx-path-step ${i < stageIndex ? "done" : i === stageIndex ? "active" : ""}`}>
                  <span className="dot" /> {t(s)}
                </span>
                {i < PATHWAY_KEYS.length - 1 && <span className="hx-path-sep">›</span>}
              </span>
            ))}
          </div>
          <EcgLine className="mt-4" />
        </div>
      </div>

      {/* the clinician's WAITING QUEUE [HOSPITAL-FLOW · Brief 9] — his rows only (triage forwards +
          referrals); one-click open marks waiting → seen. Admin has no queue (no hr identity). */}
      {scoped && (
        <DoctorWaitingStrip queue={queue} patients={patients as any[]}
          onOpen={(row) => { setSelectedId(row.patient_id); if (row.status === "waiting") markSeen.mutate(row.id); }} />
      )}

      {/* PATIENT RECORDS chart bar [HOSPITAL-CHART · Brief 8] — one click, present + historical,
          read-only aggregation, never a route change */}
      <div className="mt-4">
        <PatientChartBar patient={patient} currentBed={currentBed as any} />
      </div>

      {/* ---------- GRID ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* LEFT: vitals + diagnosis & remarks (Care Pathway panel retired — addendum (b); it
            duplicated the header stepper. Component kept below for potential re-mount.) */}
        <div className="lg:col-span-5 space-y-4">
          {/* [FIX-D] Admission & Bed — one-line collapsed summary, expand for full detail */}
          {(admDetail || currentBed) && (
            <StageSection title={t("adm.title", "Admission & Bed")} open={false} testid="hx-stage-admission" icon={BedDouble}
              summary={[
                currentBed ? `${currentBed.ward} · ${currentBed.bed_label}` : null,
                admDetail?.attending_name || null,
                admDetail?.created_at ? `${Math.max(0, Math.floor((Date.now() - +new Date(admDetail.created_at)) / 86400000))}d` : null,
              ].filter(Boolean).join(" · ")}>
              <div className="space-y-1 text-sm" data-testid="hx-admission-detail">
                {admDetail?.department_name && <div><b>{t("adm.dept", "Department")}:</b> {admDetail.department_name}</div>}
                {admDetail?.attending_name && <div><b>{t("adm.attending", "Attending")}:</b> {admDetail.attending_name}</div>}
                {currentBed && <div><b>{t("adm.bed", "Ward · Bed")}:</b> {currentBed.ward} · {currentBed.bed_label}</div>}
                {admDetail?.created_at && <div><b>{t("adm.admitted", "Admitted")}:</b> {new Date(admDetail.created_at).toLocaleString()} ({Math.max(0, Math.floor((Date.now() - +new Date(admDetail.created_at)) / 86400000))}d)</div>}
                {admDetail?.admitting_complaint && <div className="hx-dim">{admDetail.admitting_complaint}</div>}
                {admDetail?.status && <div><span className={`hx-chip ${admDetail.status === "admitted" ? "hx-chip--accent" : "hx-chip--ok"} text-xs`}>{admDetail.status}</span></div>}
              </div>
            </StageSection>
          )}

          {/* vitals — above Diagnosis & Remarks (addendum (c)) */}
          <StageSection title={t("vitals.title")} open={inConsult} testid="hx-stage-vitals" icon={HeartPulse}
            actions={<>
              <button className="hx-btn hx-btn--ghost" style={{ padding: "0.25rem 0.6rem" }} onClick={() => setVitalsOpen(true)} data-testid="hx-capture-vitals">
                <HeartPulse className="h-3.5 w-3.5" /> {t("vitals.capture")}
              </button>
              {vitalsSummary.worst === "critical" && <span className="hx-chip hx-chip--crit" data-testid="hx-vitals-critical"><AlertTriangle className="h-3 w-3" /> {t("vitals.critical")}</span>}
              {vitalsSummary.worst === "warning" && <span className="hx-chip hx-chip--warn" data-testid="hx-vitals-warning"><AlertTriangle className="h-3 w-3" /> {t("vitals.watch")}</span>}
              {vitalsSummary.worst === "normal" && <span className="hx-chip hx-chip--ok"><CheckCircle2 className="h-3 w-3" /> {t("vitals.stable")}</span>}
              {vitalsSummary.worst === "empty" && <span className="hx-chip">{t("vitals.noData")}</span>}
            </>}>
            <div>
              {!latestVisit ? (
                <p className="hx-dim text-sm">{t("vitals.empty")}</p>
              ) : (
                <div className="hx-vitals-grid">
                  {/* BP combined */}
                  <BpCell sys={latestVisit.blood_pressure_systolic} dia={latestVisit.blood_pressure_diastolic} thresholds={thresholds} />
                  {KEY_VITALS.map((k) => {
                    const f = VITAL_FIELDS.find((x) => x.key === k)!;
                    const val = latestVisit[k];
                    const status = classifyVital(k, val, thresholds);
                    return (
                      <div key={k} className={`hx-vital hx-vital--${status}`} data-testid={`hx-vital-${k}`} data-status={status}>
                        <div className="v">{val ?? "—"}<span className="text-xs hx-faint ml-0.5">{f.unit}</span></div>
                        <div className="l">{t(`vital.${k}`, f.label)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </StageSection>

          {/* Diagnosis & Remarks — BELOW vitals in the LEFT column (addendum (c)) */}
          <StageSection title={t("remarks.title")} open={inConsult} testid="hx-stage-remarks" icon={ClipboardList}
            actions={latestVisit && (
              <button className="hx-btn hx-btn--primary" style={{ padding: "0.35rem 0.8rem" }} onClick={saveRemarks} disabled={savingRemarks || (!remarksDirty && !diagnosisDirty)} data-testid="hx-remarks-save">
                {savingRemarks ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("common.saving")}</> : <>{t("common.save")}</>}
              </button>
            )}>
            <div data-testid="hx-remarks">
              {latestVisit ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="hx-label">{t("remarks.diagnosis")}</label>
                    <input className="hx-input" value={diagnosis}
                      onChange={(e) => { setDiagnosis(e.target.value); setDiagnosisDirty(true); }}
                      placeholder={t("remarks.diagnosisPh")} data-testid="hx-diagnosis-text" />
                  </div>
                  <div>
                    <label className="hx-label">{t("remarks.remarks")}</label>
                    <textarea className="hx-input" rows={3} value={remarks}
                      onChange={(e) => { setRemarks(e.target.value); setRemarksDirty(true); }}
                      placeholder={t("remarks.remarksPh")} data-testid="hx-remarks-text" />
                  </div>
                </div>
              ) : (
                <p className="hx-dim text-sm">{t("remarks.empty")}</p>
              )}
            </div>
          </StageSection>
        </div>

        {/* RIGHT: MEDICA brief + consultation + order entry + queues */}
        <div className="lg:col-span-7 space-y-4">
          {/* MEDICA brief — collapsible [Brief 8 · B]: pure presentational; the brief content/logic
              is unchanged. Collapsed = one-line header + expand control; state persists. */}
          <div className="hx-panel hx-panel--accent hx-rise" style={{ animationDelay: "120ms" }} data-testid="hx-medica-panel" data-collapsed={medicaCollapsed ? "1" : "0"}>
            <div className="hx-panel-h" style={medicaCollapsed ? { borderBottom: "none" } : undefined}>
              <Sparkles className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
              <span className="font-semibold">{t("medica.title")}</span>
              {!medicaCollapsed && (
                <button className="hx-btn hx-btn--primary ml-auto" style={{ padding: "0.4rem 0.85rem" }} onClick={askMedica} disabled={briefState === "loading"} data-testid="hx-ask-medica">
                  {briefState === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("medica.analysing")}</> : <><Sparkles className="h-4 w-4" /> {t("medica.ask")}</>}
                </button>
              )}
              <span className={medicaCollapsed ? "ml-auto" : "ml-2"}>
                <HxCollapseToggle collapsed={medicaCollapsed} onToggle={toggleMedica} testid="hx-medica-collapse" />
              </span>
            </div>
            {!medicaCollapsed && (
            <div className="hx-panel-b">
              {briefState === "idle" && (
                <p className="hx-dim text-sm">{ti("medica.idle", { name: patient.full_name })}</p>
              )}
              {briefState === "loading" && (
                <div className="hx-analysing" data-testid="hx-brief-loading">
                  <div className="flex items-center gap-2.5 mb-3"><span className="hx-pulse-dot" /><span className="hx-dim text-sm">{t("medica.loading")}</span></div>
                  <div className="space-y-2">
                    {[92, 78, 85, 64].map((w, i) => <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 6, background: "var(--hx-skeleton)" }} />)}
                  </div>
                </div>
              )}
              {briefState === "done" && <div className="hx-brief" data-testid="hx-brief-result">{renderBrief(brief)}</div>}
              {briefState === "error" && (
                <div className="text-sm" data-testid="hx-brief-error">
                  <p className="hx-chip hx-chip--warn mb-2"><AlertTriangle className="h-3 w-3" /> {t("medica.unavailable")}</p>
                  <p className="hx-dim">{briefErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={askMedica}>{t("medica.retry")}</button></p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Consultation Summary — its own native collapse is the single layer (default-collapsed) */}
          <ConsultationSummaryBox patientId={selectedId} patientName={patient.full_name} visitId={latestVisit?.id ?? null}
            onAdmitPatient={() => setAdmitOpen(true)} />

          {/* MEDICA — Medication Suggestions [13]: suggest → doctor approves → pre-fills order entry */}
          <StageSection title={t("rec.title")} open={false} testid="hx-stage-medrec" icon={Pill}
            actions={
              <button className="hx-btn hx-btn--ghost" style={{ padding: "0.4rem 0.8rem" }} onClick={askRecommend} disabled={recState === "loading"} data-testid="hx-rec-ask">
                {recState === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("medica.analysing")}</> : <><Sparkles className="h-4 w-4" /> {t("rec.ask")}</>}
              </button>
            }>
            <div data-testid="hx-medrec">
              {recState === "idle" && <p className="hx-dim text-sm">{t("rec.idle")}</p>}
              {recState === "loading" && (
                <div className="hx-analysing" data-testid="hx-rec-loading">
                  <div className="flex items-center gap-2.5 mb-3"><span className="hx-pulse-dot" /><span className="hx-dim text-sm">{t("rec.loading")}</span></div>
                  <div className="space-y-2">{[88, 72, 80].map((w, i) => <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 6, background: "var(--hx-skeleton)" }} />)}</div>
                </div>
              )}
              {recState === "done" && (
                <div data-testid="hx-rec-result">
                  <div className="hx-chip hx-chip--warn mb-3" style={{ display: "inline-flex" }} data-testid="hx-rec-disclaimer">
                    <AlertTriangle className="h-3 w-3" /> {t("rec.disclaimer")}
                  </div>
                  {recs.length === 0 ? (
                    <p className="hx-dim text-sm">{t("rec.none")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {recs.map((r, i) => (
                        <li key={`${r.name}-${i}`} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--hx-border)", background: "var(--hx-skeleton)" }} data-testid="hx-rec-item">
                          <Pill className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--hx-accent2)" }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm"><span style={{ color: "var(--hx-strong)" }}>{r.name}</span>{r.dose ? <span className="hx-dim"> · {r.dose}</span> : null}</div>
                            {r.rationale && <div className="hx-faint text-xs mt-0.5">{r.rationale}</div>}
                          </div>
                          <button className="hx-btn hx-btn--primary" style={{ padding: "0.3rem 0.7rem" }} onClick={() => acceptRec(r)} data-testid="hx-rec-accept">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("rec.accept")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {recState === "error" && (
                <div className="text-sm" data-testid="hx-rec-error">
                  <p className="hx-chip hx-chip--warn mb-2"><AlertTriangle className="h-3 w-3" /> {t("rec.unavailable")}</p>
                  <p className="hx-dim">{recErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={askRecommend}>{t("medica.retry")}</button></p>
                </div>
              )}
            </div>
          </StageSection>

          {/* order entry + live queues — the TREATMENT stage panel */}
          <StageSection title={t("order.title")} open={inTreatment || inConsult} testid="hx-stage-orders" icon={Plus}
            actions={<span className="hx-faint text-xs">{t("order.subtitle")}</span>}>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="hx-label">{t("order.type")}</label>
                  <select className="hx-select" value={orderType} onChange={(e) => setOrderType(e.target.value as HospitalOrderType)} data-testid="hx-order-type">
                    <option value="medication">{t("order.medication")}</option>
                    <option value="lab">{t("order.lab")}</option>
                    <option value="imaging">{t("order.imaging")}</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="hx-label">{t("order.department")}</label>
                  <select className="hx-select" value={orderDept} onChange={(e) => setOrderDept(e.target.value)} data-testid="hx-order-dept">
                    <option value="">{t("order.autoRoute")}</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="hx-label">{orderType === "medication" ? t("order.drugDose") : orderType === "lab" ? t("order.test") : t("order.study")}</label>
                  {/* [Brief 8 · C] type-ahead over a STATIC in-code pick-list (no DB catalog);
                      free text always allowed — Enter without a highlighted suggestion still places */}
                  <HxPickInput value={orderDetail} onChange={setOrderDetail}
                    options={orderType === "medication" ? CARDIAC_MEDS : orderType === "lab" ? LAB_PANELS : IMAGING_STUDIES}
                    placeholder={orderType === "medication" ? t("order.phMed") : orderType === "lab" ? t("order.phLab") : t("order.phImaging")}
                    onEnter={placeOrder} testid="hx-order-detail" />
                </div>
                <div className="sm:col-span-2">
                  <button className="hx-btn hx-btn--primary w-full" onClick={placeOrder} disabled={(orderType === "medication" ? (meds.length === 0 && !orderDetail.trim()) : !orderDetail.trim()) || createOrder.isPending} data-testid="hx-place-order">
                    {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> {t("order.place")}{orderType === "medication" && (meds.length + (orderDetail.trim() ? 1 : 0)) > 1 ? ` ${meds.length + (orderDetail.trim() ? 1 : 0)}` : ""}</>}
                  </button>
                </div>
              </div>

              {/* multi-medication queue [FIX3] — add several meds, then Place creates one order each */}
              {orderType === "medication" && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap" data-testid="hx-med-queue">
                  <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.7rem" }} onClick={addMed} disabled={!orderDetail.trim()} data-testid="hx-order-add-med">
                    <Plus className="h-3.5 w-3.5" /> {t("order.addMed")}
                  </button>
                  {meds.map((m, i) => (
                    <span key={`${m}-${i}`} className="hx-chip hx-chip--accent" style={{ padding: "0.15rem 0.5rem" }} data-testid="hx-med-chip">
                      {m}
                      <button type="button" className="ml-1" style={{ opacity: 0.7 }} onClick={() => setMeds((prev) => prev.filter((_, j) => j !== i))} aria-label={`remove ${m}`}>×</button>
                    </span>
                  ))}
                  {meds.length > 0 && <span className="hx-faint text-xs">{ti("order.queuedHint", { n: meds.length })}</span>}
                </div>
              )}
            </div>

          {/* routed queues (this patient) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            {queues.map((q, qi) => {
              const items = orders.filter((o) => o.order_type === q.type);
              const Icon = q.icon;
              return (
                <div key={q.type} className="hx-panel hx-rise" style={{ animationDelay: `${240 + qi * 60}ms` }} data-testid={`hx-queue-${q.type}`}>
                  <div className="hx-panel-h" style={{ padding: "0.7rem 0.85rem" }}>
                    <Icon className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
                    <Link to={q.type === "medication" ? "/hospital/pharmacy" : q.type === "lab" ? "/hospital/lab" : "/hospital/diagnostics"} className="font-semibold text-sm hover:underline" style={{ color: "var(--hx-text)" }}>{t(q.titleKey)}</Link>
                    <span className="hx-chip hx-chip--accent ml-auto" style={{ padding: "0.1rem 0.45rem" }}>{items.length}</span>
                  </div>
                  <div className="hx-panel-b" style={{ padding: "0.7rem", minHeight: 96 }}>
                    {items.length === 0 ? (
                      <p className="hx-faint text-xs">{ti("queue.noOrdersOf", { q: t(q.titleKey) })}</p>
                    ) : (
                      <ul className="space-y-2">
                        {items.slice(0, 5).map((o) => {
                          const fulfilled = ["resulted", "dispensed", "reviewed"].includes(o.status);
                          return (
                            <li key={o.id} className="flex items-center gap-2" data-testid="hx-queue-item">
                              <span className={`hx-chip ${fulfilled ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.05rem 0.4rem" }}>
                                {fulfilled ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{t(`ostatus.${o.status}`, STATUS_LABEL[o.status])}
                              </span>
                              <span className="text-xs truncate flex-1">{(o.details as any)?.item || "—"}</span>
                              {!fulfilled && NEXT_STATUS[q.type] && (
                                <button className="text-xs underline hx-faint hover:text-white"
                                  onClick={() => updateOrderStatus.mutate({ id: o.id, status: NEXT_STATUS[q.type]! })}>
                                  {q.type === "medication" ? t("order.dispense") : t("order.result")}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          </StageSection>

          {/* Prescription — collapsed until clicked (or the closing stage) [ZATEOS B1] */}
          <StageSection bare title={t("rx.title", "Prescription")} open={closing} testid="hx-stage-rx" icon={Pill}>
            <PrescriptionPanel patient={patient} visitId={latestVisit?.id ?? null} placedMeds={rxMeds} />
          </StageSection>

          {/* Operation Theatre — gated bilingual consent + the surgeon's signed operative note
              [HOSPITAL-OT]; status also chips in the patient header */}
          <StageSection bare title={t("ot.title", "Operation Theatre")} open={!!otCase && otCase.status !== "completed"} testid="hx-stage-ot" icon={Slice}>
            <OperationTheatrePanel patient={patient} visitId={latestVisit?.id ?? null} />
          </StageSection>

          {/* Post-op monitoring — deterministic partial-NEWS2 early-warning (renders only when an
              active episode exists; MEDICA narrates, never scores) [HOSPITAL-POSTOP] */}
          {postopEp && (
            <StageSection bare title={t("postop.title", "Post-op Monitoring")} open={postopEp.status === "active"} testid="hx-stage-postop" icon={Activity}>
              <PostOpPanel patient={patient} />
            </StageSection>
          )}

          {/* Discharge — deterministic readiness + grounded bilingual signed summary (med reconciliation
              off the signed Rx); sign closes the episode + frees the bed via existing flows [HOSPITAL-DISCHARGE] */}
          <StageSection bare title={t("discharge.title")} open={closing || dischargeHash} testid="hx-stage-discharge" icon={LogOut}>
            <DischargePanel patient={patient} />
          </StageSection>
        </div>
      </div>

      <HospitalAdmitDialog open={admitOpen} onOpenChange={setAdmitOpen} onAdmitted={(r) => setSelectedId(r.patient_id)} />
      <VitalsCaptureDialog open={vitalsOpen} onOpenChange={setVitalsOpen} patientId={selectedId} patientName={patient?.full_name} visitId={latestVisit?.id} />
    </div>
  );
}

/** HOSPITAL-FLOW [Brief 9] — the doctor's compact waiting strip: HIS queue only (triage forwards +
 *  referrals), waiting first; one-click Open selects the patient and marks the row seen. */
function DoctorWaitingStrip({ queue, patients, onOpen }: {
  queue: DoctorQueueRow[]; patients: any[]; onOpen: (row: DoctorQueueRow) => void;
}) {
  const { t, ti } = useHospitalT();
  const waiting = queue.filter((q) => q.status === "waiting");
  const nameById = useMemo(() => new Map(patients.map((p) => [p.id, p.full_name as string])), [patients]);
  return (
    <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "20ms" }} data-testid="hx-waiting-strip">
      <div className="hx-panel-h" style={{ padding: "0.6rem 0.9rem" }}>
        <Clock className="h-4 w-4" style={{ color: "var(--hx-warn)" }} />
        <span className="font-semibold text-sm" data-testid="hx-waiting-count">{ti("flow.waitingN", { n: waiting.length })}</span>
      </div>
      <div className="hx-panel-b" style={{ padding: "0.7rem 0.9rem" }}>
        {waiting.length === 0 ? (
          <p className="hx-faint text-xs" data-testid="hx-waiting-empty">{t("flow.queueEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {waiting.map((q) => (
              <div key={q.id} className="hx-entry flex items-center gap-2.5" style={{ padding: "0.45rem 0.65rem" }} data-testid="hx-waiting-row" data-patient={q.patient_id}>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate" data-testid="hx-waiting-name">{nameById.get(q.patient_id) || "—"}</div>
                  <div className="hx-faint text-xs">
                    <span className={`hx-chip ${q.source === "referral" ? "hx-chip--accent" : "hx-chip--warn"}`} style={{ padding: "0 0.4rem", marginRight: 6 }}>
                      {t(`flow.src.${q.source}`)}
                    </span>
                    {q.referred_by_name ? `${t("flow.by")} ${q.referred_by_name} · ` : ""}
                    {new Date(q.queued_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    {q.reason ? ` · ${q.reason}` : ""}
                  </div>
                </div>
                <button className="hx-btn hx-btn--primary" style={{ padding: "0.3rem 0.7rem" }} onClick={() => onOpen(q)} data-testid="hx-waiting-open">
                  {t("flow.open")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * RETIRED 2026-06-11 (Brief 8 addendum (b)) — the left "Care Pathway" spine panel duplicated the
 * journey stepper in the header (above the ECG line), so it is no longer mounted. Kept (exported)
 * for a potential re-mount; rendering logic unchanged.
 */
export function CarePathwayPanel({ patient, latestVisit, stageIndex, orders, briefState, vitalsSummary }: {
  patient: any; latestVisit: any; stageIndex: number; orders: any[];
  briefState: string; vitalsSummary: { worst: VitalStatus };
}) {
  const { t, ti } = useHospitalT();
  const fulfilled = orders.filter((o) => ["resulted", "dispensed", "reviewed"].includes(o.status)).length;
  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "80ms" }}>
      <div className="hx-panel-h"><Activity className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} /><span className="font-semibold">{t("spine.title")}</span></div>
      <div className="hx-panel-b">
        <div className="hx-spine">
          <SpineNode done={!!patient} active={false} icon={UserPlus} title={t("spine.admitted")}
            sub={patient.created_at ? new Date(patient.created_at).toLocaleDateString() : t("spine.registered")} />
          <SpineNode done={!!latestVisit?.vitals_completed} active={stageIndex === 1} icon={HeartPulse} title={t("spine.nurseVitals")}
            sub={latestVisit?.vitals_completed
              ? (vitalsSummary.worst === "critical" ? t("spine.criticalFlag") : vitalsSummary.worst === "warning" ? t("spine.watchFlag") : t("spine.withinRange"))
              : t("spine.awaitingVitals")} tone={vitalsSummary.worst} />
          <SpineNode done={briefState === "done"} active={stageIndex === 2} icon={Stethoscope} title={t("spine.consult")}
            sub={briefState === "done" ? t("spine.briefReviewed") : t("spine.previsit")} />
          <SpineNode done={orders.length > 0} active={stageIndex === 3} icon={ClipboardList} title={t("spine.orders")}
            sub={orders.length ? ti("spine.ordersPlaced", { n: orders.length }) : t("spine.noOrders")} />
          <SpineNode done={fulfilled > 0} active={stageIndex >= 4} icon={Pill} title={t("spine.pharmacyDiag")}
            sub={fulfilled ? ti("spine.fulfilled", { n: fulfilled }) : t("spine.routing")} />
        </div>
      </div>
    </div>
  );
}

function SpineNode({ done, active, icon: Icon, title, sub, tone }:
  { done: boolean; active: boolean; icon: any; title: string; sub: string; tone?: VitalStatus }) {
  const toneColor = tone === "critical" ? "var(--hx-crit)" : tone === "warning" ? "var(--hx-warn)" : undefined;
  return (
    <div className={`hx-node ${done ? "done" : ""} ${active ? "active" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: done ? "var(--hx-accent2)" : active ? "var(--hx-accent)" : "var(--hx-faint)" }} />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="text-xs mt-0.5" style={{ color: toneColor || "var(--hx-dim)" }}>{sub}</div>
    </div>
  );
}

function BpCell({ sys, dia, thresholds }: { sys: any; dia: any; thresholds: any }) {
  const { t } = useHospitalT();
  const s1 = classifyVital("blood_pressure_systolic", sys, thresholds);
  const s2 = classifyVital("blood_pressure_diastolic", dia, thresholds);
  const worst: VitalStatus = [s1, s2].includes("critical") ? "critical" : [s1, s2].includes("warning") ? "warning" : (sys || dia) ? "normal" : "empty";
  return (
    <div className={`hx-vital hx-vital--${worst}`} data-testid="hx-vital-bp" data-status={worst}>
      <div className="v">{sys ?? "—"}/{dia ?? "—"}<span className="text-xs hx-faint ml-0.5">mmHg</span></div>
      <div className="l">{t("vital.blood_pressure")}</div>
    </div>
  );
}

/** ECG heartbeat-animation on/off toggle (persisted; default ON) [FIX2]. */
function EcgToggle() {
  const { t } = useHospitalT();
  const [on, setOn] = useState(() => (typeof localStorage !== "undefined" ? localStorage.getItem("hx-ecg-off") !== "1" : true));
  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem("hx-ecg-off", next ? "0" : "1");
    document.documentElement.classList.toggle("hx-ecg-off", !next);
  };
  return (
    <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.28rem 0.6rem" }} onClick={toggle} data-testid="hx-ecg-toggle" title="Toggle the ECG heartbeat animation">
      <Activity className="h-3.5 w-3.5" style={{ opacity: on ? 1 : 0.45 }} /> {on ? t("ecg.on") : t("ecg.off")}
    </button>
  );
}

export default function PatientJourney() {
  return <HospitalGate allow={["doctor", "surgeon", "admin"]}><PatientJourneyInner /></HospitalGate>;
}
