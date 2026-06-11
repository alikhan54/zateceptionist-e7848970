/* ============================================================================
   Tend Operators — Conversations inbox (/tend-ops/conversations).
   Slim 3-pane: thread list (crisis-pinned red · All / Needs clinician / Crisis /
   Mine filters) · thread view (member / THERA / staff bubbles) · member context
   panel (reuses triageModel buildLiveMembers — extract-don't-duplicate).
   Staff replies = DIRECT authed INSERT (staff_insert RLS). Take-over toggle =
   thread UPDATE (staff_update RLS) — while ON, THERA is suppressed by the bridge;
   the crisis gate STILL runs on every member message (server-side, always).
   ============================================================================ */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type Member, buildLiveMembers } from "@/lib/tend/triageModel";
import {
  ChatMessage,
  ChatThread,
  fetchAllThreads,
  fetchMembersByIds,
  fetchMessages,
  setTakeover,
  staffSendMessage,
  stripTheraPrefix,
  subscribeThreadMessages,
} from "@/lib/tend/tendChatApi";
import "@/styles/tend-ops.css";

type Filter = "all" | "needs" | "crisis" | "mine";

const SENDER_LABEL: Record<string, string> = {
  member: "Member",
  thera: "THERA",
  staff: "Care team",
  system: "System",
};

