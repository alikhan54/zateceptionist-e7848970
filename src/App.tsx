import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageLoading } from "@/components/shared/PageLoading";

// Eager load critical pages
import LoginPage from "./pages/Login";
import Layout from "./components/Layout";

// Lazy load all pages for better performance
// Core Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const InboxPage = lazy(() => import("./pages/Inbox"));
const AppointmentsPage = lazy(() => import("./pages/Appointments"));
const TasksPage = lazy(() => import("./pages/Tasks"));

// Sales Module
const SalesDashboard = lazy(() => import("./pages/sales/Dashboard"));
const LeadPipeline = lazy(() => import("./pages/sales/Pipeline"));
const AutoLeadGen = lazy(() => import("./pages/sales/AutoLeadGen"));
const DealTracker = lazy(() => import("./pages/sales/Deals"));
const Sequences = lazy(() => import("./pages/sales/Sequences"));
const Proposals = lazy(() => import("./pages/sales/Proposals"));
const SalesAnalytics = lazy(() => import("./pages/sales/Analytics"));
const Forecasting = lazy(() => import("./pages/sales/Forecast"));

// Marketing Module
const MarketingHub = lazy(() => import("./pages/MarketingEngine"));
const ContentStudio = lazy(() => import("./pages/marketing/ContentStudio"));
const CampaignCentral = lazy(() => import("./pages/marketing/CampaignCentral"));
const SocialCommander = lazy(() => import("./pages/marketing/Social"));
const EmailBuilder = lazy(() => import("./pages/marketing/EmailBuilder"));
const LandingPages = lazy(() => import("./pages/marketing/LandingPages"));
const MarketingAnalytics = lazy(() => import("./pages/marketing/Analytics"));
const ABTesting = lazy(() => import("./pages/marketing/ABTesting"));

// HR Module
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard"));
const EmployeesPage = lazy(() => import("./pages/hr/Employees"));
const AttendancePage = lazy(() => import("./pages/hr/Attendance"));
const LeaveManagementPage = lazy(() => import("./pages/hr/LeaveManagement"));
const PayrollPage = lazy(() => import("./pages/hr/Payroll"));
const DepartmentsPage = lazy(() => import("./pages/hr/Departments"));
const PerformancePage = lazy(() => import("./pages/hr/Performance"));
const TrainingPage = lazy(() => import("./pages/hr/Training"));
const RecruitmentPage = lazy(() => import("./pages/hr/Recruitment"));
const HRDocumentsPage = lazy(() => import("./pages/hr/Documents"));
const HRReportsPage = lazy(() => import("./pages/hr/Reports"));
const HRAIAssistantPage = lazy(() => import("./pages/hr/AIAssistant"));

// Operations Module
const Inventory = lazy(() => import("./pages/operations/Inventory"));
const Orders = lazy(() => import("./pages/operations/Orders"));
const Vendors = lazy(() => import("./pages/operations/Vendors"));
const Expenses = lazy(() => import("./pages/operations/Expenses"));
const Invoices = lazy(() => import("./pages/operations/Invoices"));

// Communications Module
const VoiceAI = lazy(() => import("./pages/communications/VoiceAI"));
const WhatsAppHub = lazy(() => import("./pages/communications/WhatsApp"));
const EmailHub = lazy(() => import("./pages/communications/Email"));
const SMSHub = lazy(() => import("./pages/communications/SMS"));
const CallCenter = lazy(() => import("./pages/communications/CallCenter"));
const IVRBuilder = lazy(() => import("./pages/communications/IVRBuilder"));

// Analytics Module
const AnalyticsHub = lazy(() => import("./pages/analytics/Hub"));
const RealtimeDashboard = lazy(() => import("./pages/analytics/Realtime"));
const CustomReports = lazy(() => import("./pages/analytics/Reports"));
const AIInsights = lazy(() => import("./pages/analytics/AIInsights"));
const Predictions = lazy(() => import("./pages/analytics/Predictions"));

