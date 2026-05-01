export type AgentOrb =
  | "cyan"
  | "amber"
  | "violet"
  | "mint"
  | "rose"
  | "copper"
  | "electric";

export interface Agent {
  name: string;
  sub: string;
  orb: AgentOrb;
  mark: string;
}

export const AGENT_DATA: Record<string, Agent[]> = {
  CORTEX: [
    { name: "NEXUS", sub: "orchestrator · 88 tools", orb: "cyan", mark: "N" },
    { name: "OMEGA", sub: "command · 79 tools", orb: "amber", mark: "Ω" },
    { name: "ATLAS", sub: "router · 22 tools", orb: "cyan", mark: "A" },
    { name: "KERNEL", sub: "core ops · 18 tools", orb: "electric", mark: "K" },
    { name: "PRISM", sub: "person 360° · 5 tools", orb: "mint", mark: "P" },
    { name: "CORTEX", sub: "system metrics · 10 tools", orb: "cyan", mark: "C" },
    { name: "BEACON", sub: "voice ai · 8 tools", orb: "amber", mark: "B" },
    { name: "SENTINEL", sub: "audit & alerts", orb: "rose", mark: "S" },
  ],
  SALES: [
    { name: "NOVA", sub: "sales lead · 13 tools", orb: "amber", mark: "N" },
    { name: "QUANTUM", sub: "pipeline ops", orb: "cyan", mark: "Q" },
    { name: "VECTOR", sub: "lead scoring", orb: "violet", mark: "V" },
    { name: "PULSE", sub: "engagement signals", orb: "mint", mark: "P" },
    { name: "FORGE", sub: "sequence builder", orb: "copper", mark: "F" },
    { name: "ECHO", sub: "reply detection", orb: "electric", mark: "E" },
    { name: "RIVER", sub: "abm research", orb: "cyan", mark: "R" },
    { name: "ANCHOR", sub: "deal close", orb: "rose", mark: "A" },
    { name: "ORBIT", sub: "referral engine", orb: "violet", mark: "O" },
    { name: "TRACER", sub: "doc tracking", orb: "amber", mark: "T" },
  ],
  MARKETING: [
    { name: "MUSE", sub: "creative director", orb: "violet", mark: "M" },
    { name: "FLUX", sub: "campaign manager", orb: "cyan", mark: "F" },
    { name: "VERSE", sub: "blog engine", orb: "amber", mark: "V" },
    { name: "CINDER", sub: "ad intelligence", orb: "copper", mark: "C" },
    { name: "PIXEL", sub: "video brain", orb: "electric", mark: "P" },
    { name: "ASTER", sub: "social commander", orb: "mint", mark: "A" },
    { name: "HARP", sub: "email sequences", orb: "rose", mark: "H" },
    { name: "OPAL", sub: "seo strategist", orb: "violet", mark: "O" },
    { name: "GLINT", sub: "a/b testing", orb: "amber", mark: "G" },
    { name: "REVERB", sub: "social listening", orb: "cyan", mark: "R" },
  ],
  OPERATIONS: [
    { name: "GRID", sub: "ops command", orb: "cyan", mark: "G" },
    { name: "VAULT", sub: "inventory ops", orb: "copper", mark: "V" },
    { name: "FORGE-O", sub: "production planner", orb: "amber", mark: "F" },
    { name: "LEDGER", sub: "billing & invoices", orb: "mint", mark: "L" },
    { name: "RELAY", sub: "shipments tracker", orb: "electric", mark: "R" },
    { name: "TALLY", sub: "expense ops", orb: "rose", mark: "T" },
    { name: "QUARRY", sub: "vendor mgmt", orb: "violet", mark: "Q" },
    { name: "PILOT", sub: "purchase orders", orb: "cyan", mark: "P" },
  ],
  HR: [
    { name: "ARIA", sub: "hr lead · 6 tools", orb: "rose", mark: "A" },
    { name: "ZARA", sub: "recruiter ai", orb: "violet", mark: "Z" },
    { name: "RECRUIT", sub: "candidate scoring", orb: "amber", mark: "R" },
    { name: "SENTINEL-HR", sub: "compliance watch", orb: "cyan", mark: "S" },
    { name: "ORACLE", sub: "interview prep", orb: "mint", mark: "O" },
    { name: "LATCH", sub: "onboarding flow", orb: "electric", mark: "L" },
    { name: "PAYROLL", sub: "payroll engine", orb: "copper", mark: "P" },
    { name: "GAUGE", sub: "performance reviews", orb: "violet", mark: "G" },
  ],
  COMMS: [
    { name: "BEACON", sub: "voice ai router", orb: "amber", mark: "B" },
    { name: "SIGNAL", sub: "sms ops", orb: "cyan", mark: "S" },
    { name: "DELTA", sub: "email gateway", orb: "mint", mark: "D" },
    { name: "WAVE", sub: "whatsapp engine", orb: "electric", mark: "W" },
    { name: "INBOX", sub: "unified router", orb: "violet", mark: "I" },
    { name: "CHIME", sub: "notifications", orb: "rose", mark: "C" },
    { name: "REPLY", sub: "auto-reply engine", orb: "copper", mark: "R" },
    { name: "DIAL", sub: "call orchestrator", orb: "amber", mark: "D" },
  ],
  INDUSTRY: [
    { name: "MEDICA", sub: "healthcare · 11 tools", orb: "mint", mark: "M" },
    { name: "REALTY", sub: "real estate · 10 tools", orb: "cyan", mark: "R" },
    { name: "FOREMAN", sub: "construction · 12 tools", orb: "copper", mark: "F" },
    { name: "COLLECTOR", sub: "collections · 12 tools", orb: "rose", mark: "C" },
    { name: "STUDIO", sub: "youtube agency · 17 tools", orb: "violet", mark: "S" },
    { name: "CLINIC", sub: "patient ops", orb: "mint", mark: "C" },
    { name: "ESTIMATOR", sub: "bid sets · ai extract", orb: "amber", mark: "E" },
    { name: "VOYAGE", sub: "tender ops", orb: "electric", mark: "V" },
    { name: "ROOF", sub: "roofing claims", orb: "copper", mark: "R" },
  ],
  INTEL: [
    { name: "PRISM", sub: "person 360°", orb: "cyan", mark: "P" },
    { name: "WATCHER", sub: "competitor track", orb: "rose", mark: "W" },
    { name: "SCRY", sub: "company intel", orb: "violet", mark: "S" },
    { name: "ORACLE-I", sub: "predictive scoring", orb: "amber", mark: "O" },
    { name: "TRACE", sub: "website visitors", orb: "mint", mark: "T" },
    { name: "SHOAL", sub: "trigger events", orb: "electric", mark: "S" },
    { name: "VERIFY", sub: "data quality", orb: "cyan", mark: "V" },
    { name: "ORBIT-I", sub: "market signals", orb: "copper", mark: "O" },
    { name: "PILOT-I", sub: "send-time ai", orb: "violet", mark: "P" },
  ],
};

export const AGENT_TOTAL = Object.values(AGENT_DATA).reduce(
  (sum, list) => sum + list.length,
  0,
);
