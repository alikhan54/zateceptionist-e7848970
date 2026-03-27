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
const CreateSequence = lazy(() => import("./pages/sales/CreateSequence"));
const Proposals = lazy(() => import("./pages/sales/Proposals"));
const ProposalDetail = lazy(() => import("./pages/sales/ProposalDetail"));
const SalesAnalytics = lazy(() => import("./pages/sales/Analytics"));
const Forecasting = lazy(() => import("./pages/sales/Forecast"));
const LtvCac = lazy(() => import("./pages/sales/LtvCac"));
const EmailWarmup = lazy(() => import("./pages/sales/EmailWarmup"));
const TriggerEvents = lazy(() => import("./pages/sales/TriggerEvents"));
const WebsiteVisitors = lazy(() => import("./pages/sales/WebsiteVisitors"));
const PredictiveScoring = lazy(() => import("./pages/sales/PredictiveScoring"));
const ReplyRouting = lazy(() => import("./pages/sales/ReplyRouting"));
const Deliverability = lazy(() => import("./pages/sales/Deliverability"));
const TargetAccounts = lazy(() => import("./pages/sales/TargetAccounts"));
const LeadMagnets = lazy(() => import("./pages/sales/LeadMagnets"));
const ReferralsPage = lazy(() => import("./pages/sales/Referrals"));
const LeadMagnetPage = lazy(() => import("./pages/public/LeadMagnetPage"));
const CompanyIntelligence = lazy(() => import("./pages/sales/CompanyIntelligence"));
const DocumentTracking = lazy(() => import("./pages/sales/DocumentTracking"));
const SequenceTemplates = lazy(() => import("./pages/sales/SequenceTemplates"));
const SendTimeInsights = lazy(() => import("./pages/sales/SendTimeInsights"));
// Marketing Module
const MarketingHub = lazy(() => import("./pages/MarketingEngine"));
const ContentStudio = lazy(() => import("./pages/marketing/ContentStudio"));
const CampaignCentral = lazy(() => import("./pages/marketing/CampaignCentral"));
const SocialCommander = lazy(() => import("./pages/marketing/Social"));
const EmailBuilder = lazy(() => import("./pages/marketing/EmailBuilder"));
const LandingPages = lazy(() => import("./pages/marketing/LandingPages"));
const MarketingAnalytics = lazy(() => import("./pages/marketing/Analytics"));
const ABTesting = lazy(() => import("./pages/marketing/ABTesting"));
const MarketingSequences = lazy(() => import("./pages/marketing/Sequences"));
const BlogManager = lazy(() => import("./pages/marketing/BlogManager"));
const VideoProjects = lazy(() => import("./pages/marketing/VideoProjects"));
const CompetitorAnalysis = lazy(() => import("./pages/marketing/CompetitorAnalysis"));
const AdsManager = lazy(() => import("./pages/marketing/AdsManager"));
const ContentCalendar = lazy(() => import("./pages/marketing/ContentCalendar"));
const BrandVoice = lazy(() => import("./pages/marketing/BrandVoice"));
const EmailTemplates = lazy(() => import("./pages/marketing/EmailTemplates"));
const SEODashboard = lazy(() => import("./pages/marketing/SEODashboard"));
const SocialListening = lazy(() => import("./pages/marketing/SocialListening"));
const Playbooks = lazy(() => import("./pages/marketing/Playbooks"));
const VoiceMarketing = lazy(() => import("./pages/marketing/VoiceMarketing"));
const AutonomousMarketing = lazy(() => import("./pages/marketing/AutonomousMarketing"));
const VideoStudio = lazy(() => import("./pages/marketing/VideoStudio"));

