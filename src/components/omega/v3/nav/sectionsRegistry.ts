/**
 * Phase 2A.5 — Pulse section data for NavRail, Spotlight, and Pulse Cathedral.
 * Routes audited against App.tsx 2026-05-03.
 *
 * Phase 2A had a flat NavSection shape with description/stat/agentCount.
 * Phase 2A.5 replaces it with PulseSection (layered, with a metrics list).
 * Old type names (NavSection, NavColor) are re-exported as aliases so any
 * latent imports continue to compile.
 */

export type PulseColor =
  // Phase 2A palette (still used by Spotlight via existing .orb-* classes)
  | "cyan"
  | "violet"
  | "indigo"
  | "amber"
  | "mint"
  | "rose"
  | "emerald"
  | "sky"
  // Phase 2A.5 additions (only used by Pulse cards via inline --card-color)
  | "coral"
  | "plum"
  | "teal"
  | "gold"
  | "slate";

export type PulseLayer = "operations" | "intelligence" | "reach";
export type PulsePillType = "live" | "healthy" | "warning" | "normal";

export interface PulseMetric {
  /** Displayed value. Numeric values count up on cathedral open. Non-numeric show as-is. */
  value: string;
  label: string;
  /** Render the value + label in red. Used for knowledge gaps + competitor moves. */
  isWarning?: boolean;
  /** Phase 2B.1 — when true, render "—" + italic "not configured" instead of value.
   *  Set true on metrics with no real per-tenant data source. usePulseData clears
   *  this flag when its query for the metric succeeds (and sets it true if a
   *  query that was attempted fails — speculative columns end up here). */
  notConfigured?: boolean;
}

export interface PulseSection {
  id: string;
  name: string;
  /** Subtitle line under the card name, e.g. "10 agents · 32 tools". */
  meta: string;
  route: string;
  /** lucide-react icon name. */
  icon: string;
  color: PulseColor;
  layer: PulseLayer;
  metrics: PulseMetric[];
  pillType: PulsePillType;
  pillText: string;
  enabled: boolean;
  /** Keyboard shortcut hint, e.g. "⌘1". Optional. */
  shortcut?: string;
  /** Pulse Batch 1+ — the "what your agents did" line rendered under the
   *  metrics. Null/undefined = nothing rendered. Set by usePulseData resolvers. */
  agentLine?: string | null;
  /** Batch 3 — true when the card is an elegant module-ready INVITATION
   *  (relevant-but-unconfigured). Drives a subtle CTA treatment in PulseCard. */
  moduleReady?: boolean;
}

// ---- Pulse "speak the win" contract (Batch 1 foundation) ------------------
// A SectionVital is resolved per-section in usePulseData from real per-tenant
// data and mapped onto the EXISTING PulseSection shape (headline→meta,
// vitals→metrics, state→pill/enabled, agentLine→the new span). The high-design
// render shell (Cathedral/PulseCard/ParticleSphere) is unchanged.
export type Tone = "good" | "warn" | "neutral" | "empty";
export interface Vital {
  label: string;
  value: string;
  unit?: string;
  tone: Tone;
}
export type SectionState = "active" | "module-ready" | "hidden";
export interface SectionVital {
  id: string;
  /** active = real data shown; module-ready = relevant-but-unconfigured (CTA);
   *  hidden = irrelevant to this industry (section omitted from render). */
  state: SectionState;
  /** Honest verdict → PulseSection.meta. Null keeps the registry meta. */
  headline: string | null;
  /** 2-4 real vitals → PulseSection.metrics. */
  vitals: Vital[];
  /** "What your agents did" → PulseSection.agentLine. Null = not rendered. */
  agentLine: string | null;
  /** Batch 2 — optional industry-routed card title override (e.g. clinic →
   *  "Patients", banking → "Accounts"). Undefined keeps the registry name. */
  name?: string;
  /** Batch 2 — optional pill text override (e.g. module-ready CTA "set up").
   *  Undefined keeps the registry/derived pill. */
  pill?: string;
}

// ---- Type back-compat for any latent imports (Phase 2A → Phase 2A.5)
export type NavSection = PulseSection;
export type NavColor = PulseColor;

