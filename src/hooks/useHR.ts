import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook } from "@/lib/webhook";
import { WEBHOOKS } from "@/lib/api/webhooks";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Match actual Supabase column names
// ═══════════════════════════════════════════════════════════

export interface Employee {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  company_email?: string;
  personal_email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  job_title?: string;
  department_id?: string;
  department_name?: string;
  manager_id?: string;
  date_of_joining?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  salary?: number;
  salary_currency?: string;
  employment_type?: string;
  employment_status?: string;
  onboarding_status?: string;
  profile_picture_url?: string;
  national_id?: string;
  passport_number?: string;
  visa_status?: string;
  visa_expiry_date?: string;
  bank_name?: string;
  iban_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  labor_card_number?: string;
  labor_card_expiry?: string;
  medical_insurance_provider?: string;
  medical_insurance_expiry?: string;
  work_permit_number?: string;
  work_permit_expiry?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  work_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  work_hours?: number;
  overtime_hours?: number;
  status?: string;
  late_minutes?: number;
  location_check_in?: any;
  location_check_out?: any;
  notes?: string;
  created_at?: string;
}

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  leave_type?: string;
  leave_type_id?: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  requested_days?: number;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

export interface LeaveBalance {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id?: string;
  leave_type_name?: string;
  total_entitled: number;
  used: number;
  pending: number;
  remaining: number;
  year: number;
}

export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  code?: string;
  description?: string;
  manager_id?: string;
  manager_name?: string;
  parent_id?: string;
  employee_count?: number;
  budget?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface PerformanceReview {
  id: string;
  tenant_id?: string;
  employee_id: string;
  employee_name?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  review_type?: string;
  review_period_start?: string;
  review_period_end?: string;
  period?: string;
  status: string;
  overall_rating?: number;
  goals_rating?: number;
  competency_rating?: number;
  reviewer_comments?: string;
  employee_comments?: string;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: Goal[];
  created_at?: string;
}

export interface Goal {
  id: string;
  tenant_id?: string;
  employee_id?: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  progress_percent: number;
  progress?: number;
  status: string;
  created_at?: string;
}

export interface TrainingProgram {
  id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  provider?: string;
  duration_hours?: number;
  category?: string;
  format?: string;
  max_participants?: number;
  completion_rate?: number;
  enrolled_count?: number;
  status: string;
  created_at?: string;
}

export interface TrainingEnrollment {
  id: string;
  tenant_id?: string;
  employee_id: string;
  program_id?: string;
  program_title?: string;
  enrolled_at?: string;
  progress?: number;
  score?: number;
  status: string;
  completed_at?: string;
  certificate_url?: string;
}

export interface HRDocument {
  id: string;
  tenant_id?: string;
  employee_id?: string;
  title?: string;
  name?: string;
  document_type?: string;
  category?: string;
  file_url?: string;
  file_type?: string;
  status?: string;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  acknowledged?: boolean;
  version?: string;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEES
// Read: Direct Supabase | Mutations: Webhook (needs backend logic)
// ═══════════════════════════════════════════════════════════

export function useEmployees() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["employees", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      // Try with department join first
      const { data, error } = await supabase
        .from("hr_employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!tenantId,
  });

  const createEmployee = useMutation({
    mutationFn: async (employeeData: Partial<Employee>) => {
      return callWebhook(WEBHOOKS.EMPLOYEE_ONBOARDING, employeeData, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
      toast.success("Employee added successfully");
    },
    onError: () => toast.error("Failed to add employee"),
  });

  const updateEmployee = useMutation({
    mutationFn: async (data: Partial<Employee> & { id: string }) => {
      return callWebhook(WEBHOOKS.UPDATE_EMPLOYEE, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
      toast.success("Employee updated successfully");
    },
    onError: () => toast.error("Failed to update employee"),
  });

  const terminateEmployee = useMutation({
    mutationFn: async (data: { id: string; reason?: string; effective_date?: string }) => {
      return callWebhook(WEBHOOKS.TERMINATE_EMPLOYEE, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantId] });
      toast.success("Employee terminated");
    },
    onError: () => toast.error("Failed to terminate employee"),
  });

  return { ...query, createEmployee, updateEmployee, terminateEmployee };
}

// ═══════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════

