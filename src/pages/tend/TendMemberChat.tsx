/* ============================================================================
   Tend — member chat (/tend/me). Login-gated (ProtectedRoute, NO Layout) —
   the member's single ongoing conversation with THERA + their care team.

   Safety model (enforced server-side; this UI only reflects it):
   - every send goes through the n8n bridge, which runs the crisis gate FIRST,
     fail-closed — there is no client path to THERA and no member INSERT policy;
   - lane='crisis' → persistent CrisisBreakout (same component as intake);
   - gate unavailable → gentle retry with the SAME client_msg_id (no duplicates);
   - staff takeover → calm "care team is with you" note; messages still gated.
   Reads + realtime run under the member's OWN RLS (own thread only).
   ============================================================================ */
import React, { useCallback, useEffect, useRef, useState } from "react";
import TheraIntakeChat, { TendMessage } from "@/components/tend/TheraIntakeChat";
import CrisisBreakout from "@/components/tend/CrisisBreakout";
import {
  BridgeResponse,
  ChatMessage,
  ChatThread,
  fetchLatestRouting,
  fetchMessages,
  fetchOwnMember,
  fetchOwnThread,
  newClientMsgId,
  sendChatMessage,
  stripTheraPrefix,
  subscribeThreadMessages,
} from "@/lib/tend/tendChatApi";
import "@/styles/tend-member.css";

const LANE_NEXT_STEP: Record<string, string> = {
  otc: "Some options you can try are ready for you.",
  call: "Your next step: a call with a licensed clinician.",
  in_person: "Your next step: an in-person visit — you carry your own summary.",
  async: "A licensed clinician will follow up with you.",
};

function toBubble(m: ChatMessage): TendMessage {
  if (m.sender_kind === "member") return { role: "me", content: m.content };
  if (m.sender_kind === "staff") return { role: "staff", content: m.content };
  if (m.sender_kind === "system") return { role: "system", content: m.content };
  return { role: "thera", content: stripTheraPrefix(m.content) };
}

export default function TendMemberChat() {
  const [phase, setPhase] = useState<"loading" | "not_member" | "chat" | "crisis">("loading");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ text: string; clientMsgId: string } | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const appendRow = useCallback((row: ChatMessage) => {
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    setMessages((prev) => [...prev, row]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const member = await fetchOwnMember();
      if (cancelled) return;
      if (!member) {
        setPhase("not_member");
        return;
      }
      setMemberId(member.id);
      const t = await fetchOwnThread();
      if (cancelled) return;
      if (t) {
        setThread(t);
        const rows = await fetchMessages(t.id);
        if (cancelled) return;
        rows.forEach((r) => seenIds.current.add(r.id));
        setMessages(rows);
        if (t.staff_takeover) setNotice("Your care team is here with you.");
      }
      const routing = await fetchLatestRouting();
      if (!cancelled && routing && LANE_NEXT_STEP[routing.lane]) {
        setNextStep(LANE_NEXT_STEP[routing.lane]);
      }
      if (!cancelled) setPhase("chat");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // per-thread realtime — RLS means this session can only ever receive own rows
  useEffect(() => {
    if (!thread) return;
    return subscribeThreadMessages(thread.id, appendRow);
  }, [thread, appendRow]);

  const refreshThread = useCallback(async () => {
    const t = await fetchOwnThread();
    if (t) setThread((prev) => (prev && prev.id === t.id ? { ...prev, ...t } : t));
  }, []);

  const handleResult = useCallback(
    (d: BridgeResponse, text: string, clientMsgId: string) => {
      switch (d.state) {
        case "ok":
          if (d.reply && d.reply_message_id && !seenIds.current.has(d.reply_message_id)) {
            seenIds.current.add(d.reply_message_id);
            setMessages((prev) => [
              ...prev,
              {
                id: d.reply_message_id!,
                tenant_id: "tend",
                thread_id: thread?.id || "",
                sender_kind: "thera",
                sender_user_id: null,
                content: d.reply!,
                crisis_flag: false,
                client_msg_id: null,
                created_at: new Date().toISOString(),
              },
            ]);
          }
          setNotice(null);
          break;
        case "crisis":
          setPhase("crisis"); // persistent — no path back this session
          break;
        case "with_care_team":
          setNotice("Your care team is here with you — a person will reply shortly.");
          break;
        case "gate_unavailable":
        case "thera_error":
          setRetry({ text, clientMsgId });
          break;
        case "invalid":
        default:
          setNotice("Something didn't go through. Please try again.");
      }
    },
    [thread],
  );

  const doSend = useCallback(
    async (text: string, clientMsgId: string) => {
      if (!memberId) return;
      setSending(true);
      setRetry(null);
      const d = await sendChatMessage(memberId, text, clientMsgId);
      // first message creates the thread server-side — pick it up (also refreshes takeover)
      if (!thread && (d.state === "ok" || d.state === "crisis" || d.state === "with_care_team")) {
        await refreshThread();
      }
      if (d.member_message_id && !seenIds.current.has(d.member_message_id)) {
        seenIds.current.add(d.member_message_id); // realtime may also deliver it
        setMessages((prev) => [
          ...prev,
          {
            id: d.member_message_id!,
            tenant_id: "tend",
            thread_id: thread?.id || "",
            sender_kind: "member",
            sender_user_id: null,
            content: text,
            crisis_flag: d.state === "crisis",
            client_msg_id: clientMsgId,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      handleResult(d, text, clientMsgId);
      setSending(false);
    },
    [memberId, thread, refreshThread, handleResult],
  );

  const onSend = useCallback(
    (text: string) => {
      void doSend(text, newClientMsgId());
    },
    [doSend],
  );

  if (phase === "loading") {
    return (
      <div className="tend-app">
        <div className="tend-screen">
          <div className="tend-memberwait">One moment…</div>
        </div>
      </div>
    );
  }

  if (phase === "not_member") {
    return (
      <div className="tend-app">
        <div className="tend-screen">
          <div className="tend-memberwait">
            <p>This area is for Tend members.</p>
            <p className="sub">If you think you should have access, please reach out to your care team.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "crisis") {
    return (
      <div className="tend-app">
        <div className="tend-screen">
          <CrisisBreakout />
        </div>
      </div>
    );
  }

  return (
    <div className="tend-app">
      <div className="tend-screen">
        {nextStep && <div className="tend-nextstep-mini">{nextStep}</div>}
        {notice && <div className="tend-careteam-note">{notice}</div>}
        {retry && (
          <div className="tend-retrybar">
            <span>That didn't go through — I'm still here.</span>
            <button
              className="tend-retry"
              disabled={sending}
              onClick={() => void doSend(retry.text, retry.clientMsgId)}
            >
              Try again
            </button>
          </div>
        )}
        <TheraIntakeChat messages={messages.map(toBubble)} sending={sending} onSend={onSend} />
      </div>
    </div>
  );
}
