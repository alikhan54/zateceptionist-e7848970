// HOSPITAL-PORTAL — the portal frame, matched to demo/zate-os-all-portals.html: a 280px left
// rail (BSH brand mark · portal switcher · the role's LIVE registry · signed-in footer) and a
// main column (mono eyebrow + Space Grotesk h1 · ECG hairline · underline tabs into the EXISTING
// pages · stacked one-sentence deterministic MEDICA day-line). Purely presentational.
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { EcgLine } from "../hospitalShared";
import { HospitalLangToggle, useHospitalT } from "../i18n";
import "./portal.css";

export interface PortalTab { label: string; to: string; }
export interface RailItem { key: string; title: string; sub?: string; to: string; }

export function PortalShell({ identity, tabs, railTitle, railItems, railEmpty, medicaLine, switcher, children, testid }: {
  identity: string;                       // "Front Desk · OPD" — h1 takes the lead segment
  tabs: PortalTab[];                      // links into the existing pages
  railTitle: string;
  railItems: RailItem[];                  // the role's live work list
  railEmpty: string;
  medicaLine: string;                     // ONE deterministic sentence from real counts
  switcher?: React.ReactNode;             // admin portal switcher (renders in the rail)
  children: React.ReactNode;
  testid: string;
}) {
  const { authUser } = useAuth();
  const { tenantConfig } = useTenant();
  const { t } = useHospitalT();
  const [h1, ...rest] = identity.split("·").map((s) => s.trim());
  const hospitalName = (((tenantConfig as any)?.company_name as string) || "Bangladesh Specialized Hospital").replace(/\s*\(.*\)\s*$/, "");
  return (
    <div className="hxp hx-rise" data-testid={testid}>
      <aside className="hxp-rail">
        <div className="hxp-brand">
          <span className="mark">B</span>
          <span>
            <b>BSH</b>
            <small>{t("portal.suite")}</small>
          </span>
        </div>
        {switcher && <div className="hxp-switchbox">{switcher}</div>}
        <div className="hxp-rail-h">{railTitle}</div>
        <div className="hxp-rail-list" data-testid={`${testid}-rail`}>
          {railItems.length === 0 && <div style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem", color: "var(--hxp-dim)" }}>{railEmpty}</div>}
          {railItems.map((it) => (
            <Link key={it.key} className="hxp-rail-row" to={it.to}>
              <span style={{ minWidth: 0 }}>
                <div>{it.title}</div>
                {it.sub && <div className="sub">{it.sub}</div>}
              </span>
            </Link>
          ))}
        </div>
        <div className="hxp-rail-foot" data-testid={`${testid}-signedin`}>
          {t("portal.signedIn")}: <b>{authUser?.full_name || authUser?.email || "—"}</b>
        </div>
      </aside>

      <div className="hxp-main-col">
        <div className="hxp-top">
          <div className="hxp-right"><HospitalLangToggle /></div>
          <div className="hxp-eyebrow">BSH · {hospitalName}</div>
          <h1 className="hxp-h1" data-testid={`${testid}-identity`}>{identity.includes("·") ? h1 : identity}</h1>
          {rest.length > 0 && <div className="hxp-subline">{rest.join(" · ")}</div>}
        </div>
        <EcgLine className="hxp-ecg" />
        <div className="hxp-tabs">
          {tabs.map((tb) => (
            <Link key={tb.to} className="hxp-tab" to={tb.to} data-testid={`${testid}-tab`}>{tb.label}</Link>
          ))}
        </div>
        <div className="hxp-medica" data-testid={`${testid}-medica`}>
          <Sparkles className="h-3.5 w-3.5 micon" />
          <span style={{ minWidth: 0 }}>
            <span className="tag">MEDICA — {t("portal.glance")}</span>
            <span className="mline">{medicaLine}</span>
          </span>
        </div>
        <div className="hxp-body">
          <main className="hxp-main">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, kind, testid }: {
  label: string; value: string | number; sub?: string; kind?: "money" | "crit"; testid?: string;
}) {
  return (
    <div className={`hxp-stat${kind ? ` ${kind}` : ""}`} data-testid={testid}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}
