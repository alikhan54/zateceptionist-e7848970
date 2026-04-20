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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["employees", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      // Try with department join first
      const { data, error } = await supabase
        .from("hr_employees")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!tenantUuid,
  });

  const createEmployee = useMutation({
    mutationFn: async (employeeData: Partial<Employee>) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.EMPLOYEE_ONBOARDING, employeeData, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
      toast.success("Employee added successfully");
    },
    onError: () => toast.error("Failed to add employee"),
  });

  const updateEmployee = useMutation({
    mutationFn: async (data: Partial<Employee> & { id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.UPDATE_EMPLOYEE, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
      toast.success("Employee updated successfully");
    },
    onError: () => toast.error("Failed to update employee"),
  });

  const terminateEmployee = useMutation({
    mutationFn: async (data: { id: string; reason?: string; effective_date?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.TERMINATE_EMPLOYEE, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const targetDate = date || new Date().toISOString().split("T")[0];

  const query = useQuery({
    queryKey: ["attendance", tenantUuid, targetDate],
    queryFn: async () => {
      if (!tenantUuid)
        return { records: [] as AttendanceRecord[], summary: { present: 0, absent: 0, late: 0, on_leave: 0 } };

      const { data, error } = await supabase
        .from("hr_attendance")
        .select("*")
        .eq("tenant_id", tenantUuid)
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
    enabled: !!tenantUuid,
  });

  const checkIn = useMutation({
    mutationFn: async (data: { employee_id: string; location?: { lat: number; lng: number } }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_IN, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", tenantUuid] });
      toast.success("Checked in successfully");
    },
    onError: () => toast.error("Failed to check in"),
  });

  const checkOut = useMutation({
    mutationFn: async (data: { employee_id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_OUT, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", tenantUuid] });
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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ["leave-balance", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase.from("hr_leave_balances").select("*").eq("tenant_id", tenantUuid);
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        leave_type_name: b.leave_type_name || b.leave_type_id,
        remaining: (b.total_entitled || 0) - (b.used || 0) - (b.pending || 0),
      })) as LeaveBalance[];
    },
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════

export function useLeaveRequests(status?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leave-requests", tenantUuid, status],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let q = supabase
        .from("hr_leave_requests")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LeaveRequest[];
    },
    enabled: !!tenantUuid,
  });

  const requestLeave = useMutation({
    mutationFn: async (data: {
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
      is_half_day?: boolean;
    }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.LEAVE_REQUEST, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantUuid] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", tenantUuid] });
      toast.success("Leave request submitted");
    },
    onError: () => toast.error("Failed to submit leave request"),
  });

  const approveLeave = useMutation({
    mutationFn: async (data: { leave_id: string; action: "approve" | "reject"; comments?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhook(WEBHOOKS.LEAVE_APPROVE, data, tenantUuid);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantUuid] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", tenantUuid] });
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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["departments", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase.from("hr_departments").select("*").eq("tenant_id", tenantUuid).order("name");
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!tenantUuid,
  });

  const createDepartment = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_departments")
        .insert({ ...dept, tenant_id: tenantUuid })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantUuid] });
      toast.success("Department created");
    },
    onError: () => toast.error("Failed to create department"),
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Department> & { id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_departments")
        .update(changes)
        .eq("id", id)
        .eq("tenant_id", tenantUuid)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantUuid] });
      toast.success("Department updated");
    },
    onError: () => toast.error("Failed to update department"),
  });

  return { ...query, createDepartment, updateDepartment };
}

// ═══════════════════════════════════════════════════════════
// PERFORMANCE — Returns { reviews, goals } to match existing usage
// Performance.tsx uses: const { data } = usePerformance()
//                       data.reviews, data.goals
// ═══════════════════════════════════════════════════════════

