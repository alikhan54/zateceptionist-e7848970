import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import LoginPage from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import CustomersPage from "./pages/Customers";
import InboxPage from "./pages/Inbox";
import AppointmentsPage from "./pages/Appointments";
import TasksPage from "./pages/Tasks";
import LeadsPage from "./pages/Leads";
import DealsPage from "./pages/Deals";
import SalesAutomationPage from "./pages/SalesAutomation";
import MarketingEnginePage from "./pages/MarketingEngine";
import ContentStudioPage from "./pages/marketing/ContentStudio";
import CampaignCentralPage from "./pages/marketing/CampaignCentral";
import HRDashboard from "./pages/hr/HRDashboard";
import EmployeesPage from "./pages/hr/Employees";
import SettingsPage from "./pages/Settings";
import VoiceAISettingsPage from "./pages/VoiceAISettings";
import NotFound from "./pages/NotFound";

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TenantProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
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
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Core CRM */}
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/tasks" element={<TasksPage />} />

                {/* Sales */}
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/sales" element={<SalesAutomationPage />} />
                <Route path="/sales/*" element={<SalesAutomationPage />} />

                {/* Marketing */}
                <Route path="/marketing" element={<MarketingEnginePage />} />
                <Route path="/marketing/content" element={<ContentStudioPage />} />
                <Route path="/marketing/campaigns" element={<CampaignCentralPage />} />
                <Route path="/marketing/*" element={<MarketingEnginePage />} />

                {/* HR Module */}
                <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                <Route path="/hr/dashboard" element={<HRDashboard />} />
                <Route path="/hr/employees" element={<EmployeesPage />} />

                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/voice-ai" element={<VoiceAISettingsPage />} />

                {/* Admin - requires master_admin role */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
