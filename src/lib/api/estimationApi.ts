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

export type EstimationLearningAction =
  | "capture_project_data"
  | "get_learning_insights"
  | "apply_learning";

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
    .select("id, ai_processing_status, ai_extracted_data")
    .eq("project_id", projectId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  const row = data as any;
  return {
    status: row.ai_processing_status || "unknown",
    error: (row.ai_extracted_data?.error as string) || undefined,
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

// ── Learning Engine (Phase H4) ────────────────────────────────────

export async function estimationLearning<T = unknown>(
  action: EstimationLearningAction,
  data: Record<string, unknown>,
  tenantId: string,
): Promise<WebhookResponse<T>> {
  return callWebhook<T>(WEBHOOKS.ESTIMATION_LEARNING, { action, ...data }, tenantId);
}

export async function getLearningStats(tenantId: string) {
  return estimationLearning("apply_learning", {}, tenantId);
}

// ── Cost Engine (Phase H5) ────────────────────────────────────────

export async function calculateProjectCost(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_COST, {
    action: "calculate_project_cost",
    project_id: projectId,
  }, tenantId);
}

// ── Export Engine v2 (Phase 1 — Material-Wise) ──────────────────

export async function parseRoomDetails(
  projectId: string,
  tenantId: string,
  mode: string = "heuristic",
) {
  return callWebhook(WEBHOOKS.ESTIMATION_DETAILS, {
    project_id: projectId,
    mode,
  }, tenantId);
}

export async function parseScope(
  projectId: string,
  tenantId: string,
  scopeText: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_SCOPE, {
    action: "parse_scope",
    project_id: projectId,
    scope_text: scopeText,
  }, tenantId);
}

export async function getScopeSummary(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_SCOPE, {
    action: "get_scope_summary",
    project_id: projectId,
  }, tenantId);
}

export async function parseSpecs(
  projectId: string,
  tenantId: string,
  specText: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_SPECS, {
    action: "parse_specs",
    project_id: projectId,
    spec_text: specText,
  }, tenantId);
}

export async function applyAtticStock(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_SPECS, {
    action: "apply_attic_stock",
    project_id: projectId,
  }, tenantId);
}

export async function listProjectFiles(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_FILES, {
    action: "list_files",
    project_id: projectId,
  }, tenantId);
}

export async function registerFile(
  projectId: string,
  tenantId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  pageCount?: number,
  documentType?: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_FILES, {
    action: "register_file",
    project_id: projectId,
    file_name: fileName,
    file_url: fileUrl,
    file_size: fileSize,
    page_count: pageCount,
    document_type: documentType,
  }, tenantId);
}

export async function calculatePaint(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_PAINT, {
    project_id: projectId,
  }, tenantId);
}

export async function calculateCarpet(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_CARPET, {
    project_id: projectId,
  }, tenantId);
}

export async function calculateTransitions(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_TRANSITIONS, {
    project_id: projectId,
  }, tenantId);
}

export async function dissectPdf(
  projectId: string,
  pdfUrl: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_DISSECT, {
    project_id: projectId,
    pdf_url: pdfUrl,
  }, tenantId);
}

/**
 * Global material catalog (estimation_materials, tenant_id='global'): tag -> name/trade.
 * Used to annotate the Apply-Materials dialog so the estimator sees which drawing tags
 * resolve to a catalog product and which are unmatched (their mapping to-do).
 */
export async function getMaterialCatalog() {
  const { data, error } = await supabase
    .from("estimation_materials" as any)
    .select("material_tag,material_name,trade")
    .eq("tenant_id", "global")
    .not("material_tag", "is", null);
  if (error) throw error;
  return (data || []) as unknown as { material_tag: string; material_name: string | null; trade: string | null }[];
}

export async function getDissectedPages(projectId: string) {
  const { data, error } = await supabase
    .from("estimation_drawing_pages" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("page_number", { ascending: true });
  if (error) throw error;
  return data;
}

// ── Estimation v2 — Drawings tab actions (PDF Dissector via n8n bridge) ──
// Vector-only: the bridge hardcodes use_hybrid:false (vision bbox blocker still open).

export async function detectRoomsV2(
  projectId: string,
  tenantSlug: string,
  pageNumber: number,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "detect_rooms",
    project_id: projectId,
    page_number: pageNumber,
  }, tenantSlug, 120000);
}

export async function renderMarkupV2(
  projectId: string,
  tenantSlug: string,
  pageNumber: number,
  pdfUrl?: string,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "render_markup",
    project_id: projectId,
    page_number: pageNumber,
    ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
  }, tenantSlug, 120000);
}

/**
 * Push detected v2 rooms into v1's estimation_rooms (idempotent, skip-existing).
 * Omit pageNumber to sync every page with detected polygons.
 */
export async function syncToV1(
  projectId: string,
  tenantSlug: string,
  pageNumber?: number,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "sync_to_v1",
    project_id: projectId,
    ...(pageNumber != null ? { page_number: pageNumber } : {}),
  }, tenantSlug, 120000);
}

/**
 * QA check for one drawing page (scale truth + area sanity). Gemini-free.
 * applyFixes=true repairs polygon areas + provably-synced v1 rooms; the service
 * refuses to apply low-confidence scales.
 */
export async function qaCheck(
  projectId: string,
  tenantSlug: string,
  pageNumber: number,
  applyFixes: boolean = false,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "qa_check",
    project_id: projectId,
    page_number: pageNumber,
    apply_fixes: applyFixes,
  }, tenantSlug, 120000);
}

/** Parse a finish-schedule page's stored text into room→material rows (one Gemini text call). */
export async function parseSchedule(
  projectId: string,
  tenantSlug: string,
  pageNumber: number,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "parse_schedule",
    project_id: projectId,
    page_number: pageNumber,
  }, tenantSlug, 240000);
}

/**
 * Extract material tags printed inside rooms on a finish/floor plan (pure geometry,
 * Gemini-free): tag spans land in detected room polygons → estimation_room_finishes
 * rows (source='spatial_plan'). Requires Detect Rooms to have run on the page.
 */
export async function extractPlanMaterials(
  projectId: string,
  tenantSlug: string,
  pageNumber: number,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "extract_plan_materials",
    project_id: projectId,
    page_number: pageNumber,
  }, tenantSlug, 240000);
}

/**
 * Match parsed finishes to rooms and seed takeoff items. dryRun=true (default)
 * returns the plan only; the UI always shows the plan before a real apply.
 */
export async function applyFinishes(
  projectId: string,
  tenantSlug: string,
  dryRun: boolean = true,
) {
  return callWebhookWithTimeout(WEBHOOKS.ESTIMATION_V2_ACTION, {
    action: "apply_finishes",
    project_id: projectId,
    dry_run: dryRun,
  }, tenantSlug, 120000);
}

export async function recalculateWaste(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_WASTE_RECALC, {
    project_id: projectId,
  }, tenantId);
}

export async function getMaterialSummary(
  projectId: string,
  tenantId: string,
) {
  return callWebhook(WEBHOOKS.ESTIMATION_EXPORT_V2, {
    action: "material_summary",
    project_id: projectId,
  }, tenantId);
}
