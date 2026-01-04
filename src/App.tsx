import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TenantProvider } from "@/contexts/TenantContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import LoginPage from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/Customers";
import InboxPage from "./pages/Inbox";
import AppointmentsPage from "./pages/Appointments";
import TasksPage from "./pages/Tasks";
import LeadsPage from "./pages/Leads";
import DealsPage from "./pages/Deals";
import SalesAutomationPage from "./pages/SalesAutomation";
import MarketingEnginePage from "./pages/MarketingEngine";
import HRDashboard from "./pages/hr/HRDashboard";
import EmployeesPage from "./pages/hr/Employees";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TenantProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/sales/*" element={<SalesAutomationPage />} />
                <Route path="/marketing" element={<MarketingEnginePage />} />
                <Route path="/marketing/*" element={<MarketingEnginePage />} />
                <Route path="/hr/dashboard" element={<HRDashboard />} />
                <Route path="/hr/employees" element={<EmployeesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
