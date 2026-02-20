import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Environment variables with fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fncfbywkemsxwuiowxxe.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjgyNzUsImV4cCI6MjA4MjQ0NDI3NX0.wlccZnaj9Awd03LkDSaSlZFqIiSSOgOedX-aCsqeLek";

// N8N Webhook base URL
export const N8N_WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhooks.zatesystems.com/webhook";

// Create Supabase client with proper auth configuration
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
    detectSessionInUrl: true,
  },
});

// Webhook endpoints for N8N integration
export const WEBHOOKS = {
  // Sales
  LEAD_UPLOAD: "sales-upload",
  LEAD_GEN_B2B: "lead-gen-request",
  LEAD_GEN_B2C: "intent-lead-gen",
  DEAL_CREATE: "deal-create",
  DEAL_UPDATE: "deal-update",
  LEAD_CONTROL: "lead-control",
  AUTOMATION_CONTROL: "automation-control",

  // Main
  SEND_MESSAGE: "send-message",
  BOOK_APPOINTMENT: "book-appointment",

  // Marketing
  SEND_CAMPAIGN: "marketing/send-campaign",
  GENERATE_CONTENT: "marketing/generate-content",
  GENERATE_IMAGE: "marketing/generate-image",
  POST_SOCIAL: "marketing/post-social",
  SCHEDULE_POST: "marketing/schedule-post",
  LANDING_PAGE_GENERATE: "marketing/landing-page-generate",
  AB_TEST_CREATE: "marketing/ab-test-create",
  EMAIL_TEMPLATE_GENERATE: "marketing/email-template-generate",
} as const;

export type WebhookEndpoint = (typeof WEBHOOKS)[keyof typeof WEBHOOKS];

/**
 * Add tenant filter to any Supabase query
 * @param query - The Supabase query builder
 * @param tenantId - The tenant ID to filter by
 * @returns The query with tenant filter applied
 */
export function withTenantFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  tenantId: string,
): T {
  return query.eq("tenant_id", tenantId);
}

/**
 * Call an N8N webhook endpoint
 * @param endpoint - The webhook endpoint (use WEBHOOKS constants)
 * @param data - The data to send to the webhook
 * @param tenantId - The tenant ID for the request
 * @returns The webhook response data
 */
export async function callWebhook(
  endpoint: WebhookEndpoint | string,
  data: Record<string, unknown>,
  tenantId: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const url = `${N8N_WEBHOOK_BASE}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId,
      },
      body: JSON.stringify({
        ...data,
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
      data: responseData,
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
 * Create a tenant-scoped query builder
 * Automatically adds tenant_id filter to all queries
 */
export function createTenantQuery(tenantId: string) {
  return {
    from: (table: string) => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: (columns = "*"): any => {
          const query = supabase.from(table).select(columns);
          return query.eq("tenant_id", tenantId);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insert: (values: Record<string, unknown> | Record<string, unknown>[]): any => {
          if (Array.isArray(values)) {
            return supabase.from(table).insert(values.map((v) => ({ ...v, tenant_id: tenantId })));
          }
          return supabase.from(table).insert({ ...values, tenant_id: tenantId });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: (values: Record<string, unknown>): any => {
          return supabase.from(table).update(values).eq("tenant_id", tenantId);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete: (): any => {
          return supabase.from(table).delete().eq("tenant_id", tenantId);
        },
      };
    },
  };
}

// Re-export types
export type { User, Session } from "@supabase/supabase-js";
