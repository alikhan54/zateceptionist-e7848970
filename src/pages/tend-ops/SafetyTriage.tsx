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
// VERTICAL-FIRST-UI: types + SAMPLE + mappers extracted VERBATIM to the shared
// triage model so Pulse reuses the same derivation without duplicating logic.
import { type Member, SAMPLE, buildLiveMembers } from "@/lib/tend/triageModel";

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
