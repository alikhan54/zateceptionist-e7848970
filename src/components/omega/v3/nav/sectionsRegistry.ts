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
}

// ---- Type back-compat for any latent imports (Phase 2A → Phase 2A.5)
export type NavSection = PulseSection;
export type NavColor = PulseColor;

export const SECTIONS: PulseSection[] = [
  // ===== Layer 1 — OPERATIONS (what's happening NOW) =====
  {
    id: "omega",
    name: "OMEGA",
    meta: "12 agents · 79 tools",
    route: "/dashboard",
    icon: "Home",
    color: "cyan",
    layer: "operations",
    shortcut: "⌘1",
    enabled: true,
    pillType: "live",
    pillText: "live",
    metrics: [
      { value: "79", label: "tools active" },
      { value: "12", label: "core agents" },
      { value: "4", label: "LangGraph brains" },
      { value: "99.9%", label: "uptime" },
    ],
  },
  {
    id: "sales",
    name: "Sales AI",
    meta: "10 agents · 32 tools",
    route: "/sales",
    icon: "TrendingUp",
    color: "amber",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "+24% week",
    metrics: [
      { value: "522", label: "in pipeline" },
      { value: "47", label: "sequences active" },
      { value: "12", label: "contacted today" },
      { value: "3", label: "hot leads" },
      { value: "$1.2M", label: "ARR managed" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing AI",
    meta: "11 agents · 28 tools",
    route: "/marketing",
    icon: "Megaphone",
    color: "rose",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "8 campaigns",
    metrics: [
      { value: "8", label: "campaigns live" },
      { value: "24", label: "posts this week" },
      { value: "64", label: "leads from blog" },
      { value: "1.2k", label: "IG followers" },
      { value: "+12%", label: "engagement" },
    ],
  },
  {
    id: "hr",
    name: "HR AI",
    meta: "8 agents · 18 tools",
    route: "/hr",
    icon: "UserPlus",
    color: "emerald",
    layer: "operations",
    enabled: true,
    pillType: "normal",
    pillText: "7 open",
    metrics: [
      { value: "7", label: "open roles" },
      { value: "3", label: "onboarding" },
      { value: "2", label: "reviews due" },
      { value: "94%", label: "team capacity" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    meta: "12 agents · 41 tools",
    route: "/operations",
    icon: "LayoutGrid",
    color: "indigo",
    layer: "operations",
    enabled: true,
    pillType: "healthy",
    pillText: "all healthy",
    metrics: [
      { value: "18", label: "active projects" },
      { value: "11", label: "estimates pending" },
      { value: "22", label: "dispatches today" },
      { value: "96%", label: "SLA met" },
    ],
  },
  {
    id: "comms",
    name: "Communications",
    meta: "10 agents · 41 tools",
    route: "/communications",
    icon: "Phone",
    color: "sky",
    layer: "operations",
    enabled: true,
    pillType: "live",
    pillText: "12 live now",
    metrics: [
      { value: "12", label: "calls today" },
      { value: "47", label: "WhatsApp chats" },
      { value: "94", label: "emails sent" },
      { value: "41", label: "VAPI tools" },
    ],
  },

  // ===== Layer 2 — INTELLIGENCE (what OMEGA KNOWS) =====
  {
    id: "intel",
    name: "Intelligence Layer",
    meta: "12 agents · 80 trained",
    route: "/settings/business-profile/knowledge", // App.tsx:1503 — KnowledgeBaseSettings
    icon: "Brain",
    color: "violet",
    layer: "intelligence",
    enabled: true,
    pillType: "warning",
    pillText: "3 gaps",
    metrics: [
      { value: "4.2k", label: "docs ingested" },
      { value: "2.1M", label: "tokens indexed" },
      { value: "78%", label: "knowledge confidence" },
      { value: "3", label: "knowledge gaps", isWarning: true },
      { value: "80", label: "agents trained" },
    ],
  },
  {
    id: "industry",
    name: "Industry Verticals",
    meta: "8 competitors · monitored",
    route: "/settings/business-profile/company", // App.tsx:1495 — CompanyInfoSettings
    icon: "Building2",
    color: "coral",
    layer: "intelligence",
    enabled: true,
    pillType: "warning",
    pillText: "3 alerts",
    metrics: [
      { value: "SaaS", label: "tenant industry" },
      { value: "8", label: "competitors tracked" },
      { value: "3", label: "moves this week", isWarning: true },
      { value: "Top 12%", label: "lead velocity" },
      { value: "Top 8%", label: "pipeline volume" },
    ],
  },

  // ===== Layer 3 — REACH (who & where) =====
  {
    id: "inbox",
    name: "Unified Inbox",
    meta: "10 channels",
    route: "/inbox",
    icon: "Inbox",
    color: "plum",
    layer: "reach",
    shortcut: "⌘2",
    enabled: true,
    pillType: "warning",
    pillText: "3 hot",
    metrics: [
      { value: "10", label: "channels active" },
      { value: "17", label: "conversations" },
      { value: "3", label: "hot threads" },
      { value: "2", label: "awaiting response" },
    ],
  },
  {
    id: "clients",
    name: "Clients",
    meta: "17 active",
    route: "/customers",
    icon: "Users",
    color: "teal",
    layer: "reach",
    shortcut: "⌘3",
    enabled: true,
    pillType: "normal",
    pillText: "+2 today",
    metrics: [
      { value: "17", label: "total clients" },
      { value: "+2", label: "today" },
      { value: "14", label: "active accounts" },
      { value: "8.4", label: "avg NPS" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    meta: "14 dashboards · live",
    route: "/analytics",
    icon: "BarChart3",
    color: "gold",
    layer: "reach",
    enabled: true,
    pillType: "live",
    pillText: "live",
    metrics: [
      { value: "14", label: "dashboards" },
      { value: "522", label: "events / hr" },
      { value: "18M", label: "datapoints" },
      { value: "live", label: "streaming" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    meta: "22 integrations",
    route: "/settings",
    icon: "Settings",
    color: "slate",
    layer: "reach",
    enabled: true,
    pillType: "normal",
    pillText: "all connected",
    metrics: [
      { value: "22", label: "integrations connected" },
      { value: "Knowledge base", label: "managed" },
      { value: "AI training", label: "active" },
      { value: "Company info", label: "configured" },
    ],
  },
];

/** Cathedral hero stats (top of "Pulse" view). Unchanged from Phase 2A. */
export interface CathedralStat {
  label: string;
  value: string;
  delta: string;
}

export const CATHEDRAL_STATS: CathedralStat[] = [
  { label: "Active leads",        value: "522",    delta: "↗ +38 this week" },
  { label: "Conversations",       value: "94",     delta: "↗ +12% today" },
  { label: "Booked appointments", value: "18",     delta: "↗ +3 today" },
  { label: "Agents healthy",      value: "88/88",  delta: "all systems online" },
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

  // Industry Verticals · NEW in Phase 2A.5
  { id: "iv-company", group: "Industry Verticals", name: "Tenant info", sub: "/settings/business-profile/company · industry + brand", icon: "Building2", color: "rose", route: "/settings/business-profile/company", enabled: true },

  // Quick actions
  { id: "qa-seq",       group: "Quick actions", name: "Create new sequence", sub: "/sales/sequences/new · multi-channel cadence", icon: "Plus",  color: "indigo", route: "/sales/sequences/new", action: "create-sequence", enabled: true },
  { id: "qa-hot",       group: "Quick actions", name: "View all hot leads",  sub: "/sales/dashboard · filtered by score ≥ 75",    icon: "Flame", color: "amber",  route: "/sales/dashboard",     action: "view-hot-leads",  enabled: true },
  { id: "qa-broadcast", group: "Quick actions", name: "Send broadcast",      sub: "/marketing/email · email + WhatsApp blast",    icon: "Send",  color: "rose",   route: "/marketing/email",     action: "send-broadcast",  enabled: true },
];
