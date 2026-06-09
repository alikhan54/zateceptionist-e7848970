/* ============================================================================
   Tend — member intake API helpers (ADDITIVE; tend-only).
   - preFilter(): the MANDATORY crisis safety gate. POSTs every member message to
     the LIVE v2 lexical+semantic net at /webhook/tend-intake-prefilter FIRST.
   - askThera(): only reached AFTER a non-crisis pre-filter result. Bridges to the
     tend THERA agent via the verified /omega-chat + agent_preference path
     (tenant_id 'tend' → PHI-guard forces on-box Ollama; never cloud).
   Synthetic member only (no real PHI). Reuses the operator app's webhook base env.
   ============================================================================ */

const WEBHOOK_BASE =
  (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || "https://webhooks.zatesystems.com/webhook";
const TENANT_ID = "tend";

export type Lane = "crisis" | "pass_to_thera";

export interface PreFilterResult {
  ok: boolean;            // false = the safety gate could not run (caller must NOT proceed to THERA)
  lane: Lane;
  label?: string;
  detection?: string;     // 'lexical' | 'semantic' | 'none'
  response?: string;      // crisis template text (we render our own breakout UI, not this)
}

export interface TheraResult {
  ok: boolean;
  text: string;
}

/** A per-browser synthetic member id (no real identity). Persisted for the session. */
export function getSyntheticMemberId(): string {
  const KEY = "tend_synthetic_member_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        (crypto as any)?.randomUUID?.() ||
        "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "00000000-0000-4000-8000-000000000000";
  }
}

/** MANDATORY safety gate — runs before THERA on every message. */
export async function preFilter(message: string, memberId: string): Promise<PreFilterResult> {
  try {
    const r = await fetch(`${WEBHOOK_BASE}/tend-intake-prefilter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: TENANT_ID, member_id: memberId, message }),
    });
    if (!r.ok) return { ok: false, lane: "pass_to_thera" };
    const d: any = await r.json();
    if (d && (d.lane === "crisis" || d.lane === "pass_to_thera")) {
      return { ok: true, lane: d.lane, label: d.label, detection: d.detection, response: d.response };
    }
    return { ok: false, lane: "pass_to_thera" }; // unexpected shape → treat as gate failure (do not bypass)
  } catch {
    return { ok: false, lane: "pass_to_thera" };
  }
}

/** Only called after a confirmed non-crisis pre-filter result. */
export async function askThera(message: string, senderIdentifier: string): Promise<TheraResult> {
  try {
    const r = await fetch(`${WEBHOOK_BASE}/omega-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        agent_preference: "thera",
        tenant_id: TENANT_ID,
        channel: "web_chat",
        sender_identifier: senderIdentifier,
        sender_type: "member",
      }),
    });
    if (!r.ok) return { ok: false, text: "I'm having trouble responding right now — please try again in a moment." };
    const d: any = await r.json();
    const text: string = (d?.response || d?.message || "").toString().trim();
    return { ok: !!text, text: text || "I'm here with you. Could you tell me a little more about what's going on?" };
  } catch {
    return { ok: false, text: "I'm having trouble responding right now — please try again in a moment." };
  }
}

/* ---------------------------------------------------------------------------
   "Your next step" — dossier → router. Both are built+tested backends. The member
   surface renders the lane in plain language (no scores/severity labels).
   --------------------------------------------------------------------------- */

export type DossierStatus = "generated" | "more_intake_needed" | "crisis_safety" | "error";
export interface DossierResult {
  ok: boolean;
  status: DossierStatus;
  dossier_id?: string;
  routing_lane?: Lane;
}

export type RouterLane = "otc" | "call" | "in_person" | "async" | "crisis";
export interface OtcItem { name: string; description?: string; category?: string; price_label?: string; }
export interface RouterResult {
  ok: boolean;
  lane: RouterLane;
  member_state?: string | null;
  otc_catalog?: OtcItem[];
  provider_count?: number;     // from matcher_note (in-state providers found)
  // Fixed service fees (display plainly): call $49 / in-person $75.
}

export async function generateDossier(memberId: string): Promise<DossierResult> {
  try {
    const r = await fetch(`${WEBHOOK_BASE}/tend-generate-dossier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: TENANT_ID, member_id: memberId }),
    });
    if (!r.ok) return { ok: false, status: "error" };
    const d: any = await r.json();
    const status: DossierStatus = d?.status === "generated" ? "generated"
      : d?.status === "crisis_safety" ? "crisis_safety"
      : d?.status === "more_intake_needed" ? "more_intake_needed" : "error";
    return { ok: status === "generated", status, dossier_id: d?.dossier_id, routing_lane: d?.routing_lane };
  } catch {
    return { ok: false, status: "error" };
  }
}

/**
 * Fire-and-forget dossier generation. The dossier's Ollama narrative is slow (>120s
 * under GPU load), so the member's "next step" must NOT wait on it. We trigger it and
 * return immediately; it completes server-side and writes telehealth_dossiers for the
 * operator + the downloadable summary later. Errors are swallowed (best-effort).
 */
export function triggerDossierAsync(memberId: string): void {
  try {
    void fetch(`${WEBHOOK_BASE}/tend-generate-dossier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: TENANT_ID, member_id: memberId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never block the member flow on the dossier */
  }
}

export async function routeMember(memberId: string, dossierId?: string): Promise<RouterResult> {
  try {
    const r = await fetch(`${WEBHOOK_BASE}/tend-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: TENANT_ID, member_id: memberId, dossier_id: dossierId }),
    });
    if (!r.ok) return { ok: false, lane: "otc" };
    const d: any = await r.json();
    const providerCount = (() => {
      const m = /(\d+)\s+providers?/i.exec(d?.matcher_note || "");
      return m ? parseInt(m[1], 10) : undefined;
    })();
    return {
      ok: d?.status === "routed" && !!d?.lane,
      lane: (d?.lane as RouterLane) || "otc",
      member_state: d?.member_state ?? null,
      otc_catalog: Array.isArray(d?.otc_catalog) ? d.otc_catalog : undefined,
      provider_count: providerCount,
    };
  } catch {
    return { ok: false, lane: "otc" };
  }
}

/** Preview-only mock router results (rendered via ?mocklane=…). Not used in the live flow. */
export function mockRouterResult(lane: RouterLane): RouterResult {
  const base: Record<RouterLane, RouterResult> = {
    otc: {
      ok: true, lane: "otc", member_state: "CA",
      otc_catalog: [
        { name: "Melatonin (3mg)", category: "Sleep", description: "A gentle, non-habit-forming sleep aid many people start with." },
        { name: "Magnesium glycinate", category: "Sleep", description: "Often used to support relaxation and steadier sleep." },
        { name: "Guided CBT-I program", category: "Behavioral", description: "A self-paced sleep-reset program — most people feel it in 1–2 weeks." },
        { name: "L-theanine", category: "Calm", description: "Used to take the edge off daytime tension." },
      ],
    },
    call: { ok: true, lane: "call", member_state: "CA" },
    in_person: { ok: true, lane: "in_person", member_state: "CA", provider_count: 3 },
    async: { ok: true, lane: "async", member_state: "CA" },
    crisis: { ok: true, lane: "crisis" },
  };
  return base[lane];
}