// HR Module
const HRDashboardOverview = lazy(() => import("./pages/hr/Dashboard"));
const HRRecruitmentDash = lazy(() => import("./pages/hr/HRDashboard"));
const EmployeesPage = lazy(() => import("./pages/hr/Employees"));
const AttendancePage = lazy(() => import("./pages/hr/Attendance"));
const LeaveManagementPage = lazy(() => import("./pages/hr/Leave"));
const PayrollPage = lazy(() => import("./pages/hr/Payroll"));
const DepartmentsPage = lazy(() => import("./pages/hr/Departments"));
const PerformancePage = lazy(() => import("./pages/hr/Performance"));
const TrainingPage = lazy(() => import("./pages/hr/Training"));
const RecruitmentPage = lazy(() => import("./pages/hr/Recruitment"));
const HRDocumentsPage = lazy(() => import("./pages/hr/Documents"));
const HRReportsPage = lazy(() => import("./pages/hr/Reports"));
const HRAIAssistantPage = lazy(() => import("./pages/hr/AIAssistant"));
const CompliancePage = lazy(() => import("./pages/hr/Compliance"));
const ShiftsPage = lazy(() => import("./pages/hr/Shifts"));
const EmployeeProfilePage = lazy(() => import("./pages/hr/EmployeeProfile"));
const AIAgentsPage = lazy(() => import("./pages/hr/AIAgents"));
const AIAgentHirePage = lazy(() => import("./pages/hr/AIAgentHire"));
const AIAgentProfilePage = lazy(() => import("./pages/hr/AIAgentProfile"));
const AIAgentAnalyticsPage = lazy(() => import("./pages/hr/AIAgentAnalytics"));

// Operations Module
const Inventory = lazy(() => import("./pages/operations/Inventory"));
const Orders = lazy(() => import("./pages/operations/Orders"));
const Vendors = lazy(() => import("./pages/operations/Vendors"));
const Expenses = lazy(() => import("./pages/operations/Expenses"));
const Invoices = lazy(() => import("./pages/operations/Invoices"));
const KitchenDisplay = lazy(() => import("./pages/operations/KitchenDisplay"));
const MenuEditor = lazy(() => import("./pages/operations/MenuEditor"));
const Reservations = lazy(() => import("./pages/operations/Reservations"));
const AiIntelligence = lazy(() => import("./pages/operations/AiIntelligence"));

// Collections Module
const CollectionsDashboard = lazy(() => import("./pages/collections/CollectionsDashboard"));
const PTTracker = lazy(() => import("./pages/collections/PTTracker"));
const SettlementTracker = lazy(() => import("./pages/collections/SettlementTracker"));
const AgentKPIs = lazy(() => import("./pages/collections/AgentKPIs"));

// Clinic Module
const ClinicDashboard = lazy(() => import("./pages/clinic/ClinicDashboard"));
const ClinicPatients = lazy(() => import("./pages/clinic/Patients"));
const ClinicTreatments = lazy(() => import("./pages/clinic/Treatments"));
const ClinicProducts = lazy(() => import("./pages/clinic/Products"));
const ConsultationNotes = lazy(() => import("./pages/clinic/ConsultationNotes"));
const HealthReports = lazy(() => import("./pages/clinic/HealthReports"));
const DoctorReviewQueue = lazy(() => import("./pages/clinic/DoctorReviewQueue"));

// Real Estate Module
const RealEstateDashboard = lazy(() => import("./pages/realestate/RealEstateDashboard"));
const PropertyListings = lazy(() => import("./pages/realestate/PropertyListings"));
const REClientManagement = lazy(() => import("./pages/realestate/ClientManagement"));
const ViewingCalendar = lazy(() => import("./pages/realestate/ViewingCalendar"));
const DealPipeline = lazy(() => import("./pages/realestate/DealPipeline"));
const EOITracker = lazy(() => import("./pages/realestate/EOITracker"));
const RoadShowManager = lazy(() => import("./pages/realestate/RoadShowManager"));
const InvestmentCalculator = lazy(() => import("./pages/realestate/InvestmentCalculator"));
const MarketIntelligence = lazy(() => import("./pages/realestate/MarketIntelligence"));
const RegionSettings = lazy(() => import("./pages/realestate/RegionSettings"));
const DealAdvisor = lazy(() => import("./pages/realestate/DealAdvisor"));
const REKnowledgeBase = lazy(() => import("./pages/realestate/KnowledgeBase"));
const PricePrediction = lazy(() => import("./pages/realestate/PricePrediction"));
const AgentPerformance = lazy(() => import("./pages/realestate/AgentPerformance"));
const LeadScoring = lazy(() => import("./pages/realestate/LeadScoring"));
const OffPlanExplorer = lazy(() => import("./pages/realestate/OffPlanExplorer"));
const REMortgageCalculator = lazy(() => import("./pages/realestate/MortgageCalculator"));
const DealOrchestrator = lazy(() => import("./pages/realestate/DealOrchestrator"));
const MarketForecasts = lazy(() => import("./pages/realestate/MarketForecasts"));
const WhatsAppJourneys = lazy(() => import("./pages/realestate/WhatsAppJourneys"));
const InvestorPortfolio = lazy(() => import("./pages/realestate/InvestorPortfolio"));
const DeveloperPortal = lazy(() => import("./pages/realestate/DeveloperPortal"));
// CrossBorderAdvisor removed - module not found

