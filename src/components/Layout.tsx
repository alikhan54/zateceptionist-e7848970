import { Component, type ErrorInfo, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
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
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: tenantLoading, tenantConfig } = useTenant();

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

  const tenantStyle = tenantConfig?.primary_color
    ? ({ "--primary": tenantConfig.primary_color } as React.CSSProperties)
    : {};

  return (
    <MobileErrorBoundary>
      <>
        <SidebarProvider>
          <SkipLink />
          <div className="min-h-screen flex w-full overflow-x-hidden max-w-[100vw]" style={tenantStyle}>
            <NavigationSidebar />
            <main id="main-content" className="flex-1 flex flex-col min-w-0">
              <Header />
              <div className="flex-1 p-4 md:p-6 overflow-auto" style={{ paddingBottom: '80px' }}>
                <Outlet />
              </div>
            </main>
          </div>
          <InstallPrompt />
          <OnboardingFlow />
          <OmegaFloatingChat />
        </SidebarProvider>
        {/* BottomTabBar OUTSIDE SidebarProvider — zero context dependency */}
        <BottomTabBar />
        {/* TEMPORARY DEBUG — REMOVE AFTER MOBILE FIX CONFIRMED */}
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          height: '30px', backgroundColor: '#ff0000', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 'bold', zIndex: 999999,
        }}>
          DEBUG: LAYOUT MOUNTED
        </div>
      </>
    </MobileErrorBoundary>
  );
}
