/**
 * Phase F — Organization Brain: static platform topology manifest.
 *
 * Every node is real: OMEGA core, 8 departments, the agent registry, the
 * platform's voice-tool surface, and the n8n automation fabric (sanitized).
 *
 * Sanitization contract: rendered strings NEVER contain internal workflow IDs,
 * internal codenames, or tenant identities. The raw→display mapping lives in
 * docs/ORGANIZATION_BRAIN.md (kept out of the bundle deliberately).
 *
 * Workflow inventory source: on-disk export of the n8n workflow table
 * (2026-05-01) merged with the live sample verified 2026-06-11 (live active
 * count = 298; the 246 named here are those whose names exist in local
 * snapshots — refresh path documented in docs/ORGANIZATION_BRAIN.md).
 *
 * Topology decision (approved): the Brain shows the PLATFORM's full automation
 * fabric to every tenant — it IS the product. Per-tenant live counts are the
 * only tenant-scoped data (see useBrainData.ts).
 */

import { AGENT_DATA } from "@/components/omega/agentRegistry";

export type BrainDeptId =
  | "sales"
  | "marketing"
  | "hr"
  | "operations"
  | "communications"
  | "intelligence"
  | "industry"
  | "collections";

export type BrainNodeType =
  | "core"
  | "department"
  | "agent"
  | "workflow"
  | "tool"
  | "live";

export interface BrainNode {
  id: string;
  name: string;
  type: BrainNodeType;
  /** Owning department (undefined for core). */
  dept?: BrainDeptId;
  color: string;
  /** Sphere volume — core 70, dept 20, agent 7, workflow 1.4, tool 1.8, live 6. */
  val: number;
}

export interface BrainLink {
  source: string;
  target: string;
  /** Drives link distance + width. */
  tier: "core" | "dept" | "leaf" | "cross";
  color: string;
  /** Directional particle count for this link. */
  particles: number;
}

export interface BrainWorkflow {
  id: string;
  name: string;
  dept: BrainDeptId;
}

// ---- Departments (Pulse palette) -------------------------------------------

export interface BrainDept {
  id: BrainDeptId;
  name: string;
  color: string;
}

export const DEPARTMENTS: BrainDept[] = [
  { id: "sales", name: "Sales AI", color: "#F59E0B" },
  { id: "marketing", name: "Marketing AI", color: "#F43F5E" },
  { id: "hr", name: "HR AI", color: "#10B981" },
  { id: "operations", name: "Operations", color: "#6366F1" },
  { id: "communications", name: "Communications", color: "#0EA5E9" },
  { id: "intelligence", name: "Intelligence", color: "#8B5CF6" },
  { id: "industry", name: "Industry Verticals", color: "#FB7185" },
  { id: "collections", name: "Collections", color: "#EAB308" },
];

export const CORE_COLOR = "#C4B5FD";
export const TOOL_COLOR = "#14B8A6";

const DEPT_BY_ID = new Map(DEPARTMENTS.map((d) => [d.id, d]));
export const deptColor = (id: BrainDeptId): string =>
  DEPT_BY_ID.get(id)?.color ?? "#94A3B8";
export const deptName = (id: BrainDeptId): string =>
  DEPT_BY_ID.get(id)?.name ?? id;

// ---- Agents: imported from the real registry --------------------------------
// Registry sections → Brain departments. The registry's CORTEX "OMEGA" entry IS
// the core node (not duplicated). PRISM and BEACON appear in two registry
// sections; each renders once, in its specialist department (last wins).

const SECTION_TO_DEPT: Record<string, BrainDeptId> = {
  CORTEX: "intelligence",
  SALES: "sales",
  MARKETING: "marketing",
  OPERATIONS: "operations",
  HR: "hr",
  COMMS: "communications",
  INDUSTRY: "industry",
  INTEL: "intelligence",
};

export interface BrainAgent {
  name: string;
  sub: string;
  dept: BrainDeptId;
}

function buildAgents(): BrainAgent[] {
  const byName = new Map<string, BrainAgent>();
  for (const [section, agents] of Object.entries(AGENT_DATA)) {
    const dept = SECTION_TO_DEPT[section] ?? "operations";
    for (const a of agents) {
      if (a.name === "OMEGA") continue; // the core absorbs the OMEGA agent entry
      byName.set(a.name, { name: a.name, sub: a.sub, dept }); // last wins
    }
  }
  return [...byName.values()];
}