export function usePerformance() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["performance", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { reviews: [] as PerformanceReview[], goals: [] as Goal[], activeCycle: null };

      const [reviewsRes, goalsRes] = await Promise.all([
        supabase
          .from("hr_performance_reviews")
          .select("*")
          .eq("tenant_id", tenantUuid)
          .order("created_at", { ascending: false }),
        supabase.from("hr_goals").select("*").eq("tenant_id", tenantUuid).order("created_at", { ascending: false }),
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
    enabled: !!tenantUuid,
  });

  const createReview = useMutation({
    mutationFn: async (review: { employee_id: string; employee_name?: string; review_type?: string; review_period_start?: string; review_period_end?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_performance_reviews")
        .insert({ ...review, tenant_id: tenantUuid, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", tenantUuid] });
      toast.success("Review created");
    },
    onError: () => toast.error("Failed to create review"),
  });

  const createGoal = useMutation({
    mutationFn: async (goal: { title: string; employee_id?: string; description?: string; category?: string; target_date?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_goals")
        .insert({ ...goal, tenant_id: tenantUuid, progress_percent: 0, status: 'not_started' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", tenantUuid] });
      toast.success("Goal created");
    },
    onError: () => toast.error("Failed to create goal"),
  });

  return { ...query, createReview, createGoal };
}

// ═══════════════════════════════════════════════════════════
// TRAINING — Returns { programs, enrollments, enroll } object
// Training.tsx uses: const { programs, enrollments, enroll } = useTraining()
// ═══════════════════════════════════════════════════════════

export function useTraining() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const programs = useQuery({
    queryKey: ["training-programs", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("hr_training_programs")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrainingProgram[];
    },
    enabled: !!tenantUuid,
  });

  const enrollments = useQuery({
    queryKey: ["training-enrollments", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("hr_training_records")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TrainingEnrollment[];
    },
    enabled: !!tenantUuid,
  });

  const enroll = useMutation({
    mutationFn: async (data: { program_id: string; employee_id?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_training_records")
        .insert({
          tenant_id: tenantUuid,
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
      queryClient.invalidateQueries({ queryKey: ["training-enrollments", tenantUuid] });
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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["hr-documents", tenantUuid, category],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let q = supabase
        .from("hr_documents")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (category && category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as HRDocument[];
    },
    enabled: !!tenantUuid,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: Partial<HRDocument>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_documents")
        .insert({ ...doc, tenant_id: tenantUuid })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-documents", tenantUuid] });
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
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ["payroll", tenantUuid, period],
    queryFn: async () => {
      if (!tenantUuid)
        return { employees: [], summary: { total_payroll: 0, total_employees: 0, avg_salary: 0, total_deductions: 0 } };

      const { data: employees, error } = await supabase
        .from("hr_employees")
        .select(
          "id, first_name, last_name, full_name, salary, salary_currency, department_id, position, employment_status, employment_type",
        )
        .eq("tenant_id", tenantUuid)
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
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// ADDITIONAL HOOKS — New capabilities not in old file
// ═══════════════════════════════════════════════════════════

export function useAnnouncements() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["announcements", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("hr_announcements")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return []; // Table might not exist yet
      return data || [];
    },
    enabled: !!tenantUuid,
  });
}

export function useAuditLogs(limit = 20) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["audit-logs", tenantUuid, limit],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("hr_audit_logs")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantUuid,
  });
}

export function useAssets(employeeId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["hr-assets", tenantUuid, employeeId],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let q = supabase
        .from("hr_asset_assignments")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantUuid,
  });
}

export function useExpenseClaims(employeeId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["expense-claims", tenantUuid, employeeId],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let q = supabase
        .from("hr_expense_claims")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantUuid,
  });
}

export function useComplianceData() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["compliance-data", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { visaAlerts: [], wpsStatus: [], emiratisationRate: 0, totalEmployees: 0, uaeNationals: 0, medicalStatus: [], laborCardAlerts: [] };

      const { data: employees } = await supabase
        .from("hr_employees")
        .select(
          "id, first_name, last_name, full_name, nationality, visa_status, visa_expiry_date, labor_card_number, labor_card_expiry, bank_name, iban_number, medical_insurance_provider, medical_insurance_expiry, work_permit_number, work_permit_expiry, employment_status",
        )
        .eq("tenant_id", tenantUuid)
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

      const medicalStatus = emps.map((e: any) => ({
        id: e.id,
        name: e.full_name || `${e.first_name} ${e.last_name}`,
        provider: e.medical_insurance_provider,
        expiry: e.medical_insurance_expiry,
        has_insurance: !!e.medical_insurance_provider,
        days_until_expiry: e.medical_insurance_expiry
          ? Math.floor((new Date(e.medical_insurance_expiry).getTime() - now) / 86400000)
          : null,
      }));

      const laborCardAlerts = emps
        .filter((e: any) => e.labor_card_expiry)
        .map((e: any) => ({
          id: e.id,
          name: e.full_name || `${e.first_name} ${e.last_name}`,
          labor_card_number: e.labor_card_number,
          labor_card_expiry: e.labor_card_expiry,
          nationality: e.nationality,
          days_until_lc_expiry: Math.floor((new Date(e.labor_card_expiry).getTime() - now) / 86400000),
        }))
        .sort((a: any, b: any) => a.days_until_lc_expiry - b.days_until_lc_expiry);

      return {
        visaAlerts,
        wpsStatus,
        emiratisationRate,
        totalEmployees: emps.length,
        uaeNationals: uaeNationals.length,
        medicalStatus,
        laborCardAlerts,
      };
    },
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// HR AI ASSISTANT — Calls webhook for AI chat
// ═══════════════════════════════════════════════════════════

export function useHRAI() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const sendMessage = async (message: string, context?: { channel?: string; employee_id?: string }) => {
    if (!tenantUuid) return { success: false, error: "No tenant" };
    return callWebhook(WEBHOOKS.HR_AI_ASSISTANT, { query: message, ...context }, tenantUuid);
  };

  return { sendMessage };
}

// ═══════════════════════════════════════════════════════════
// HR REPORTS — Provides fetchReport for Reports page
// ═══════════════════════════════════════════════════════════

export function useHRReports() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const fetchReport = async (reportType: string, filters?: Record<string, any>) => {
    if (!tenantUuid) return null;
    const result = await callWebhook(WEBHOOKS.HR_REPORTS, { type: reportType, ...filters }, tenantUuid);
    return result?.data || null;
  };

  return { fetchReport };
}

// ═══════════════════════════════════════════════════════════
// SHIFTS — Computed from employees + attendance data
// ═══════════════════════════════════════════════════════════

export interface Shift {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name?: string;
  date: string;
  shift_type: 'morning' | 'afternoon' | 'night' | 'off';
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'absent';
}

export function useShifts(weekStart: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ["shifts", tenantUuid, weekStart],
    queryFn: async () => {
      if (!tenantUuid) return [];

      // Get active employees
      const { data: employees } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, full_name, department_name, employment_type")
        .eq("tenant_id", tenantUuid)
        .eq("employment_status", "active");

      if (!employees?.length) return [];

      // Get attendance for the week (7 days from weekStart)
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString().split("T")[0];

      const { data: attendance } = await supabase
        .from("hr_attendance")
        .select("employee_id, work_date, check_in_time, check_out_time, status")
        .eq("tenant_id", tenantUuid)
        .gte("work_date", weekStart)
        .lte("work_date", endStr);

      const attendanceMap = new Map<string, any>();
      (attendance || []).forEach((a: any) => {
        attendanceMap.set(`${a.employee_id}_${a.work_date}`, a);
      });

      // Build shift grid: each employee × each day of the week
      const shifts: Shift[] = [];
      for (const emp of employees) {
        for (let d = 0; d < 7; d++) {
          const date = new Date(start);
          date.setDate(date.getDate() + d);
          const dateStr = date.toISOString().split("T")[0];
          const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri+Sat for UAE

          const att = attendanceMap.get(`${emp.id}_${dateStr}`);
          const name = emp.full_name || `${emp.first_name} ${emp.last_name}`;

          let shift_type: Shift['shift_type'] = isWeekend ? 'off' : 'morning';
          let start_time = '09:00';
          let end_time = '18:00';
          let status: Shift['status'] = 'scheduled';

          if (att) {
            if (att.status === 'absent') {
              status = 'absent';
            } else if (att.check_out_time) {
              status = 'completed';
            } else if (att.check_in_time) {
              status = 'checked_in';
            }
            if (att.check_in_time) start_time = att.check_in_time.substring(0, 5);
            if (att.check_out_time) end_time = att.check_out_time.substring(0, 5);
          }

          if (isWeekend) {
            start_time = '-';
            end_time = '-';
            status = 'scheduled';
          }

          shifts.push({
            id: `${emp.id}_${dateStr}`,
            employee_id: emp.id,
            employee_name: name,
            department_name: emp.department_name,
            date: dateStr,
            shift_type,
            start_time,
            end_time,
            status,
          });
        }
      }
      return shifts;
    },
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// ATTRITION RISK — Computed from employee tenure + leave patterns
// ═══════════════════════════════════════════════════════════

export interface AttritionRisk {
  employee_id: string;
  employee_name: string;
  department: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  factors: string[];
}

export function useAttritionRisk() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ["attrition-risk", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { employees: [] as AttritionRisk[], summary: { high: 0, medium: 0, low: 0 } };

      const { data: employees } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, full_name, department_name, date_of_joining, employment_status, salary, employment_type")
        .eq("tenant_id", tenantUuid)
        .eq("employment_status", "active");

      const { data: leaveRequests } = await supabase
        .from("hr_leave_requests")
        .select("employee_id, leave_type, status, created_at")
        .eq("tenant_id", tenantUuid)
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString());

      const emps = employees || [];
      const leaves = leaveRequests || [];
      const now = Date.now();

      const leaveCountByEmp = new Map<string, number>();
      leaves.forEach((l: any) => {
        leaveCountByEmp.set(l.employee_id, (leaveCountByEmp.get(l.employee_id) || 0) + 1);
      });

      const risks: AttritionRisk[] = emps.map((emp: any) => {
        const factors: string[] = [];
        let score = 0;

        // Tenure factor: 1-2 years = medium risk, <1 year = high risk for turnover
        if (emp.date_of_joining) {
          const tenureMonths = Math.floor((now - new Date(emp.date_of_joining).getTime()) / (30 * 86400000));
          if (tenureMonths <= 6) { score += 15; factors.push('New hire (<6 months)'); }
          else if (tenureMonths > 24 && tenureMonths <= 36) { score += 10; factors.push('2-3 year tenure (common exit window)'); }
        }

        // Leave frequency
        const leaveCount = leaveCountByEmp.get(emp.id) || 0;
        if (leaveCount >= 5) { score += 25; factors.push(`${leaveCount} leave requests in 90 days`); }
        else if (leaveCount >= 3) { score += 15; factors.push(`${leaveCount} leave requests in 90 days`); }

        // No salary data = possible dissatisfaction signal
        if (!emp.salary || emp.salary === 0) { score += 10; factors.push('No salary on record'); }

        // Part-time/contract = higher natural turnover
        if (emp.employment_type === 'Contract') { score += 20; factors.push('Contract employee'); }
        else if (emp.employment_type === 'Intern') { score += 25; factors.push('Intern role'); }

        const risk_level = score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
        const name = emp.full_name || `${emp.first_name} ${emp.last_name}`;

        return { employee_id: emp.id, employee_name: name, department: emp.department_name || 'Unassigned', risk_level, risk_score: Math.min(score, 100), factors };
      });

      const summary = {
        high: risks.filter(r => r.risk_level === 'high').length,
        medium: risks.filter(r => r.risk_level === 'medium').length,
        low: risks.filter(r => r.risk_level === 'low').length,
      };

      return { employees: risks.sort((a, b) => b.risk_score - a.risk_score), summary };
    },
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// COMPENSATION OVERVIEW — Aggregated salary stats
// ═══════════════════════════════════════════════════════════

export interface CompensationStats {
  totalPayroll: number;
  avgSalary: number;
  medianSalary: number;
  currency: string;
  byDepartment: { department: string; avg: number; count: number; total: number }[];
  byType: { type: string; avg: number; count: number }[];
}

export function useCompensationOverview() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ["compensation-overview", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return null;

      const { data: employees } = await supabase
        .from("hr_employees")
        .select("salary, salary_currency, department_name, employment_type, employment_status")
        .eq("tenant_id", tenantUuid)
        .eq("employment_status", "active");

      const emps = (employees || []).filter((e: any) => e.salary && e.salary > 0);
      if (emps.length === 0) return null;

      const salaries = emps.map((e: any) => e.salary).sort((a: number, b: number) => a - b);
      const totalPayroll = salaries.reduce((s: number, v: number) => s + v, 0);
      const medianSalary = salaries.length % 2 === 0
        ? (salaries[salaries.length / 2 - 1] + salaries[salaries.length / 2]) / 2
        : salaries[Math.floor(salaries.length / 2)];

      // Group by department
      const deptMap = new Map<string, number[]>();
      emps.forEach((e: any) => {
        const dept = e.department_name || 'Unassigned';
        if (!deptMap.has(dept)) deptMap.set(dept, []);
        deptMap.get(dept)!.push(e.salary);
      });
      const byDepartment = Array.from(deptMap.entries()).map(([department, sals]) => ({
        department,
        avg: Math.round(sals.reduce((s, v) => s + v, 0) / sals.length),
        count: sals.length,
        total: sals.reduce((s, v) => s + v, 0),
      })).sort((a, b) => b.total - a.total);

      // Group by employment type
      const typeMap = new Map<string, number[]>();
      emps.forEach((e: any) => {
        const type = e.employment_type || 'Full-time';
        if (!typeMap.has(type)) typeMap.set(type, []);
        typeMap.get(type)!.push(e.salary);
      });
      const byType = Array.from(typeMap.entries()).map(([type, sals]) => ({
        type,
        avg: Math.round(sals.reduce((s, v) => s + v, 0) / sals.length),
        count: sals.length,
      }));

      return {
        totalPayroll,
        avgSalary: Math.round(totalPayroll / emps.length),
        medianSalary: Math.round(medianSalary),
        currency: emps[0]?.salary_currency || tenantConfig?.currency || '',
        byDepartment,
        byType,
      } as CompensationStats;
    },
    enabled: !!tenantUuid,
  });
}

// ═══════════════════════════════════════════════════════════
// SELF-SERVICE HOOKS — Employee sees own data, admin sees all
// ═══════════════════════════════════════════════════════════

export function useCurrentEmployee() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['current-employee', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;
      const { data } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, company_email, position, department, employment_status')
        .eq('tenant_id', tenantUuid)
        .eq('company_email', user.email)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantUuid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'staff';
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      return (data?.role as string) || 'staff';
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useIsHRAdmin() {
  const { data: role } = useUserRole();
  return ['master_admin', 'admin', 'manager'].includes(role || '');
}
