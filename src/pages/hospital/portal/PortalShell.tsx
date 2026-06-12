// HOSPITAL-PORTAL — the portal frame: BSH brand sidebar-rail (portal identity + the role's LIVE
// work list + signed-in footer), topbar with tab nav into the EXISTING pages, ECG hairline,
// one-sentence deterministic MEDICA day-line strip. Purely presentational — homes feed it.
import { Link } from "react-router-dom";
import { Activity, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EcgLine } from "../hospitalShared";
import { HospitalLangToggle, useHospitalT } from "../i18n";
import "./portal.css";

export interface PortalTab { label: string; to: string; }
export interface RailItem { key: string; title: string; sub?: string; to: string; }

export function PortalShell({ identity, tabs, railTitle, railItems, railEmpty, medicaLine, switcher, children, testid }: {
  identity: string;                       // "FRONT DESK · OPD" etc (already translated)
  tabs: PortalTab[];                      // links into the existing pages
  railTitle: string;
  railItems: RailItem[];                  // the role's live work list
  railEmpty: string;
  medicaLine: string;                     // ONE deterministic sentence from real counts
  switcher?: React.ReactNode;             // admin portal switcher
  children: React.ReactNode;
  testid: string;
}) {
  const { authUser } = useAuth();
  const { t } = useHospitalT();
  return (
    <div className="hxp hx-rise" data-testid={testid}>
      <div className="hxp-top">
        <span className="hxp-brand"><b>BSH</b> {t("portal.suite")}</span>
        <span className="hxp-identity" data-testid={`${testid}-identity`}>{identity}</span>
        <div className="hxp-right">
          {switcher}
          <HospitalLangToggle />
        </div>
      </div>
      <div className="hxp-tabs">
        {tabs.map((tb) => (
          <Link key={tb.to} className="hxp-tab" to={tb.to} data-testid={`${testid}-tab`}>{tb.label}</Link>
        ))}
      </div>
      <EcgLine className="hxp-ecg" />
      <div className="hxp-medica" data-testid={`${testid}-medica`}>
        <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--hxp-teal)" }} />
        <span className="tag">MEDICA</span>
        <span>{medicaLine}</span>
      </div>
      <div className="hxp-body">
        <aside className="hxp-rail">
          <div className="hxp-rail-h"><Activity className="inline h-3 w-3 mr-1" style={{ color: "var(--hxp-teal)" }} />{railTitle}</div>
          <div className="hxp-rail-list" data-testid={`${testid}-rail`}>
            {railItems.length === 0 && <div className="hxp-rail-foot" style={{ border: "none", paddingTop: 0 }}>{railEmpty}</div>}
            {railItems.map((it) => (
              <Link key={it.key} className="hxp-rail-row" to={it.to}>
                <div>{it.title}</div>
                {it.sub && <div className="sub">{it.sub}</div>}
              </Link>
            ))}
          </div>
          <div className="hxp-rail-foot" data-testid={`${testid}-signedin`}>
            {t("portal.signedIn")}: <b>{authUser?.full_name || authUser?.email || "—"}</b>
          </div>
        </aside>
        <main className="hxp-main">{children}</main>
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