export const AGENTS: BrainAgent[] = buildAgents();

// ---- Voice tool surface (teal) ----------------------------------------------
// Curated capability names derived from the platform's real voice-tool taxonomy
// (universal assistant tool categories + industry voice tool sets + the live
// bridge). Live registry names are tenant-scoped → generalized per the
// sanitization contract. Attached to Communications-cluster agents.

export interface BrainTool {
  id: string;
  name: string;
  agent: string; // owning Communications agent
}

export const VAPI_TOOLS: BrainTool[] = [
  // customer (5) — BEACON
  { id: "tool-01", name: "Customer Lookup", agent: "BEACON" },
  { id: "tool-02", name: "Customer Create", agent: "BEACON" },
  { id: "tool-03", name: "Customer Update", agent: "BEACON" },
  { id: "tool-04", name: "Customer Merge", agent: "BEACON" },
  { id: "tool-05", name: "Customer Timeline", agent: "BEACON" },
  // conversation (4) — INBOX
  { id: "tool-06", name: "Conversation History", agent: "INBOX" },
  { id: "tool-07", name: "Conversation Summary", agent: "INBOX" },
  { id: "tool-08", name: "Conversation Tagging", agent: "INBOX" },
  { id: "tool-09", name: "Handoff to Human", agent: "INBOX" },
  // booking (5) — DIAL
  { id: "tool-10", name: "Availability Check", agent: "DIAL" },
  { id: "tool-11", name: "Book Appointment", agent: "DIAL" },
  { id: "tool-12", name: "Reschedule Appointment", agent: "DIAL" },
  { id: "tool-13", name: "Cancel Appointment", agent: "DIAL" },
  { id: "tool-14", name: "Booking Confirmation", agent: "DIAL" },
  // compliance (4) — REPLY
  { id: "tool-15", name: "DNC Check", agent: "REPLY" },
  { id: "tool-16", name: "Consent Verification", agent: "REPLY" },
  { id: "tool-17", name: "Compliance Guard", agent: "REPLY" },
  { id: "tool-18", name: "Quiet Hours Check", agent: "REPLY" },
  // send (5) — WAVE / SIGNAL / DELTA
  { id: "tool-19", name: "Send WhatsApp", agent: "WAVE" },
  { id: "tool-20", name: "Send SMS", agent: "SIGNAL" },
  { id: "tool-21", name: "Send Email", agent: "DELTA" },
  { id: "tool-22", name: "Send Voice Callback", agent: "DIAL" },
  { id: "tool-23", name: "Send Document", agent: "DELTA" },
  // query (3) — BEACON / CHIME
  { id: "tool-24", name: "Knowledge Base Search", agent: "BEACON" },
  { id: "tool-25", name: "FAQ Search", agent: "BEACON" },
  { id: "tool-26", name: "Business Data Query", agent: "BEACON" },
  // analytics (2) — CHIME
  { id: "tool-27", name: "Call Analytics", agent: "CHIME" },
  { id: "tool-28", name: "Engagement Metrics", agent: "CHIME" },
  // estimation voice set (5) — DIAL
  { id: "tool-29", name: "Project Status Lookup", agent: "DIAL" },
  { id: "tool-30", name: "Estimate Summary", agent: "DIAL" },
  { id: "tool-31", name: "Material Price Check", agent: "DIAL" },
  { id: "tool-32", name: "RFI Status", agent: "DIAL" },
  { id: "tool-33", name: "Bid Deadline Check", agent: "DIAL" },
  // collections voice set (7) — SIGNAL / WAVE
  { id: "tool-34", name: "Account Balance Lookup", agent: "SIGNAL" },
  { id: "tool-35", name: "Payment Plan Offer", agent: "SIGNAL" },
  { id: "tool-36", name: "Promise-to-Pay Capture", agent: "SIGNAL" },
  { id: "tool-37", name: "Settlement Quote", agent: "WAVE" },
  { id: "tool-38", name: "Payment Link Send", agent: "WAVE" },
  { id: "tool-39", name: "Dispute Logging", agent: "REPLY" },
  // the live cross-brain bridge (real) — BEACON
  { id: "tool-40", name: "Ask OMEGA", agent: "BEACON" },
  { id: "tool-41", name: "Supervisor Escalation", agent: "CHIME" },
];

