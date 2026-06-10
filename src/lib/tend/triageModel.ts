/* ============================================================================
   Tend — shared triage model (extracted VERBATIM from pages/tend-ops/SafetyTriage.tsx
   for the VERTICAL-FIRST-UI pilot so Pulse can reuse the cockpit's exact query/
   derivation patterns without duplicating logic). Pure data + pure functions —
   no React, no fetching here. The only structural change vs the original:
   the per-member attention/need rule is extracted into deriveAttention() so
   buildLiveMembers (cockpit) and the Pulse stat computation share ONE source.
   Output of buildLiveMembers is byte-identical to the pre-extraction version.
   ============================================================================ */

export type Lane = "crisis" | "in_person" | "call" | "otc" | "async" | "pending";
export type Band = "crisis" | "sev" | "modsev" | "mod" | "mild" | "min" | "na";
export interface Ins { label: string; band: Band }
export interface Ev { kind: "crisis" | "clear" | ""; when: string; title: string; detail: string }
export interface Member {
  id: string; name: string; initials: string; meta: string;
  intake: string; intakeSub?: string; lane: Lane; laneLabel: string;
  ins: Ins[]; safe: "clear" | "flag"; safeSub?: string;
  attn: { cls: string; text: string }; need: boolean;
  dossier?: string; scores?: { nm: string; sc: string; bd: string }[];
  reasons?: string[]; ctrl?: string; timeline?: Ev[];
}