export const SECTIONS: PulseSection[] = [
  // ===== Layer 1 — OPERATIONS (what's happening NOW) =====
  {
    id: "omega",
    name: "OMEGA",
    // Honest neutral fallback (Batch 1, P2) — real agent_actions/conversations
    // fill this via the resolver. No fabricated 81/12/99.9% even on timeout.
    meta: "cross-brain agents",
    route: "/dashboard",
    icon: "Home",
    color: "cyan",
    layer: "operations",
    shortcut: "⌘1",
    enabled: true,
    pillType: "live",
    pillText: "live",
    metrics: [],
  },
  {
    id: "sales",
    name: "Sales AI",
    // Batch 3 — neutral fallback; resolver fills real sales_leads/sequences + NOVA agentLine.
    meta: "sales pipeline",
    route: "/sales",
    icon: "TrendingUp",
    color: "amber",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    metrics: [],
  },
  {
    id: "marketing",
    name: "Marketing AI",
    // Batch 3 — neutral fallback; resolver fills real social/blog/campaign counts.
    meta: "campaigns & content",
    route: "/marketing",
    icon: "Megaphone",
    color: "rose",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    metrics: [],
  },
  {
    id: "hr",
    name: "HR AI",
    // Batch 3 — neutral fallback; resolver = active (candidates/reviews) or
    // module-ready "set up your team" when empty.
    meta: "team & hiring",
    route: "/hr",
    icon: "UserPlus",
    color: "emerald",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    metrics: [],
  },
  {
    id: "operations",
    name: "Operations",
    // Honest neutral fallback (Batch 1, P1) — real ops_* (inventory/vendors/
    // savings) fill this via the resolver. estimation_projects is no longer the
    // source (it's construction-only and 0 for clinics/restaurants).
    meta: "supply chain",
    route: "/operations",
    icon: "LayoutGrid",
    color: "indigo",
    layer: "operations",
    enabled: true,
    pillType: "healthy",
    pillText: "all healthy",
    metrics: [],
  },
  {
    id: "comms",
    name: "Communications",
    // Batch 3 — neutral fallback; resolver = active (calls/chats/emails) or
    // module-ready "connect a channel" when none enabled.
    meta: "channels & messaging",
    route: "/communications",
    icon: "Phone",
    color: "sky",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    metrics: [],
  },

  // ===== Layer 2 — INTELLIGENCE (what OMEGA KNOWS) =====
  {
    id: "intel",
    name: "Intelligence Layer",
    meta: "knowledge & training",
    route: "/settings/business-profile/knowledge", // App.tsx:1503 — KnowledgeBaseSettings
    icon: "Brain",
    color: "violet",
    layer: "intelligence",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    // Batch 3 — resolver surfaces real agent_memory; sourceless placeholders dropped.
    metrics: [],
  },
  {
    id: "industry",
    name: "Industry Verticals",
    meta: "competitor intelligence",
    route: "/settings/business-profile/company", // App.tsx:1495 — CompanyInfoSettings
    icon: "Building2",
    color: "coral",
    layer: "intelligence",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    // Batch 3 — resolver surfaces real competitor_tracking; placeholders dropped.
    metrics: [],
  },
  {
    id: "organization-brain",
    name: "Organization Brain",
    meta: "living system map",
    route: "/brain",
    icon: "Brain",
    color: "violet",
    layer: "intelligence",
    enabled: true,
    pillType: "live",
    pillText: "live",
    // Phase F — SYSTEM CONSTANTS from the generated brain manifest (platform
    // topology, identical for all tenants — like the OMEGA card, deliberately
    // NOT per-tenant and NOT notConfigured). Values = BRAIN_NODE_COUNT /
    // BRAIN_LINK_COUNT, hardcoded so the manifest stays out of the main bundle.
    metrics: [
      { value: "367", label: "entities" },
      { value: "378", label: "connections" },
      { value: "8", label: "departments" },
      { value: "live", label: "streaming" },
    ],
  },

  // ===== Layer 3 — REACH (who & where) =====
  {
    id: "inbox",
    name: "Unified Inbox",
    meta: "unified messaging",
    route: "/inbox",
    icon: "Inbox",
    color: "plum",
    layer: "reach",
    shortcut: "⌘2",
    enabled: true,
    pillType: "warning",
    pillText: "3 hot",
    // Batch 3 — resolver = active (open conversations) or module-ready "connect a channel".
    metrics: [],
  },
  {
    id: "clients",
    name: "Clients",
    // Honest neutral fallback (Batch 2, P3) — the resolver industry-routes the
    // source (clinic_patients / re_clients / collections_accounts / customers)
    // and overrides name + metrics. No fabricated "active accounts / NPS / +2 today".
    meta: "customer 360",
    route: "/customers",
    icon: "Users",
    color: "teal",
    layer: "reach",
    shortcut: "⌘3",
    enabled: true,
    pillType: "normal",
    pillText: "live",
    metrics: [],
  },
  {
    id: "analytics",
    name: "Analytics",
    // Honest neutral fallback (Batch 1, P2) — no fabricated 14/522/18M. The
    // resolver sets module-ready (no per-tenant events table is populated;
    // daily_analytics does not exist). Real metrics arrive when a source is wired.
    meta: "dashboards",
    route: "/analytics",
    icon: "BarChart3",
    color: "gold",
    layer: "reach",
    enabled: true,
    pillType: "normal",
    pillText: "open analytics",
    metrics: [],
  },
  {
    id: "settings",
    name: "Settings",
    meta: "integrations & config",
    route: "/settings",
    icon: "Settings",
    color: "slate",
    layer: "reach",
    enabled: true,
    pillType: "normal",
    pillText: "all connected",
    // Batch 3 — resolver = real integration count or module-ready "connect integrations".
    metrics: [],
  },
];

