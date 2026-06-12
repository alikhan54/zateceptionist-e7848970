// HOSPITAL-PORTAL — PHARMACY home (pending dispense = real medication hospital_orders; collected
// today = the pharmacy-context POS sum — amber money) + LAB home (pending lab orders). Both link
// into their existing queue pages; nothing re-implemented.
import { Link } from "react-router-dom";
import { Pill, FlaskConical, Receipt } from "lucide-react";
import { useHospitalOrders } from "@/hooks/useHospitalOrders";
import { PortalShell, Stat, type RailItem } from "./PortalShell";
import { useSalesToday, usePatientNames } from "./usePortalData";
import { useHospitalT } from "../i18n";

const itemOf = (o: any) => ((o.details as any)?.item as string) || "—";
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function PharmacyHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { orders } = useHospitalOrders({ orderType: "medication" });
  const { data: sales } = useSalesToday();
  const { data: names } = usePatientNames();
  const pendingDispense = orders.filter((o) => o.status !== "dispensed" && o.status !== "cancelled");

  const rail: RailItem[] = pendingDispense.map((o) => ({
    key: o.id, title: itemOf(o),
    sub: `${names?.get(o.patient_id) || "…"} · ${t(`ostatus.${o.status}`, o.status)}`,
    to: "/hospital/pharmacy",
  }));
  const medica = ti("portal.ph.medica", { n: pendingDispense.length, money: (sales?.pharmacy ?? 0).toLocaleString() });

  return (
    <PortalShell testid="hxp-pharmacy" identity={t("portal.ph.identity")} switcher={switcher}
      tabs={[{ label: t("portal.tab.pharmacy"), to: "/hospital/pharmacy" }]}
      railTitle={t("portal.ph.rail")} railItems={rail} railEmpty={t("portal.ph.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-ph-pending" label={t("portal.ph.pending")} value={pendingDispense.length} sub={t("portal.ph.toDispense")} />
        <Stat testid="hxp-ph-money" kind="money" label={t("portal.fd.collected")} value={`৳${(sales?.pharmacy ?? 0).toLocaleString()}`} sub={t("portal.ph.posCtx")} />
        <Stat testid="hxp-ph-total" label={t("portal.ph.allOrders")} value={orders.length} sub={t("portal.today")} />
      </div>
      <div className="hxp-panel">
        <div className="hxp-panel-h"><Pill className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.ph.queueTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-ph-queue">
          {pendingDispense.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.ph.railEmpty")}</div>}
          {pendingDispense.slice(0, 10).map((o) => (
            <div className="hxp-row" key={o.id}>
              <span className="hxp-mono">{t(`ostatus.${o.status}`, o.status)}</span>
              <span>{itemOf(o)}</span>
              <span style={{ color: "var(--hxp-dim)", fontSize: "0.78rem" }}>{names?.get(o.patient_id) || ""}</span>
              <span className="hxp-time">{hhmm(o.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/pharmacy"><Pill className="h-4 w-4" />{t("portal.ph.goQueue")}</Link>
        <Link className="hxp-link" to="/hospital/pharmacy"><Receipt className="h-4 w-4" />{t("portal.fd.goPos")}</Link>
      </div>
    </PortalShell>
  );
}

export function LabHome({ switcher }: { switcher?: React.ReactNode }) {
  const { t, ti } = useHospitalT();
  const { orders } = useHospitalOrders({ orderType: "lab" });
  const { data: names } = usePatientNames();
  const pending = orders.filter((o) => !["resulted", "reviewed", "cancelled"].includes(o.status));

  const rail: RailItem[] = pending.map((o) => ({
    key: o.id, title: itemOf(o),
    sub: `${names?.get(o.patient_id) || "…"} · ${t(`ostatus.${o.status}`, o.status)}`,
    to: "/hospital/lab",
  }));
  const medica = ti("portal.lb.medica", { n: pending.length, done: orders.filter((o) => o.status === "resulted" || o.status === "reviewed").length });

  return (
    <PortalShell testid="hxp-lab" identity={t("portal.lb.identity")} switcher={switcher}
      tabs={[{ label: t("portal.tab.lab"), to: "/hospital/lab" }]}
      railTitle={t("portal.lb.rail")} railItems={rail} railEmpty={t("portal.lb.railEmpty")} medicaLine={medica}>
      <div className="hxp-stats">
        <Stat testid="hxp-lb-pending" label={t("portal.lb.pending")} value={pending.length} sub={t("portal.lb.awaiting")} />
        <Stat testid="hxp-lb-resulted" label={t("portal.lb.resulted")} value={orders.filter((o) => o.status === "resulted" || o.status === "reviewed").length} sub={t("portal.lb.complete")} />
      </div>
      <div className="hxp-panel">
        <div className="hxp-panel-h"><FlaskConical className="h-4 w-4" style={{ color: "var(--hxp-teal)" }} />{t("portal.lb.queueTitle")}</div>
        <div className="hxp-panel-b" data-testid="hxp-lb-queue">
          {pending.length === 0 && <div className="hxp-row" style={{ color: "var(--hxp-dim)" }}>{t("portal.lb.railEmpty")}</div>}
          {pending.slice(0, 10).map((o) => (
            <div className="hxp-row" key={o.id}>
              <span className="hxp-mono">{t(`ostatus.${o.status}`, o.status)}</span>
              <span>{itemOf(o)}</span>
              <span style={{ color: "var(--hxp-dim)", fontSize: "0.78rem" }}>{names?.get(o.patient_id) || ""}</span>
              <span className="hxp-time">{hhmm(o.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hxp-links">
        <Link className="hxp-link" to="/hospital/lab"><FlaskConical className="h-4 w-4" />{t("portal.lb.goQueue")}</Link>
      </div>
    </PortalShell>
  );
}
