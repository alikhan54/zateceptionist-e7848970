/**
 * Phase 2A — section data for NavRail, Spotlight, and Cathedral.
 * Single source of truth. Routes audited against App.tsx 2026-05-03.
 */

export type NavColor =
  | "cyan"
  | "violet"
  | "indigo"
  | "amber"
  | "mint"
  | "rose"
  | "emerald"
  | "sky";

export interface NavSection {
  id: string;
  name: string;
  route: string;
  icon: string; // lucide-react name (string-keyed for serialization)
  color: NavColor;
  agentCount: number;
  description: string;
  stat: string;
  pillType: "live" | "hot" | "normal";
  pillText: string;
  enabled: boolean;
  shortcut?: string;
}

export const SECTIONS: NavSection[] = [
  {
    id: "omega",
    name: "OMEGA",
    route: "/dashboard",
    icon: "Home",
    color: "cyan",
    agentCount: 79,
    description:
      "The brain. Voice command, agent orchestration, autonomous decisions.",
    stat: "79 tools",
    pillType: "live",
    pillText: "live",
    enabled: true,
    shortcut: "⌘1",
  },
  {
    id: "inbox",
    name: "Unified Inbox",
    route: "/inbox",
    icon: "Inbox",
    color: "violet",
    agentCount: 10,
    description:
      "WhatsApp, Email, SMS, Instagram, Voice — every channel in one stream.",
    stat: "10 channels",
    pillType: "hot",
    pillText: "3 hot",
    enabled: true,
    shortcut: "⌘2",
  },
  {
    id: "clients",
    name: "Clients",
    route: "/customers", // App.tsx line 453 — routes through /customers
    icon: "Users",
    color: "rose",
    agentCount: 0,
    description:
      "Every customer, lead, vendor — unified across all channels.",
    stat: "17 clients",
    pillType: "normal",
    pillText: "+2 today",
    enabled: true,
    shortcut: "⌘3",
  },
  {
    id: "sales",
    name: "Sales AI",
    route: "/sales",
    icon: "TrendingUp",
    color: "amber",
    agentCount: 10,
    description:
      "Lead generation, scoring, sequencing, closing — fully autonomous pipeline.",
    stat: "10 agents",
    pillType: "normal",
    pillText: "47 sequences",
    enabled: true,
  },
  {
    id: "marketing",
    name: "Marketing AI",
    route: "/marketing",
    icon: "Megaphone",
    color: "rose",
    agentCount: 11,
    description:
      "Campaigns, content, social, ads, AEO — autonomous brand presence.",
    stat: "11 agents",
    pillType: "normal",
    pillText: "8 campaigns",
    enabled: true,
  },
  {
    id: "hr",
    name: "HR AI",
    route: "/hr",
    icon: "UserPlus",
    color: "mint",
    agentCount: 8,
    description:
      "Hiring, onboarding, payroll, performance — including hiring AI agents.",
    stat: "8 agents",
    pillType: "normal",
    pillText: "7 open roles",
    enabled: true,
  },
  {
    id: "operations",
    name: "Operations",
    route: "/operations",
    icon: "LayoutGrid",
    color: "indigo",
    agentCount: 12,
    description:
      "Construction, dispatch, inventory, procurement — every back-office function.",
    stat: "12 agents",
    pillType: "normal",
    pillText: "all healthy",
    enabled: true,
  },
  {
    id: "comms",
    name: "Communications",
    route: "/communications", // App.tsx line 1329 — actual route is /communications
    icon: "Phone",
    color: "emerald",
    agentCount: 10,
    description:
      "VAPI Voice, WhatsApp, email, SMS, telephony — every channel orchestrated.",
    stat: "10 agents",
    pillType: "normal",
    pillText: "12 calls today",
    enabled: true,
  },
  {
    id: "industry",
    name: "Industry Verticals",
    route: "/industry",
    icon: "Building2",
    color: "violet",
    agentCount: 10,
    description:
      "Restaurant, banking, healthcare, real estate, construction — pre-tuned.",
    stat: "10 agents",
    pillType: "normal",
    pillText: "Coming soon",
    enabled: false,
  },
  {
    id: "intel",
    name: "Intelligence Layer",
    route: "/intel",
    icon: "Brain",
    color: "cyan",
    agentCount: 12,
    description:
      "Knowledge base, vectors, models — the substrate underneath every agent.",
    stat: "12 agents",
    pillType: "normal",
    pillText: "Coming soon",
    enabled: false,
  },
  {
    id: "analytics",
    name: "Analytics",
    route: "/analytics",
    icon: "BarChart3",
    color: "amber",
    agentCount: 0,
    description:
      "Pipeline metrics, agent telemetry, conversion analytics, ROI breakdowns.",
    stat: "14 dashboards",
    pillType: "live",
    pillText: "live",
    enabled: true,
  },
  {
    id: "settings",
    name: "Settings",
    route: "/settings",
    icon: "Settings",
    color: "indigo",
    agentCount: 0,
    description:
      "Tenant config, integrations, API keys, branding — control everything.",
    stat: "22 integrations",
    pillType: "normal",
    pillText: "all connected",
    enabled: true,
  },
];

/** Cathedral hero stats (top of "All apps" view). */
export interface CathedralStat {
  label: string;
  value: string;
  delta: string;
}

export const CATHEDRAL_STATS: CathedralStat[] = [
  { label: "Active leads",         value: "522",   delta: "↗ +38 this week" },
  { label: "Conversations",        value: "94",    delta: "↗ +12% today" },
  { label: "Booked appointments",  value: "18",    delta: "↗ +3 today" },
  { label: "Agents healthy",       value: "88/88", delta: "all systems online" },
];