// ---- Cross-department agent links (the system is interconnected) ------------

export const CROSS_LINKS: Array<[string, string]> = [
  ["NOVA", "MUSE"], // campaigns feed pipeline
  ["NOVA", "BEACON"], // voice outreach
  ["ECHO", "INBOX"], // reply routing
  ["VECTOR", "ORACLE-I"], // predictive scoring
  ["RIVER", "SCRY"], // company intel for ABM
  ["HARP", "DELTA"], // email sequence delivery
  ["PIXEL", "STUDIO"], // video brain for channel content
  ["ZARA", "BEACON"], // AI interview calls
  ["MEDICA", "WAVE"], // patient WhatsApp journeys
  ["COLLECTOR", "DIAL"], // collections call orchestration
  ["GRID", "CORTEX"], // ops command on system metrics
  ["ASTER", "TRACE"], // social posts vs website visits
];

// ---- Live per-tenant entity nodes (counts filled by useBrainData) -----------

export interface BrainLiveEntity {
  id: string;
  label: string;
  dept: BrainDeptId;
  dataKey: "leads" | "customers" | "conversations" | "appointments";
}

export const LIVE_ENTITIES: BrainLiveEntity[] = [
  { id: "live-leads", label: "Leads", dept: "sales", dataKey: "leads" },
  { id: "live-customers", label: "Customers", dept: "sales", dataKey: "customers" },
  { id: "live-conversations", label: "Conversations", dept: "communications", dataKey: "conversations" },
  { id: "live-appointments", label: "Appointments", dept: "operations", dataKey: "appointments" },
];

// ---- Workflows (sanitized; generated from the n8n inventory snapshot) -------

