// HOSPITAL-PORTAL — CP3 homes. OT (ot_nurse + surgeon): today's hospital_ot_cases by status +
// per-case pre-op completeness from hospital_preop_checklists. TRIAGE (opd_nurse): the Nurse
// Station's own in-flow/awaiting-vitals derivation. HOD (admin): occupancy, EWS ≥ 7, today's
// vitals-round compliance, collections split. Every number a real row; no source → omitted.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Slice, UserPlus, Gauge, Siren, ClipboardList, BedDouble } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useTheatreCases, PREOP_ITEMS, type PreopItems } from "@/hooks/useHospitalPreop";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalBeds } from "@/hooks/useHospitalBeds";
import { usePostopBoard } from "@/hooks/useHospitalPostop";
import { useHospitalNurseTasks, shiftsForToday } from "@/hooks/useHospitalNurseTasks";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicVisits } from "@/hooks/useClinicVisits";
import { summarizeVitals, DEFAULT_THRESHOLDS } from "@/lib/clinic/vitalsThresholds";
import { PortalShell, Stat, type RailItem } from "./PortalShell";
import { useSalesToday, usePatientNames, todayStartIso } from "./usePortalData";
import { useHospitalT } from "../i18n";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const checkedOf = (items: PreopItems | null | undefined) => PREOP_ITEMS.filter((k) => items?.[k]).length;

/** tenant-wide pre-op checklists (read-only; keyed by ot_case_id). */
function usePreopMapAll() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hxp-preop-all", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospital_preop_checklists" as any)
        .select("ot_case_id,items").eq("tenant_id", tenantId);
      if (error) throw error;
      const m = new Map<string, PreopItems>();
      ((data as any[]) || []).forEach((r) => m.set(r.ot_case_id, r.items || {}));
      return m;
    },
    enabled: !!tenantId, refetchInterval: 60_000,
  });
}

