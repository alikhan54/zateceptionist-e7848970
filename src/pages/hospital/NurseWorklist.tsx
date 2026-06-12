// HOSPITAL-NURSE â€” the nursing worklist section on the Nurse Station. The doctor's orders become
// her tasks; AM/PM vitals rounds generate deterministically (idempotent); the deteriorating post-op
// patient sorts to the TOP via the EWS band. Mark-done records who + when (the accountability trail).
// Read-only context: the doctor's orders + OT case status for her patients (visible, never writable).
// MEDICA shift brief (Assisted) summarizes the deterministic list â€” decides nothing. Additive; hx-*.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Sparkles, Loader2, AlertTriangle, CheckCircle2, Clock, Activity, Pill, Slice } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useHospitalT } from "./i18n";
import { useHospitalMode, HospitalModeToggle } from "./hospitalMode";
import { fetchShiftBrief } from "./hospitalShared";
import { useHospitalNurseTasks, useGenerateRoundsOnce, type NurseTask } from "@/hooks/useHospitalNurseTasks";
import { usePostopBoard, isAlertState } from "@/hooks/useHospitalPostop";
import { bandChipClass } from "./PostOpPanel";

const BAND_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
// [Brief 10] + routine (care-routine items derive through this same engine); unknown-type
// fallback below so a future task_type can never render an undefined component (React #130)
const TASK_ICON: Record<string, any> = { med_admin: Pill, vitals_round: Activity, order_prep: ClipboardList, routine: ClipboardList };

