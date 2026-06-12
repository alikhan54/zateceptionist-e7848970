// HOSPITAL-PORTAL — FRONT DESK home (admin + opd_nurse). Every number is a real row count:
// doctor queues = hospital_doctor_queue waiting · beds free = hospital_beds · collected today =
// today's hospital_pos_sales (amber = money) · admitted now = hospital_admissions. Links INTO the
// existing Nurse Station / Bed Board / Pharmacy POS — nothing re-implemented.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, BedDouble, Receipt, Stethoscope } from "lucide-react";
import { useHospitalBeds } from "@/hooks/useHospitalBeds";
import { PortalShell, Stat, type RailItem } from "./PortalShell";
import { useWaitingAll, useSalesToday, useAdmittedNow, usePatientNames } from "./usePortalData";
import { useHospitalT } from "../i18n";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function FrontDeskHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { data: waiting = [] } = useWaitingAll();
  const { data: sales } = useSalesToday();
  const { data: admitted = [] } = useAdmittedNow();
  const { kpis } = useHospitalBeds();
  const { data: names } = usePatientNames();

  const byDoctor = useMemo(() => {
    const m = new Map<string, { doctor: string; dept: string | null; n: number }>();
    for (const w of waiting) {
      const k = w.doctor_id;
      const cur = m.get(k) || { doctor: w.doctor_name || "—", dept: w.department_name, n: 0 };
      cur.n += 1; m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.n - a.n);
  }, [waiting]);

  // recent activity = real recent rows, merged: forwards (queue) + receipts (sales) + admissions
  const recent = useMemo(() => {
    const acts: { key: string; at: string; text: string; chip: string; money?: boolean }[] = [];
    for (const w of waiting.slice(-6))
      acts.push({ key: `q${w.patient_id}${w.queued_at}`, at: w.queued_at, chip: t("portal.act.forwarded"), text: `${names?.get(w.patient_id) || "…"} → ${w.doctor_name || "—"}` });
    for (const s of (sales?.rows || []).slice(0, 6))
      acts.push({ key: `s${s.id}`, at: s.billed_at, chip: `৳${Number(s.total).toLocaleString()}`, money: true, text: `${t(`pos.ctx.${s.context}`, s.context)} · ${s.patient_id ? names?.get(s.patient_id) || "…" : t("pos.walkIn")}` });
    for (const a of admitted.slice(0, 4))
      acts.push({ key: `a${a.id}`, at: a.created_at, chip: t("portal.act.admitted"), text: `${names?.get(a.patient_id) || "…"} · ${a.department_name || "—"}` });
    return acts.sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 8);
  }, [waiting, sales, admitted, names, t]);

  const rail: RailItem[] = waiting.map((w) => ({
    key: `${w.patient_id}-${w.queued_at}`,
    title: names?.get(w.patient_id) || "…",
    sub: `${w.doctor_name || "—"} · ${hhmm(w.queued_at)}`,
    to: "/hospital/nurse",
  }));

  const medica = ti("portal.fd.medica", {
    w: waiting.length, d: byDoctor.length, free: kpis.available, money: (sales?.total ?? 0).toLocaleString(),
  });

  return (
    <PortalShell testid="hxp-frontdesk" identity={t("portal.fd.identity")} switcher={switcher}
      tabs={[
        { label: t("portal.tab.nurse"), to: "/hospital/nurse" },
        { label: t("portal.tab.beds"), to: "/hospital/beds" },
        { label: t("portal.tab.pharmacy"), to: "/hospital/pharmacy" },
        { label: t("portal.tab.admissions", "Admissions & Beds"), to: "/hospital/patients" },
      ]}
      railTitle={t("portal.fd.rail")} railItems={rail} railEmpty={t("portal.fd.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-fd-waiting" label={t("portal.fd.waiting")} value={waiting.length} sub={ti("portal.fd.acrossDocs", { d: byDoctor.length })} />
        <Stat testid="hxp-fd-beds" label={t("portal.fd.bedsFree")} value={kpis.available} sub={`${kpis.occupied}/${kpis.total} ${t("portal.fd.occupied")} · ${kpis.occupancyPct}%`} />
        <Stat testid="hxp-fd-money" kind="money" label={t("portal.fd.collected")} value={`৳${(sales?.total ?? 0).toLocaleString()}`} sub={ti("portal.fd.receipts", { n: sales?.count ?? 0 })} />
        <Stat testid="hxp-fd-admitted" label={t("portal.fd.admitted")} value={admitted.length} sub={t("portal.fd.inpatients")} />
      </div>

      <div className="hxp-panel">
        <div className="hxp-panel-h"><Stethoscope className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.fd.queues")}</div>
        <div className="hxp-panel-b" data-testid="hxp-fd-queues">
          {byDoctor.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.fd.noQueues")}</div>}
          {byDoctor.map((d) => (
            <div className="hxp-row" key={d.doctor}>
              <span className="hxp-mono">{d.n}</span>
              <span>{d.doctor}</span>
              <span className="hxp-time">{d.dept || ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hxp-panel">
        <div className="hxp-panel-h"><Users className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.recent")}</div>
        <div className="hxp-panel-b" data-testid="hxp-fd-recent">
          {recent.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.recentEmpty")}</div>}
          {recent.map((a) => (
            <div className="hxp-row" key={a.key}>
              <span className={`hxp-mono${a.money ? " money" : ""}`}>{a.chip}</span>
              <span>{a.text}</span>
              <span className="hxp-time">{hhmm(a.at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/nurse"><Users className="h-4 w-4" />{t("portal.fd.goNurse")}</Link>
        <Link className="hxp-link" to="/hospital/beds"><BedDouble className="h-4 w-4" />{t("portal.tab.beds")}</Link>
        <Link className="hxp-link" to="/hospital/pharmacy"><Receipt className="h-4 w-4" />{t("portal.fd.goPos")}</Link>
      </div>
    </PortalShell>
  );
}
