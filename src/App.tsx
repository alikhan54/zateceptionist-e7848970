import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageLoading } from "@/components/shared/PageLoading";

// Eager load critical pages
import LoginPage from "./pages/Login";
import Layout from "./components/Layout";

// Lazy load all other pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const InboxPage = lazy(() => import("./pages/Inbox"));
const AppointmentsPage = lazy(() => import("./pages/Appointments"));
const TasksPage = lazy(() => import("./pages/Tasks"));
const LeadsPage = lazy(() => import("./pages/Leads"));
const DealsPage = lazy(() => import("./pages/Deals"));
const SalesAutomationPage = lazy(() => import("./pages/SalesAutomation"));
const MarketingEnginePage = lazy(() => import("./pages/MarketingEngine"));
const ContentStudioPage = lazy(() => import("./pages/marketing/ContentStudio"));
const CampaignCentralPage = lazy(() => import("./pages/marketing/CampaignCentral"));
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard"));
const EmployeesPage = lazy(() => import("./pages/hr/Employees"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const VoiceAISettingsPage = lazy(() => import("./pages/VoiceAISettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Suspense wrapper for lazy-loaded pages
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TenantProvider>
        <AuthProvider>
          <Toaster />
          <Sonner richColors closeButton position="top-right" />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Protected routes with Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route path="/dashboard" element={<LazyPage><Dashboard /></LazyPage>} />

                {/* Core CRM */}
                <Route path="/customers" element={<LazyPage><CustomersPage /></LazyPage>} />
                <Route path="/inbox" element={<LazyPage><InboxPage /></LazyPage>} />
                <Route path="/appointments" element={<LazyPage><AppointmentsPage /></LazyPage>} />
                <Route path="/tasks" element={<LazyPage><TasksPage /></LazyPage>} />

                {/* Sales */}
                <Route path="/leads" element={<LazyPage><LeadsPage /></LazyPage>} />
                <Route path="/deals" element={<LazyPage><DealsPage /></LazyPage>} />
                <Route path="/sales" element={<LazyPage><SalesAutomationPage /></LazyPage>} />
                <Route path="/sales/*" element={<LazyPage><SalesAutomationPage /></LazyPage>} />

                {/* Marketing */}
                <Route path="/marketing" element={<LazyPage><MarketingEnginePage /></LazyPage>} />
                <Route path="/marketing/content" element={<LazyPage><ContentStudioPage /></LazyPage>} />
                <Route path="/marketing/campaigns" element={<LazyPage><CampaignCentralPage /></LazyPage>} />
                <Route path="/marketing/*" element={<LazyPage><MarketingEnginePage /></LazyPage>} />

                {/* HR Module */}
                <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                <Route path="/hr/dashboard" element={<LazyPage><HRDashboard /></LazyPage>} />
                <Route path="/hr/employees" element={<LazyPage><EmployeesPage /></LazyPage>} />

                {/* Settings */}
                <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
                <Route path="/settings/voice-ai" element={<LazyPage><VoiceAISettingsPage /></LazyPage>} />

                {/* Admin - requires master_admin role */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><AdminPanel /></LazyPage>
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;