// Estimation Module
const EstimationProjects = lazy(() => import("./pages/estimation/ProjectsDashboard"));
const EstimationProjectDetail = lazy(() => import("./pages/estimation/ProjectDetail"));
const EstimationTakeoffs = lazy(() => import("./pages/estimation/TakeoffWorkspace"));
const EstimationMaterials = lazy(() => import("./pages/estimation/MaterialDatabase"));
const EstimationTeam = lazy(() => import("./pages/estimation/TeamWorkload"));
const EstimationRFIs = lazy(() => import("./pages/estimation/RFITracker"));
const EstimationReports = lazy(() => import("./pages/estimation/EstimationReports"));
const EstimationApprovalQueue = lazy(() => import("./pages/estimation/EstimationApprovalQueue"));

// Communications Module
const VoiceAIHub = lazy(() => import("./pages/communications/VoiceAIHub"));
const WhatsAppHub = lazy(() => import("./pages/communications/WhatsApp"));
const EmailHub = lazy(() => import("./pages/communications/Email"));
const SMSHub = lazy(() => import("./pages/communications/SMS"));

// Analytics Module
const AnalyticsHub = lazy(() => import("./pages/analytics/Hub"));
const RealtimeDashboard = lazy(() => import("./pages/analytics/Realtime"));
const CustomReports = lazy(() => import("./pages/analytics/Reports"));
const AIInsights = lazy(() => import("./pages/analytics/AIInsights"));
const Predictions = lazy(() => import("./pages/analytics/Predictions"));

// Settings Module
const GeneralSettings = lazy(() => import("./pages/settings/General"));
// VoiceAISettings removed — now part of VoiceAIHub
const Integrations = lazy(() => import("./pages/settings/Integrations"));
const APIKeys = lazy(() => import("./pages/settings/APIKeys"));
const TeamSettings = lazy(() => import("./pages/settings/Team"));
const BillingSettings = lazy(() => import("./pages/settings/Billing"));
const NotificationSettings = lazy(() => import("./pages/settings/Notifications"));
const KnowledgeBaseSettings = lazy(() => import("./pages/settings/KnowledgeBase"));
const OutreachSettings = lazy(() => import("./pages/settings/OutreachSettings"));
// PhoneNumberSettings removed — now part of VoiceAIHub

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

// Intelligence
const Intelligence = lazy(() => import("./pages/Intelligence"));

// OMEGA Command Center
const OmegaCommandCenter = lazy(() => import("./pages/OmegaCommandCenter"));