// Settings Module
const GeneralSettings = lazy(() => import("./pages/settings/General"));
const VoiceAISettings = lazy(() => import("./pages/settings/VoiceAI"));
const Integrations = lazy(() => import("./pages/settings/Integrations"));
const APIKeys = lazy(() => import("./pages/settings/APIKeys"));
const TeamSettings = lazy(() => import("./pages/settings/Team"));
const BillingSettings = lazy(() => import("./pages/settings/Billing"));
const NotificationSettings = lazy(() => import("./pages/settings/Notifications"));
const KnowledgeBaseSettings = lazy(() => import("./pages/settings/KnowledgeBase"));

// Admin Module
const AdminPanel = lazy(() => import("./pages/admin/Panel"));
const AllTenants = lazy(() => import("./pages/admin/Tenants"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const SystemHealth = lazy(() => import("./pages/admin/Health"));
const AuditLogs = lazy(() => import("./pages/admin/Logs"));
const FeatureFlags = lazy(() => import("./pages/admin/Features"));

// Onboarding
const CompanySetup = lazy(() => import("./pages/onboarding/CompanySetup"));

// Auth
const AuthCallback = lazy(() => import("./pages/auth/Callback"));

// Invite
const Invite = lazy(() => import("./pages/Invite"));

// Other
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
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
          <SubscriptionProvider>
            <Toaster />
            <Sonner richColors closeButton position="top-right" />
            <BrowserRouter>
              <Routes>
{/* Public routes */}
<Route path="/login" element={<LoginPage />} />
<Route path="/auth/callback" element={<LazyPage><AuthCallback /></LazyPage>} />
<Route path="/onboarding" element={<LazyPage><CompanySetup /></LazyPage>} />
<Route path="/invite" element={<LazyPage><Invite /></LazyPage>} />
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

                {/* Sales Module */}
                <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
                <Route path="/sales/dashboard" element={<LazyPage><SalesDashboard /></LazyPage>} />
                <Route path="/sales/pipeline" element={<LazyPage><LeadPipeline /></LazyPage>} />
                <Route path="/sales/auto-leadgen" element={<LazyPage><AutoLeadGen /></LazyPage>} />
                <Route path="/sales/deals" element={<LazyPage><DealTracker /></LazyPage>} />
                <Route path="/sales/sequences" element={<LazyPage><Sequences /></LazyPage>} />
                <Route path="/sales/proposals" element={<LazyPage><Proposals /></LazyPage>} />
                <Route path="/sales/analytics" element={<LazyPage><SalesAnalytics /></LazyPage>} />
                <Route path="/sales/forecast" element={<LazyPage><Forecasting /></LazyPage>} />

                {/* Marketing Module */}
                <Route path="/marketing" element={<LazyPage><MarketingHub /></LazyPage>} />
                <Route path="/marketing/content" element={<LazyPage><ContentStudio /></LazyPage>} />
                <Route path="/marketing/campaigns" element={<LazyPage><CampaignCentral /></LazyPage>} />
                <Route path="/marketing/social" element={<LazyPage><SocialCommander /></LazyPage>} />
                <Route path="/marketing/email" element={<LazyPage><EmailBuilder /></LazyPage>} />
                <Route path="/marketing/landing" element={<LazyPage><LandingPages /></LazyPage>} />
                <Route path="/marketing/analytics" element={<LazyPage><MarketingAnalytics /></LazyPage>} />
                <Route path="/marketing/ab-testing" element={<LazyPage><ABTesting /></LazyPage>} />

                {/* HR Module */}
                <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                <Route path="/hr/dashboard" element={<LazyPage><HRDashboard /></LazyPage>} />
                <Route path="/hr/employees" element={<LazyPage><EmployeesPage /></LazyPage>} />
                <Route path="/hr/attendance" element={<LazyPage><AttendancePage /></LazyPage>} />
                <Route path="/hr/leave" element={<LazyPage><LeaveManagementPage /></LazyPage>} />
                <Route path="/hr/payroll" element={<LazyPage><PayrollPage /></LazyPage>} />
                <Route path="/hr/departments" element={<LazyPage><DepartmentsPage /></LazyPage>} />
                <Route path="/hr/performance" element={<LazyPage><PerformancePage /></LazyPage>} />
                <Route path="/hr/training" element={<LazyPage><TrainingPage /></LazyPage>} />
                <Route path="/hr/recruitment" element={<LazyPage><RecruitmentPage /></LazyPage>} />
                <Route path="/hr/documents" element={<LazyPage><HRDocumentsPage /></LazyPage>} />
                <Route path="/hr/reports" element={<LazyPage><HRReportsPage /></LazyPage>} />
                <Route path="/hr/ai-assistant" element={<LazyPage><HRAIAssistantPage /></LazyPage>} />

                {/* Operations Module */}
                <Route path="/operations" element={<Navigate to="/operations/inventory" replace />} />
                <Route path="/operations/inventory" element={<LazyPage><Inventory /></LazyPage>} />
                <Route path="/operations/orders" element={<LazyPage><Orders /></LazyPage>} />
                <Route path="/operations/vendors" element={<LazyPage><Vendors /></LazyPage>} />
                <Route path="/operations/expenses" element={<LazyPage><Expenses /></LazyPage>} />
                <Route path="/operations/invoices" element={<LazyPage><Invoices /></LazyPage>} />

                {/* Communications Module */}
                <Route path="/communications" element={<Navigate to="/communications/voice" replace />} />
                <Route path="/communications/voice" element={<LazyPage><VoiceAI /></LazyPage>} />
                <Route path="/communications/whatsapp" element={<LazyPage><WhatsAppHub /></LazyPage>} />
                <Route path="/communications/email" element={<LazyPage><EmailHub /></LazyPage>} />
                <Route path="/communications/sms" element={<LazyPage><SMSHub /></LazyPage>} />
                <Route path="/communications/call-center" element={<LazyPage><CallCenter /></LazyPage>} />
                <Route path="/communications/ivr" element={<LazyPage><IVRBuilder /></LazyPage>} />

                {/* Analytics Module */}
                <Route path="/analytics" element={<LazyPage><AnalyticsHub /></LazyPage>} />
                <Route path="/analytics/realtime" element={<LazyPage><RealtimeDashboard /></LazyPage>} />
                <Route path="/analytics/reports" element={<LazyPage><CustomReports /></LazyPage>} />
                <Route path="/analytics/ai-insights" element={<LazyPage><AIInsights /></LazyPage>} />
                <Route path="/analytics/predictions" element={<LazyPage><Predictions /></LazyPage>} />

                {/* Settings Module */}
                <Route path="/settings" element={<LazyPage><GeneralSettings /></LazyPage>} />
                <Route path="/settings/voice-ai" element={<LazyPage><VoiceAISettings /></LazyPage>} />
                <Route path="/settings/integrations" element={<LazyPage><Integrations /></LazyPage>} />
                <Route path="/settings/api-keys" element={<LazyPage><APIKeys /></LazyPage>} />
                <Route path="/settings/team" element={<LazyPage><TeamSettings /></LazyPage>} />
                <Route path="/settings/billing" element={<LazyPage><BillingSettings /></LazyPage>} />
                <Route path="/settings/notifications" element={<LazyPage><NotificationSettings /></LazyPage>} />
                <Route path="/settings/knowledge-base" element={<LazyPage><KnowledgeBaseSettings /></LazyPage>} />

                {/* Admin Module - ONLY for master_admin role */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><AdminPanel /></LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tenants"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><AllTenants /></LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><AdminUsers /></LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/health"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><SystemHealth /></LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><AuditLogs /></LazyPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/features"
                  element={
                    <ProtectedRoute requiredRole="master_admin">
                      <LazyPage><FeatureFlags /></LazyPage>
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
                <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
              </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