export default function TendConversations() {
  const { authUser } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, { full_name: string | null; state_us: string | null }>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<Member | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  const selected = useMemo(() => threads.find((t) => t.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const rows = await fetchAllThreads();
    setThreads(rows);
    const map = await fetchMembersByIds(rows.map((r) => r.member_id));
    setMemberMap(map);
  }, []);

  useEffect(() => {
    void loadThreads();
    const iv = setInterval(() => void loadThreads(), 15000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  // selected-thread messages + realtime
  useEffect(() => {
    if (!selectedId) return;
    seenIds.current = new Set();
    setMessages([]);
    void fetchMessages(selectedId).then((rows) => {
      rows.forEach((r) => seenIds.current.add(r.id));
      setMessages(rows);
    });
    return subscribeThreadMessages(selectedId, (row) => {
      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setMessages((prev) => [...prev, row]);
    });
  }, [selectedId]);

  // member context panel — the cockpit's exact derivation, scoped to one member
  useEffect(() => {
    if (!selected) {
      setContext(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const mid = selected.member_id;
      const [mem, rd, ir, ce, dos] = await Promise.all([
        supabase.from("telehealth_members").select("*").eq("id", mid),
        supabase.from("telehealth_routing_decisions").select("*").eq("member_id", mid).order("created_at", { ascending: false }),
        supabase.from("telehealth_instrument_results").select("*").eq("member_id", mid),
        supabase.from("telehealth_crisis_events").select("*").eq("member_id", mid).order("created_at", { ascending: false }),
        supabase.from("telehealth_dossiers").select("*").eq("member_id", mid).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const live = buildLiveMembers(mem.data || [], rd.data || [], ir.data || [], ce.data || [], dos.data || []);
      setContext(live[0] || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const visible = useMemo(() => {
    return threads.filter((t) => {
      if (filter === "crisis") return !!t.crisis_last_at;
      if (filter === "mine") return t.staff_takeover && t.takeover_by === authUser?.id;
      if (filter === "needs") return !!t.crisis_last_at || t.staff_takeover;
      return true;
    });
  }, [threads, filter, authUser]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !selected || !authUser?.id || busy) return;
    setBusy(true);
    const row = await staffSendMessage(selected.id, text, authUser.id);
    if (row && !seenIds.current.has(row.id)) {
      seenIds.current.add(row.id);
      setMessages((prev) => [...prev, row]);
    }
    setDraft("");
    setBusy(false);
  }, [draft, selected, authUser, busy]);

  const toggleTakeover = useCallback(async () => {
    if (!selected || !authUser?.id || busy) return;
    setBusy(true);
    await setTakeover(selected.id, !selected.staff_takeover, authUser.id);
    await loadThreads();
    setBusy(false);
  }, [selected, authUser, busy, loadThreads]);

  const nameOf = (t: ChatThread) => memberMap[t.member_id]?.full_name || "Member";

  return (
    <div className="tend-ops tend-convo">
      <header className="tc-head">
        <h1>Conversations</h1>
        <div className="tc-filters">
          {(["all", "needs", "crisis", "mine"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`tc-filter ${filter === f ? "on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "needs" ? "Needs clinician" : f === "crisis" ? "Crisis" : "Mine"}
            </button>
          ))}
        </div>
      </header>

      <div className="tc-panes">
        {/* pane 1 — thread list */}
        <aside className="tc-list">
          {visible.length === 0 && <div className="tc-empty">No conversations yet.</div>}
          {visible.map((t) => (
            <button
              key={t.id}
              className={`tc-item ${selectedId === t.id ? "sel" : ""} ${t.crisis_last_at ? "crisis" : ""}`}
              onClick={() => setSelectedId(t.id)}
            >
              <div className="tc-item-top">
                <span className="tc-name">{nameOf(t)}</span>
                {t.crisis_last_at && <span className="tc-pin" title="Crisis event on this thread">●</span>}
                {t.staff_takeover && <span className="tc-takeover-chip">care team</span>}
              </div>
              <div className="tc-preview">{stripTheraPrefix(t.last_message_preview || "")}</div>
            </button>
          ))}
        </aside>

        {/* pane 2 — thread view */}
        <section className="tc-thread">
          {!selected && <div className="tc-empty">Select a conversation.</div>}
          {selected && (
            <>
              <div className="tc-thread-head">
                <div>
                  <b>{nameOf(selected)}</b>
                  {selected.crisis_last_at && <span className="tc-crisis-note"> · crisis event on record</span>}
                </div>
                <button
                  className={`tc-takeover ${selected.staff_takeover ? "on" : ""}`}
                  onClick={() => void toggleTakeover()}
                  disabled={busy}
                  title="While ON, THERA is paused for this member. The crisis safety gate always runs."
                >
                  {selected.staff_takeover ? "Hand back to THERA" : "Take over"}
                </button>
              </div>
              <div className="tc-msgs">
                {messages.map((m) => (
                  <div key={m.id} className={`tc-msg ${m.sender_kind} ${m.crisis_flag ? "flagged" : ""}`}>
                    <div className="tc-msg-meta">
                      {SENDER_LABEL[m.sender_kind] || m.sender_kind}
                      {m.crisis_flag && <span className="tc-flag"> · crisis-flagged</span>}
                    </div>
                    <div className="tc-msg-body">
                      {m.sender_kind === "thera" ? stripTheraPrefix(m.content) : m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="tc-composer">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={
                    selected.staff_takeover
                      ? "Reply as the care team…"
                      : "Reply as the care team (THERA stays active unless you take over)…"
                  }
                  disabled={busy}
                />
                <button onClick={() => void send()} disabled={busy || !draft.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </section>

        {/* pane 3 — member context (cockpit derivation, reused) */}
        <aside className="tc-context">
          {!context && <div className="tc-empty">Member context appears here.</div>}
          {context && (
            <>
              <div className="tc-ctx-name">
                {context.name} <span className="tc-ctx-meta">{context.meta}</span>
              </div>
              <div className={`tc-ctx-attn ${context.attn.cls}`}>{context.attn.text}</div>
              <div className="tc-ctx-lane">Lane: {context.laneLabel}</div>
              <div className="tc-ctx-ins">
                {context.ins.map((i, idx) => (
                  <span key={idx} className={`tc-band ${i.band}`}>{i.label}</span>
                ))}
              </div>
              {context.dossier && <p className="tc-ctx-dossier">{context.dossier}</p>}
              {context.timeline && context.timeline.length > 0 && (
                <div className="tc-ctx-timeline">
                  {context.timeline.slice(0, 4).map((ev, idx) => (
                    <div key={idx} className={`tc-ev ${ev.kind}`}>
                      <div className="tc-ev-when">{ev.when}</div>
                      <div className="tc-ev-title">{ev.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
