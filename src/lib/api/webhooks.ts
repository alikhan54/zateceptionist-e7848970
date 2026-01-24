// Webhook base URL
export const N8N_WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhooks.zatesystems.com/webhook";

// Complete webhook endpoint definitions
export const WEBHOOKS = {
  // Main/CRM
  SEND_MESSAGE: "/send-message",
  BOOK_APPOINTMENT: "/book-appointment",
  CUSTOMER_UPDATE: "/customer-update",

  // Sales
  LEAD_GEN_B2B: "/lead-gen-request",
  LEAD_GEN_B2C: "/intent-lead-gen",
  LEAD_UPLOAD: "/sales-upload",
  DEAL_CREATE: "/deal-create",
  DEAL_UPDATE: "/deal-update",
  LEAD_CONTROL: "/lead-control",
  SEQUENCE_CONTROL: "/sequence-control",
  AUTOMATION_CONTROL: "/automation-control",

  // Marketing
  GENERATE_CONTENT: "/marketing/generate-content",
  GENERATE_IMAGE: "/marketing/generate-image",
  SEND_CAMPAIGN: "/marketing/send-campaign",
  POST_SOCIAL: "/marketing/post-social",
  SCHEDULE_POST: "/marketing/schedule-post",

  // HR
  EMPLOYEE_ONBOARDING: "/hr/employee-onboarding",
  ATTENDANCE_CHECK_IN: "/hr/attendance/check-in",
  ATTENDANCE_CHECK_OUT: "/hr/attendance/check-out",
  LEAVE_REQUEST: "/hr/leave/request",
  LEAVE_APPROVE: "/hr/leave/approve",
  GET_EMPLOYEES: "/hr/employees",
  GET_EMPLOYEE: "/hr/employee",
  UPDATE_EMPLOYEE: "/hr/employee/update",
  TERMINATE_EMPLOYEE: "/hr/employee/terminate",
  HR_DASHBOARD: "/hr/dashboard",
  HR_REPORTS: "/hr/reports",
  HR_AI_ASSISTANT: "/hr/ai-assistant",

  // Voice
  VAPI_OUTBOUND: "/vapi/outbound-call",
  VAPI_CONFIG: "/vapi/config",

  // Analytics
  GET_ANALYTICS: "/analytics",
  GET_REALTIME: "/analytics/realtime",

  // =============================================
  // ONBOARDING - FIXED PATHS TO MATCH N8N
  // =============================================
  AI_COMPANY_ANALYZE: "/onboarding/analyze-company",
  ONBOARDING_COMPLETE: "/onboarding/complete",
  // FIXED: Changed from '/onboarding/train-knowledge' to '/onboarding/train-agents'
  // to match n8n OBT.1 webhook path
  TRAIN_AI_KNOWLEDGE: "/onboarding/train-agents",
} as const;

export type WebhookEndpoint = (typeof WEBHOOKS)[keyof typeof WEBHOOKS];

// Response types
export interface WebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Call an N8N webhook endpoint (POST)
 */
export async function callWebhook<T = unknown>(
  endpoint: WebhookEndpoint | string,
  data: object,
  tenantId: string,
): Promise<WebhookResponse<T>> {
  const url = `${N8N_WEBHOOK_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId,
      },
      body: JSON.stringify({
        ...(data as object),
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook error [${endpoint}]:`, errorText);
      return {
        success: false,
        error: `Webhook failed with status ${response.status}`,
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      data: responseData as T,
    };
  } catch (error) {
    console.error(`Webhook error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Call webhook with GET method for fetching data
 */
export async function fetchWebhook<T = unknown>(
  endpoint: WebhookEndpoint | string,
  tenantId: string,
  params?: Record<string, string>,
): Promise<WebhookResponse<T>> {
  const url = new URL(`${N8N_WEBHOOK_BASE}${endpoint}`);
  url.searchParams.set("tenant_id", tenantId);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Tenant-ID": tenantId,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Fetch failed with status ${response.status}`,
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      data: responseData as T,
    };
  } catch (error) {
    console.error(`Fetch webhook error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