export function useAttendance(date?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const targetDate = date || new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["attendance", tenantId, targetDate],
    queryFn: async () => {
      if (!tenantId)
        return { records: [] as AttendanceRecord[], summary: { present: 0, absent: 0, late: 0, on_leave: 0 } };

      const { data, error } = await supabase
        .from("hr_attendance")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("work_date", targetDate)
        .order("check_in_time", { ascending: false });

      if (error) throw error;
      const records = (data || []) as AttendanceRecord[];
      const summary = {
        present: records.filter(
          (r) => r.status === "present" || (r.check_in_time && r.status !== "late" && r.status !== "on_leave"),
        ).length,
        absent: records.filter((r) => r.status === "absent").length,
        late: records.filter((r) => r.status === "late" || (r.late_minutes && r.late_minutes > 0)).length,
        on_leave: records.filter((r) => r.status === "on_leave").length,
      };
      return { records, summary };
    },
    enabled: !!tenantId,
  });

  const checkIn = useMutation({
    mutationFn: async (data: { employee_id: string; location?: { lat: number; lng: number } }) =>
      callWebhook(WEBHOOKS.ATTENDANCE_CHECK_IN, data, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", tenantId] });
      toast.success("Checked in successfully");
    },
    onError: () => toast.error("Failed to check in"),
  });

  const checkOut = useMutation({
    mutationFn: async (data: { employee_id: string }) => callWebhook(WEBHOOKS.ATTENDANCE_CHECK_OUT, data, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", tenantId] });
      toast.success("Checked out successfully");
    },
    onError: () => toast.error("Failed to check out"),
  });

  return { ...query, checkIn, checkOut };
}

// ═══════════════════════════════════════════════════════════
// LEAVE BALANCE
// ═══════════════════════════════════════════════════════════

export function useLeaveBalance() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["leave-balance", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from("hr_leave_balances").select("*").eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        leave_type_name: b.leave_type_name || b.leave_type_id,
        remaining: (b.total_entitled || 0) - (b.used || 0) - (b.pending || 0),
      })) as LeaveBalance[];
    },
    enabled: !!tenantId,
  });
}

// ═══════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════

export function useLeaveRequests(status?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leave-requests", tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("hr_leave_requests")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LeaveRequest[];
    },
    enabled: !!tenantId,
  });

  const requestLeave = useMutation({
    mutationFn: async (data: {
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
      is_half_day?: boolean;
    }) => callWebhook(WEBHOOKS.LEAVE_REQUEST, data, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", tenantId] });
      toast.success("Leave request submitted");
    },
    onError: () => toast.error("Failed to submit leave request"),
  });

  const approveLeave = useMutation({
    mutationFn: async (data: { leave_id: string; action: "approve" | "reject"; comments?: string }) =>
      callWebhook(WEBHOOKS.LEAVE_APPROVE, data, tenantId!),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", tenantId] });
      toast.success(`Leave ${vars.action}d`);
    },
    onError: () => toast.error("Failed to process leave"),
  });

  return { ...query, requestLeave, approveLeave };
}

// ═══════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════

export function useDepartments() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from("hr_departments").select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!tenantId,
  });

  const createDepartment = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      const { data: result, error } = await supabase
        .from("hr_departments")
        .insert({ ...dept, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantId] });
      toast.success("Department created");
    },
    onError: () => toast.error("Failed to create department"),
  });

  return { ...query, createDepartment };
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE — Returns { reviews, goals } to match existing usage
// Performance.tsx uses: const { data } = usePerformance()
//                       data.reviews, data.goals
// ═══════════════════════════════════════════════════════════

export function usePerformance() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["performance", tenantId],
    queryFn: async () => {
      if (!tenantId) return { reviews: [] as PerformanceReview[], goals: [] as Goal[], activeCycle: null };

      const [reviewsRes, goalsRes] = await Promise.all([
        supabase
          .from("hr_performance_reviews")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase.from("hr_goals").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      ]);

      return {
        reviews: (reviewsRes.data || []) as PerformanceReview[],
        goals: (goalsRes.data || []).map((g: any) => ({
          ...g,
          progress_percent: g.progress_percent ?? g.progress ?? 0,
        })) as Goal[],
        activeCycle: null,
      };
    },
    enabled: !!tenantId,
  });
}

// ═══════════════════════════════════════════════════════════
// TRAINING — Returns { programs, enrollments, enroll } object
// Training.tsx uses: const { programs, enrollments, enroll } = useTraining()
// ═══════════════════════════════════════════════════════════