// ---- synthetic sample (faithful to the operator mockup; clearly badged) ----
export const SAMPLE: Member[] = [
  { id: "mr", name: "Marcus R.", initials: "MR", meta: "29 · CA · session 1",
    intake: "Paused", intakeSub: "crisis breakout", lane: "crisis", laneLabel: "Crisis",
    ins: [{ label: "PHQ-9 · item 9 +", band: "crisis" }, { label: "others held", band: "na" }],
    safe: "flag", safeSub: "active", need: true, attn: { cls: "crisis", text: "● Crisis · 988 shown · follow up now" },
    dossier: "Member expressed acute distress on the intake message; the crisis pre-filter intercepted and showed 988 (call+text) before any scoring. Intake is paused. No means/method discussed. Needs human follow-up now.",
    timeline: [{ kind: "crisis", when: "Today · just now", title: "Crisis event — flagged by the net", detail: "Pre-filter fired → 988 breakout shown. Logged to crisis lane. No means named." }] },
  { id: "dl", name: "David L.", initials: "DL", meta: "38 · CA · dossier ready",
    intake: "Dossier ready", intakeSub: "3 sessions", lane: "in_person", laneLabel: "In-person",
    ins: [{ label: "PHQ-9 22", band: "sev" }, { label: "GAD-7 16", band: "sev" }, { label: "ISI 19", band: "mod" }],
    safe: "clear", safeSub: "1 prior event", need: true, attn: { cls: "severe", text: "▲ Severe MH — in-person eval" },
    dossier: "~4 months of low mood, anhedonia, and worsening sleep, with a recent rise in work stress and social withdrawal. Reports a past episode of passive ideation (addressed 9 days ago — see safety history); denies current intent or plan. Moderate-to-severe depressive and anxious symptoms with significant insomnia. No controlled-substance indication from screening. Pattern consistent with a major depressive presentation warranting prompt in-person clinical evaluation. Assembled by THERA from the conversation — no forms.",
    scores: [{ nm: "PHQ-9", sc: "22", bd: "sev" }, { nm: "GAD-7", sc: "16", bd: "sev" }, { nm: "ISI", sc: "19", bd: "mod" }, { nm: "IIEF-5", sc: "21", bd: "mild" }, { nm: "ASRS", sc: "—", bd: "neg" }],
    reasons: ["PHQ-9 22 (≥20, severe) and GAD-7 16 (≥15, severe) → severe-MH floor → in-person evaluation, not async.",
      "No controlled-substance indication (ASRS negative) → Ryan Haight in-person trigger not set on that basis.",
      "State-constrained matcher: 3 in-state (CA) providers only — no out-of-state / licensure-unsafe matches."],
    ctrl: "⚑ Controlled-substance flag: not set for David. (Set when ASRS+ / stimulant consideration → in-person per Ryan Haight — see James P.)",
    timeline: [{ kind: "clear", when: "Today · this session", title: "Safety screen: CLEAR", detail: "No item-9, no risk language. Crisis net green on all 14 messages." },
      { kind: "clear", when: "9 days ago · resolved", title: "Operator follow-up completed → resolved", detail: "Safety plan confirmed; member re-engaged intake." },
      { kind: "crisis", when: "9 days ago · 21:14", title: "Crisis event — passive ideation flagged", detail: "Net fired (semantic) → 988 shown (call+text). No means named. Logged to crisis lane." }] },
  { id: "jp", name: "James P.", initials: "JP", meta: "34 · TX · dossier ready",
    intake: "Dossier ready", intakeSub: "2 sessions", lane: "in_person", laneLabel: "In-person",
    ins: [{ label: "ASRS +", band: "modsev" }, { label: "PHQ-9 8", band: "mild" }, { label: "GAD-7 6", band: "min" }],
    safe: "clear", need: true, attn: { cls: "ctrl", text: "⚑ Controlled-substance (ASRS+) · Ryan Haight" },
    dossier: "Long-standing attention/focus difficulties; positive ADHD screen (ASRS). Mild depressive symptoms, minimal anxiety, safety clear. A positive ASRS raises the possibility of a controlled stimulant — under the Ryan Haight Act that requires an in-person evaluation before any such prescription.",
    scores: [{ nm: "PHQ-9", sc: "8", bd: "mild" }, { nm: "GAD-7", sc: "6", bd: "min" }, { nm: "ASRS", sc: "+", bd: "mod" }],
    reasons: ["ASRS positive screen → potential controlled stimulant (ADHD); Ryan Haight ⇒ in-person only.",
      "No severe-MH floor (PHQ-9 8 / GAD-7 6). Routing driven by the controlled-substance flag."],
    ctrl: "⚑ Controlled-substance flag: SET (ASRS+). In-person required before any stimulant — Ryan Haight.",
    timeline: [{ kind: "clear", when: "Today", title: "Safety screen: CLEAR", detail: "No risk language across the intake." }] },
  { id: "ak", name: "Aiden K.", initials: "AK", meta: "26 · NY · session 1",
    intake: "In session 1/3", intakeSub: "incomplete", lane: "pending", laneLabel: "Pending",
    ins: [{ label: "PHQ-9 9", band: "mild" }, { label: "GAD-7 —", band: "na" }, { label: "duration —", band: "na" }],
    safe: "clear", need: true, attn: { cls: "floor", text: "⊘ Below intake floor — needs GAD-7 + duration" },
    dossier: "Intake in progress. PHQ-9 captured (9, mild) but GAD-7 and symptom duration are not yet recorded. Below the soft-gate floor for a dossier/route — more intake is needed before a defensible administrative lane can be set.",
    scores: [{ nm: "PHQ-9", sc: "9", bd: "mild" }, { nm: "GAD-7", sc: "—", bd: "neg" }, { nm: "ISI", sc: "—", bd: "neg" }],
    timeline: [{ kind: "clear", when: "Today", title: "Safety screen: CLEAR", detail: "No risk language so far." }] },
  { id: "tb", name: "Tom B.", initials: "TB", meta: "41 · CA · dossier ready",
    intake: "Dossier ready", lane: "call", laneLabel: "Provider call",
    ins: [{ label: "PHQ-9 12", band: "mod" }, { label: "GAD-7 11", band: "mod" }],
    safe: "clear", need: false, attn: { cls: "ok", text: "AI-routed · moderate" } },
  { id: "cm", name: "Chris M.", initials: "CM", meta: "33 · WA · dossier ready",
    intake: "Dossier ready", lane: "otc", laneLabel: "OTC + behavioral",
    ins: [{ label: "ISI 16", band: "mod" }, { label: "IIEF-5 19", band: "mild" }, { label: "PHQ-9 6", band: "mild" }],
    safe: "clear", need: false, attn: { cls: "ok", text: "AI-routed · sleep + behavioral" } },
  { id: "ew", name: "Ethan W.", initials: "EW", meta: "47 · CA · dossier ready",
    intake: "Dossier ready", lane: "async", laneLabel: "Companion",
    ins: [{ label: "PHQ-9 4", band: "min" }, { label: "GAD-7 3", band: "min" }],
    safe: "clear", need: false, attn: { cls: "ok", text: "AI-routed · sub-threshold" } },
];

