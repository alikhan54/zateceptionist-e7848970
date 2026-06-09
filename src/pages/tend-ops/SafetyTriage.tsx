/* ============================================================================
   Tend — operator Safety & Triage cockpit (telehealth-gated nav; tenant 'tend').
   Renders INSIDE the platform Layout (sidebar/topbar from the platform). Clinical
   register: severity bands + scores + safety status live HERE (the clinician view —
   deliberately the opposite of the plain-language member surface). The header says
   "triaged / routed" (the AI triages, it does NOT clinically clear). An active crisis
   is elevated above the queue.
   Data: best-effort live read of telehealth_* for tenant 'tend' (Supabase REST + RLS);
   falls back to a clearly-badged SYNTHETIC sample so the cockpit renders for review.
   No real PHI. Full live integration (mapping seeded rows) verified once a tend-authed
   session + seeded data exist.
   ============================================================================ */
import React, { useEffect, useState } from "react";
import "@/styles/tend-ops.css";
import { supabase } from "@/integrations/supabase/client";

type Lane = "crisis" | "in_person" | "call" | "otc" | "async" | "pending";
type Band = "crisis" | "sev" | "modsev" | "mod" | "mild" | "min" | "na";
interface Ins { label: string; band: Band }
interface Ev { kind: "crisis" | "clear" | ""; when: string; title: string; detail: string }
interface Member {
  id: string; name: string; initials: string; meta: string;
  intake: string; intakeSub?: string; lane: Lane; laneLabel: string;
  ins: Ins[]; safe: "clear" | "flag"; safeSub?: string;
  attn: { cls: string; text: string }; need: boolean;
  dossier?: string; scores?: { nm: string; sc: string; bd: string }[];
  reasons?: string[]; ctrl?: string; timeline?: Ev[];
}

