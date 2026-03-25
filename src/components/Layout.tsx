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
  );
}
