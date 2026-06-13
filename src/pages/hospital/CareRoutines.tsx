// HOSPITAL-ROLES [Brief 10 · C] — /hospital/routines: the inpatient day/night CARE ROUTINES view
// (the bed-board click-through). Morning / evening / night blocks (round · vitals · consultation ·
// medication) from the STANDARD in-code routine + CUSTOM templates (hospital_routine_templates);
// instances derive into hospital_nurse_tasks THROUGH the existing idempotent engine (a second load
// inserts 0 duplicates). Marks reuse the task columns — done_by + done_at + note (a remarks preset
// + free text). Deterministic UI; MEDICA not involved.
// (Design note: the claude.ai artifact reference was unreachable (client-rendered; only its title
// "Ward Patient Dashboard · CCU Bed Board UI" survived fetching) — built from the brief's
// description in the hx design language.)
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sun, Sunset, Moon, ClipboardList, Loader2, CheckCircle2, Plus, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePostopBoard, isAlertState } from "@/hooks/useHospitalPostop";
import {
  usePatientRoutineTemplates, usePatientRoutineTasks, useDeriveRoutineTasks,
  type RoutineBlock, type RoutineItem,
} from "@/hooks/useHospitalRoutines";
import { HospitalGate, EcgLine, displayName } from "./hospitalShared";
import { VitalsCaptureDialog } from "@/components/hospital/VitalsCaptureDialog";
import { useHospitalNurseTasks } from "@/hooks/useHospitalNurseTasks";
import { useHospitalT } from "./i18n";

const BLOCKS: { key: RoutineBlock; icon: any; labelKey: string }[] = [
  { key: "morning", icon: Sun, labelKey: "routine.morning" },
  { key: "evening", icon: Sunset, labelKey: "routine.evening" },
  { key: "night", icon: Moon, labelKey: "routine.night" },
];
const REMARKS = ["given", "done", "refused", "asleep", "not_required", "escalated"] as const;

function blockOf(shiftKey: string | null): RoutineBlock | null {
  const m = (shiftKey || "").match(/:RTN:(morning|evening|night):/);
  return (m?.[1] as RoutineBlock) || null;
}