export const WORKFLOWS: BrainWorkflow[] = [
  { id: "wf-000", name: "A/B Test Engine", dept: "marketing" },
  { id: "wf-001", name: "AB Test Evaluator", dept: "marketing" },
  { id: "wf-002", name: "ABM Personalizer", dept: "marketing" },
  { id: "wf-003", name: "ABM Research", dept: "sales" },
  { id: "wf-004", name: "AEO Competitor Tracker", dept: "marketing" },
  { id: "wf-005", name: "AEO Content Optimizer", dept: "marketing" },
  { id: "wf-006", name: "AEO Intelligence Engine", dept: "marketing" },
  { id: "wf-007", name: "AI Agent Activator", dept: "intelligence" },
  { id: "wf-008", name: "AI Agent Chat", dept: "intelligence" },
  { id: "wf-009", name: "AI Agent Creator", dept: "intelligence" },
  { id: "wf-010", name: "AI Agent Learning", dept: "intelligence" },
  { id: "wf-011", name: "AI Agent Metrics", dept: "intelligence" },
  { id: "wf-012", name: "AI Lead Qualifier", dept: "sales" },
  { id: "wf-013", name: "AI Research Agent", dept: "intelligence" },
  { id: "wf-014", name: "AI Sequence Generator", dept: "sales" },
  { id: "wf-015", name: "AI Video Generator", dept: "marketing" },
  { id: "wf-016", name: "Account Mapper", dept: "sales" },
  { id: "wf-017", name: "Adapter - FB Messenger Inbound", dept: "communications" },
  { id: "wf-018", name: "Adapter - IG Comment Inbound", dept: "communications" },
  { id: "wf-019", name: "Adapter - IG DM Inbound", dept: "communications" },
  { id: "wf-020", name: "Alert Dispatcher", dept: "intelligence" },
  { id: "wf-021", name: "Auto Counter Video", dept: "marketing" },
  { id: "wf-022", name: "Auto Publish Engine", dept: "marketing" },
  { id: "wf-023", name: "Auto SEO Blog Analyzer", dept: "marketing" },
  { id: "wf-024", name: "Auto Social Trend Video", dept: "marketing" },
  { id: "wf-025", name: "Auto-Qualify Pipeline", dept: "sales" },
  { id: "wf-026", name: "AutoLeadGen Scheduler", dept: "sales" },
  { id: "wf-027", name: "Autonomous Marketing", dept: "marketing" },
  { id: "wf-028", name: "Behavioral Scorer", dept: "sales" },
  { id: "wf-029", name: "Blog Image Enricher", dept: "marketing" },
  { id: "wf-030", name: "Blog→AEO Bridge", dept: "marketing" },
  { id: "wf-031", name: "Blog→AEO Wrapper", dept: "marketing" },
  { id: "wf-032", name: "Bounce Processor", dept: "operations" },
  { id: "wf-033", name: "Bounce Reader", dept: "operations" },
  { id: "wf-034", name: "Bounce Webhook", dept: "operations" },
  { id: "wf-035", name: "Bulk Call Engine", dept: "communications" },
  { id: "wf-036", name: "Buyer Intent Scorer", dept: "sales" },
  { id: "wf-037", name: "COLLAB Outreach Sender", dept: "sales" },
  { id: "wf-038", name: "Clinic Post-Care", dept: "industry" },
  { id: "wf-039", name: "Clinic", dept: "industry" },
  { id: "wf-040", name: "Collections Engine", dept: "collections" },
  { id: "wf-041", name: "Collections VAPI", dept: "collections" },
  { id: "wf-042", name: "Comm - AI Suggested Responses", dept: "communications" },
  { id: "wf-043", name: "Comm - Analytics Aggregator", dept: "communications" },
  { id: "wf-044", name: "Comm - Channel Mapper", dept: "communications" },
  { id: "wf-045", name: "Comm - Export Conversation", dept: "communications" },
  { id: "wf-046", name: "Comm - Merge Conversations", dept: "communications" },
  { id: "wf-047", name: "Comm - Resolution Tracker", dept: "communications" },
  { id: "wf-048", name: "Comm - SLA Monitor", dept: "communications" },
  { id: "wf-049", name: "Comm - Scheduled Message Sender", dept: "communications" },
  { id: "wf-050", name: "Comm - Sentiment Analyzer", dept: "communications" },
  { id: "wf-051", name: "Comm - Voice to Inbox Sync", dept: "communications" },
  { id: "wf-052", name: "Company Intel Aggregator", dept: "intelligence" },
  { id: "wf-053", name: "Content Intelligence Engine", dept: "marketing" },
  { id: "wf-054", name: "Content Repurposer", dept: "marketing" },
  { id: "wf-055", name: "Delivery Intelligence v1.0 ()", dept: "intelligence" },
  { id: "wf-056", name: "Data Decay Detector", dept: "operations" },
  { id: "wf-057", name: "Deliverability Monitor", dept: "sales" },
  { id: "wf-058", name: "Doc Pixel Tracker", dept: "sales" },
  { id: "wf-059", name: "Doctor Avatar", dept: "industry" },
  { id: "wf-060", name: "Document Tracker", dept: "sales" },
  { id: "wf-061", name: "Duplicate Merger", dept: "operations" },
  { id: "wf-062", name: "Email Fortress", dept: "communications" },
  { id: "wf-063", name: "Email Pattern Guesser", dept: "communications" },
  { id: "wf-064", name: "Email Upgrader", dept: "communications" },
  { id: "wf-065", name: "Email Warmup Manager", dept: "sales" },
  { id: "wf-066", name: "Engagement Optimizer", dept: "marketing" },
  { id: "wf-067", name: "Engagement Responder", dept: "marketing" },
  { id: "wf-068", name: "Enrichment Connector", dept: "sales" },
  { id: "wf-069", name: "Enrichment Fortress", dept: "sales" },
  { id: "wf-070", name: "Error Handler", dept: "intelligence" },
  { id: "wf-071", name: "Estimation Document AI", dept: "industry" },
  { id: "wf-072", name: "Estimation Accuracy Engine", dept: "industry" },
  { id: "wf-073", name: "Estimation Carpet Engine", dept: "industry" },
  { id: "wf-074", name: "Estimation Cost Engine", dept: "industry" },
  { id: "wf-075", name: "Estimation Detail Engine", dept: "industry" },
  { id: "wf-076", name: "Estimation Export Engine", dept: "industry" },
  { id: "wf-077", name: "Estimation File Manager", dept: "industry" },
  { id: "wf-078", name: "Estimation Learning Engine", dept: "industry" },
  { id: "wf-079", name: "Plan Document Dissector", dept: "industry" },
  { id: "wf-080", name: "Estimation Paint Engine", dept: "industry" },
  { id: "wf-081", name: "Estimation Scope Engine", dept: "industry" },
  { id: "wf-082", name: "Estimation Spec Engine", dept: "industry" },
  { id: "wf-083", name: "Estimation Transition Engine", dept: "industry" },
  { id: "wf-084", name: "Estimation Workspace Actions", dept: "industry" },
  { id: "wf-085", name: "Estimation Voice Tools", dept: "industry" },
  { id: "wf-086", name: "Estimation Vision Processor", dept: "industry" },
  { id: "wf-087", name: "Estimation Waste Recalculator", dept: "industry" },
  { id: "wf-088", name: "Estimation Action Engine", dept: "industry" },
  { id: "wf-089", name: "Forecast Pipeline", dept: "sales" },
  { id: "wf-090", name: "Funding Alert Scanner", dept: "intelligence" },
  { id: "wf-091", name: "GDPR Consent Tracker", dept: "communications" },
  { id: "wf-092", name: "Google Maps Discovery", dept: "operations" },
  { id: "wf-093", name: "HR AI Interview Call", dept: "hr" },
  { id: "wf-094", name: "HR Auto-Pipeline", dept: "hr" },
  { id: "wf-095", name: "HR Leave Request", dept: "hr" },
  { id: "wf-096", name: "HR Onboarding", dept: "hr" },
  { id: "wf-097", name: "HR Part 2", dept: "hr" },
  { id: "wf-098", name: "HR Recruitment Approve-Outreach", dept: "hr" },
  { id: "wf-099", name: "HR Recruitment Outreach", dept: "hr" },
  { id: "wf-100", name: "HR part1", dept: "hr" },
  { id: "wf-101", name: "Hiring Signal Detector", dept: "sales" },
  { id: "wf-102", name: "Icebreaker Injector", dept: "operations" },
  { id: "wf-103", name: "Inbox Rotator", dept: "sales" },
  { id: "wf-104", name: "Intelligence Hub", dept: "intelligence" },
  { id: "wf-105", name: "LTV:CAC Pipeline", dept: "sales" },
  { id: "wf-106", name: "LangGraph Bridge v1.1 CLEAN", dept: "operations" },
  { id: "wf-107", name: "Lead Magnet Handler", dept: "sales" },
  { id: "wf-108", name: "LinkedIn Discovery", dept: "operations" },
  { id: "wf-109", name: "LinkedIn Viewer", dept: "operations" },
  { id: "wf-110", name: "Manual Email Engine", dept: "communications" },
  { id: "wf-111", name: "Marketing Predictions", dept: "marketing" },
  { id: "wf-112", name: "Marketing Self-Learn", dept: "marketing" },
  { id: "wf-113", name: "Marketing Autonomy Engine", dept: "marketing" },
  { id: "wf-114", name: "Meeting Scheduler", dept: "sales" },
  { id: "wf-115", name: "OMEGA Alert Monitor", dept: "intelligence" },
  { id: "wf-116", name: "OMEGA Autonomous", dept: "intelligence" },
  { id: "wf-117", name: "OMEGA Campaign Executor", dept: "marketing" },
  { id: "wf-118", name: "OMEGA Daily Briefing", dept: "intelligence" },
  { id: "wf-119", name: "OMEGA Heartbeat Daily", dept: "intelligence" },
  { id: "wf-120", name: "OMEGA Lead Gen Async", dept: "sales" },
  { id: "wf-121", name: "OMEGA TTS Proxy", dept: "intelligence" },
  { id: "wf-122", name: "Onboarding Monitor", dept: "intelligence" },
  { id: "wf-123", name: "Onboarding Orchestrator", dept: "intelligence" },
  { id: "wf-124", name: "Paddle Webhook", dept: "operations" },
  { id: "wf-125", name: "Part 39B - Social Content Publisher", dept: "marketing" },
  { id: "wf-126", name: "Personalized Image", dept: "marketing" },
  { id: "wf-127", name: "Phone Validator", dept: "operations" },
  { id: "wf-128", name: "Predictive Scoring", dept: "sales" },
  { id: "wf-129", name: "Provision Agents", dept: "operations" },
  { id: "wf-130", name: "Provision Comms", dept: "operations" },
  { id: "wf-131", name: "Provision HR", dept: "operations" },
  { id: "wf-132", name: "Provision Marketing", dept: "marketing" },
  { id: "wf-133", name: "Provision Ops", dept: "operations" },
  { id: "wf-134", name: "Provision Sales", dept: "sales" },
  { id: "wf-135", name: "Provision Voice", dept: "communications" },
  { id: "wf-136", name: "RE Auto-Matcher", dept: "operations" },
  { id: "wf-137", name: "RE Compliance Monitor", dept: "intelligence" },
  { id: "wf-138", name: "RE Deal Orchestrator Approve", dept: "sales" },
  { id: "wf-139", name: "RE Deal Orchestrator", dept: "sales" },
  { id: "wf-140", name: "RE Developer API Gateway", dept: "operations" },
  { id: "wf-141", name: "RE Intelligence", dept: "intelligence" },
  { id: "wf-142", name: "RE Investment Advisor", dept: "operations" },
  { id: "wf-143", name: "RE Lead Scorer", dept: "sales" },
  { id: "wf-144", name: "RE Market Forecaster", dept: "sales" },
  { id: "wf-145", name: "RE Market Scraper", dept: "operations" },
  { id: "wf-146", name: "RE Mortgage Calculator", dept: "operations" },
  { id: "wf-147", name: "RE Off-Plan Matcher", dept: "operations" },
  { id: "wf-148", name: "RE Portfolio Updater", dept: "operations" },
  { id: "wf-149", name: "RE Price Intelligence", dept: "intelligence" },
  { id: "wf-150", name: "RE Proposal Generator", dept: "sales" },
  { id: "wf-151", name: "RE WhatsApp Journey", dept: "communications" },
  { id: "wf-152", name: "Real Estate Automations", dept: "industry" },
  { id: "wf-153", name: "Real Estate", dept: "industry" },
  { id: "wf-154", name: "Referral Engine", dept: "sales" },
  { id: "wf-155", name: "Reply Processor", dept: "sales" },
  { id: "wf-156", name: "Reply Router", dept: "sales" },
  { id: "wf-157", name: "SEO Analyzer", dept: "marketing" },
  { id: "wf-158", name: "SMS Outbound", dept: "communications" },
  { id: "wf-159", name: "SMS Sender", dept: "communications" },
  { id: "wf-160", name: "SMTP Config Rotator", dept: "operations" },
  { id: "wf-161", name: "SMTP Test", dept: "operations" },
  { id: "wf-162", name: "Critical Path Sentinel", dept: "intelligence" },
  { id: "wf-163", name: "Score Decay", dept: "sales" },
  { id: "wf-164", name: "Signal Stacker", dept: "sales" },
  { id: "wf-165", name: "Smart Send Pre-processor", dept: "operations" },
  { id: "wf-166", name: "Smart Send Time", dept: "operations" },
  { id: "wf-167", name: "Social Listener", dept: "marketing" },
  { id: "wf-168", name: "Social Queue Publisher", dept: "marketing" },
  { id: "wf-169", name: "Subsequence Manager", dept: "sales" },
  { id: "wf-170", name: "Super Enrichment", dept: "sales" },
  { id: "wf-171", name: "Technographic Scanner", dept: "operations" },
  { id: "wf-172", name: "Template Enricher", dept: "sales" },
  { id: "wf-173", name: "Autonomous Health Audit", dept: "intelligence" },
  { id: "wf-174", name: "Tenant Provisioner", dept: "operations" },
  { id: "wf-175", name: "Trigger Event Engine", dept: "operations" },
  { id: "wf-176", name: "Client Reminders Engine", dept: "industry" },
  { id: "wf-177", name: "Universal VAPI", dept: "communications" },
  { id: "wf-178", name: "VAPI-OMEGA Bridge", dept: "communications" },
  { id: "wf-179", name: "Video AI — AIDA Intelligence Loop", dept: "marketing" },
  { id: "wf-180", name: "Video AI — Autonomous Monitor", dept: "marketing" },
  { id: "wf-181", name: "Video AI — Sales Integration", dept: "marketing" },
  { id: "wf-182", name: "Video Auto-Creator Bridge", dept: "marketing" },
  { id: "wf-183", name: "Video Auto-Creator", dept: "marketing" },
  { id: "wf-184", name: "Video Intelligence Orchestrator", dept: "marketing" },
  { id: "wf-185", name: "Video Render Watchdog", dept: "marketing" },
  { id: "wf-186", name: "Voice Marketing", dept: "marketing" },
  { id: "wf-187", name: "Voice Outbound", dept: "communications" },
  { id: "wf-188", name: "Warmup Enforcer", dept: "sales" },
  { id: "wf-189", name: "Website Blog Subscribe", dept: "marketing" },
  { id: "wf-190", name: "Website CTA Click Tracker", dept: "operations" },
  { id: "wf-191", name: "Website Exit Lead", dept: "sales" },
  { id: "wf-192", name: "Website Intent", dept: "sales" },
  { id: "wf-193", name: "Website Visitor Tracker", dept: "sales" },
  { id: "wf-194", name: "WhatsApp Outbound", dept: "communications" },
  { id: "wf-195", name: "Omnichannel Orchestrator", dept: "communications" },
  { id: "wf-196", name: "Core Operations Engine", dept: "operations" },
  { id: "wf-197", name: "Sales Automation Engine", dept: "sales" },
  { id: "wf-198", name: "sales part 2", dept: "sales" },
  { id: "wf-199", name: "420-api-pool-daily-reset", dept: "operations" },
  { id: "wf-200", name: "420-search-cascade-v1", dept: "operations" },
  { id: "wf-201", name: "Restaurant Dispatch Auto-Assign", dept: "industry" },
  { id: "wf-202", name: "OPS - GUARDIAN Quality Monitor", dept: "intelligence" },
  { id: "wf-203", name: "OPS — Agent Dispatcher", dept: "operations" },
  { id: "wf-204", name: "OPS — Agent Performance Weekly Score", dept: "sales" },
  { id: "wf-205", name: "OPS — BUYER Delivery Tracker", dept: "operations" },
  { id: "wf-206", name: "OPS — BUYER Process Reorders", dept: "operations" },
  { id: "wf-207", name: "OPS — COURIER Process Returns", dept: "operations" },
  { id: "wf-208", name: "OPS — COURIER Tracking Poller", dept: "operations" },
  { id: "wf-209", name: "OPS — Currency Risk Monitor", dept: "intelligence" },
  { id: "wf-210", name: "OPS — DIPLOMAT Monthly Scoring", dept: "sales" },
  { id: "wf-211", name: "OPS — Emergency Stop", dept: "operations" },
  { id: "wf-212", name: "OPS — FACTORY Daily Planning", dept: "operations" },
  { id: "wf-213", name: "OPS — Full Autonomy Monitor", dept: "intelligence" },
  { id: "wf-214", name: "OPS — GUARDIAN Monthly Compliance", dept: "operations" },
  { id: "wf-215", name: "OPS — NEXUS Daily Briefing", dept: "intelligence" },
  { id: "wf-216", name: "OPS — Notification Router", dept: "communications" },
  { id: "wf-217", name: "OPS — OPTIMIZER Weekly Report", dept: "operations" },
  { id: "wf-218", name: "OPS — ORACLE Daily Forecast", dept: "sales" },
  { id: "wf-219", name: "OPS — SENTINEL Anomaly Detection", dept: "intelligence" },
  { id: "wf-220", name: "OPS — SENTINEL QC Webhook", dept: "intelligence" },
  { id: "wf-221", name: "OPS — SLA Monitor", dept: "intelligence" },
  { id: "wf-222", name: "OPS — STOCKMASTER Reorder Monitor", dept: "intelligence" },
  { id: "wf-223", name: "OPS — TREASURER Daily Budget Alert", dept: "intelligence" },
  { id: "wf-224", name: "R-ROOFING-01 Inspection Scheduler", dept: "industry" },
  { id: "wf-225", name: "R-ROOFING-02 Insurance Claim Orchestrator", dept: "industry" },
  { id: "wf-226", name: "R-ROOFING-03 Storm Event Trigger", dept: "industry" },
  { id: "wf-227", name: "R-ROOFING-04 Warranty & Maintenance Recall", dept: "industry" },
  { id: "wf-228", name: "TENDER — Payment Aging Clock", dept: "industry" },
  { id: "wf-229", name: "TENDER — Security Deposit Maturity", dept: "industry" },
  { id: "wf-230", name: "TENDER — Stage Progression Webhook", dept: "industry" },
  { id: "wf-231", name: "YT-AssetGen", dept: "industry" },
  { id: "wf-232", name: "YT-Audit", dept: "industry" },
  { id: "wf-233", name: "YT-CompetitorDiscover", dept: "industry" },
  { id: "wf-234", name: "YT-CompetitorMonitor", dept: "industry" },
  { id: "wf-235", name: "YT-DailyDiscovery", dept: "industry" },
  { id: "wf-236", name: "YT-DailyFollowups", dept: "industry" },
  { id: "wf-237", name: "YT-DailyOutreach", dept: "industry" },
  { id: "wf-238", name: "YT-DailySummary", dept: "industry" },
  { id: "wf-239", name: "YT-EnrichEmails", dept: "industry" },
  { id: "wf-240", name: "YT-Outreach", dept: "industry" },
  { id: "wf-241", name: "YT-ReplyMonitor", dept: "industry" },
  { id: "wf-242", name: "YT-ReportGen", dept: "industry" },
  { id: "wf-243", name: "YT-SEO", dept: "industry" },
  { id: "wf-244", name: "YT-ScriptWriter", dept: "industry" },
  { id: "wf-245", name: "YT-TrendDetector", dept: "industry" },
];

