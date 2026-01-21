import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { Header } from "@/components/layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingFlow } from "@/components/global/OnboardingFlow";
import { SkipLink } from "@/components/shared/AccessibleComponents";
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
    <SidebarProvider>
      <SkipLink />
      <div className="min-h-screen flex w-full" style={tenantStyle}>
        <NavigationSidebar />
        <main id="main-content" className="flex-1 flex flex-col min-w-0">
          <Header />
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <OnboardingFlow />
    </SidebarProvider>
  );
}