/** Cathedral hero stats (top of "Pulse" view). Unchanged from Phase 2A. */
export interface CathedralStat {
  label: string;
  value: string;
  delta: string;
  /** When true, the renderer should show "—" instead of value. Used for
   *  hero stats that have no real data source wired (e.g. Agents healthy
   *  until CORTEX /health is wired). */
  notConfigured?: boolean;
}

export const CATHEDRAL_STATS: CathedralStat[] = [
  { label: "Active leads",        value: "0",      delta: "—" },
  { label: "Conversations",       value: "0",      delta: "—" },
  { label: "Booked appointments", value: "0",      delta: "—" },
  { label: "Agents healthy",      value: "—",      delta: "—", notConfigured: true },
];

/** Spotlight rows — minimally updated. UI unchanged; only added Intelligence
 *  + Industry rows (previously absent because those sections were "Coming soon"). */
export interface SpotlightRow {
  id: string;
  group: string;
  name: string;
  sub: string;
  icon: string;
  /** Constrained to Phase 2A's 8-color palette so existing .orb-* CSS classes apply. */
  color: PulseColor;
  route?: string;
  action?: "create-sequence" | "view-hot-leads" | "send-broadcast";
  shortcut?: string;
  enabled: boolean;
}

export const SPOTLIGHT_ROWS: SpotlightRow[] = [
  // Suggested
  { id: "sug-omega",   group: "Suggested", name: "OMEGA home",   sub: "/dashboard · the home view",         icon: "Home",  color: "cyan",   route: "/dashboard", shortcut: "⌘1", enabled: true },
  { id: "sug-inbox",   group: "Suggested", name: "Unified Inbox", sub: "/inbox · all channels in one stream", icon: "Inbox", color: "violet", route: "/inbox",     shortcut: "⌘2", enabled: true },
  { id: "sug-clients", group: "Suggested", name: "Clients",      sub: "/customers · all leads + customers", icon: "Users", color: "rose",   route: "/customers", shortcut: "⌘3", enabled: true },

  // Sales AI · 10 agents
  { id: "sa-pipeline", group: "Sales AI · 10 agents", name: "Pipeline",   sub: "/sales/pipeline · live deal flow",            icon: "GitBranch", color: "amber", route: "/sales/pipeline",           enabled: true },
  { id: "sa-leads",    group: "Sales AI · 10 agents", name: "Hot leads",  sub: "/sales/dashboard · score ≥ 75",               icon: "Flame",     color: "amber", route: "/sales/dashboard",          enabled: true },
  { id: "sa-prospect", group: "Sales AI · 10 agents", name: "Prospector", sub: "/sales/auto-leadgen · autonomous lead gen",   icon: "Search",    color: "amber", route: "/sales/auto-leadgen",       enabled: true },
  { id: "sa-cadence",  group: "Sales AI · 10 agents", name: "Cadence",    sub: "/sales/sequences · multi-channel sequences",  icon: "Layers",    color: "amber", route: "/sales/sequences",          enabled: true },
  { id: "sa-scorer",   group: "Sales AI · 10 agents", name: "Scorer",     sub: "/sales/predictive-scoring · ML lead scoring", icon: "Sparkles",  color: "amber", route: "/sales/predictive-scoring", enabled: true },

  // Marketing AI · 11 agents
  { id: "ma-campaigns", group: "Marketing AI · 11 agents", name: "Campaigns", sub: "/marketing/campaigns · all running campaigns", icon: "Megaphone", color: "rose", route: "/marketing/campaigns", enabled: true },
  { id: "ma-blog",      group: "Marketing AI · 11 agents", name: "Blog",      sub: "/marketing/blogs · autonomous blog engine",     icon: "FileText",  color: "rose", route: "/marketing/blogs",     enabled: true },
  { id: "ma-social",    group: "Marketing AI · 11 agents", name: "Social",    sub: "/marketing/social · scheduled + live posts",   icon: "Share2",    color: "rose", route: "/marketing/social",    enabled: true },

  // Operations · 12 agents
  { id: "op-cmd",    group: "Operations · 12 agents", name: "Command center", sub: "/operations/command-center · live ops",      icon: "LayoutGrid",   color: "indigo", route: "/operations/command-center", enabled: true },
  { id: "op-inv",    group: "Operations · 12 agents", name: "Inventory",      sub: "/operations/inventory · stock + warehouses", icon: "Package",      color: "indigo", route: "/operations/inventory",      enabled: true },
  { id: "op-orders", group: "Operations · 12 agents", name: "Orders",         sub: "/operations/orders · open + fulfilled",      icon: "ShoppingCart", color: "indigo", route: "/operations/orders",         enabled: true },

  // Communications · 10 agents
  { id: "co-voice",    group: "Communications · 10 agents", name: "Voice AI", sub: "/communications/voice-ai · VAPI orchestrator",   icon: "Phone",         color: "emerald", route: "/communications/voice-ai", enabled: true },
  { id: "co-whatsapp", group: "Communications · 10 agents", name: "WhatsApp", sub: "/communications/whatsapp · live conversations",  icon: "MessageCircle", color: "emerald", route: "/communications/whatsapp", enabled: true },
  { id: "co-email",    group: "Communications · 10 agents", name: "Email",    sub: "/communications/email · unified email hub",      icon: "Mail",          color: "emerald", route: "/communications/email",    enabled: true },

  // HR AI · 8 agents
  { id: "hr-recruit",   group: "HR AI · 8 agents", name: "Recruitment", sub: "/hr/recruitment · 5 AI hiring agents", icon: "UserPlus", color: "mint", route: "/hr/recruitment", enabled: true },
  { id: "hr-employees", group: "HR AI · 8 agents", name: "Employees",   sub: "/hr/employees · roster + profiles",     icon: "Users",   color: "mint", route: "/hr/employees",   enabled: true },

  // Intelligence Layer · NEW in Phase 2A.5
  { id: "in-knowledge", group: "Intelligence Layer · 12 agents", name: "Knowledge base", sub: "/settings/business-profile/knowledge · docs + RAG", icon: "Brain",    color: "violet", route: "/settings/business-profile/knowledge", enabled: true },
  { id: "in-training",  group: "Intelligence Layer · 12 agents", name: "AI training",    sub: "/settings/business-profile/training · agent tuning", icon: "Sparkles", color: "violet", route: "/settings/business-profile/training",  enabled: true },
  { id: "in-brain",     group: "Intelligence Layer · 12 agents", name: "Organization Brain", sub: "/brain · live 3D system map",                    icon: "Brain",    color: "violet", route: "/brain",                               enabled: true },

  // Industry Verticals · NEW in Phase 2A.5
  { id: "iv-company", group: "Industry Verticals", name: "Tenant info", sub: "/settings/business-profile/company · industry + brand", icon: "Building2", color: "rose", route: "/settings/business-profile/company", enabled: true },

  // Quick actions
  { id: "qa-seq",       group: "Quick actions", name: "Create new sequence", sub: "/sales/sequences/new · multi-channel cadence", icon: "Plus",  color: "indigo", route: "/sales/sequences/new", action: "create-sequence", enabled: true },
  { id: "qa-hot",       group: "Quick actions", name: "View all hot leads",  sub: "/sales/dashboard · filtered by score ≥ 75",    icon: "Flame", color: "amber",  route: "/sales/dashboard",     action: "view-hot-leads",  enabled: true },
  { id: "qa-broadcast", group: "Quick actions", name: "Send broadcast",      sub: "/marketing/email · email + WhatsApp blast",    icon: "Send",  color: "rose",   route: "/marketing/email",     action: "send-broadcast",  enabled: true },
];