export function useTraining() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const programs = useQuery({
    queryKey: ["training-programs", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("hr_training_programs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrainingProgram[];
    },
    enabled: !!tenantId,
  });

  const enrollments = useQuery({
    queryKey: ["training-enrollments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("hr_training_records")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrainingEnrollment[];
    },
    enabled: !!tenantId,
  });

  const enroll = useMutation({
    mutationFn: async (data: { program_id: string; employee_id?: string }) => {
      const { data: result, error } = await supabase
        .from("hr_training_records")
        .insert({
          tenant_id: tenantId,
          program_id: data.program_id,
          employee_id: data.employee_id || "current",
          status: "enrolled",
          progress: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-enrollments", tenantId] });
      toast.success("Enrolled successfully");
    },
    onError: () => toast.error("Failed to enroll"),
  });

  return { programs, enrollments, enroll };
}

// ═══════════════════════════════════════════════════════════
// DOCUMENTS — Returns query + upload mutation
// Documents.tsx uses: const { data, isLoading, uploadDocument } = useHRDocuments()
// ═══════════════════════════════════════════════════════════

export function useHRDocuments(category?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["hr-documents", tenantId, category],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("hr_documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (category && category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as HRDocument[];
    },
    enabled: !!tenantId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: Partial<HRDocument>) => {
      const { data: result, error } = await supabase
        .from("hr_documents")
        .insert({ ...doc, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-documents", tenantId] });
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Failed to upload document"),
  });

  return { ...query, uploadDocument };
}

// ═══════════════════════════════════════════════════════════
// PAYROLL — Returns { employees, summary } object
// Payroll.tsx uses: const { data, isLoading } = usePayroll()
//                   data.summary.total_payroll, data.summary.avg_salary, etc.
// ═══════════════════════════════════════════════════════════

export function usePayroll(period?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["payroll", tenantId, period],
    queryFn: async () => {
      if (!tenantId)
        return { employees: [], summary: { total_payroll: 0, total_employees: 0, avg_salary: 0, total_deductions: 0 } };

      const { data: employees, error } = await supabase
        .from("hr_employees")
        .select(
          "id, first_name, last_name, full_name, salary, salary_currency, department_id, position, employment_status, employment_type",
        )
        .eq("tenant_id", tenantId)
        .eq("employment_status", "active");

      if (error) throw error;
      const emps = employees || [];
      const totalPayroll = emps.reduce((sum: number, e: any) => sum + (e.salary || 0), 0);

      return {
        employees: emps,
        summary: {
          total_payroll: totalPayroll,
          total_employees: emps.length,
          avg_salary: emps.length > 0 ? Math.round(totalPayroll / emps.length) : 0,
          total_deductions: 0,
        },
      };
    },
    enabled: !!tenantId,
  });
}

// ═══════════════════════════════════════════════════════════
// ADDITIONAL HOOKS — New capabilities not in old file
// ═══════════════════════════════════════════════════════════

export function useAnnouncements() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["announcements", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("hr_announcements")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return []; // Table might not exist yet
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useAuditLogs(limit = 20) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["audit-logs", tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("hr_audit_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useAssets(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hr-assets", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("hr_asset_assignments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useExpenseClaims(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["expense-claims", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("hr_expense_claims")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useComplianceData() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance-data", tenantId],
    queryFn: async () => {
      if (!tenantId) return { visaAlerts: [], wpsStatus: [], emiratisationRate: 0 };

      const { data: employees } = await supabase
        .from("hr_employees")
        .select(
          "id, first_name, last_name, full_name, nationality, visa_status, visa_expiry_date, labor_card_number, labor_card_expiry, bank_name, iban_number, medical_insurance_provider, medical_insurance_expiry, work_permit_number, work_permit_expiry, employment_status",
        )
        .eq("tenant_id", tenantId)
        .eq("employment_status", "active");

      const emps = employees || [];
      const now = Date.now();

      const visaAlerts = emps
        .filter((e: any) => e.visa_expiry_date)
        .map((e: any) => ({
          ...e,
          days_until_expiry: Math.floor((new Date(e.visa_expiry_date).getTime() - now) / 86400000),
        }))
        .filter((e: any) => e.days_until_expiry <= 90)
        .sort((a: any, b: any) => a.days_until_expiry - b.days_until_expiry);

      const wpsStatus = emps.map((e: any) => ({
        id: e.id,
        name: e.full_name || `${e.first_name} ${e.last_name}`,
        has_bank: !!(e.bank_name && e.iban_number),
        bank_name: e.bank_name,
        iban: e.iban_number,
      }));

      const uaeNationals = emps.filter(
        (e: any) =>
          e.nationality && (e.nationality.toLowerCase().includes("emirati") || e.nationality.toLowerCase() === "uae"),
      );
      const emiratisationRate = emps.length > 0 ? Math.round((uaeNationals.length / emps.length) * 100) : 0;

      return {
        visaAlerts,
        wpsStatus,
        emiratisationRate,
        totalEmployees: emps.length,
        uaeNationals: uaeNationals.length,
      };
    },
    enabled: !!tenantId,
  });
}

// ═══════════════════════════════════════════════════════════
// HR AI ASSISTANT — Calls webhook for AI chat
// ═══════════════════════════════════════════════════════════

export function useHRAI() {
  const { tenantId } = useTenant();

  const sendMessage = async (message: string, context?: { channel?: string; employee_id?: string }) => {
    if (!tenantId) return { success: false, error: "No tenant" };
    return callWebhook(WEBHOOKS.HR_AI_ASSISTANT, { query: message, ...context }, tenantId);
  };

  return { sendMessage };
}

// ═══════════════════════════════════════════════════════════
// HR REPORTS — Provides fetchReport for Reports page
// ═══════════════════════════════════════════════════════════

export function useHRReports() {
  const { tenantId } = useTenant();

  const fetchReport = async (reportType: string, filters?: Record<string, any>) => {
    if (!tenantId) return null;
    const result = await callWebhook(WEBHOOKS.HR_REPORTS, { type: reportType, ...filters }, tenantId);
    return result?.data || null;
  };

  return { fetchReport };
}
