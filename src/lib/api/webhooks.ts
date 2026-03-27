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
  LANDING_PAGE_GENERATE: "/marketing/landing-page-generate",
  AB_TEST_CREATE: "/marketing/ab-test-create",
  EMAIL_TEMPLATE_GENERATE: "/marketing/email-template-generate",
  REFRESH_TRENDS: "/marketing/refresh-trends",
  ANALYZE_COMPETITOR: "/marketing/analyze-competitor",
  DISCOVER_COMPETITORS: "/marketing/discover-competitors",
  VIDEO_GENERATE: "/marketing/video-generate",
  AI_VIDEO_GENERATE: "/ai-video/generate",
  CREATE_AD_CAMPAIGN: "/marketing/create-ad-campaign",
  GENERATE_AD_CREATIVE: "/marketing/generate-ad-creative",
  TRACK_CONVERSION: "/marketing/track-conversion",
  AIDA_CLASSIFY: "/marketing/aida-classify",
  AD_INTELLIGENCE: "/marketing/ad-intelligence",
  REPURPOSE_CONTENT: "/marketing/repurpose-content",
  VOICE_CALL: "/marketing/voice-call",
  SEO_ANALYZE: "/seo-analyze",

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
  HR_ATTENDANCE_TODAY: "/hr/attendance/today",
  HR_LEAVE_BALANCE: "/hr/leave/balance",
  HR_PAYROLL_SUMMARY: "/hr/payroll/summary",
  HR_DEPARTMENTS: "/hr/departments",
  HR_PERFORMANCE_REVIEW: "/hr/performance/review",
  HR_TRAINING_PROGRAMS: "/hr/training/programs",
  HR_TRAINING_ENROLLMENTS: "/hr/training/enrollments",
  HR_DOCUMENTS: "/hr/documents",
  HR_GET_EMPLOYEES: "/hr/employees",
  HR_GET_EMPLOYEE: "/hr/employee",
  HR_UPDATE_EMPLOYEE: "/hr/employee/update",
  HR_TERMINATE_EMPLOYEE: "/hr/employee/terminate",

  // HR - Recruitment AI
  HR_AI_SOURCE: "/hr-ai-source",
  HR_AI_INTERVIEW: "/hr-ai-interview",
  HR_AI_INTERVIEW_CALLBACK: "/hr-ai-interview-callback",
  HR_OUTREACH_APPROVE: "/hr-outreach-approve",
  HR_BATCH_IMPORT: "/hr-batch-import",

  // HR - Recruitment Webhooks
  HR_TRIGGER_SOURCING: "/hr/job/trigger-sourcing",
  HR_TRIGGER_AI_INTERVIEW: "/hr/ai-interview/trigger",
  HR_APPROVE_OUTREACH: "/hr/approve-outreach",
  HR_RECRUITMENT_OUTREACH: "/hr-recruitment-outreach",
  HR_SOURCING_STATUS: "/hr/sourcing-status",

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
  // OBD workflow for document analysis
  ANALYZE_DOCUMENT: "/onboarding/analyze-document",
  // OMEGA AI Proxy (Phase 7)
  OMEGA_CHAT: "/omega-chat",
  OMEGA_HEALTH: "/omega-health",
  OMEGA_AUTONOMOUS_TRIGGER: "/omega-autonomous-trigger",

  // Deep scrape — cascading website + social + document analysis
  // FIXED: Was "/onboarding/deep-scrape" (404) — n8n OB.1 node uses "analyze-company"
  DEEP_SCRAPE: "/onboarding/analyze-company",
  // Analyze social profiles
  ANALYZE_SOCIAL: "/onboarding/analyze-social",

  // Billing — Stripe payment
  BILLING_SETUP_INTENT: "/billing/create-setup-intent",
  BILLING_CREATE_CHECKOUT: "/billing/create-checkout",
  BILLING_CUSTOMER_PORTAL: "/billing/customer-portal",

  // Billing — Paddle webhook (registered in Paddle dashboard)
  PADDLE_WEBHOOK: "/billing/paddle-webhook",

  // OAuth — channel connections
  OAUTH_EXCHANGE_TOKEN: "/oauth/exchange-token",

  // Construction Estimation (Phase 7E-B)
  ESTIMATION_ACTION: "/estimation-action",
  ESTIMATION_AI: "/estimation-ai",
  ESTIMATION_VAPI_TOOLS: "/vapi-estimation-tools",
  ESTIMATION_LEARNING: "/estimation-learning",
  ESTIMATION_COST: "/estimation-cost-calculate",

  // Bulk Voice Calls (Phase 14)
  BULK_CALL_CREATE: "/bulk-call/create-campaign",
  BULK_CALL_START: "/bulk-call/start-campaign",
  BULK_CALL_PAUSE: "/bulk-call/pause-campaign",
  BULK_CALL_STATUS: "/bulk-call/get-status",

  // ABM & Growth (Phase 18E)
  ABM_RESEARCH: "/abm-research",
  LEAD_MAGNET_SUBMIT: "/lead-magnet-submit",
  REQUEST_REFERRAL: "/request-referral",

  // Advanced Intelligence (Phase 18F)
  RESEARCH_COMPANY: "/research-company",
  CREATE_TRACKING_LINK: "/create-tracking-link",

  // Manual Email Campaigns (Phase 14)
  MANUAL_EMAIL_CREATE: "/manual-email/create-campaign",
  MANUAL_EMAIL_START: "/manual-email/start-campaign",
  MANUAL_EMAIL_PAUSE: "/manual-email/pause-campaign",
  MANUAL_EMAIL_STATUS: "/manual-email/get-status",
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
  if (!tenantId) {
    console.error(`[WEBHOOK] callWebhook called with null/empty tenantId for ${endpoint}`);
    return { success: false, error: "No tenant ID - are you logged in?" };
  }

  const cleanEndpoint = typeof endpoint === 'string' && !endpoint.startsWith('/') ? `/${endpoint}` : endpoint;
  const url = `${N8N_WEBHOOK_BASE}${cleanEndpoint}`;
  console.log(`[WEBHOOK] POST ${url} tenantId=${tenantId}`);

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
 * Call an N8N webhook with a custom timeout (ms).
 * Used for long-running operations like PDF vision analysis.
 */
export async function callWebhookWithTimeout<T = unknown>(
  endpoint: WebhookEndpoint | string,
  data: object,
  tenantId: string,
  timeoutMs: number = 300000,
): Promise<WebhookResponse<T>> {
  if (!tenantId) {
    return { success: false, error: "No tenant ID - are you logged in?" };
  }

  const cleanEndpoint = typeof endpoint === 'string' && !endpoint.startsWith('/') ? `/${endpoint}` : endpoint;
  const url = `${N8N_WEBHOOK_BASE}${cleanEndpoint}`;
  console.log(`[WEBHOOK] POST ${url} tenantId=${tenantId} timeout=${timeoutMs}ms`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webhook error [${endpoint}]:`, errorText);
      return { success: false, error: `Webhook failed with status ${response.status}` };
    }

    const responseData = await response.json();
    return { success: true, data: responseData as T };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn(`[WEBHOOK] ${endpoint} timed out after ${timeoutMs}ms`);
      return { success: false, error: "TIMEOUT" };
    }
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
  const cleanEndpoint = typeof endpoint === 'string' && !endpoint.startsWith('/') ? `/${endpoint}` : endpoint;
  const url = new URL(`${N8N_WEBHOOK_BASE}${cleanEndpoint}`);
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