// ---- synthetic sample (faithful to the operator mockup; clearly badged) ----
const SAMPLE: Member[] = [
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
const BAND_MAP: Record<string, Band> = { severe: "sev", moderately_severe: "modsev", moderate: "mod", mild: "mild", minimal: "min", none: "min", subthreshold: "min", negative: "min" };
const LANE_LABEL: Record<string, string> = { crisis: "Crisis", in_person: "In-person", call: "Provider call", otc: "OTC + behavioral", async: "Companion", pending: "Pending" };
const INSTR_LABEL: Record<string, string> = { phq9: "PHQ-9", gad7: "GAD-7", isi: "ISI", iief5: "IIEF-5", asrs: "ASRS" };
function ageFromDob(dob?: string): string { if (!dob) return ""; const a = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5)); return a > 0 && a < 130 ? String(a) : ""; }
function initialsOf(name: string): string { return (name || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"; }

function buildLiveMembers(members: any[], routing: any[], instruments: any[], crisis: any[], dossiers: any[]): Member[] {
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
    let attn = { cls: "ok", text: "AI-routed" }; let need = false;
    if (lane === "crisis" || item9) { attn = { cls: "crisis", text: "● Crisis · 988 shown · follow up now" }; need = true; }
    else if (controlled) { attn = { cls: "ctrl", text: "⚑ Controlled-substance · Ryan Haight" }; need = true; }
    else if (severeIns) { attn = { cls: "severe", text: "▲ Severe MH — in-person eval" }; need = true; }
    else if (!rd || ins.length === 0) { attn = { cls: "floor", text: "⊘ Below intake floor" }; need = true; }
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

export default function SafetyTriage() {
  const [members, setMembers] = useState<Member[]>(SAMPLE);
  const [selectedId, setSelectedId] = useState<string>("dl");
  const [isLive, setIsLive] = useState(false);

  // Query LIVE telehealth data for tenant 'tend' (Supabase REST + RLS; up independent of
  // n8n). Build the queue from real members + routing + instruments + crisis + dossiers.
  // Fall back to the synthetic SAMPLE when tend tables are empty (so the cockpit still demos).
  useEffect(() => {
    (async () => {
      try {
        const [m, rd, ir, ce, dos] = await Promise.all([
          supabase.from("telehealth_members").select("*").eq("tenant_id", "tend"),
          supabase.from("telehealth_routing_decisions").select("*").eq("tenant_id", "tend").order("created_at", { ascending: false }),
          supabase.from("telehealth_instrument_results").select("*").eq("tenant_id", "tend"),
          supabase.from("telehealth_crisis_events").select("*").eq("tenant_id", "tend").order("created_at", { ascending: false }),
          supabase.from("telehealth_dossiers").select("*").eq("tenant_id", "tend").order("created_at", { ascending: false }),
        ]);
        const mem = m.data || [];
        if (mem.length) {
          const live = buildLiveMembers(mem, rd.data || [], ir.data || [], ce.data || [], dos.data || []);
          live.sort((a, b) => Number(b.need) - Number(a.need)); // needs-a-clinician first
          setMembers(live);
          setSelectedId(live[0].id);
          setIsLive(true);
        } else {
          setIsLive(false); // tend tables empty → keep the synthetic SAMPLE
        }
      } catch {
        setIsLive(false);
      }
    })();
  }, []);

  const crisis = members.find((m) => m.lane === "crisis");
  const queue = members; // crisis stays in the queue too (elevated banner above)
  const needCount = members.filter((m) => m.need).length;
  const selected = members.find((m) => m.id === selectedId) || members[1];

  return (
    <div className="tend-ops">
      {/* WIN header — "triaged / routed", NOT "cleared" */}
      <div className="winhead">
        <div className="spark">✦</div>
        <div>
          <h2>Tend triaged <em>47 intakes</em> today. The AI routed 43 — <em>these {needCount} need a clinician.</em></h2>
          <p>Every member was crisis-screened on each message, scored on the validated instruments, banded, and routed to a lane with logged reasons — before you opened this page. Triaged &amp; routed, not clinically cleared.
            <span className="synthbadge">{isLive ? `● LIVE · ${members.length} member${members.length > 1 ? "s" : ""} from tend` : "synthetic preview (tend tables empty)"}</span>
          </p>
        </div>
      </div>

      {/* active crisis elevated above the queue (clinical-protocol: a live crisis is the top priority) */}
      {crisis && (
        <div className="sec" style={{ borderColor: "var(--crisis-line)" }}>
          <div className="head" style={{ background: "var(--crisis-bg)" }}>
            <h3 style={{ color: "var(--crisis)" }}>● Active crisis — needs human follow-up now</h3>
            <span className="meta">{crisis.name} · {crisis.meta} · 988 shown</span>
          </div>
          <div style={{ padding: "12px 16px", fontSize: 13, color: "#33414a" }}>{crisis.dossier}</div>
        </div>
      )}

      <div className="stats">
        <div className="stat"><div className="k">Intakes today</div><div className="v">47</div><div className="trend">+8 vs. yesterday</div></div>
        <div className="stat"><div className="k">Dossiers ready</div><div className="v">39</div><div className="trend">8 still in session</div></div>
        <div className="stat flag"><div className="k">◈ Needs a clinician</div><div className="v">{needCount}</div><div className="trend">surfaced from 47</div></div>
        <div className="stat alert"><div className="k">● Crisis events · 24h</div><div className="v">1</div><div className="trend">988 shown · open follow-up</div></div>
        <div className="stat warn"><div className="k">⚑ Controlled-substance</div><div className="v">1</div><div className="trend">ASRS+ · Ryan Haight</div></div>
      </div>

      {/* A · TRIAGE QUEUE */}
      <div className="sec">
        <div className="head"><h3>Triage queue</h3><span className="meta">{queue.length} active · sorted by attention · click a row to drill in</span></div>
        <table>
          <thead><tr><th>Member</th><th>Intake</th><th>Lane</th><th>Instruments &amp; bands</th><th>Safety screen</th><th>Attention</th></tr></thead>
          <tbody>
            {queue.map((m) => (
              <tr key={m.id} className={(m.need ? "need " : "") + (m.id === selectedId ? "sel" : "")} onClick={() => setSelectedId(m.id)}>
                <td><div className="mem"><div className="av">{m.initials}</div><div><div className="nm">{m.name}</div><div className="mt">{m.meta}</div></div></div></td>
                <td><div className="istat">{m.intake}{m.intakeSub ? <small>{m.intakeSub}</small> : null}</div></td>
                <td><span className={"lane " + m.lane}>{m.laneLabel}</span></td>
                <td>{m.ins.map((x, i) => <span key={i} className={"ins " + x.band}>{x.label}</span>)}</td>
                <td><span className={"safe " + m.safe}><span className="s" />{m.safe === "flag" ? "Flagged" : "Clear"}{m.safeSub ? <small>{m.safeSub}</small> : null}</span></td>
                <td><span className={"att " + m.attn.cls}>{m.attn.text}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* B · MEMBER DRILL-IN */}
      <div className="sec">
        <div className="head"><h3>Member detail</h3><span className="meta">drill-in · {selected.name} <span style={{ color: "var(--muted-2)" }}>(synthetic)</span></span></div>
        <div className="detail">
          <div className="dcol l">
            <div className="dhead"><div className="av">{selected.initials}</div><div><div className="nm">{selected.name} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>· {selected.meta}</span></div><div className="mt"><span className={"lane " + selected.lane} style={{ fontSize: 10.5, padding: "2px 7px" }}>{selected.laneLabel}</span></div></div></div>
            {selected.dossier && (<div className="block"><div className="bk">▤ AI clinical dossier</div><div className="dossier">{selected.dossier}</div></div>)}
            {selected.scores && (<div className="block"><div className="bk">◔ Instruments &amp; severity bands</div><div className="grid5">{selected.scores.map((s, i) => <div className="iscore" key={i}><div className="nm">{s.nm}</div><div className="sc">{s.sc}</div><div className={"bd " + s.bd}>{({ sev: "Severe", mod: "Moderate", mild: "Mild", min: "Minimal", neg: "Negative" } as Record<string, string>)[s.bd] || s.bd}</div></div>)}</div></div>)}
          </div>
          <div className="dcol">
            {selected.reasons && (<div className="block" style={{ marginTop: 0 }}><div className="bk">⤳ Routing decision &amp; reasons</div><div className="route"><div><span className={"lane " + selected.lane}>{selected.laneLabel}</span></div><ul className="reasons">{selected.reasons.map((r, i) => <li key={i}><span className="rk">{i + 1}</span><div>{r}</div></li>)}</ul>{selected.ctrl && <div className="ctrlflag">{selected.ctrl}</div>}</div></div>)}
            {selected.timeline && (<div className="block"><div className="bk">◈ Safety &amp; crisis-event history</div><div className="tl">{selected.timeline.map((e, i) => <div className={"ev " + e.kind} key={i}><div className="ew">{e.when}</div><div className="et">{e.title}</div><div className="ed">{e.detail}</div></div>)}</div></div>)}
            <div className="selfref">🔒 <b>Self-referral, by design.</b> {selected.name.split(" ")[0]} carries their own dossier — nothing is sent to a provider without their explicit action. Matched providers are in-state only. No PHI leaves to non-contracted providers.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
