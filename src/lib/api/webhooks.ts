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
  // OB.1 in 420 Communication
  AI_COMPANY_ANALYZE: "/onboarding/analyze-company",

  // OBD.1 in 420 Communication
  ONBOARDING_DOCUMENT: "/onboarding/analyze-document",

  // OBT.1 in 420 Communication (NOT train-knowledge!)
  TRAIN_AI_KNOWLEDGE: "/onboarding/train-agents",

  // OBC.1 in 420 Communication
  ONBOARDING_COMPLETE: "/onboarding/complete",

  // 6.1 in 420 Main (different from OBT!)
  COMPILE_KNOWLEDGE: "/onboarding/train-knowledge",
} as const;

export type WebhookEndpoint = (typeof WEBHOOKS)[keyof typeof WEBHOOKS];

// Response types
export interface WebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic webhook caller with improved error handling
export async function callWebhook<T = unknown>(
  endpoint: string,
  data: Record<string, unknown>,
  tenantId: string,
): Promise<WebhookResponse<T>> {
  const url = `${N8N_WEBHOOK_BASE}${endpoint}`;

  console.log(`[Webhook] Calling: ${url}`);
  console.log(`[Webhook] Tenant: ${tenantId}`);
  console.log(`[Webhook] Data:`, data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
      }),
    });

    console.log(`[Webhook] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webhook] Error response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Webhook] Success:`, result);

    return {
      success: true,
      data: result as T,
    };
  } catch (error) {
    console.error(`[Webhook] Error calling ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// ONBOARDING HELPERS
// ============================================

/**
 * Analyze company website
 */
export async function analyzeCompanyWebsite(tenantId: string, url: string) {
  return callWebhook(WEBHOOKS.AI_COMPANY_ANALYZE, { url }, tenantId);
}

/**
 * Analyze uploaded document
 */
export async function analyzeDocument(tenantId: string, content: string, filename: string) {
  return callWebhook(WEBHOOKS.ONBOARDING_DOCUMENT, { content, filename, document_content: content }, tenantId);
}

/**
 * Train AI agents with knowledge
 */
export async function trainAIAgents(
  tenantId: string,
  modules: string[] = ["sales", "marketing", "communication", "voice", "hr"],
) {
  return callWebhook(WEBHOOKS.TRAIN_AI_KNOWLEDGE, { modules }, tenantId);
}

/**
 * Complete onboarding process
 */
export async function completeOnboarding(
  tenantId: string,
  payload: {
    company: Record<string, unknown>;
    ai_config: Record<string, unknown>;
    channels: Record<string, boolean>;
    subscription: { plan: string; status: string };
    automation_mode?: string;
    enable_voice?: boolean;
  },
) {
  return callWebhook(WEBHOOKS.ONBOARDING_COMPLETE, payload, tenantId);
}

// ============================================
// SALES HELPERS
// ============================================

export interface B2BLeadGenParams {
  industry: string;
  keywords: string;
  location: string;
  count: number;
  company_size?: string;
  job_titles?: string[];
}

export async function generateB2BLeads(tenantId: string, params: B2BLeadGenParams) {
  return callWebhook(WEBHOOKS.LEAD_GEN_B2B, params as unknown as Record<string, unknown>, tenantId);
}

export interface B2CLeadGenParams {
  intent_keywords: string;
  platforms: string[];
  location?: string;
  count?: number;
}

export async function generateB2CLeads(tenantId: string, params: B2CLeadGenParams) {
  return callWebhook(WEBHOOKS.LEAD_GEN_B2C, params as unknown as Record<string, unknown>, tenantId);
}

// ============================================
// MESSAGING HELPERS
// ============================================

export interface SendMessageParams {
  customer_id?: string;
  customer_phone?: string;
  customer_email?: string;
  message: string;
  channel: "whatsapp" | "email" | "sms" | "instagram" | "facebook" | "linkedin";
  template_id?: string;
  variables?: Record<string, string>;
}

export async function sendMessage(tenantId: string, params: SendMessageParams) {
  return callWebhook(WEBHOOKS.SEND_MESSAGE, params as unknown as Record<string, unknown>, tenantId);
}

// ============================================
// HR HELPERS
// ============================================

export async function checkInAttendance(tenantId: string, employeeId: string, location?: string) {
  return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_IN, { employee_id: employeeId, location }, tenantId);
}

export async function checkOutAttendance(tenantId: string, employeeId: string) {
  return callWebhook(WEBHOOKS.ATTENDANCE_CHECK_OUT, { employee_id: employeeId }, tenantId);
}

export async function requestLeave(
  tenantId: string,
  employeeId: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason?: string,
) {
  return callWebhook(
    WEBHOOKS.LEAVE_REQUEST,
    {
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason,
    },
    tenantId,
  );
}

// ============================================
// MARKETING HELPERS
// ============================================

export async function generateContent(
  tenantId: string,
  type: "blog" | "social" | "email" | "ad",
  topic: string,
  tone?: string,
  length?: "short" | "medium" | "long",
) {
  return callWebhook(WEBHOOKS.GENERATE_CONTENT, { type, topic, tone, length }, tenantId);
}

export async function sendCampaign(tenantId: string, campaignId: string, channel: string, recipients: string[]) {
  return callWebhook(WEBHOOKS.SEND_CAMPAIGN, { campaign_id: campaignId, channel, recipients }, tenantId);
}