// ---- live-data mappers (telehealth_* → Member rows) ----
export const BAND_MAP: Record<string, Band> = { severe: "sev", moderately_severe: "modsev", moderate: "mod", mild: "mild", minimal: "min", none: "min", subthreshold: "min", negative: "min" };
export const LANE_LABEL: Record<string, string> = { crisis: "Crisis", in_person: "In-person", call: "Provider call", otc: "OTC + behavioral", async: "Companion", pending: "Pending" };
export const INSTR_LABEL: Record<string, string> = { phq9: "PHQ-9", gad7: "GAD-7", isi: "ISI", iief5: "IIEF-5", asrs: "ASRS" };
export function ageFromDob(dob?: string): string { if (!dob) return ""; const a = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5)); return a > 0 && a < 130 ? String(a) : ""; }
export function initialsOf(name: string): string { return (name || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"; }

/** The per-member attention/need rule — the cockpit's exact priority ladder
 *  (was inline in buildLiveMembers). Single source for the cockpit queue AND
 *  the Pulse needs-a-clinician stat. */
export function deriveAttention(
  lane: Lane, item9: boolean, controlled: boolean, severeIns: boolean,
  hasRouting: boolean, insCount: number,
): { attn: { cls: string; text: string }; need: boolean } {
  let attn = { cls: "ok", text: "AI-routed" }; let need = false;
  if (lane === "crisis" || item9) { attn = { cls: "crisis", text: "● Crisis · 988 shown · follow up now" }; need = true; }
  else if (controlled) { attn = { cls: "ctrl", text: "⚑ Controlled-substance · Ryan Haight" }; need = true; }
  else if (severeIns) { attn = { cls: "severe", text: "▲ Severe MH — in-person eval" }; need = true; }
  else if (!hasRouting || insCount === 0) { attn = { cls: "floor", text: "⊘ Below intake floor" }; need = true; }
  return { attn, need };
}

export function buildLiveMembers(members: any[], routing: any[], instruments: any[], crisis: any[], dossiers: any[]): Member[] {
  return members.map((mem) => {
    const rd = routing.find((r) => r.member_id === mem.id); // ordered desc → latest
    const ins = instruments.filter((i) => i.member_id === mem.id);
    const ces = crisis.filter((c) => c.member_id === mem.id);
    const dos = dossiers.find((d) => d.member_id === mem.id);
    const lane: Lane = (rd?.lane as Lane) || "pending";
    const item9 = ins.some((i) => i.item9_positive);
    const severeIns = ins.some((i) => i.severity_band === "severe" || i.severity_band === "moderately_severe");
    const controlled = !!rd?.controlled_substance_flag;
    const safe: "clear" | "flag" = ces.length > 0 || item9 ? "flag" : "clear";
    const { attn, need } = deriveAttention(lane, item9, controlled, severeIns, !!rd, ins.length);
    const body = dos?.body || {};
    const dossierText = typeof body === "string" ? body : (body.chief_concern || body.session_summary || body.summary || (Object.keys(body).length ? JSON.stringify(body).slice(0, 320) : ""));
    return {
      id: mem.id, name: mem.full_name || "(member)", initials: initialsOf(mem.full_name || "?"),
      meta: [ageFromDob(mem.dob), mem.state_us, dos ? "dossier ready" : rd ? "routed" : "in intake"].filter(Boolean).join(" · "),
      intake: dos ? "Dossier ready" : rd ? "Routed" : "In intake", lane, laneLabel: LANE_LABEL[lane] || lane,
      ins: ins.length ? ins.map((i) => ({ label: `${INSTR_LABEL[i.instrument] || i.instrument} ${i.score ?? "—"}`, band: (i.item9_positive ? "crisis" : BAND_MAP[i.severity_band] || "na") as Band })) : [{ label: "no instruments yet", band: "na" as Band }],
      safe, safeSub: ces.length ? `${ces.length} event${ces.length > 1 ? "s" : ""}` : undefined, attn, need,
      dossier: dossierText || undefined,
      scores: ins.length ? ins.map((i) => ({ nm: INSTR_LABEL[i.instrument] || i.instrument, sc: String(i.score ?? "—"), bd: i.item9_positive ? "sev" : BAND_MAP[i.severity_band] || "neg" })) : undefined,
      reasons: rd?.reasons?.rules?.length ? rd.reasons.rules : undefined,
      ctrl: controlled ? "⚑ Controlled-substance flag: SET — in-person required (Ryan Haight)." : undefined,
      timeline: ces.length ? ces.map((c) => ({ kind: "crisis" as const, when: new Date(c.created_at).toLocaleString(), title: "Crisis event — flagged by the net", detail: `${c.action_taken || ""}${c.trigger_excerpt ? " · " + c.trigger_excerpt : ""}` })) : undefined,
    };
  });
}

/** The cockpit's displayed SYNTHETIC numbers (SafetyTriage header + stat tiles)
 *  — Pulse's fallback mirrors these exactly so both surfaces tell one story
 *  when the tend tables are empty ("same synthetic-fallback behavior"). */
export const SYNTHETIC_PULSE = {
  intakesToday: 47,                                       // cockpit "Intakes today" tile
  triaged: 43,                                            // cockpit header "The AI routed 43"
  needsClinician: SAMPLE.filter((m) => m.need).length,    // cockpit live-derived needCount over SAMPLE (4)
  crisis24h: 1,                                           // cockpit "Crisis events · 24h" tile
} as const;