export function OtHome({ surgeonHrId, switcher }: { surgeonHrId?: string | null; switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { data: cases = [] } = useTheatreCases(surgeonHrId || undefined);
  const { data: preop } = usePreopMapAll();
  const { byId } = useHospitalStaff();
  const { data: names } = usePatientNames();

  const today = useMemo(() => {
    const start = todayStartIso();
    return cases.filter((c) => c.status === "in_theatre" || (c.scheduled_at && c.scheduled_at >= start) || c.created_at >= start);
  }, [cases]);
  const inTheatre = today.filter((c) => c.status === "in_theatre");
  const upNext = today.filter((c) => c.status === "planned" || c.status === "consented")
    .sort((a, b) => +new Date(a.scheduled_at || a.created_at) - +new Date(b.scheduled_at || b.created_at));
  const doneToday = today.filter((c) => c.status === "completed");

  const rail: RailItem[] = today.map((c) => ({
    key: c.id, title: c.procedure_name,
    sub: `${names?.get(c.patient_id) || "…"} · ${t(`ot.status.${c.status}`, c.status)} · ${ti("portal.ot.preopN", { n: checkedOf(preop?.get(c.id)), total: PREOP_ITEMS.length })}`,
    to: "/hospital/ot",
  }));
  const next = upNext[0];
  const medica = ti("portal.ot.medica", {
    it: inTheatre.length,
    next: next ? `${next.procedure_name}${next.scheduled_at ? ` ${hhmm(next.scheduled_at)}` : ""}` : t("portal.ot.none"),
    done: doneToday.length,
  });

  return (
    <PortalShell testid="hxp-ot" identity={t("portal.ot.identity")} switcher={switcher}
      tabs={[{ label: t("portal.tab.theatre"), to: "/hospital/ot" }]}
      railTitle={t("portal.ot.rail")} railItems={rail} railEmpty={t("portal.ot.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-ot-intheatre" label={t("portal.ot.inTheatre")} value={inTheatre.length} kind={inTheatre.length > 0 ? "crit" : undefined} sub={t("portal.ot.nowOperating")} />
        <Stat testid="hxp-ot-next" label={t("portal.ot.upNext")} value={upNext.length} sub={next ? `${next.procedure_name}${next.scheduled_at ? ` · ${hhmm(next.scheduled_at)}` : ""}` : t("portal.ot.none")} />
        <Stat testid="hxp-ot-done" label={t("portal.ot.done")} value={doneToday.length} sub={t("portal.today")} />
      </div>
      <div className="hxp-panel">
        <div className="hxp-panel-h"><Slice className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.ot.listTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-ot-list">
          {today.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.ot.railEmpty")}</div>}
          {today.map((c) => {
            const n = checkedOf(preop?.get(c.id));
            return (
              <div className="hxp-row" key={c.id}>
                <span className={`hxp-mono${c.status === "in_theatre" ? " crit" : ""}`}>{t(`ot.status.${c.status}`, c.status)}</span>
                <span>{c.procedure_name}</span>
                <span style={{ color: "var(--hxp-dim)", fontSize: "0.78rem" }}>
                  {names?.get(c.patient_id) || ""}{c.surgeon_id && byId[c.surgeon_id] ? ` · ${byId[c.surgeon_id].name}` : ""}
                </span>
                <span className={`hxp-mono${n === PREOP_ITEMS.length ? "" : " crit"}`} style={{ marginLeft: "auto" }}>
                  {ti("portal.ot.preopN", { n, total: PREOP_ITEMS.length })}
                </span>
                <span className="hxp-time">{c.scheduled_at ? hhmm(c.scheduled_at) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/ot"><Slice className="h-4 w-4" />{t("portal.ot.goTheatre")}</Link>
      </div>
    </PortalShell>
  );
}

export function TriageHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { patients } = useClinicPatients();
  const { visits } = useClinicVisits();

  // the Nurse Station's own derivation: latest visit per patient, in-flow = not completed,
  // awaiting vitals = worst === 'empty'
  const flow = useMemo(() => {
    const latest: Record<string, any> = {};
    for (const v of visits as any[]) {
      const cur = latest[v.patient_id];
      if (!cur || +new Date(v.visit_date) > +new Date(cur.visit_date)) latest[v.patient_id] = v;
    }
    const rows = (patients as any[]).map((p) => ({ p, v: latest[p.id] }))
      .filter((r) => r.v && r.v.current_status !== "completed");
    const awaiting = rows.filter((r) => summarizeVitals(r.v, DEFAULT_THRESHOLDS).worst === "empty");
    return { rows, awaiting };
  }, [patients, visits]);

  const rail: RailItem[] = flow.awaiting.map((r) => ({
    key: r.p.id, title: r.p.full_name, sub: t("portal.tr.noVitals"), to: "/hospital/nurse",
  }));
  const medica = ti("portal.tr.medica", { a: flow.awaiting.length, f: flow.rows.length });

  return (
    <PortalShell testid="hxp-triage" identity={t("portal.tr.identity")} switcher={switcher}
      tabs={[{ label: t("portal.tab.nurse"), to: "/hospital/nurse" }]}
      railTitle={t("portal.tr.rail")} railItems={rail} railEmpty={t("portal.tr.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-tr-awaiting" label={t("portal.tr.awaiting")} value={flow.awaiting.length} kind={flow.awaiting.length > 0 ? "crit" : undefined} sub={t("portal.tr.needVitals")} />
        <Stat testid="hxp-tr-inflow" label={t("portal.tr.inFlow")} value={flow.rows.length} sub={t("portal.tr.openVisits")} />
      </div>
      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/nurse"><UserPlus className="h-4 w-4" />{t("portal.fd.goNurse")}</Link>
      </div>
    </PortalShell>
  );
}

export function HodHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { kpis, wards } = useHospitalBeds();
  const { data: ews } = usePostopBoard();
  const { tasks } = useHospitalNurseTasks();
  const { data: sales } = useSalesToday();
  const { data: names } = usePatientNames();

  const sevenPlus = useMemo(() => {
    const out: { pid: string; score: number; band: string | null; trend: string | null }[] = [];
    ews?.forEach((v, pid) => { if ((v.score ?? 0) >= 7) out.push({ pid, score: v.score!, band: v.band, trend: v.trend }); });
    return out.sort((a, b) => b.score - a.score);
  }, [ews]);

  // rounds compliance = done/total of TODAY's vitals_round tasks (the Brief-10 shift keys)
  const rounds = useMemo(() => {
    const keys = new Set(shiftsForToday().map((s) => s.key));
    const todays = tasks.filter((tk) => tk.task_type === "vitals_round" && tk.shift_key && keys.has(tk.shift_key));
    return { done: todays.filter((tk) => tk.status === "done").length, total: todays.length };
  }, [tasks]);

  const rail: RailItem[] = wards.map((w) => ({
    key: w.ward, title: w.ward, sub: `${w.occupied}/${w.total} · ${w.occupancyPct}%`, to: "/hospital/beds",
  }));
  const medica = ti("portal.hod.medica", {
    occ: kpis.occupancyPct, n: sevenPlus.length,
    r: rounds.total ? `${rounds.done}/${rounds.total}` : "0/0",
    money: (sales?.total ?? 0).toLocaleString(),
  });

  return (
    <PortalShell testid="hxp-hod" identity={t("portal.hod.identity")} switcher={switcher}
      tabs={[
        { label: t("portal.tab.beds"), to: "/hospital/beds" },
        { label: t("portal.tab.worklist"), to: "/hospital/nurse" },
        { label: t("portal.tab.theatre"), to: "/hospital/ot" },
        { label: t("portal.tab.journey"), to: "/hospital/journey" },
      ]}
      railTitle={t("portal.hod.rail")} railItems={rail} railEmpty={t("portal.hod.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-hod-occ" label={t("portal.hod.occupancy")} value={`${kpis.occupancyPct}%`} sub={`${kpis.occupied}/${kpis.total} ${t("portal.fd.occupied")}`} />
        <Stat testid="hxp-hod-ews" label={t("portal.hod.ews7")} value={sevenPlus.length} kind={sevenPlus.length > 0 ? "crit" : undefined} sub={t("portal.hod.reviewNow")} />
        <Stat testid="hxp-hod-rounds" label={t("portal.hod.rounds")} value={rounds.total ? `${rounds.done}/${rounds.total}` : "—"} sub={t("portal.hod.roundsSub")} />
        <Stat testid="hxp-hod-money" kind="money" label={t("portal.hod.collections")} value={`৳${(sales?.total ?? 0).toLocaleString()}`}
          sub={`${t("pos.ctx.pharmacy")} ৳${(sales?.pharmacy ?? 0).toLocaleString()} · ${t("pos.ctx.discharge")} ৳${(sales?.discharge ?? 0).toLocaleString()}`} />
      </div>

      {sevenPlus.length > 0 && (
        <div className="hxp-panel">
          <div className="hxp-panel-h"><Siren className="h-4 w-4" style={{ color: "var(--hxp-crit)" }} />{t("portal.hod.ewsTitle")}</div>
          <div className="hxp-panel-b" data-testid="hxp-hod-ewslist">
            {sevenPlus.map((f) => (
              <Link key={f.pid} to={`/hospital/journey?patient=${f.pid}`} className="hxp-row" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="hxp-mono crit">{f.score} · {f.band}</span>
                <span>{names?.get(f.pid) || "…"}</span>
                <span className="hxp-time">{f.trend || ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="hxp-panel">
        <div className="hxp-panel-h"><Gauge className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.hod.wardsTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-hod-wards">
          {wards.map((w) => (
            <div className="hxp-row" key={w.ward}>
              <span className="hxp-mono">{w.occupancyPct}%</span>
              <span>{w.ward}</span>
              <span className="hxp-time">{w.occupied}/{w.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/beds"><BedDouble className="h-4 w-4" />{t("portal.tab.beds")}</Link>
        <Link className="hxp-link" to="/hospital/nurse"><ClipboardList className="h-4 w-4" />{t("portal.tab.worklist")}</Link>
      </div>
    </PortalShell>
  );
}
