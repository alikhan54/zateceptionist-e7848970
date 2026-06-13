import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import { useHospitalRole, HOSPITAL_ROLE_PAGES, HOSPITAL_ROLE_HOME, isRestrictedHospitalRole } from "@/hooks/useHospitalRole";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingFlow } from "@/components/global/OnboardingFlow";
import { SkipLink } from "@/components/shared/AccessibleComponents";
import { OmegaFloatingChat } from "@/components/OmegaFloatingChat";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Loader2 } from "lucide-react";

class MobileErrorBoundary extends Component<
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
    console.error("Layout crash:", error, errorInfo);
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
            <a href="?reset-sw=true" style={{ color: "#6366f1" }}>
              Clear cache and reload
            </a>
          </p>
          <div style={{ marginTop: "20px" }}>
            <a href="/dashboard" style={{ color: "#6366f1", marginRight: "15px" }}>Dashboard</a>
            <a href="/inbox" style={{ color: "#6366f1", marginRight: "15px" }}>Inbox</a>
            <a href="/customers" style={{ color: "#6366f1", marginRight: "15px" }}>Customers</a>
            <a href="/sales/dashboard" style={{ color: "#6366f1" }}>Sales</a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Layout() {
  const { user, isLoading: authLoading, isMasterAdmin } = useAuth();
  const { isLoading: tenantLoading, tenantConfig, brandBackgroundColor, isAccountingPracticeUK, isHospital } = useTenant();
  const branding = useTenantBranding();
  const location = useLocation();
  // HOSPITAL-RBAC [8] — resolves to 'admin' synchronously for non-hospital tenants + platform admins
  // (no query), so this is a true no-op everywhere except a bsh-hospital doctor/nurse/lab login.
  const { hospitalRole, loading: hospitalRoleLoading } = useHospitalRole();

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

  // ADD THIS: Redirect to onboarding wizard if not completed
  if (tenantConfig && tenantConfig.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // Smart Ledger (industry=accounting_practice_uk + features.accountant_dept=true):
  // accounting-tenant non-master-admin users see /accounting/dashboard as their
  // landing route. Master admins (Zate Systems internal) bypass this gate so they
  // can debug the generic /dashboard view. All other 35 tenants: gate falls through.
  const accountantDeptEnabled =
    !!(tenantConfig?.features && (tenantConfig.features as Record<string, boolean>).accountant_dept === true);
  const isAccountingTenantUser =
    isAccountingPracticeUK && accountantDeptEnabled && !isMasterAdmin;
  if (
    isAccountingTenantUser &&
    (location.pathname === "/" || location.pathname === "/dashboard")
  ) {
    return <Navigate to="/accounting/dashboard" replace />;
  }

  // HOSPITAL-RBAC [8]: a restricted hospital role (doctor/nurse/lab) only reaches its OWN surface —
  // any other route (incl. /dashboard, /sales, …) bounces to its hospital home. Additive + no-op for
  // everyone else (admin/master_admin/non-hospital users resolve to 'admin' → never restricted).
  if (hospitalRoleLoading) {
    // Only ever true for a bsh-hospital non-admin user while the marker resolves — avoids a wrong-page flash.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (isRestrictedHospitalRole(hospitalRole)) {
    const allowed = HOSPITAL_ROLE_PAGES[hospitalRole];
    const onAllowed = allowed.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
    if (!onAllowed) return <Navigate to={HOSPITAL_ROLE_HOME[hospitalRole]} replace />;
  }

  const tenantStyle: React.CSSProperties = {
    ...(tenantConfig?.primary_color
      ? ({ "--primary": tenantConfig.primary_color } as React.CSSProperties)
      : {}),
    ...(brandBackgroundColor ? { backgroundColor: brandBackgroundColor } : {}),
    ...branding.cssVars,
  };

  return (
    <MobileErrorBoundary>
      <>
        <SidebarProvider>
          <SkipLink />
          <div className={`min-h-screen flex w-full overflow-x-hidden max-w-[100vw]${isHospital ? " hospital-shell" : ""}`} style={tenantStyle}>
            <NavigationSidebar />
            <main id="main-content" className="flex-1 flex flex-col min-w-0">
              <Header />
              <div className="flex-1 p-4 md:p-6 overflow-auto" style={{ paddingBottom: '80px' }}>
                <Outlet />
              </div>
            </main>
          </div>
          <InstallPrompt />
          {/* Skip the generic CRM onboarding tutorial for accounting tenants — Adil sees
              Smart Ledger's own Dashboard with "Welcome, Adil Vohra" + "Coming May 25"
              cards instead. The generic tutorial overlay was blocking mobile sidebar/hamburger
              taps on first login (Phase J mobile fix, 2026-05-19). */}
          {!isAccountingTenantUser && <OnboardingFlow />}
          <OmegaFloatingChat />
        </SidebarProvider>
        {/* BottomTabBar OUTSIDE SidebarProvider — zero context dependency */}
        <BottomTabBar />
      </>
    </MobileErrorBoundary>
  );
}