function CareRoutinesInner() {
  const { t, ti } = useHospitalT();
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const urlPatient = params.get("patient") || "";

  // inpatients (active admissions) — the routine view targets the ward
  const { data: inpatients = [] } = useQuery({
    queryKey: ["hx-routine-inpatients", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_admissions" as any)
        .select("patient_id").eq("tenant_id", tenantId).eq("status", "admitted");
      const ids = Array.from(new Set(((data as any[]) || []).map((r) => r.patient_id).filter(Boolean)));
      if (ids.length === 0) return [];
      const { data: pats } = await supabase.from("clinic_patients" as any)
        .select("id,full_name").eq("tenant_id", tenantId).in("id", ids).order("full_name");
      return ((pats as any[]) || []) as { id: string; full_name: string }[];
    },
    enabled: !!tenantId,
  });

  const [selected, setSelected] = useState(urlPatient);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  useEffect(() => { if (urlPatient && urlPatient !== selected) setSelected(urlPatient); }, [urlPatient]);
  const patient = inpatients.find((p) => p.id === selected);
  const hasActiveAdmission = !!patient;

  const { data: templates = [] } = usePatientRoutineTemplates(selected || undefined);
  const { data: tasks = [] } = usePatientRoutineTasks(selected || undefined);
  // [ZATEOS B3] tenant-wide tasks for the per-patient collapsed counts (read-only)
  const { tasks: allTasks } = useHospitalNurseTasks();
  const derive = useDeriveRoutineTasks();
  const { data: ews } = usePostopBoard();

  // derive ONCE per (patient, day, template-set) — the engine itself is idempotent regardless
  const derivedFor = useRef("");
  useEffect(() => {
    if (!selected || !hasActiveAdmission) return;
    const stamp = `${selected}:${new Date().toDateString()}:${templates.map((x) => x.id).sort().join(",")}`;
    if (derivedFor.current === stamp || derive.isPending) return;
    derivedFor.current = stamp;
    derive.mutate({ patientId: selected, hasActiveAdmission, templates });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, hasActiveAdmission, templates.map((x) => x.id).join(",")]);

  // mark done — the existing task columns (done_by/done_at/note); remark preset + free text
  const [marking, setMarking] = useState<string | null>(null);
  const [remark, setRemark] = useState<string>("given");
  const [remarkText, setRemarkText] = useState("");
  const markDone = useMutation({
    mutationFn: async (taskId: string) => {
      const note = `${t(`routine.remark.${remark}`)}${remarkText.trim() ? ` — ${remarkText.trim()}` : ""}`;
      const { error } = await supabase.from("hospital_nurse_tasks" as any)
        .update({ status: "done", done_by: authUser?.id ?? null, done_at: new Date().toISOString(), note, updated_at: new Date().toISOString() })
        .eq("id", taskId).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hx-routine-tasks"] });
      setMarking(null); setRemark("given"); setRemarkText("");
      toast({ title: t("nurse.taskDone") });
    },
    onError: (e: any) => toast({ title: t("nurse.taskFail"), description: e?.message, variant: "destructive" }),
  });

  // custom template mini-builder
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplItems, setTplItems] = useState<RoutineItem[]>([]);
  const [tplBlock, setTplBlock] = useState<RoutineBlock>("morning");
  const [tplLabel, setTplLabel] = useState("");
  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (!tplName.trim() || tplItems.length === 0) throw new Error(t("routine.tplNeed"));
      const { error } = await supabase.from("hospital_routine_templates" as any).insert({
        tenant_id: tenantId, patient_id: selected, name: tplName.trim(),
        items: tplItems, is_active: true, created_by: authUser?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hx-routine-templates"] });
      setTplOpen(false); setTplName(""); setTplItems([]);
      toast({ title: t("routine.tplSaved") });
    },
    onError: (e: any) => toast({ title: t("routine.tplFail"), description: e?.message, variant: "destructive" }),
  });

  const tasksByBlock = useMemo(() => {
    const m: Record<RoutineBlock, any[]> = { morning: [], evening: [], night: [] };
    for (const task of tasks) { const b = blockOf(task.shift_key); if (b) m[b].push(task); }
    return m;
  }, [tasks]);
  const e = selected ? ews?.get(selected) : undefined;

  return (
    <div data-testid="hx-routines">
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6" style={{ color: "var(--hx-accent2)" }} />
              <div>
                <div className="hx-eyebrow">{t("routine.eyebrow")}</div>
                <h1 className="hx-h1" data-testid="hx-routines-patient">{patient?.full_name || t("routine.title")}</h1>
                <p className="hx-dim text-sm mt-0.5">{t("routine.sub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {e && isAlertState(e.band, e.trend) && (
                <span className={`hx-chip ${e.band === "high" ? "hx-chip--crit" : "hx-chip--warn"}`} data-testid="hx-routines-ews">
                  <Activity className="h-3 w-3" /> {ti("postop.bedFlag", { n: e.score ?? "—" })}{e.trend === "deteriorating" ? " ↑" : ""}
                </span>
              )}

            </div>
          </div>
          <EcgLine className="mt-3" />
        </div>
      </div>

      {/* [ZATEOS B3] one COLLAPSED row per inpatient (due/overdue counts); the clicked patient
          expands to their full routine blocks below. */}
      <div className="hx-panel hx-rise mt-4" data-testid="hx-routines-patients">
        <div className="hx-panel-b" style={{ display: "grid", gap: "0.45rem" }}>
          {inpatients.length === 0 && <p className="hx-dim text-sm" data-testid="hx-routines-empty">{t("routine.noInpatient")}</p>}
          {inpatients.map((p) => {
            const mine = allTasks.filter((x: any) => x.patient_id === p.id && x.task_type === "routine" && x.status === "pending");
            const over = mine.filter((x: any) => x.due_at && +new Date(x.due_at) < Date.now()).length;
            const isSel = selected === p.id;
            return (
              <button key={p.id} type="button" className="hx-stage-row" style={isSel ? { borderColor: "var(--hx-border-strong)" } : undefined}
                onClick={() => { setSelected(isSel ? "" : p.id); if (!isSel) setParams({ patient: p.id }, { replace: true }); }}
                data-testid="hx-routine-patient-row" data-expanded={isSel ? "1" : "0"}>
                <span className="font-semibold">{displayName(p.full_name)}</span>
                <span className="hx-chip text-xs">{ti("routine.pendingN", { n: mine.length })}</span>
                {over > 0 && <span className="hx-chip hx-chip--crit text-xs">{ti("routine.overdueN", { n: over })}</span>}
                {isSel ? <ChevronUp className="h-4 w-4 ml-auto hx-dim" /> : <ChevronDown className="h-4 w-4 ml-auto hx-dim" />}
              </button>
            );
          })}
        </div>
      </div>

      {!patient ? null : (
        <>
          {/* [CHART-HZ CP-3] capture vitals directly inside the expanded routine */}
          <div className="flex items-center gap-2 mt-4" data-testid="hx-routine-vitals-bar">
            <span className="hx-eyebrow">{displayName(patient.full_name)}</span>
            <button type="button" className="hx-btn hx-btn--ghost ml-auto" style={{ padding: "0.3rem 0.7rem" }} onClick={() => setVitalsOpen(true)} data-testid="hx-routine-capture-vitals">
              <Activity className="h-3.5 w-3.5" /> {t("vitals.capture")}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2" data-testid="hx-routine-blocks">
            {BLOCKS.map(({ key, icon: Icon, labelKey }, bi) => (
              <div key={key} className="hx-panel hx-rise" style={{ animationDelay: `${60 + bi * 60}ms` }} data-testid={`hx-routine-block-${key}`}>
                <div className="hx-panel-h">
                  <Icon className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
                  <span className="font-semibold">{t(labelKey)}</span>
                  <span className="hx-tab-badge ml-auto">{tasksByBlock[key].filter((x) => x.status === "pending").length}</span>
                </div>
                <div className="hx-panel-b" style={{ padding: "0.8rem" }}>
                  {tasksByBlock[key].length === 0 ? (
                    <p className="hx-faint text-xs">{t("routine.blockEmpty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {tasksByBlock[key].map((task) => (
                        <li key={task.id} className="hx-entry" style={{ padding: "0.5rem 0.65rem" }} data-testid="hx-routine-item" data-status={task.status}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${task.status === "done" ? "hx-dim" : "font-medium"}`}>{String(task.title).replace(/\s*\((morning|evening|night)\)\s*$/, "")}</span>
                            {task.status === "done"
                              ? <span className="hx-chip hx-chip--ok ml-auto" style={{ padding: "0 0.45rem" }}><CheckCircle2 className="h-3 w-3" /> {t("nurse.done")}</span>
                              : <button className="hx-btn hx-btn--ghost ml-auto" style={{ padding: "0.2rem 0.55rem", fontSize: "0.72rem" }}
                                  onClick={() => { setMarking(marking === task.id ? null : task.id); setRemark("given"); setRemarkText(""); }}
                                  data-testid="hx-routine-mark">{t("nurse.markDone")}</button>}
                          </div>
                          {task.status === "done" && (task.note || task.done_at) && (
                            <div className="hx-faint text-xs mt-0.5" data-testid="hx-routine-donemeta">
                              {task.note ? `${task.note} · ` : ""}{task.done_at ? new Date(task.done_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                            </div>
                          )}
                          {marking === task.id && task.status === "pending" && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" data-testid="hx-routine-markpanel">
                              <select className="hx-select" style={{ width: "auto" }} value={remark} onChange={(ev) => setRemark(ev.target.value)} data-testid="hx-routine-remark">
                                {REMARKS.map((r) => <option key={r} value={r}>{t(`routine.remark.${r}`)}</option>)}
                              </select>
                              <input className="hx-input" style={{ flex: 1, minWidth: 120 }} value={remarkText}
                                onChange={(ev) => setRemarkText(ev.target.value)} placeholder={t("nurse.notePh")} data-testid="hx-routine-remark-text" />
                              <button className="hx-btn hx-btn--primary" style={{ padding: "0.3rem 0.65rem" }}
                                onClick={() => markDone.mutate(task.id)} disabled={markDone.isPending} data-testid="hx-routine-confirm">
                                {markDone.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* custom routine templates (special cases) */}
          <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "240ms" }} data-testid="hx-routine-templates">
            <div className="hx-panel-h">
              <Plus className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
              <span className="font-semibold">{t("routine.tplTitle")}</span>
              <button className="hx-btn hx-btn--ghost ml-auto" style={{ padding: "0.3rem 0.65rem" }}
                onClick={() => setTplOpen((o) => !o)} data-testid="hx-routine-tpl-toggle">
                <Plus className="h-3.5 w-3.5" /> {t("routine.tplNew")}
              </button>
            </div>
            <div className="hx-panel-b">
              {templates.length === 0 && !tplOpen && <p className="hx-faint text-xs">{t("routine.tplNone")}</p>}
              {templates.map((tp) => (
                <div key={tp.id} className="hx-chip hx-chip--accent mr-2 mb-1" data-testid="hx-routine-tpl">{tp.name} · {(tp.items || []).length}</div>
              ))}
              {tplOpen && (
                <div className="hx-intake mt-2" data-testid="hx-routine-tpl-form">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-4">
                      <label className="hx-label">{t("routine.tplName")}</label>
                      <input className="hx-input" value={tplName} onChange={(ev) => setTplName(ev.target.value)} placeholder={t("routine.tplNamePh")} data-testid="hx-tpl-name" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="hx-label">{t("routine.block")}</label>
                      <select className="hx-select" value={tplBlock} onChange={(ev) => setTplBlock(ev.target.value as RoutineBlock)} data-testid="hx-tpl-block">
                        {BLOCKS.map((b) => <option key={b.key} value={b.key}>{t(b.labelKey)}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="hx-label">{t("routine.itemLabel")}</label>
                      <input className="hx-input" value={tplLabel} onChange={(ev) => setTplLabel(ev.target.value)} placeholder={t("routine.itemPh")} data-testid="hx-tpl-label" />
                    </div>
                    <div className="sm:col-span-2">
                      <button className="hx-btn hx-btn--ghost w-full" onClick={() => { if (tplLabel.trim()) { setTplItems((p) => [...p, { block: tplBlock, type: "custom", label: tplLabel.trim() }]); setTplLabel(""); } }} data-testid="hx-tpl-add">
                        <Plus className="h-3.5 w-3.5" /> {t("routine.addItem")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {tplItems.map((it, i) => (
                      <span key={i} className="hx-chip" data-testid="hx-tpl-item">{t(`routine.${it.block}`)} · {it.label}
                        <button className="ml-1" style={{ opacity: 0.7 }} onClick={() => setTplItems((p) => p.filter((_, j) => j !== i))}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button className="hx-btn hx-btn--primary" style={{ padding: "0.35rem 0.8rem" }}
                      onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending} data-testid="hx-tpl-save">
                      {saveTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t("routine.tplApply")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <VitalsCaptureDialog open={vitalsOpen} onOpenChange={setVitalsOpen} patientId={selected || undefined} patientName={patient?.full_name} visitId={undefined} />
    </div>
  );
}

export default function CareRoutines() {
  return <HospitalGate allow={["nurse", "ward_nurse", "doctor", "admin"]}><CareRoutinesInner /></HospitalGate>;
}
