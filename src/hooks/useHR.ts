import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook } from "@/lib/webhook";
import { WEBHOOKS, callWebhookOrThrow } from "@/lib/api/webhooks";
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
  department?: string;
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
  file_size?: number;
  document_name?: string;
  document_content?: string;
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
      return callWebhookOrThrow(WEBHOOKS.EMPLOYEE_ONBOARDING, employeeData, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
      toast.success("Employee added successfully");
    },
    onError: (e: any) => toast.error(`Failed to add employee: ${e?.message || 'unknown error'}`),
  });

  // V7: DIRECT supabase update (the /hr/employee/update webhook was unreliable — queue
  // backlog Bug #96 — AND the dialog sent `department_name`, which is NOT a column).
  // Whitelist real hr_employees columns; surface the REAL error.
  const EMP_UPDATABLE = ['first_name', 'last_name', 'company_email', 'phone', 'position',
    'employment_type', 'salary', 'employment_status', 'department', 'department_id',
    'date_of_birth', 'date_of_joining'];
  const updateEmployee = useMutation({
    mutationFn: async (data: any) => {
      if (!tenantUuid) throw new Error('No tenant');
      if (!data?.id) throw new Error('Missing employee id');
      const payload: any = { updated_at: new Date().toISOString() };
      for (const k of EMP_UPDATABLE) if (data[k] !== undefined) payload[k] = data[k];
      const { data: result, error } = await supabase
        .from('hr_employees')
        .update(payload)
        .eq('id', data.id)
        .eq('tenant_id', tenantUuid)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message || 'Update failed');
      if (!result) throw new Error('Update did not match any employee (tenant/RLS).');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('hr_audit_logs').insert({
          tenant_id: (tenantConfig as any)?.tenant_id || tenantUuid,
          entity_type: 'employee', entity_id: data.id, action: 'update',
          actor_id: user?.id || null, actor_type: 'user', changes: payload,
        });
      } catch { /* audit is best-effort, never blocks the save */ }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
      toast.success("Employee updated successfully");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update employee"),
  });

  // V7: direct soft-delete (same reliability fix). Writes the real termination columns.
  const terminateEmployee = useMutation({
    mutationFn: async (data: { id: string; reason?: string; effective_date?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const payload: any = {
        employment_status: 'terminated',
        termination_reason: data.reason || null,
        termination_date: data.effective_date || new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };
      const { data: result, error } = await supabase
        .from('hr_employees')
        .update(payload)
        .eq('id', data.id)
        .eq('tenant_id', tenantUuid)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message || 'Terminate failed');
      if (!result) throw new Error('Terminate did not match any employee (tenant/RLS).');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('hr_audit_logs').insert({
          tenant_id: (tenantConfig as any)?.tenant_id || tenantUuid,
          entity_type: 'employee', entity_id: data.id, action: 'terminate',
          actor_id: user?.id || null, actor_type: 'user', changes: payload,
        });
      } catch { /* best-effort */ }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", tenantUuid] });
      toast.success("Employee terminated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to terminate employee"),
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
      return callWebhookOrThrow(WEBHOOKS.ATTENDANCE_CHECK_IN, data, tenantUuid);
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
      return callWebhookOrThrow(WEBHOOKS.ATTENDANCE_CHECK_OUT, data, tenantUuid);
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
      employee_id: string;
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
      is_half_day?: boolean;
    }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.LEAVE_REQUEST, data, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests", tenantUuid] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance", tenantUuid] });
      toast.success("Leave request submitted");
    },
    onError: (e: any) => toast.error(`Failed to submit leave: ${e?.message || 'unknown error'}`),
  });

  const approveLeave = useMutation({
    mutationFn: async (data: { leave_id: string; action: "approve" | "reject"; comments?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.LEAVE_APPROVE, data, tenantUuid);
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

  // hr_departments has uuid-typed manager_id / parent_id / parent_department_id
  // columns; the form initialises them as "" so we must coerce empty strings
  // to null before INSERT/UPDATE or PostgREST returns 22P02.
  const cleanDeptPayload = (dept: Partial<Department>): Partial<Department> => {
    const cleaned: Record<string, unknown> = { ...dept };
    for (const k of ['manager_id', 'parent_id', 'parent_department_id'] as const) {
      if (cleaned[k] === '' || cleaned[k] === undefined) cleaned[k] = null;
    }
    return cleaned as Partial<Department>;
  };

  const createDepartment = useMutation({
    mutationFn: async (dept: Partial<Department>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_departments")
        .insert({ ...cleanDeptPayload(dept), tenant_id: tenantUuid })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", tenantUuid] });
      toast.success("Department created");
    },
    onError: (err: any) => toast.error(`Failed to create department${err?.message ? `: ${err.message}` : ''}`),
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Department> & { id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_departments")
        .update(cleanDeptPayload(changes))
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
    onError: (err: any) => toast.error(`Failed to update department${err?.message ? `: ${err.message}` : ''}`),
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

      const [reviewsRes, goalsRes, empRes] = await Promise.all([
        supabase
          .from("hr_performance_reviews")
          .select("*")
          .eq("tenant_id", tenantUuid)
          .order("created_at", { ascending: false }),
        supabase.from("hr_goals").select("*").eq("tenant_id", tenantUuid).order("created_at", { ascending: false }),
        supabase.from("hr_employees").select("id, first_name, last_name").eq("tenant_id", tenantUuid),
      ]);

      // Reviews store only employee_id/reviewer_id (uuids) — resolve recipient names
      // here so the UI never shows a blank name. (reviewer_id is an auth-user id, so it
      // usually won't match an employee row — left null rather than guessed.)
      const nameById = new Map<string, string>();
      for (const e of (empRes.data || []) as any[]) {
        nameById.set(e.id, `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown');
      }
      const enrichedReviews = ((reviewsRes.data || []) as any[]).map((r) => ({
        ...r,
        employee_name: nameById.get(r.employee_id) || 'Unknown employee',
        reviewer_name: r.reviewer_id ? (nameById.get(r.reviewer_id) || null) : null,
        reviewed_on: r.created_at ? String(r.created_at).slice(0, 10) : null,
      }));

      return {
        reviews: enrichedReviews as PerformanceReview[],
        goals: (goalsRes.data || []).map((g: any) => ({
          ...g,
          progress_percent: g.progress_percent ?? g.progress ?? 0,
          // hr_goals column is `due_date`; surface it as target_date for the UI badge.
          target_date: g.due_date ?? g.target_date ?? null,
        })) as Goal[],
        activeCycle: null,
      };
    },
    enabled: !!tenantUuid,
  });

  const createReview = useMutation({
    mutationFn: async (review: { employee_id: string; employee_name?: string; review_type?: string; review_period_start?: string; review_period_end?: string; comments?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      // hr_performance_reviews actual columns: employee_id, reviewer_id, review_type,
      // status, overall_rating, rating_scale, strengths, areas_for_improvement,
      // achievements, comments, ai_generated_review, cycle_id, acknowledged_at,
      // submitted_at, tenant_id. Period dates aren't on this table — they live on
      // hr_performance_cycles (joined via cycle_id). Drop unknown columns rather
      // than 400 the insert.
      const { data: { user } } = await supabase.auth.getUser();
      // review_type CHECK constraint: only 'self' or 'manager' (rater type).
      // cycle_id is NOT NULL — look up most-recent active cycle, create one if absent.
      const { data: cycles } = await supabase
        .from('hr_performance_cycles')
        .select('id')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(1);
      let cycleId = cycles?.[0]?.id;
      if (!cycleId) {
        const today = new Date();
        const start = new Date(today); start.setMonth(start.getMonth() - 3);
        const { data: newCycle, error: ccErr } = await supabase
          .from('hr_performance_cycles')
          .insert({
            tenant_id: tenantUuid,
            name: `${review.review_type || 'quarterly'} cycle ${start.toISOString().slice(0,10)} to ${today.toISOString().slice(0,10)}`,
            type: review.review_type || 'quarterly',
            start_date: start.toISOString().slice(0,10),
            end_date: today.toISOString().slice(0,10),
            status: 'active',
          })
          .select()
          .single();
        if (ccErr) throw ccErr;
        cycleId = newCycle.id;
      }
      const payload: any = {
        tenant_id: tenantUuid,
        employee_id: review.employee_id,
        cycle_id: cycleId,
        review_type: 'manager',
        // status CHECK allows pending/in_progress/submitted/acknowledged — NOT 'draft'.
        status: 'in_progress',
        reviewer_id: user?.id,
        rating_scale: 5,
      };
      if (review.comments) payload.comments = review.comments;
      const { data: result, error } = await supabase
        .from("hr_performance_reviews")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", tenantUuid] });
      toast.success("Review created");
    },
    onError: (e: any) => toast.error(`Failed to create review: ${e?.message || 'unknown'}`),
  });

  // AI-generated review — fires the n8n auto-review workflow + refreshes list.
  const aiGenerateReview = useMutation({
    mutationFn: async (input: { employee_id: string; review_type?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.HR_REVIEW_GENERATE, {
        tenant_id: tenantUuid,
        employee_id: input.employee_id,
        review_type: input.review_type || 'quarterly',
      }, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', tenantUuid] });
      toast.success('AI review generated');
    },
    onError: (e: any) => toast.error(`AI review failed: ${e?.message || 'unknown'}`),
  });

  const createGoal = useMutation({
    mutationFn: async (goal: { title: string; employee_id?: string; description?: string; category?: string; target_date?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      // hr_goals column is `due_date`, not `target_date` — remap so the date persists.
      const { target_date, ...rest } = goal;
      const { data: result, error } = await supabase
        .from("hr_goals")
        .insert({ ...rest, due_date: target_date || null, tenant_id: tenantUuid, progress_percent: 0, status: 'not_started' })
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

  // V6: 360°/peer feedback — stored as an hr_performance_reviews row.
  // review_type CHECK allows 'self'|'manager'|'peer'|'360' (verified live).
  const createFeedback = useMutation({
    mutationFn: async (fb: { employee_id: string; comments: string; feedback_type?: string; status?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: { user } } = await supabase.auth.getUser();
      // cycle_id is NOT NULL — reuse the most-recent cycle or create one (mirror createReview)
      const { data: cycles } = await supabase
        .from('hr_performance_cycles')
        .select('id')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(1);
      let cycleId = cycles?.[0]?.id;
      if (!cycleId) {
        const today = new Date(); const start = new Date(today); start.setMonth(start.getMonth() - 3);
        const { data: newCycle, error: ccErr } = await supabase
          .from('hr_performance_cycles')
          .insert({
            tenant_id: tenantUuid,
            name: `feedback cycle ${start.toISOString().slice(0, 10)} to ${today.toISOString().slice(0, 10)}`,
            type: 'quarterly', start_date: start.toISOString().slice(0, 10), end_date: today.toISOString().slice(0, 10), status: 'active',
          })
          .select()
          .single();
        if (ccErr) throw ccErr;
        cycleId = newCycle.id;
      }
      const pending = fb.status === 'pending';
      const { data: result, error } = await supabase
        .from('hr_performance_reviews')
        .insert({
          tenant_id: tenantUuid,
          employee_id: fb.employee_id,
          cycle_id: cycleId,
          review_type: fb.feedback_type === 'peer' ? 'peer' : '360',
          status: pending ? 'pending' : 'submitted',
          reviewer_id: user?.id,
          rating_scale: 5,
          comments: fb.comments,
          submitted_at: pending ? null : new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', tenantUuid] });
      toast.success('Feedback submitted');
    },
    onError: (e: any) => toast.error(`Failed to submit feedback: ${e?.message || 'unknown'}`),
  });

  // V7: edit an existing review/feedback row (comments, rating, status). Tenant-isolated.
  const updateReview = useMutation({
    mutationFn: async (data: { id: string; comments?: string; overall_rating?: number | null; status?: string; strengths?: string; areas_for_improvement?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      if (!data?.id) throw new Error('Missing review id');
      const payload: any = {};
      for (const k of ['comments', 'overall_rating', 'status', 'strengths', 'areas_for_improvement'] as const)
        if ((data as any)[k] !== undefined) payload[k] = (data as any)[k];
      if (payload.status === 'submitted') payload.submitted_at = new Date().toISOString();
      if (payload.status === 'acknowledged') payload.acknowledged_at = new Date().toISOString();
      const { data: result, error } = await supabase
        .from('hr_performance_reviews').update(payload).eq('id', data.id).eq('tenant_id', tenantUuid).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!result) throw new Error('Review not found (tenant/RLS).');
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['performance', tenantUuid] }); toast.success('Review updated'); },
    onError: (e: any) => toast.error(e?.message || 'Failed to update review'),
  });

  return { ...query, createReview, createGoal, aiGenerateReview, createFeedback, updateReview };
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
      // hr_training_records schema: NO program_id FK — uses denormalized
      // training_name + training_type. Look up the program to copy fields,
      // and resolve the current user's employee row (admin enrolling self).
      const [{ data: program }, { data: { user } }] = await Promise.all([
        supabase.from('hr_training_programs').select('name,type').eq('id', data.program_id).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      let employeeId = data.employee_id;
      if (!employeeId) {
        // Try to resolve via auth user → hr_employees.user_id
        const { data: empByUser } = await supabase
          .from('hr_employees')
          .select('id')
          .eq('tenant_id', tenantUuid)
          .eq('user_id', user?.id || '00000000-0000-0000-0000-000000000000')
          .maybeSingle();
        employeeId = empByUser?.id;
      }
      if (!employeeId) {
        // Fall back to the first active employee — admin enrolling on behalf
        const { data: anyEmp } = await supabase
          .from('hr_employees')
          .select('id')
          .eq('tenant_id', tenantUuid)
          .eq('employment_status', 'active')
          .limit(1)
          .maybeSingle();
        employeeId = anyEmp?.id;
      }
      if (!employeeId) throw new Error('No employee record found to enroll');
      const { data: result, error } = await supabase
        .from('hr_training_records')
        .insert({
          tenant_id: tenantUuid,
          employee_id: employeeId,
          training_name: program?.name || 'Training',
          training_type: program?.type || 'online',
          start_date: new Date().toISOString().slice(0, 10),
          status: 'enrolled',
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
    onError: (e: any) => toast.error(`Failed to enroll: ${e?.message || 'unknown'}`),
  });

  const createProgram = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      duration_hours?: number;
      max_participants?: number;
    }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: result, error } = await supabase
        .from("hr_training_programs")
        .insert({
          tenant_id: tenantUuid,
          name: data.name,
          description: data.description ?? null,
          duration_hours: data.duration_hours ?? null,
          max_participants: data.max_participants ?? null,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] });
      toast.success("Training program created");
    },
    onError: () => toast.error("Failed to create program"),
  });

  // V6: AI course generator — Claude/Gemini writes lesson + slides + quiz + objectives
  // into a new hr_training_programs row (n8n HTuKFLf8uiDnzPJA). Backend was unwired from UI.
  // Generate AI lesson/slides/quiz/objectives (n8n HTuKFLf8uiDnzPJA). Two modes:
  //  • new course → pass {topic} only → INSERTs a new row.
  //  • existing   → pass {training_program_id, topic} → writes content INTO that
  //    course (UPDATE, no duplicate; preserves its name + any prior avatar/doc URL).
  const generateCourse = useMutation({
    mutationFn: async (data: { topic: string; category?: string; duration_minutes?: number; training_program_id?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const payload: any = {
        topic: data.topic,
        category: data.category || 'general',
        duration_minutes: data.duration_minutes ?? 30,
      };
      if (data.training_program_id) payload.training_program_id = data.training_program_id;
      return callWebhookOrThrow(WEBHOOKS.HR_TRAINING_GENERATE, payload, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] });
      toast.success("AI content generated");
    },
    onError: (e: any) => toast.error(`AI generation failed: ${e?.message || 'unknown'}`),
  });

  // V6: HeyGen avatar video for a generated course (n8n 4u2H6AwbDnYcGQW5, premium only).
  // NOTE: HeyGen render can take a few minutes; the webhook is synchronous today.
  const generateAvatarVideo = useMutation({
    mutationFn: async (data: { training_program_id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.HR_TRAINING_AVATAR_VIDEO, {
        training_program_id: data.training_program_id,
      }, tenantUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] });
      toast.success("Avatar video generated");
    },
    onError: (e: any) => toast.error(`Video generation failed: ${e?.message || 'unknown'}`),
  });

  // V7: course edit / soft-delete / manual content (direct supabase, tenant-isolated)
  const updateCourse = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; duration_hours?: number; type?: string; max_participants?: number }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { id, ...fields } = data;
      const payload: any = {};
      for (const k of ['name', 'description', 'duration_hours', 'type', 'max_participants'] as const)
        if ((fields as any)[k] !== undefined) payload[k] = (fields as any)[k];
      const { data: result, error } = await supabase
        .from('hr_training_programs').update(payload).eq('id', id).eq('tenant_id', tenantUuid).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!result) throw new Error('Course not found (tenant/RLS).');
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] }); toast.success("Course updated"); },
    onError: (e: any) => toast.error(e?.message || "Failed to update course"),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error('No tenant');
      // soft-delete: keep the row (preserves enrollments/history), hide via status
      const { error } = await supabase.from('hr_training_programs').update({ status: 'cancelled' }).eq('id', id).eq('tenant_id', tenantUuid);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] }); toast.success("Course removed"); },
    onError: (e: any) => toast.error(e?.message || "Failed to remove course"),
  });

  // Add a manual video / document URL — merged into the course's `provider` JSON
  // (same place the AI generator stores avatar_video_url), preserving any vendor name.
  const addCourseMedia = useMutation({
    mutationFn: async (data: { id: string; video_url?: string; document_url?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: prog, error: ge } = await supabase
        .from('hr_training_programs').select('provider').eq('id', data.id).eq('tenant_id', tenantUuid).maybeSingle();
      if (ge) throw new Error(ge.message);
      if (!prog) throw new Error('Course not found.');
      let meta: any = {};
      const orig = ((prog as any).provider || '').toString();
      try { const p = JSON.parse(orig || '{}'); if (p && typeof p === 'object') meta = p; else if (orig.trim()) meta.vendor = orig; }
      catch { if (orig.trim()) meta.vendor = orig; }
      if (data.video_url) meta.avatar_video_url = data.video_url;
      if (data.document_url) meta.document_url = data.document_url;
      meta.manual_content = true;
      const { error } = await supabase.from('hr_training_programs').update({ provider: JSON.stringify(meta) }).eq('id', data.id).eq('tenant_id', tenantUuid);
      if (error) throw new Error(error.message);
      return data.id;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-programs", tenantUuid] }); toast.success("Content added to course"); },
    onError: (e: any) => toast.error(e?.message || "Failed to add content"),
  });

  // Chaptered training videos — async HeyGen (n8n cMU1weyCZFP3kVrw). Completion via the
  // HeyGen webhook → receiver KyIF7qhdTZR3o9E5, or the poll-once fallback NaVWUiV5oXsFZXDH.
  const generateChapters = useMutation({
    mutationFn: async (data: { training_program_id: string; max_chapters?: number; avatar_mode?: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.HR_CHAPTER_GENERATE, { training_program_id: data.training_program_id, max_chapters: data.max_chapters, avatar_mode: data.avatar_mode }, tenantUuid);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["course-chapters", tenantUuid] }); toast.success("Chapter video generation started"); },
    onError: (e: any) => toast.error(`Chapter generation failed: ${e?.message || 'unknown'}`),
  });
  const refreshChapters = useMutation({
    mutationFn: async (data: { training_program_id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      return callWebhookOrThrow(WEBHOOKS.HR_CHAPTER_POLL, { training_program_id: data.training_program_id }, tenantUuid);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["course-chapters", tenantUuid] }); },
    onError: () => { /* poll is best-effort */ },
  });

  return { programs, enrollments, enroll, createProgram, generateCourse, generateAvatarVideo, updateCourse, deleteCourse, addCourseMedia, generateChapters, refreshChapters };
}

// Chapters for a course (hr_course_chapters). Auto-polls every 8s while any chapter is
// still generating, so completed videos appear without a manual refresh.
export function useCourseChapters(programId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ["course-chapters", tenantUuid, programId],
    queryFn: async () => {
      if (!tenantUuid || !programId) return [] as any[];
      const { data, error } = await supabase
        .from('hr_course_chapters')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('training_program_id', programId)
        .order('chapter_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!programId,
    refetchInterval: (q: any) => {
      const rows = (q?.state?.data as any[]) || [];
      return rows.some((r) => r.status === 'generating' || r.status === 'queued') ? 8000 : false;
    },
  });
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

    // Route through the OMEGA Bridge (/hr/ai-assistant-v2) — that workflow
    // fetches tenant + synced policies + employee count server-side and
    // forwards an enriched prompt to OMEGA (central brain, 13 agents).
    // Returns { success, response, agent, context_loaded, thread_id, execution_time_ms }.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result: any = await callWebhook(
        WEBHOOKS.HR_AI_ASSISTANT,
        {
          message,
          query: message,
          tenant_id: tenantUuid,
          user_id: user?.id || context?.employee_id || 'web-user',
          channel: context?.channel || 'web',
          ...context,
        },
        tenantUuid,
      );
      return result?.data ?? result;
    } catch (e: any) {
      return { success: false, error: e?.message || 'AI request failed' };
    }
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
        .select("id, first_name, last_name, full_name, department_name:department, employment_type")
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
        .select("id, first_name, last_name, full_name, department_name:department, date_of_joining, employment_status, salary, employment_type")
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
        .select("salary, salary_currency, department_name:department, employment_type, employment_status")
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
