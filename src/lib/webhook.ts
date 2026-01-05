const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

export interface WebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function callWebhook<T = unknown>(
  endpoint: string,
  data: object,
  tenantId: string
): Promise<WebhookResponse<T>> {
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Webhook endpoint constants
export const WEBHOOKS = {
  // Sales
  LEAD_GEN_REQUEST: '/lead-gen-request',
  INTENT_LEAD_GEN: '/intent-lead-gen',
  DEAL_CREATE: '/deal-create',
  DEAL_UPDATE: '/deal-update',
  LEAD_CONTROL: '/lead-control',
  AUTOMATION_CONTROL: '/automation-control',
  
  // Marketing
  SEND_CAMPAIGN: '/marketing/send-campaign',
  GENERATE_CONTENT: '/marketing/generate-content',
  
  // HR - Extended
  EMPLOYEE_ONBOARDING: '/hr/employee-onboarding',
  ATTENDANCE_CHECK_IN: '/hr/attendance/check-in',
  ATTENDANCE_CHECK_OUT: '/hr/attendance/check-out',
  LEAVE_REQUEST: '/hr/leave/request',
  LEAVE_APPROVE: '/hr/leave/approve',
  HR_DASHBOARD: '/hr/dashboard',
  HR_ATTENDANCE_TODAY: '/hr/attendance/today',
  HR_LEAVE_BALANCE: '/hr/leave/balance',
  HR_PAYROLL_SUMMARY: '/hr/payroll/summary',
  HR_DEPARTMENTS: '/hr/departments',
  HR_PERFORMANCE_REVIEW: '/hr/performance/review',
  HR_TRAINING_PROGRAMS: '/hr/training/programs',
  HR_TRAINING_ENROLLMENTS: '/hr/training/enrollments',
  HR_DOCUMENTS: '/hr/documents',
  HR_REPORTS: '/hr/reports',
  HR_AI_ASSISTANT: '/hr/ai-assistant',
  HR_GET_EMPLOYEE: '/hr/employee',
  HR_GET_EMPLOYEES: '/hr/employees',
  HR_UPDATE_EMPLOYEE: '/hr/employee/update',
  HR_TERMINATE_EMPLOYEE: '/hr/employee/terminate',
  
  // Main/Operations
  SEND_MESSAGE: '/send-message',
  BOOK_APPOINTMENT: '/book-appointment',
  CUSTOMER_UPDATE: '/customer-update',
} as const;
