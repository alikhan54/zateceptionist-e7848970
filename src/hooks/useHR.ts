import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/webhook';
import { toast } from 'sonner';

// Types
export interface Employee {
  id: string;
  tenant_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  position: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  avatar_url?: string;
  manager_id?: string;
  salary?: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  work_hours?: number;
  overtime_hours?: number;
  location?: { lat: number; lng: number };
}

export interface LeaveBalance {
  leave_type: string;
  total: number;
  used: number;
  remaining: number;
  pending: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  half_day?: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  attachment_url?: string;
  approved_by?: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  tax: number;
  net_pay: number;
  status: 'draft' | 'processed' | 'paid';
  pay_date?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager_id?: string;
  manager_name?: string;
  employee_count: number;
  budget?: number;
  parent_id?: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  employee_name: string;
  reviewer_id: string;
  reviewer_name: string;
  period: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'completed';
  overall_rating?: number;
  goals: Goal[];
  feedback?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  provider: string;
  duration_hours: number;
  category: string;
  format: 'online' | 'classroom' | 'hybrid';
  completion_rate: number;
  enrolled_count: number;
  status: 'active' | 'draft' | 'archived';
}

export interface TrainingEnrollment {
  id: string;
  program_id: string;
  program_title: string;
  employee_id: string;
  enrolled_at: string;
  progress: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  completed_at?: string;
  certificate_url?: string;
}

export interface HRDocument {
  id: string;
  name: string;
  category: 'policy' | 'template' | 'personal' | 'contract';
  file_url: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  acknowledged?: boolean;
  version?: string;
}

// Hooks
export function useEmployees() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employees', tenantId],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return [] as Employee[];
    },
    enabled: !!tenantId,
  });

  const createEmployee = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      return callWebhook(WEBHOOKS.HR_GET_EMPLOYEES, { action: 'create', ...data }, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast.success('Employee added successfully');
    },
    onError: () => toast.error('Failed to add employee'),
  });

  const updateEmployee = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      return callWebhook(WEBHOOKS.HR_UPDATE_EMPLOYEE, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast.success('Employee updated successfully');
    },
    onError: () => toast.error('Failed to update employee'),
  });

  return { ...query, createEmployee, updateEmployee };
}

export function useAttendance(date?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['attendance', tenantId, date],
    queryFn: async () => {
      // Mock data
      return {
        records: [] as AttendanceRecord[],
        summary: { present: 0, absent: 0, late: 0, on_leave: 0 },
      };
    },
    enabled: !!tenantId,
  });

  const checkIn = useMutation({
    mutationFn: async (data: { employee_id: string; location?: { lat: number; lng: number } }) => {
      return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_IN, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', tenantId] });
      toast.success('Checked in successfully');
    },
    onError: () => toast.error('Failed to check in'),
  });

  const checkOut = useMutation({
    mutationFn: async (data: { employee_id: string }) => {
      return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_OUT, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', tenantId] });
      toast.success('Checked out successfully');
    },
    onError: () => toast.error('Failed to check out'),
  });

  return { ...query, checkIn, checkOut };
}

export function useLeaveBalance() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['leave-balance', tenantId],
    queryFn: async () => {
      // Mock data
      return [
        { leave_type: 'Annual', total: 20, used: 5, remaining: 15, pending: 2 },
        { leave_type: 'Sick', total: 10, used: 2, remaining: 8, pending: 0 },
        { leave_type: 'Personal', total: 5, used: 1, remaining: 4, pending: 0 },
        { leave_type: 'Maternity/Paternity', total: 60, used: 0, remaining: 60, pending: 0 },
      ] as LeaveBalance[];
    },
    enabled: !!tenantId,
  });
}

export function useLeaveRequests(status?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['leave-requests', tenantId, status],
    queryFn: async () => {
      return [] as LeaveRequest[];
    },
    enabled: !!tenantId,
  });

  const requestLeave = useMutation({
    mutationFn: async (data: Partial<LeaveRequest>) => {
      return callWebhook(WEBHOOKS.LEAVE_REQUEST, data, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance', tenantId] });
      toast.success('Leave request submitted');
    },
    onError: () => toast.error('Failed to submit leave request'),
  });

  const approveLeave = useMutation({
    mutationFn: async (data: { request_id: string; approved: boolean; comment?: string }) => {
      return callWebhook(WEBHOOKS.LEAVE_APPROVE, data, tenantId!);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', tenantId] });
      toast.success(variables.approved ? 'Leave approved' : 'Leave rejected');
    },
    onError: () => toast.error('Failed to process leave request'),
  });

  return { ...query, requestLeave, approveLeave };
}

export function usePayroll(period?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['payroll', tenantId, period],
    queryFn: async () => {
      return {
        records: [] as PayrollRecord[],
        summary: { total_payroll: 0, avg_salary: 0, headcount: 0, period: '' },
      };
    },
    enabled: !!tenantId,
  });
}

export function useDepartments() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['departments', tenantId],
    queryFn: async () => {
      return [] as Department[];
    },
    enabled: !!tenantId,
  });

  const createDepartment = useMutation({
    mutationFn: async (data: Partial<Department>) => {
      return callWebhook(WEBHOOKS.HR_DEPARTMENTS, { action: 'create', ...data }, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', tenantId] });
      toast.success('Department created');
    },
    onError: () => toast.error('Failed to create department'),
  });

  return { ...query, createDepartment };
}

export function usePerformance() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['performance', tenantId],
    queryFn: async () => {
      return {
        reviews: [] as PerformanceReview[],
        goals: [] as Goal[],
        activeCycle: null as { name: string; start_date: string; end_date: string } | null,
      };
    },
    enabled: !!tenantId,
  });
}

export function useTraining() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const programsQuery = useQuery({
    queryKey: ['training-programs', tenantId],
    queryFn: async () => {
      return [] as TrainingProgram[];
    },
    enabled: !!tenantId,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['training-enrollments', tenantId],
    queryFn: async () => {
      return [] as TrainingEnrollment[];
    },
    enabled: !!tenantId,
  });

  const enroll = useMutation({
    mutationFn: async (data: { program_id: string }) => {
      return callWebhook(WEBHOOKS.HR_TRAINING_ENROLLMENTS, { action: 'enroll', ...data }, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments', tenantId] });
      toast.success('Enrolled successfully');
    },
    onError: () => toast.error('Failed to enroll'),
  });

  return { programs: programsQuery, enrollments: enrollmentsQuery, enroll };
}

export function useHRDocuments(category?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hr-documents', tenantId, category],
    queryFn: async () => {
      return [] as HRDocument[];
    },
    enabled: !!tenantId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (data: { name: string; category: string; file: File }) => {
      return callWebhook(WEBHOOKS.HR_DOCUMENTS, { action: 'upload', ...data }, tenantId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents', tenantId] });
      toast.success('Document uploaded');
    },
    onError: () => toast.error('Failed to upload document'),
  });

  return { ...query, uploadDocument };
}

export function useHRReports() {
  const { tenantId } = useTenant();

  const fetchReport = async (reportType: string, filters: Record<string, string>) => {
    return callWebhook(WEBHOOKS.HR_REPORTS, { report_type: reportType, ...filters }, tenantId!);
  };

  return { fetchReport };
}

export function useHRAI() {
  const { tenantId } = useTenant();

  const sendMessage = async (message: string, context?: Record<string, unknown>) => {
    return callWebhook(WEBHOOKS.HR_AI_ASSISTANT, { message, context }, tenantId!);
  };

  return { sendMessage };
}