export function NurseWorklist() {
  const { t, ti, lang } = useHospitalT();
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { isAssisted } = useHospitalMode();
  const { tasks, isLoading, generateRounds, markDone } = useHospitalNurseTasks();
  const { data: ewsByPatient } = usePostopBoard();

  // the active (admitted) patients drive both the rounds generation and the grouping
  const { data: admitted = [] } = useQuery({
    queryKey: ["hx-nurse-admitted", tenantId],
    queryFn: async () => {
      const { data: adms } = await supabase.from("hospital_admissions" as any)
        .select("patient_id").eq("tenant_id", tenantId).eq("status", "admitted");
      const ids = [...new Set(((adms as any[]) || []).map((a) => a.patient_id).filter(Boolean))];
      if (!ids.length) return [] as { id: string; full_name: string }[];
      const { data: pats } = await supabase.from("clinic_patients" as any)
        .select("id, full_name").eq("tenant_id", tenantId).in("id", ids);
      return ((pats as any[]) || []) as { id: string; full_name: string }[];
    },
    enabled: !!tenantId,
  });

  // read-only context: medication orders + OT case status for her patients
  const { data: ctx } = useQuery({
    queryKey: ["hx-nurse-ctx", tenantId, admitted.map((p) => p.id).join(",")],
    queryFn: async () => {
      const ids = admitted.map((p) => p.id);
      if (!ids.length) return { orders: {} as Record<string, any[]>, ot: {} as Record<string, string> };
      const [{ data: orders }, { data: cases }] = await Promise.all([
        supabase.from("hospital_orders" as any).select("patient_id, order_type, status, details").eq("tenant_id", tenantId).in("patient_id", ids),
        supabase.from("hospital_ot_cases" as any).select("patient_id, status, procedure_name").eq("tenant_id", tenantId).in("patient_id", ids),
      ]);
      const ordersBy: Record<string, any[]> = {}; ((orders as any[]) || []).forEach((o) => (ordersBy[o.patient_id] ||= []).push(o));
      const otBy: Record<string, string> = {}; ((cases as any[]) || []).forEach((c) => { otBy[c.patient_id] = c.status; });
      return { orders: ordersBy, ot: otBy };
    },
    enabled: !!tenantId && admitted.length > 0,
  });

  useGenerateRoundsOnce(admitted, generateRounds, !!tenantId && !isLoading);

  const nameById = useMemo(() => Object.fromEntries(admitted.map((p) => [p.id, p.full_name])), [admitted]);
  const now = Date.now();
  const isOverdue = (tk: NurseTask) => tk.status === "pending" && tk.due_at != null && new Date(tk.due_at).getTime() < now;

  // group pending tasks by patient; sort patients deteriorating-first (EWS band), then by overdue count
  const groups = useMemo(() => {
    const byPatient: Record<string, NurseTask[]> = {};
    tasks.filter((tk) => tk.status === "pending").forEach((tk) => (byPatient[tk.patient_id] ||= []).push(tk));
    const arr = Object.entries(byPatient).map(([pid, ts]) => {
      const ews = ewsByPatient?.get(pid);
      const overdue = ts.filter(isOverdue).length;
      return { pid, name: nameById[pid] || t("nurse.unknownPatient"), tasks: ts, ews, overdue,
        rank: (ews && BAND_RANK[ews.band || ""]) || 0 };
    });
    arr.sort((a, b) => (b.rank - a.rank) || (b.overdue - a.overdue) || a.name.localeCompare(b.name));
    return arr;
  }, [tasks, ewsByPatient, nameById]);

  const totals = useMemo(() => {
    const pending = tasks.filter((tk) => tk.status === "pending");
    return { pending: pending.length, overdue: pending.filter(isOverdue).length };
  }, [tasks]);

  // ---- mark done (with optional note) ----
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteVal, setNoteVal] = useState("");
  async function done(id: string, note?: string) {
    try { await markDone.mutateAsync({ id, note }); setNoteFor(null); setNoteVal(""); toast({ title: t("nurse.taskDone") }); }
    catch (e: any) { toast({ title: t("nurse.taskFail"), description: e?.message, variant: "destructive" }); }
  }

  // ---- MEDICA shift brief ----
  const [brief, setBrief] = useState(""); const [briefState, setBriefState] = useState<"idle" | "loading" | "error">("idle"); const [briefErr, setBriefErr] = useState("");
  async function shiftBrief() {
    setBriefState("loading"); setBriefErr("");
    try {
      const items = groups.map((g) => {
        const next = g.tasks.filter((tk) => tk.due_at).sort((a, b) => +new Date(a.due_at!) - +new Date(b.due_at!))[0];
        return { patient: g.name, ews: g.ews && isAlertState(g.ews.band, g.ews.trend) ? `${g.ews.band}${g.ews.trend === "deteriorating" ? " deteriorating" : ""}` : null,
          pending: g.tasks.length, overdue: g.overdue, nextDue: next?.due_at ? new Date(next.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
          tasks: g.tasks.map((tk) => tk.title) };
      });
      const s = await fetchShiftBrief({ nurseName: authUser?.full_name || t("nurse.theNurse"), items, lang });
      setBrief(s); setBriefState("idle");
    } catch (e: any) { setBriefErr(e?.message || t("medica.down")); setBriefState("error"); }
  }

  return (
    <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "40ms" }} data-testid="hx-worklist">
      <div className="hx-panel-h">
        <ClipboardList className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
        <span className="font-semibold">{t("nurse.worklist")}</span>
        <span className="hx-chip hx-chip--accent" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-worklist-pending">{ti("nurse.pendingN", { n: totals.pending })}</span>
        {totals.overdue > 0 && <span className="hx-chip hx-chip--crit" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-worklist-overdue"><AlertTriangle className="h-3 w-3" /> {ti("nurse.overdueN", { n: totals.overdue })}</span>}
        <span className="ml-auto"><HospitalModeToggle /></span>
      </div>
      <div className="hx-panel-b space-y-3">
        {/* MEDICA shift brief â€” Assisted only; the list stands alone in Manual */}
        {isAssisted && (
          <div className="space-y-2">
            <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.75rem" }} onClick={shiftBrief} disabled={briefState === "loading" || groups.length === 0} data-testid="hx-shift-brief-btn">
              {briefState === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("nurse.briefing")}</> : <><Sparkles className="h-4 w-4" /> {t("nurse.shiftBrief")}</>}
            </button>
            {briefState === "error" && <p className="hx-dim text-sm" data-testid="hx-shift-brief-error">{briefErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={shiftBrief}>{t("medica.retry")}</button></p>}
            {brief && (
              <div data-testid="hx-shift-brief">
                <p className="text-sm" style={{ color: "var(--hx-strong)" }}>{brief}</p>
                <span className="hx-chip hx-chip--warn mt-1" style={{ display: "inline-flex" }} data-testid="hx-shift-brief-disclaimer"><AlertTriangle className="h-3 w-3" /> {t("nurse.briefDisclaimer")}</span>
              </div>
            )}
          </div>
        )}

        {groups.length === 0 ? (
          <p className="hx-dim text-sm" data-testid="hx-worklist-empty">{t("nurse.worklistEmpty")}</p>
        ) : groups.map((g) => {
          const orders = (ctx?.orders[g.pid] || []);
          const otStatus = ctx?.ot[g.pid];
          return (
            <div key={g.pid} className="rounded-lg" style={{ border: "1px solid var(--hx-border)" }} data-testid="hx-worklist-group" data-patient={g.pid}>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--hx-border)" }}>
                <span className="font-medium text-sm" style={{ color: "var(--hx-strong)" }} data-testid="hx-worklist-patient">{g.name}</span>
                {g.ews && isAlertState(g.ews.band, g.ews.trend) && (
                  <span className={`hx-chip ${bandChipClass(g.ews.band)}`} style={{ padding: "0.05rem 0.45rem" }} data-testid="hx-worklist-ews"><Activity className="h-3 w-3" /> EWS {g.ews.score ?? "â€”"}{g.ews.trend === "deteriorating" ? " â†‘" : ""}</span>
                )}
                {otStatus && <span className="hx-chip" style={{ padding: "0.05rem 0.45rem" }} data-testid="hx-worklist-ot"><Slice className="h-3 w-3" /> OT Â· {t(`ot.status.${otStatus}`)}</span>}
                {g.overdue > 0 && <span className="hx-chip hx-chip--crit" style={{ padding: "0.05rem 0.45rem" }}>{ti("nurse.overdueN", { n: g.overdue })}</span>}
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {g.tasks.sort((a, b) => +new Date(a.due_at || 0) - +new Date(b.due_at || 0)).map((tk) => {
                  const Icon = TASK_ICON[tk.task_type] ?? ClipboardList; const over = isOverdue(tk);
                  return (
                    <div key={tk.id} className="flex items-center gap-2" data-testid="hx-worklist-task" data-overdue={over ? "1" : "0"}>
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: over ? "var(--hx-crit)" : "var(--hx-accent2)" }} />
                      <span className="text-sm flex-1 truncate" style={over ? { color: "var(--hx-crit)" } : undefined}>{tk.title}</span>
                      {tk.due_at && <span className={`hx-chip ${over ? "hx-chip--crit" : ""}`} style={{ padding: "0.05rem 0.4rem" }}><Clock className="h-3 w-3" />{over ? t("nurse.overdue") : new Date(tk.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {noteFor === tk.id ? (
                        <>
                          <input className="hx-input" style={{ width: 160, padding: "0.2rem 0.5rem" }} value={noteVal} onChange={(e) => setNoteVal(e.target.value)} placeholder={t("nurse.notePh")} data-testid="hx-task-note" />
                          <button className="hx-btn hx-btn--primary" style={{ padding: "0.2rem 0.55rem" }} onClick={() => done(tk.id, noteVal)} disabled={markDone.isPending} data-testid="hx-task-done-confirm"><CheckCircle2 className="h-3.5 w-3.5" /> {t("nurse.done")}</button>
                        </>
                      ) : (
                        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.2rem 0.55rem" }} onClick={() => { setNoteFor(tk.id); setNoteVal(""); }} data-testid="hx-task-done"><CheckCircle2 className="h-3.5 w-3.5" /> {t("nurse.markDone")}</button>
                      )}
                    </div>
                  );
                })}
                {/* read-only doctor's orders context (visible, no write) */}
                {orders.length > 0 && (
                  <div className="hx-faint text-xs pt-1" data-testid="hx-worklist-orders">
                    {t("nurse.doctorOrders")}: {orders.slice(0, 5).map((o, i) => `${(o.details && o.details.item) || o.order_type} (${t(`ostatus.${o.status}`, o.status)})`).join(", ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
