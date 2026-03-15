import { WEBHOOKS, callWebhook, callWebhookWithTimeout, type WebhookResponse } from "./webhooks";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export type EstimationAction =
  | "create_project"
  | "update_status"
  | "assign_estimator"
  | "generate_estimate"
  | "calculate_accessories"
  | "calculate_waste"
  | "export_data"
  | "send_to_client"
  | "close_project"
  | "log_activity"
  | "process_pdf_vision";

export type EstimationAIAction =
  | "analyze_bidset_text"
  | "suggest_materials"
  | "review_estimate"
  | "generate_qualification";

// ── Core Estimation Action ─────────────────────────────────────────

/**
 * Call the core estimation workflow (POST /estimation-action)
 * Dispatches to one of 10 action handlers in n8n.
 */
export async function estimationAction<T = unknown>(
  action: EstimationAction,
  data: Record<string, unknown>,
  tenantId: string,
): Promise<WebhookResponse<T>> {
  return callWebhook<T>(WEBHOOKS.ESTIMATION_ACTION, { action, ...data }, tenantId);
}

// ── AI Estimation ──────────────────────────────────────────────────

/**
 * Call the AI estimation workflow (POST /estimation-ai)
 * For AI-Assisted and Autonomous mode features.
 */
export async function estimationAI<T = unknown>(
  action: EstimationAIAction,
  data: Record<string, unknown>,
  tenantId: string,
): Promise<WebhookResponse<T>> {
  return callWebhook<T>(WEBHOOKS.ESTIMATION_AI, { action, ...data }, tenantId);
}

// ── Convenience Wrappers ───────────────────────────────────────────

export async function createEstimationProject(
  data: {
    project_name: string;
    client_name: string;
    building_type?: string;
    city?: string;
    state?: string;
    trades_requested?: string[];
    [key: string]: unknown;
  },
  tenantId: string,
) {
  return estimationAction("create_project", data, tenantId);
}

export async function updateProjectStatus(
  projectId: string,
  newStatus: string,
  tenantId: string,
  notes?: string,
) {
  return estimationAction("update_status", {
    project_id: projectId,
    new_status: newStatus,
    notes,
  }, tenantId);
}

export async function generateEstimate(
  projectId: string,
  tenantId: string,
  options?: { overhead_pct?: number; profit_pct?: number; tax_pct?: number },
) {
  return estimationAction("generate_estimate", {
    project_id: projectId,
    ...options,
  }, tenantId);
}

export async function calculateAccessories(
  projectId: string,
  tenantId: string,
) {
  return estimationAction("calculate_accessories", {
    project_id: projectId,
  }, tenantId);
}

export async function calculateWaste(
  projectId: string,
  tenantId: string,
) {
  return estimationAction("calculate_waste", {
    project_id: projectId,
  }, tenantId);
}

export async function exportEstimationData(
  projectId: string,
  exportType: "quantities_xlsx" | "cost_sheet" | "qualification" | "color_coded" | "csv",
  tenantId: string,
) {
  return estimationAction("export_data", {
    project_id: projectId,
    export_type: exportType,
  }, tenantId);
}

export async function sendEstimateToClient(
  projectId: string,
  tenantId: string,
  options?: { channel?: string; recipient_email?: string },
) {
  return estimationAction("send_to_client", {
    project_id: projectId,
    ...options,
  }, tenantId);
}

export async function closeProject(
  projectId: string,
  outcome: "awarded" | "lost",
  tenantId: string,
  notes?: string,
) {
  return estimationAction("close_project", {
    project_id: projectId,
    outcome,
    notes,
  }, tenantId);
}

// ── PDF Vision Pipeline ──────────────────────────────────────────────

/**
 * Upload a PDF to Gemini Vision for room/material extraction.
 * Uses 5-minute timeout since Gemini analysis takes 1-3 minutes.
 * Returns "TIMEOUT" error if webhook doesn't respond in time —
 * caller should fall back to polling checkVisionStatus().
 */
export async function processVisionPdf(
  projectId: string,
  fileUrl: string,
  fileName: string,
  estimationMode: string,
  tenantId: string,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_ACTION, {
    action: "process_pdf_vision",
    project_id: projectId,
    file_url: fileUrl,
    file_name: fileName,
    estimation_mode: estimationMode,
  }, tenantId, 300000); // 5-minute timeout
}

/**
 * Poll bidset processing status. Used when vision webhook times out.
 * The backend creates the bidset record BEFORE Gemini analysis starts,
 * then updates ai_processing_status to "completed" or "failed".
 */
export async function checkVisionStatus(
  projectId: string,
  tenantId: string,
): Promise<{ status: string; error?: string; data?: unknown } | null> {
  const { data, error } = await supabase
    .from("estimation_bidsets" as any)
    .select("id, ai_processing_status, ai_extracted_data, ai_error_message")
    .eq("project_id", projectId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  const row = data as any;
  return {
    status: row.ai_processing_status || "unknown",
    error: row.ai_error_message || (row.ai_extracted_data?.error as string) || undefined,
    data: row.ai_extracted_data,
  };
}

// ── AI Convenience Wrappers ────────────────────────────────────────

/**
 * Analyze bidset / specification text using GPT-4o.
 * Extracts rooms, materials, and RFI candidates.
 * Mode-dependent: ai_auto inserts, ai_assisted stores in ai_suggestions, manual returns only.
 */
export async function analyzeBidsetText(
  projectId: string,
  documentText: string,
  tenantId: string,
) {
  return estimationAI("analyze_bidset_text", {
    project_id: projectId,
    document_text: documentText,
    tenant_id: tenantId,
  }, tenantId);
}

/**
 * Run AI QA review on an existing estimate.
 * Returns qa_score (0-100), issues with severity/category, and summary.
 */
export async function aiQAReview(
  projectId: string,
  tenantId: string,
) {
  return estimationAI("review_estimate", {
    project_id: projectId,
    tenant_id: tenantId,
  }, tenantId);
}

/**
 * Match specification text references against the material catalog.
 * Returns matched materials with confidence scores.
 */
export async function suggestMaterials(
  specText: string,
  tenantId: string,
) {
  return estimationAI("suggest_materials", {
    spec_text: specText,
    tenant_id: tenantId,
  }, tenantId);
}

/**
 * Generate a professional qualification letter for a project.
 * Returns letter text, assumptions, exclusions, and clarifications.
 */
export async function generateQualification(
  projectId: string,
  tenantId: string,
) {
  return estimationAI("generate_qualification", {
    project_id: projectId,
    tenant_id: tenantId,
  }, tenantId);
}
