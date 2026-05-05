/**
 * Phase 5 — V3 chrome wrapper for the 5 Tier 1 routes.
 *
 * Mirrors Layout.tsx auth/onboarding/tenantStyle gates, then renders v3 chrome
 * (NavRail + slim top bar) around an <Outlet /> where the existing page
 * content (Inbox, Customers, Sales Dashboard, MarketingHub) renders unchanged.
 *
 * SACRED: Layout.tsx and ParticleSphereShell.tsx are byte-identical. This file
 * mirrors their patterns by composition rather than modification.
 *
 * `?ui=legacy` bypass: V3Layout returns the existing <Layout /> instead of
 * rendering v3 chrome. Per-device escape hatch for any tenant who reports
 * issues with the new chrome on a Tier 1 route.
 *
 * Top-bar de-duplication: on /dashboard, ParticleSphereShell renders its own
 * top bar. V3Layout uses useLocation() to detect this and skips its own bar.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { NavRail } from "@/components/omega/v3/nav/NavRail";
import { Spotlight } from "@/components/omega/v3/nav/Spotlight";
import { Cathedral } from "@/components/omega/v3/nav/Cathedral";
import { useNavOverlay } from "@/components/omega/v3/nav/useNavOverlay";
import { OmegaFloatingChat } from "@/components/OmegaFloatingChat";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OnboardingFlow } from "@/components/global/OnboardingFlow";
import { SkipLink } from "@/components/shared/AccessibleComponents";
import Layout from "@/components/Layout";
import "./V3Layout.css";

// ---------- Inline error boundary (mirrored from Layout.tsx, separate class)
class V3MobileErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("V3Layout crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            fontFamily: "system-ui",
            color: "#fff",
            backgroundColor: "#1a1a2e",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ color: "#ef4444" }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8" }}>{this.state.error}</p>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "10px" }}>
            Try:{" "}
            <a href="?ui=legacy" style={{ color: "#6366f1" }}>
              switch to legacy UI
            </a>
            {" or "}
            <a href="?reset-sw=true" style={{ color: "#6366f1" }}>
              clear cache and reload
            </a>
          </p>
          <div style={{ marginTop: "20px" }}>
            <a href="/dashboard" style={{ color: "#6366f1", marginRight: "15px" }}>
              Dashboard
            </a>
            <a href="/inbox" style={{ color: "#6366f1", marginRight: "15px" }}>
              Inbox
            </a>
            <a href="/customers" style={{ color: "#6366f1", marginRight: "15px" }}>
              Customers
            </a>
            <a href="/sales/dashboard" style={{ color: "#6366f1" }}>
              Sales
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------- The wrapper itself

export default function V3Layout() {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading, tenantId, tenantConfig } = useTenant();
  const overlay = useNavOverlay();

  // ?ui=legacy — per-device escape hatch. Delegate entirely to existing Layout.
  // Auth/tenant gates are then handled by Layout.tsx itself.
  const params = new URLSearchParams(location.search);
  if (params.get("ui") === "legacy") {
    return <Layout />;
  }

  // Auth/tenant gates — mirrored from Layout.tsx exactly.
  const isLoading = authLoading || tenantLoading;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (tenantConfig && tenantConfig.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  const isDashboard = location.pathname === "/dashboard";
  const businessName =
    tenantConfig?.company_name ??
    tenantId?.replace(/-/g, " ").toUpperCase() ??
    "OMEGA";
  const tenantLabel = tenantId ?? "guest";
  const markLetter = (businessName[0] ?? "O").toUpperCase();

  const tenantStyle = tenantConfig?.primary_color
    ? ({ "--primary": tenantConfig.primary_color } as React.CSSProperties)
    : {};

  return (
    <V3MobileErrorBoundary>
      <SkipLink />
      <div
        className={`v3-layout-shell ${isDashboard ? "is-dashboard" : ""}`}
        style={tenantStyle}
      >
        {/* TOP BAR — skip on /dashboard since ParticleSphereShell renders its own */}
        {!isDashboard && (
          <header className="v3-layout-topbar" role="banner">
            <div className="v3-layout-mark" aria-hidden>
              {markLetter}
            </div>
            <div className="v3-layout-name">
              {businessName.toUpperCase()}
              <span className="v3-layout-small">tenant · {tenantLabel}</span>
            </div>
            <div className="v3-layout-search-hint" aria-hidden>
              ⌘K · search
            </div>
          </header>
        )}

        {/* LEFT RAIL — Phase 2A NavRail, reused. Active state from useLocation. */}
        <NavRail
          onOpenSpotlight={overlay.openSpotlight}
          onOpenCathedral={overlay.openCathedral}
          currentPath={location.pathname}
        />

        {/* PAGE CONTENT — existing pages render unchanged via Outlet.
            On /dashboard, NeuralDashboardV3 (ParticleSphereShell) takes over
            the full viewport so we collapse our padding via CSS. */}
        <main
          id="main-content"
          className={`v3-layout-main ${isDashboard ? "is-dashboard" : ""}`}
        >
          <Outlet />
        </main>

        {/* OVERLAYS — Phase 2A Spotlight + Phase 2A.5/2B/2B.1 Cathedral, reused */}
        <Spotlight isOpen={overlay.spotlightOpen} onClose={overlay.closeSpotlight} />
        <Cathedral isOpen={overlay.cathedralOpen} onClose={overlay.closeCathedral} />

        {/* SACRED CHILDREN — preserved from Layout.tsx.
            On /dashboard, ParticleSphereShell adds body.omega-fullscreen which
            hides OmegaFloatingChat via CSS. We additionally skip the render to
            be belt-and-suspenders; either mechanism alone would suffice. */}
        {!isDashboard && <OmegaFloatingChat />}
        <InstallPrompt />
        <OnboardingFlow />
      </div>
      {/* BottomTabBar OUTSIDE the shell wrapper — matches Layout.tsx pattern */}
      <BottomTabBar />
    </V3MobileErrorBoundary>
  );
}