// Public Pages
const PublicBlog = lazy(() => import("./pages/public/PublicBlog"));
const PublicLandingPage = lazy(() => import("./pages/public/PublicLandingPage"));
const Pricing = lazy(() => import("./pages/public/Pricing"));
const Terms = lazy(() => import("./pages/public/Terms"));
const Privacy = lazy(() => import("./pages/public/Privacy"));
const Refund = lazy(() => import("./pages/public/Refund"));
const Landing = lazy(() => import("./pages/public/Landing"));
const Demo = lazy(() => import("./pages/public/Demo"));

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
                <Route
                  path="/auth/callback"
                  element={
                    <LazyPage>
                      <AuthCallback />
                    </LazyPage>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <LazyPage>
                      <CompanySetup />
                    </LazyPage>
                  }
                />
                <Route
                  path="/invite"
                  element={
                    <LazyPage>
                      <Invite />
                    </LazyPage>
                  }
                />
                {/* Public content pages */}
                <Route
                  path="/blog/:slug"
                  element={
                    <LazyPage>
                      <PublicBlog />
                    </LazyPage>
                  }
                />
                <Route
                  path="/lp/:slug"
                  element={
                    <LazyPage>
                      <PublicLandingPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/lm/:slug"
                  element={
                    <LazyPage>
                      <LeadMagnetPage />
                    </LazyPage>
                  }
                />
                {/* Legal & pricing pages (public, no auth) */}
                <Route
                  path="/pricing"
                  element={
                    <LazyPage>
                      <Pricing />
                    </LazyPage>
                  }
                />
                <Route
                  path="/landing"
                  element={
                    <LazyPage>
                      <Landing />
                    </LazyPage>
                  }
                />
                <Route
                  path="/demo"
                  element={
                    <LazyPage>
                      <Demo />
                    </LazyPage>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <LazyPage>
                      <Terms />
                    </LazyPage>
                  }
                />
                <Route
                  path="/privacy"
                  element={
                    <LazyPage>
                      <Privacy />
                    </LazyPage>
                  }
                />
                <Route
                  path="/refund"
                  element={
                    <LazyPage>
                      <Refund />
                    </LazyPage>
                  }
                />

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
                  <Route
                    path="/dashboard"
                    element={
                      <LazyPage>
                        <Dashboard />
                      </LazyPage>
                    }
                  />

                  {/* Core CRM */}
                  <Route
                    path="/customers"
                    element={
                      <LazyPage>
                        <CustomersPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/inbox"
                    element={
                      <LazyPage>
                        <InboxPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/appointments"
                    element={
                      <LazyPage>
                        <AppointmentsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <LazyPage>
                        <TasksPage />
                      </LazyPage>
                    }
                  />

                  {/* Sales Module */}
                  <Route path="/leads" element={<Navigate to="/sales/dashboard" replace />} />
                  <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />
                  <Route
                    path="/sales/dashboard"
                    element={
                      <LazyPage>
                        <SalesDashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/pipeline"
                    element={
                      <LazyPage>
                        <LeadPipeline />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/auto-leadgen"
                    element={
                      <LazyPage>
                        <AutoLeadGen />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/deals"
                    element={
                      <LazyPage>
                        <DealTracker />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/sequences"
                    element={
                      <LazyPage>
                        <Sequences />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/sequences/new"
                    element={
                      <LazyPage>
                        <CreateSequence />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/proposals"
                    element={
                      <LazyPage>
                        <Proposals />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/proposals/:id"
                    element={
                      <LazyPage>
                        <ProposalDetail />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/analytics"
                    element={
                      <LazyPage>
                        <SalesAnalytics />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/forecast"
                    element={
                      <LazyPage>
                        <Forecasting />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/ltv-cac"
                    element={
                      <LazyPage>
                        <LtvCac />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/email-warmup"
                    element={
                      <LazyPage>
                        <EmailWarmup />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/trigger-events"
                    element={
                      <LazyPage>
                        <TriggerEvents />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/website-visitors"
                    element={
                      <LazyPage>
                        <WebsiteVisitors />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/predictive-scoring"
                    element={
                      <LazyPage>
                        <PredictiveScoring />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/reply-routing"
                    element={
                      <LazyPage>
                        <ReplyRouting />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/deliverability"
                    element={
                      <LazyPage>
                        <Deliverability />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/target-accounts"
                    element={
                      <LazyPage>
                        <TargetAccounts />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/referrals"
                    element={
                      <LazyPage>
                        <ReferralsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/lead-magnets"
                    element={
                      <LazyPage>
                        <LeadMagnets />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/sales/company-intel"
                    element={<LazyPage><CompanyIntelligence /></LazyPage>}
                  />
                  <Route
                    path="/sales/doc-tracking"
                    element={<LazyPage><DocumentTracking /></LazyPage>}
                  />
                  <Route
                    path="/sales/sequence-templates"
                    element={<LazyPage><SequenceTemplates /></LazyPage>}
                  />
                  <Route
                    path="/sales/send-time"
                    element={<LazyPage><SendTimeInsights /></LazyPage>}
                  />

                  <Route
                    path="/marketing"
                    element={
                      <LazyPage>
                        <MarketingHub />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/content"
                    element={
                      <LazyPage>
                        <ContentStudio />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/campaigns"
                    element={
                      <LazyPage>
                        <CampaignCentral />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/social"
                    element={
                      <LazyPage>
                        <SocialCommander />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/email"
                    element={
                      <LazyPage>
                        <EmailBuilder />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/landing"
                    element={
                      <LazyPage>
                        <LandingPages />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/analytics"
                    element={
                      <LazyPage>
                        <MarketingAnalytics />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/ab-testing"
                    element={
                      <LazyPage>
                        <ABTesting />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/sequences"
                    element={
                      <LazyPage>
                        <MarketingSequences />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/blogs"
                    element={
                      <LazyPage>
                        <BlogManager />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/videos"
                    element={
                      <LazyPage>
                        <VideoProjects />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/competitors"
                    element={
                      <LazyPage>
                        <CompetitorAnalysis />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/ads"
                    element={
                      <LazyPage>
                        <AdsManager />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/calendar"
                    element={
                      <LazyPage>
                        <ContentCalendar />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/brand-voice"
                    element={
                      <LazyPage>
                        <BrandVoice />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/templates"
                    element={
                      <LazyPage>
                        <EmailTemplates />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/seo"
                    element={
                      <LazyPage>
                        <SEODashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/social-listening"
                    element={
                      <LazyPage>
                        <SocialListening />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/playbooks"
                    element={
                      <LazyPage>
                        <Playbooks />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/voice"
                    element={
                      <LazyPage>
                        <VoiceMarketing />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/marketing/autonomous"
                    element={
                      <LazyPage>
                        <AutonomousMarketing />
                      </LazyPage>
                    }
                  />

                  <Route
                    path="/marketing/video-studio"
                    element={
                      <LazyPage>
                        <VideoStudio />
                      </LazyPage>
                    }
                  />

                  {/* HR Module */}
                  <Route path="/hr" element={<Navigate to="/hr/dashboard" replace />} />
                  <Route
                    path="/hr/dashboard"
                    element={
                      <LazyPage>
                        <HRDashboardOverview />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/employees"
                    element={
                      <LazyPage>
                        <EmployeesPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/employees/:id"
                    element={
                      <LazyPage>
                        <EmployeeProfilePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/attendance"
                    element={
                      <LazyPage>
                        <AttendancePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/leave"
                    element={
                      <LazyPage>
                        <LeaveManagementPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/payroll"
                    element={
                      <LazyPage>
                        <PayrollPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/departments"
                    element={
                      <LazyPage>
                        <DepartmentsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/performance"
                    element={
                      <LazyPage>
                        <PerformancePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/training"
                    element={
                      <LazyPage>
                        <TrainingPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/recruitment"
                    element={
                      <LazyPage>
                        <RecruitmentPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/recruitment-dashboard"
                    element={
                      <LazyPage>
                        <HRRecruitmentDash />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/documents"
                    element={
                      <LazyPage>
                        <HRDocumentsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/compliance"
                    element={
                      <LazyPage>
                        <CompliancePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/reports"
                    element={
                      <LazyPage>
                        <HRReportsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/ai-assistant"
                    element={
                      <LazyPage>
                        <HRAIAssistantPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/shifts"
                    element={
                      <LazyPage>
                        <ShiftsPage />
                      </LazyPage>
                    }
                  />

                  <Route
                    path="/hr/ai-agents"
                    element={
                      <LazyPage>
                        <AIAgentsPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/ai-agents/hire"
                    element={
                      <LazyPage>
                        <AIAgentHirePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/ai-agents/:id"
                    element={
                      <LazyPage>
                        <AIAgentProfilePage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/hr/ai-agents/analytics"
                    element={
                      <LazyPage>
                        <AIAgentAnalyticsPage />
                      </LazyPage>
                    }
                  />

                  {/* Operations Module */}
                  <Route path="/operations" element={<Navigate to="/operations/inventory" replace />} />
                  <Route
                    path="/operations/inventory"
                    element={
                      <LazyPage>
                        <Inventory />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/orders"
                    element={
                      <LazyPage>
                        <Orders />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/vendors"
                    element={
                      <LazyPage>
                        <Vendors />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/expenses"
                    element={
                      <LazyPage>
                        <Expenses />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/invoices"
                    element={
                      <LazyPage>
                        <Invoices />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/kitchen-display"
                    element={
                      <LazyPage>
                        <KitchenDisplay />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/menu"
                    element={
                      <LazyPage>
                        <MenuEditor />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/reservations"
                    element={
                      <LazyPage>
                        <Reservations />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/operations/ai-intelligence"
                    element={
                      <LazyPage>
                        <AiIntelligence />
                      </LazyPage>
                    }
                  />

                  {/* Collections Module */}
                  <Route path="/collections" element={<Navigate to="/collections/dashboard" replace />} />
                  <Route
                    path="/collections/dashboard"
                    element={
                      <LazyPage>
                        <CollectionsDashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/collections/ptp"
                    element={
                      <LazyPage>
                        <PTTracker />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/collections/settlements"
                    element={
                      <LazyPage>
                        <SettlementTracker />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/collections/kpis"
                    element={
                      <LazyPage>
                        <AgentKPIs />
                      </LazyPage>
                    }
                  />

                  {/* Clinic Module */}
                  <Route path="/clinic" element={<Navigate to="/clinic/dashboard" replace />} />
                  <Route
                    path="/clinic/dashboard"
                    element={
                      <LazyPage>
                        <ClinicDashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/patients"
                    element={
                      <LazyPage>
                        <ClinicPatients />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/treatments"
                    element={
                      <LazyPage>
                        <ClinicTreatments />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/products"
                    element={
                      <LazyPage>
                        <ClinicProducts />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/consultations"
                    element={
                      <LazyPage>
                        <ConsultationNotes />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/health-reports"
                    element={
                      <LazyPage>
                        <HealthReports />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/clinic/review-queue"
                    element={
                      <LazyPage>
                        <DoctorReviewQueue />
                      </LazyPage>
                    }
                  />

                  {/* Estimation Module */}
                  <Route path="/estimation" element={<Navigate to="/estimation/projects" replace />} />
                  <Route path="/estimation/projects" element={<LazyPage><EstimationProjects /></LazyPage>} />
                  <Route path="/estimation/projects/:id" element={<LazyPage><EstimationProjectDetail /></LazyPage>} />
                  <Route path="/estimation/takeoffs" element={<LazyPage><EstimationTakeoffs /></LazyPage>} />
                  <Route path="/estimation/materials" element={<LazyPage><EstimationMaterials /></LazyPage>} />
                  <Route path="/estimation/team" element={<LazyPage><EstimationTeam /></LazyPage>} />
                  <Route path="/estimation/rfis" element={<LazyPage><EstimationRFIs /></LazyPage>} />
                  <Route path="/estimation/reports" element={<LazyPage><EstimationReports /></LazyPage>} />
                  <Route path="/estimation/approval" element={<LazyPage><EstimationApprovalQueue /></LazyPage>} />

                  {/* Real Estate Module */}
                  <Route path="/realestate" element={<LazyPage><RealEstateDashboard /></LazyPage>} />
                  <Route path="/realestate/listings" element={<LazyPage><PropertyListings /></LazyPage>} />
                  <Route path="/realestate/clients" element={<LazyPage><REClientManagement /></LazyPage>} />
                  <Route path="/realestate/viewings" element={<LazyPage><ViewingCalendar /></LazyPage>} />
                  <Route path="/realestate/deals" element={<LazyPage><DealPipeline /></LazyPage>} />
                  <Route path="/realestate/eoi" element={<LazyPage><EOITracker /></LazyPage>} />
                  <Route path="/realestate/road-shows" element={<LazyPage><RoadShowManager /></LazyPage>} />
                  <Route path="/realestate/calculator" element={<LazyPage><InvestmentCalculator /></LazyPage>} />
                  <Route path="/realestate/market" element={<LazyPage><MarketIntelligence /></LazyPage>} />
                  <Route path="/realestate/regions" element={<LazyPage><RegionSettings /></LazyPage>} />
                  <Route path="/realestate/advisor" element={<LazyPage><DealAdvisor /></LazyPage>} />
                  <Route path="/realestate/knowledge" element={<LazyPage><REKnowledgeBase /></LazyPage>} />
                  <Route path="/realestate/pricing" element={<LazyPage><PricePrediction /></LazyPage>} />
                  <Route path="/realestate/agent-performance" element={<LazyPage><AgentPerformance /></LazyPage>} />
                  <Route path="/realestate/lead-scoring" element={<LazyPage><LeadScoring /></LazyPage>} />
                  <Route path="/realestate/offplan" element={<LazyPage><OffPlanExplorer /></LazyPage>} />
                  <Route path="/realestate/mortgage-calculator" element={<LazyPage><REMortgageCalculator /></LazyPage>} />
                  <Route path="/realestate/deal-orchestrator" element={<LazyPage><DealOrchestrator /></LazyPage>} />
                  <Route path="/realestate/market-forecasts" element={<LazyPage><MarketForecasts /></LazyPage>} />
                  <Route path="/realestate/whatsapp-journeys" element={<LazyPage><WhatsAppJourneys /></LazyPage>} />
                  <Route path="/realestate/investor-portfolio" element={<LazyPage><InvestorPortfolio /></LazyPage>} />
                  <Route path="/realestate/developer-api" element={<LazyPage><DeveloperPortal /></LazyPage>} />
                  {/* CrossBorderAdvisor route removed - module not found */}

                  {/* Communications Module */}
                  <Route path="/communications" element={<Navigate to="/communications/voice-ai" replace />} />
                  <Route
                    path="/communications/voice-ai"
                    element={
                      <LazyPage>
                        <VoiceAIHub />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/communications/whatsapp"
                    element={
                      <LazyPage>
                        <WhatsAppHub />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/communications/email"
                    element={
                      <LazyPage>
                        <EmailHub />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/communications/sms"
                    element={
                      <LazyPage>
                        <SMSHub />
                      </LazyPage>
                    }
                  />
                  {/* Redirects for old voice routes */}
                  <Route path="/communications/voice" element={<Navigate to="/communications/voice-ai" replace />} />
                  <Route path="/communications/voice-calls" element={<Navigate to="/communications/voice-ai?tab=calls" replace />} />
                  <Route path="/communications/call-center" element={<Navigate to="/communications/voice-ai?tab=center" replace />} />
                  <Route path="/communications/ivr" element={<Navigate to="/communications/voice-ai?tab=ivr" replace />} />

                  {/* Analytics Module */}
                  <Route
                    path="/analytics"
                    element={
                      <LazyPage>
                        <AnalyticsHub />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/analytics/realtime"
                    element={
                      <LazyPage>
                        <RealtimeDashboard />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/analytics/reports"
                    element={
                      <LazyPage>
                        <CustomReports />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/analytics/ai-insights"
                    element={
                      <LazyPage>
                        <AIInsights />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/analytics/predictions"
                    element={
                      <LazyPage>
                        <Predictions />
                      </LazyPage>
                    }
                  />

                  {/* Intelligence */}
                  <Route
                    path="/intelligence"
                    element={
                      <LazyPage>
                        <Intelligence />
                      </LazyPage>
                    }
                  />

                  {/* OMEGA Command Center */}
                  <Route
                    path="/omega"
                    element={
                      <LazyPage>
                        <OmegaCommandCenter />
                      </LazyPage>
                    }
                  />
                  {/* Settings Module */}
                  <Route
                    path="/settings"
                    element={
                      <LazyPage>
                        <GeneralSettings />
                      </LazyPage>
                    }
                  />
                  <Route path="/settings/voice-ai" element={<Navigate to="/communications/voice-ai?tab=config" replace />} />
                  <Route
                    path="/settings/integrations"
                    element={
                      <LazyPage>
                        <Integrations />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/api-keys"
                    element={
                      <LazyPage>
                        <APIKeys />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/team"
                    element={
                      <LazyPage>
                        <TeamSettings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/billing"
                    element={
                      <LazyPage>
                        <BillingSettings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/notifications"
                    element={
                      <LazyPage>
                        <NotificationSettings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/knowledge-base"
                    element={
                      <LazyPage>
                        <KnowledgeBaseSettings />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="/settings/outreach"
                    element={
                      <LazyPage>
                        <OutreachSettings />
                      </LazyPage>
                    }
                  />
                  <Route path="/settings/phone-numbers" element={<Navigate to="/communications/voice-ai?tab=phones" replace />} />

                  {/* Admin Module - ONLY for master_admin role */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <AdminPanel />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/tenants"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <AllTenants />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <AdminUsers />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/health"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <SystemHealth />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/logs"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <AuditLogs />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/features"
                    element={
                      <ProtectedRoute requiredRole="master_admin">
                        <LazyPage>
                          <FeatureFlags />
                        </LazyPage>
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Catch-all */}
                <Route
                  path="*"
                  element={
                    <LazyPage>
                      <NotFound />
                    </LazyPage>
                  }
                />
              </Routes>
            </BrowserRouter>
          </SubscriptionProvider>
        </AuthProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
