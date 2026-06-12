// HOSPITAL-PORTAL — WARD home (ward_nurse). Due/overdue from hospital_nurse_tasks (pending),
// EWS flags from the ACTIVE hospital_postop_episodes — the deteriorating patient is PINNED FIRST
// (the worklist's own sort rule). Links into the existing Worklist · Routines · Bed Board.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, BedDouble, CalendarClock, Siren } from "lucide-react";
import { useHospitalNurseTasks } from "@/hooks/useHospitalNurseTasks";
import { usePostopBoard, isAlertState } from "@/hooks/useHospitalPostop";
import { PortalShell, Stat, type RailItem } from "./PortalShell";
import { usePatientNames } from "./usePortalData";
import { useHospitalT } from "../i18n";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function WardHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { tasks } = useHospitalNurseTasks();
  const { data: ews } = usePostopBoard();
  const { data: names } = usePatientNames();

  const pending = useMemo(() => tasks.filter((tk) => tk.status === "pending"), [tasks]);
  const now = Date.now();
  const overdue = pending.filter((tk) => tk.due_at && +new Date(tk.due_at) < now);
  const flagged = useMemo(() => {
    const out: { pid: string; score: number | null; band: string | null; trend: string | null }[] = [];
    ews?.forEach((v, pid) => { if (isAlertState(v.band, v.trend)) out.push({ pid, score: v.score, band: v.band, trend: v.trend }); });
    return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [ews]);

  // patients with pending work — deteriorating PINNED FIRST, then by overdue count (the worklist rule)
  const byPatient = useMemo(() => {
    const m = new Map<string, { n: number; over: number }>();
    for (const tk of pending) {
      const cur = m.get(tk.patient_id) || { n: 0, over: 0 };
      cur.n += 1; if (tk.due_at && +new Date(tk.due_at) < now) cur.over += 1;
      m.set(tk.patient_id, cur);
    }
    const flaggedSet = new Set(flagged.map((f) => f.pid));
    return Array.from(m.entries())
      .map(([pid, v]) => ({ pid, ...v, alert: flaggedSet.has(pid) }))
      .sort((a, b) => Number(b.alert) - Number(a.alert) || b.over - a.over || b.n - a.n);
  }, [pending, flagged, now]);

  const rail: RailItem[] = byPatient.map((p) => ({
    key: p.pid,
    title: `${p.alert ? "⚠ " : ""}${names?.get(p.pid) || "…"}`,
    sub: ti("portal.wd.taskSub", { n: p.n, over: p.over }),
    to: "/hospital/nurse",
  }));

  const medica = ti("portal.wd.medica", { due: pending.length, over: overdue.length, flags: flagged.length });

  return (
    <PortalShell testid="hxp-ward" identity={t("portal.wd.identity")} switcher={switcher}
      tabs={[
        { label: t("portal.tab.worklist"), to: "/hospital/nurse" },
        { label: t("portal.tab.routines"), to: "/hospital/routines" },
        { label: t("portal.tab.beds"), to: "/hospital/beds" },
      ]}
      railTitle={t("portal.wd.rail")} railItems={rail} railEmpty={t("portal.wd.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-wd-due" label={t("portal.wd.due")} value={pending.length} sub={t("portal.wd.pendingTasks")} />
        <Stat testid="hxp-wd-overdue" label={t("portal.wd.overdue")} value={overdue.length} kind={overdue.length > 0 ? "crit" : undefined} sub={t("portal.wd.pastDue")} />
        <Stat testid="hxp-wd-flags" label={t("portal.wd.flags")} value={flagged.length} kind={flagged.length > 0 ? "crit" : undefined} sub={t("portal.wd.activeEpisodes")} />
        <Stat testid="hxp-wd-patients" label={t("portal.wd.patients")} value={byPatient.length} sub={t("portal.wd.withWork")} />
      </div>

      {flagged.length > 0 && (
        <div className="hxp-panel">
          <div className="hxp-panel-h"><Siren className="h-4 w-4" style={{ color: "var(--hxp-crit)" }} />{t("portal.wd.ewsTitle")}</div>
          <div className="hxp-panel-b" data-testid="hxp-wd-ews">
            {flagged.map((f) => (
              <Link key={f.pid} to={`/hospital/journey?patient=${f.pid}`} className="hxp-row" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="hxp-mono crit">{f.score ?? "—"} · {f.band}</span>
                <span>{names?.get(f.pid) || "…"}</span>
                <span className="hxp-time">{f.trend || ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="hxp-panel">
        <div className="hxp-panel-h"><CalendarClock className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.wd.nextTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-wd-next">
          {pending.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.wd.railEmpty")}</div>}
          {pending.slice(0, 8).map((tk) => (
            <div className="hxp-row" key={tk.id}>
              <span className={`hxp-mono${tk.due_at && +new Date(tk.due_at) < now ? " crit" : ""}`}>{tk.due_at ? hhmm(tk.due_at) : "—"}</span>
              <span>{tk.title}</span>
              <span className="hxp-time">{names?.get(tk.patient_id) || ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/nurse"><ClipboardList className="h-4 w-4" />{t("portal.tab.worklist")}</Link>
        <Link className="hxp-link" to="/hospital/routines"><CalendarClock className="h-4 w-4" />{t("portal.tab.routines")}</Link>
        <Link className="hxp-link" to="/hospital/beds"><BedDouble className="h-4 w-4" />{t("portal.tab.beds")}</Link>
      </div>
    </PortalShell>
  );
}
