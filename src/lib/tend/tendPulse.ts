/* ============================================================================
   Tend — Pulse stats for the VERTICAL-FIRST-UI pilot (telehealth tenants only;
   the caller gates on industry === 'telehealth', so non-telehealth tenants
   fire ZERO telehealth queries). Reuses the cockpit's exact patterns:
   - same tables + filters as SafetyTriage (tenant_id = SLUG, RLS-scoped),
     but NARROW column lists + a head-count — never dossier bodies/PHI here.
   - same live/synthetic switch: live when telehealth_members has rows for the
     tenant; otherwise the cockpit's synthetic preview numbers (SYNTHETIC_PULSE).
   - needs-a-clinician uses the SAME deriveAttention rule the cockpit queue uses.
   Never throws — resolves to the synthetic fallback on any error/timeout.
   ============================================================================ */
import { supabase } from "@/lib/supabase";
import { deriveAttention, SYNTHETIC_PULSE, type Lane } from "@/lib/tend/triageModel";

export interface TendPulseStats {
  isLive: boolean;
  intakesToday: number;
  needsClinician: number;
  crisis24h: number;
  triaged: number;
}

/** Cockpit-parity synthetic stats — also the hook-level catch fallback so a
 *  telehealth tenant never sees the generic (Active leads…) hero labels. */
export const TEND_SYNTHETIC_STATS: TendPulseStats = { isLive: false, ...SYNTHETIC_PULSE };
const SYNTH = TEND_SYNTHETIC_STATS;

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchTendPulseStats(tenantSlug: string): Promise<TendPulseStats> {
  try {
    const [m, rd, ir, ce] = await Promise.all([
      supabase.from("telehealth_members").select("id, created_at").eq("tenant_id", tenantSlug),
      supabase.from("telehealth_routing_decisions").select("member_id, lane, controlled_substance_flag").eq("tenant_id", tenantSlug).order("created_at", { ascending: false }),
      supabase.from("telehealth_instrument_results").select("member_id, item9_positive, severity_band").eq("tenant_id", tenantSlug),
      supabase.from("telehealth_crisis_events").select("*", { count: "exact", head: true }).eq("tenant_id", tenantSlug).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    ]);
    const members = m.data || [];
    if (!members.length) return SYNTH; // tend tables empty → same synthetic preview as the cockpit

    const routing = rd.data || [];
    const instruments = ir.data || [];
    const today = startOfTodayISO();

    let needsClinician = 0;
    let triaged = 0;
    for (const mem of members) {
      const r = routing.find((x) => x.member_id === mem.id); // desc-ordered → latest (cockpit rule)
      const ins = instruments.filter((i) => i.member_id === mem.id);
      if (r) triaged++;
      const lane = ((r?.lane as Lane) || "pending") as Lane;
      const item9 = ins.some((i) => i.item9_positive);
      const severeIns = ins.some((i) => i.severity_band === "severe" || i.severity_band === "moderately_severe");
      if (deriveAttention(lane, item9, !!r?.controlled_substance_flag, severeIns, !!r, ins.length).need) needsClinician++;
    }
    return {
      isLive: true,
      intakesToday: members.filter((x) => x.created_at && x.created_at >= today).length,
      needsClinician,
      crisis24h: ce.count ?? 0,
      triaged,
    };
  } catch {
    return SYNTH;
  }
}