// ---- Graph assembly ----------------------------------------------------------

export function buildBrainGraph(): { nodes: BrainNode[]; links: BrainLink[] } {
  const nodes: BrainNode[] = [];
  const links: BrainLink[] = [];

  nodes.push({ id: "core", name: "OMEGA", type: "core", color: CORE_COLOR, val: 70 });

  for (const d of DEPARTMENTS) {
    nodes.push({ id: `dept-${d.id}`, name: d.name, type: "department", dept: d.id, color: d.color, val: 20 });
    links.push({ source: "core", target: `dept-${d.id}`, tier: "core", color: d.color, particles: 4 });
  }

  for (const a of AGENTS) {
    nodes.push({ id: `agent-${a.name}`, name: a.name, type: "agent", dept: a.dept, color: deptColor(a.dept), val: 7 });
    links.push({ source: `dept-${a.dept}`, target: `agent-${a.name}`, tier: "dept", color: deptColor(a.dept), particles: 2 });
  }

  for (const t of VAPI_TOOLS) {
    nodes.push({ id: t.id, name: t.name, type: "tool", dept: "communications", color: TOOL_COLOR, val: 1.8 });
    links.push({ source: `agent-${t.agent}`, target: t.id, tier: "leaf", color: TOOL_COLOR, particles: 0 });
  }

  WORKFLOWS.forEach((w, i) => {
    nodes.push({ id: w.id, name: w.name, type: "workflow", dept: w.dept, color: deptColor(w.dept), val: 1.4 });
    links.push({ source: `dept-${w.dept}`, target: w.id, tier: "leaf", color: deptColor(w.dept), particles: i % 3 === 0 ? 1 : 0 });
  });

  for (const [a, b] of CROSS_LINKS) {
    links.push({ source: `agent-${a}`, target: `agent-${b}`, tier: "cross", color: "#7C8DB5", particles: 2 });
  }

  for (const e of LIVE_ENTITIES) {
    nodes.push({ id: e.id, name: e.label, type: "live", dept: e.dept, color: deptColor(e.dept), val: 6 });
    links.push({ source: `dept-${e.dept}`, target: e.id, tier: "dept", color: deptColor(e.dept), particles: 2 });
  }

  return { nodes, links };
}

// System constants (also hardcoded on the Pulse card per the build contract).
const BUILT = buildBrainGraph();
export const BRAIN_NODE_COUNT = BUILT.nodes.length;
export const BRAIN_LINK_COUNT = BUILT.links.length;
