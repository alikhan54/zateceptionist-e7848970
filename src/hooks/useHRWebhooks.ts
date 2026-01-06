import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, fetchWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  employee_id: string;
  hire_date: string;
  status: 'active' | 'on_leave' | 'terminated';
  manager_id?: string;
  salary?: number;
  created_at: string;
}

export interface OnboardingRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  hire_date: string;
  manager_id?: string;
  salary?: number;
  documents?: string[];
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string;
  check_out?: string;
  status: 'present' | 'late' | 'absent' | 'half_day';
  notes?: string;
}

export interface LeaveRequest {
  employee_id: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  start_date: string;
  end_date: string;
  reason?: string;
  documents?: string[];
}

export interface LeaveApproval {
  request_id: string;
  action: 'approve' | 'reject';
  notes?: string;
}

export interface HRDashboardData {
  total_employees: number;
  active_employees: number;
  on_leave: number;
  new_hires_this_month: number;
  pending_leave_requests: number;
  attendance_rate: number;
  department_breakdown: Record<string, number>;
}

export interface AIAssistantRequest {
  query: string;
  context?: {
    employee_id?: string;
    department?: string;
    topic?: 'policy' | 'benefits' | 'leave' | 'performance' | 'general';
  };
}

export function useHRWebhooks() {
  const { tenantId: tid } = useTenant();
  const tenantId = tid || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get HR Dashboard Data
  const useDashboard = () => {
    return useQuery({
      queryKey: ['hr-dashboard', tenantId],
      queryFn: async () => {
        const result = await fetchWebhook<HRDashboardData>(WEBHOOKS.HR_DASHBOARD, tenantId);
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId,
      staleTime: 30000,
    });
  };

  // Get Employees
  const useEmployees = (filters?: { department?: string; status?: string }) => {
    return useQuery({
      queryKey: ['employees', tenantId, filters],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (filters?.department) params.department = filters.department;
        if (filters?.status) params.status = filters.status;
        
        const result = await fetchWebhook<Employee[]>(WEBHOOKS.GET_EMPLOYEES, tenantId, params);
        if (!result.success) throw new Error(result.error);
        return result.data || [];
      },
      enabled: !!tenantId,
    });
  };

  // Get Single Employee
  const useEmployee = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee', tenantId, employeeId],
      queryFn: async () => {
        const result = await fetchWebhook<Employee>(WEBHOOKS.GET_EMPLOYEE, tenantId, { id: employeeId });
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId && !!employeeId,
    });
  };

  // Employee Onboarding
  const onboardEmployee = useMutation({
    mutationFn: async (data: OnboardingRequest) => {
      const result = await callWebhook<Employee>(WEBHOOKS.EMPLOYEE_ONBOARDING, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hr-dashboard', tenantId] });
      toast({
        title: 'Employee Onboarded',
        description: `${data?.first_name} ${data?.last_name} has been added successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Onboarding Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update Employee
  const updateEmployee = useMutation({
    mutationFn: async (data: Partial<Employee> & { id: string }) => {
      const result = await callWebhook<Employee>(WEBHOOKS.UPDATE_EMPLOYEE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      toast({ title: 'Employee Updated', description: 'Employee details have been updated' });
    },
  });

  // Terminate Employee
  const terminateEmployee = useMutation({
    mutationFn: async (data: { id: string; reason?: string; effective_date?: string }) => {
      const result = await callWebhook<Employee>(WEBHOOKS.TERMINATE_EMPLOYEE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hr-dashboard', tenantId] });
      toast({
        title: 'Employee Terminated',
        description: 'Employee has been terminated successfully',
      });
    },
  });

  // Check In
  const checkIn = useMutation({
    mutationFn: async (data: { employee_id: string; notes?: string }) => {
      const result = await callWebhook<AttendanceRecord>(WEBHOOKS.ATTENDANCE_CHECK_IN, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', tenantId] });
      toast({ title: 'Checked In', description: 'Attendance recorded successfully' });
    },
  });

  // Check Out
  const checkOut = useMutation({
    mutationFn: async (data: { employee_id: string; notes?: string }) => {
      const result = await callWebhook<AttendanceRecord>(WEBHOOKS.ATTENDANCE_CHECK_OUT, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', tenantId] });
      toast({ title: 'Checked Out', description: 'Attendance updated successfully' });
    },
  });

  // Request Leave
  const requestLeave = useMutation({
    mutationFn: async (data: LeaveRequest) => {
      const result = await callWebhook<{ request_id: string }>(WEBHOOKS.LEAVE_REQUEST, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', tenantId] });
      toast({
        title: 'Leave Requested',
        description: 'Your leave request has been submitted for approval',
      });
    },
  });

  // Approve/Reject Leave
  const approveLeave = useMutation({
    mutationFn: async (data: LeaveApproval) => {
      const result = await callWebhook(WEBHOOKS.LEAVE_APPROVE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hr-dashboard', tenantId] });
      toast({
        title: variables.action === 'approve' ? 'Leave Approved' : 'Leave Rejected',
        description: `Leave request has been ${variables.action}d`,
      });
    },
  });

  // HR Reports
  const useReports = (reportType: string, dateRange?: { start: string; end: string }) => {
    return useQuery({
      queryKey: ['hr-reports', tenantId, reportType, dateRange],
      queryFn: async () => {
        const params: Record<string, string> = { type: reportType };
        if (dateRange) {
          params.start_date = dateRange.start;
          params.end_date = dateRange.end;
        }
        const result = await fetchWebhook(WEBHOOKS.HR_REPORTS, tenantId, params);
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId && !!reportType,
    });
  };

  // AI Assistant
  const askAIAssistant = useMutation({
    mutationFn: async (data: AIAssistantRequest) => {
      const result = await callWebhook<{ response: string; sources?: string[] }>(WEBHOOKS.HR_AI_ASSISTANT, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  return {
    useDashboard,
    useEmployees,
    useEmployee,
    useReports,
    onboardEmployee,
    updateEmployee,
    terminateEmployee,
    checkIn,
    checkOut,
    requestLeave,
    approveLeave,
    askAIAssistant,
  };
}