/** Spotlight rows — flat list, grouped by `group` for visual sections. */
export interface SpotlightRow {
  id: string;
  group: string;
  name: string;
  sub: string;
  icon: string;
  color: NavColor;
  route?: string;
  action?: "create-sequence" | "view-hot-leads" | "send-broadcast";
  shortcut?: string;
  enabled: boolean;
}

export const SPOTLIGHT_ROWS: SpotlightRow[] = [
  // Suggested
  { id: "sug-omega", group: "Suggested", name: "OMEGA home", sub: "/dashboard · the home view", icon: "Home", color: "cyan", route: "/dashboard", shortcut: "⌘1", enabled: true },
  { id: "sug-inbox", group: "Suggested", name: "Unified Inbox", sub: "/inbox · all channels in one stream", icon: "Inbox", color: "violet", route: "/inbox", shortcut: "⌘2", enabled: true },
  { id: "sug-clients", group: "Suggested", name: "Clients", sub: "/customers · all leads + customers", icon: "Users", color: "rose", route: "/customers", shortcut: "⌘3", enabled: true },

  // Sales AI · 10 agents
  { id: "sa-pipeline",  group: "Sales AI · 10 agents", name: "Pipeline",     sub: "/sales/pipeline · live deal flow",         icon: "GitBranch", color: "amber", route: "/sales/pipeline",       enabled: true },
  { id: "sa-leads",     group: "Sales AI · 10 agents", name: "Hot leads",    sub: "/sales/dashboard · score ≥ 75",            icon: "Flame",     color: "amber", route: "/sales/dashboard",      enabled: true },
  { id: "sa-prospect",  group: "Sales AI · 10 agents", name: "Prospector",   sub: "/sales/auto-leadgen · autonomous lead gen", icon: "Search",    color: "amber", route: "/sales/auto-leadgen",   enabled: true },
  { id: "sa-cadence",   group: "Sales AI · 10 agents", name: "Cadence",      sub: "/sales/sequences · multi-channel sequences",icon: "Layers",    color: "amber", route: "/sales/sequences",      enabled: true },
  { id: "sa-scorer",    group: "Sales AI · 10 agents", name: "Scorer",       sub: "/sales/predictive-scoring · ML lead scoring",icon: "Sparkles",  color: "amber", route: "/sales/predictive-scoring", enabled: true },

  // Marketing AI · 11 agents
  { id: "ma-campaigns", group: "Marketing AI · 11 agents", name: "Campaigns", sub: "/marketing/campaigns · all running campaigns", icon: "Megaphone", color: "rose", route: "/marketing/campaigns", enabled: true },
  { id: "ma-blog",      group: "Marketing AI · 11 agents", name: "Blog",      sub: "/marketing/blogs · autonomous blog engine",    icon: "FileText",  color: "rose", route: "/marketing/blogs",     enabled: true },
  { id: "ma-social",    group: "Marketing AI · 11 agents", name: "Social",    sub: "/marketing/social · scheduled + live posts",  icon: "Share2",    color: "rose", route: "/marketing/social",    enabled: true },

  // Operations · 12 agents
  { id: "op-cmd",       group: "Operations · 12 agents", name: "Command center", sub: "/operations/command-center · live ops",       icon: "LayoutGrid", color: "indigo", route: "/operations/command-center", enabled: true },
  { id: "op-inv",       group: "Operations · 12 agents", name: "Inventory",      sub: "/operations/inventory · stock + warehouses",   icon: "Package",    color: "indigo", route: "/operations/inventory",      enabled: true },
  { id: "op-orders",    group: "Operations · 12 agents", name: "Orders",         sub: "/operations/orders · open + fulfilled",        icon: "ShoppingCart", color: "indigo", route: "/operations/orders",       enabled: true },

  // Communications · 10 agents
  { id: "co-voice",     group: "Communications · 10 agents", name: "Voice AI",   sub: "/communications/voice-ai · VAPI orchestrator", icon: "Phone",       color: "emerald", route: "/communications/voice-ai", enabled: true },
  { id: "co-whatsapp",  group: "Communications · 10 agents", name: "WhatsApp",   sub: "/communications/whatsapp · live conversations", icon: "MessageCircle", color: "emerald", route: "/communications/whatsapp", enabled: true },
  { id: "co-email",     group: "Communications · 10 agents", name: "Email",      sub: "/communications/email · unified email hub",     icon: "Mail",        color: "emerald", route: "/communications/email",     enabled: true },

  // HR AI · 8 agents
  { id: "hr-recruit",   group: "HR AI · 8 agents", name: "Recruitment", sub: "/hr/recruitment · 5 AI hiring agents", icon: "UserPlus", color: "mint", route: "/hr/recruitment", enabled: true },
  { id: "hr-employees", group: "HR AI · 8 agents", name: "Employees",   sub: "/hr/employees · roster + profiles",     icon: "Users",    color: "mint", route: "/hr/employees",   enabled: true },

  // Quick actions
  { id: "qa-seq",       group: "Quick actions", name: "Create new sequence", sub: "/sales/sequences/new · multi-channel cadence",  icon: "Plus",     color: "indigo", route: "/sales/sequences/new", action: "create-sequence", enabled: true },
  { id: "qa-hot",       group: "Quick actions", name: "View all hot leads",  sub: "/sales/dashboard · filtered by score ≥ 75",     icon: "Flame",    color: "amber",  route: "/sales/dashboard",     action: "view-hot-leads",  enabled: true },
  { id: "qa-broadcast", group: "Quick actions", name: "Send broadcast",      sub: "/marketing/email · email + WhatsApp blast",     icon: "Send",     color: "rose",   route: "/marketing/email",     action: "send-broadcast",  enabled: true },
];
