/* ============================================================================
   Tend — member intake page (patient-facing route /tend).
   Standalone calm surface (NOT the operator Layout/sidebar). State machine:
     intake     → THERA conversational intake
     crisis     → persistent crisis breakout (terminal; cannot return to intake)
     generating → "preparing your summary…" while dossier+router run
     next_step  → the routing outcome, in plain language (otc/call/in_person/async)
   Every member message is gated by the crisis pre-filter FIRST. Synthetic member.
   ============================================================================ */
import React, { useState, useCallback, useEffect } from "react";
import "@/styles/tend-member.css";
import TheraIntakeChat, { TendMessage } from "@/components/tend/TheraIntakeChat";
import CrisisBreakout from "@/components/tend/CrisisBreakout";
import NextStep from "@/components/tend/NextStep";
import {
  preFilter, askThera, getSyntheticMemberId,
  routeMember, triggerDossierAsync, mockRouterResult,
  type RouterResult, type RouterLane,
} from "@/lib/tend/tendApi";

type Mode = "intake" | "crisis" | "generating" | "next_step";

const GREETING: TendMessage = {
  role: "thera",
  content:
    "Hi — I'm really glad you're here. I'm THERA. Think of this as a calm first conversation, just between us. What's been weighing on you lately?",
};

function GeneratingView() {
  return (
    <>
      <div className="tend-appbar">
        <div className="tend-avatar">TH</div>
        <div>
          <div className="tend-who">THERA</div>
          <div className="tend-state"><span className="tend-dot" /> putting this together · private</div>
        </div>
        <div className="tend-logo">Tend</div>
      </div>
      <div className="tend-gen">
        <div className="tend-emblem"><span className="ring" /><span className="ring r2" /><span className="core" /></div>
        <div className="gtext">Putting together a calm summary of our conversation, and where to go from here…</div>
      </div>
    </>
  );
}

export default function TendIntakePage() {
  const [mode, setMode] = useState<Mode>("intake");
  const [messages, setMessages] = useState<TendMessage[]>([GREETING]);
  const [sending, setSending] = useState(false);
  const [routerResult, setRouterResult] = useState<RouterResult | null>(null);
  const memberId = getSyntheticMemberId();

  // Preview-only: ?mocklane=otc|call|in_person|async renders a lane without the backend.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("mocklane");
    if (p && ["otc", "call", "in_person", "async"].includes(p)) {
      setRouterResult(mockRouterResult(p as RouterLane));
      setMode("next_step");
    }
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "me", content: text }]);
      setSending(true);

      // 1) MANDATORY crisis gate — runs before THERA on every message.
      const pf = await preFilter(text, memberId);
      if (pf.lane === "crisis") { setSending(false); setMode("crisis"); return; }
      if (!pf.ok) {
        setMessages((prev) => [...prev, {
          role: "thera",
          content: "I had a little trouble just then — could you say that again? (If you're ever in crisis, you can call or text 988 anytime.)",
        }]);
        setSending(false);
        return;
      }
      // 2) non-crisis → THERA (on-box, PHI-guarded).
      const reply = await askThera(text, memberId);
      setMessages((prev) => [...prev, { role: "thera", content: reply.text }]);
      setSending(false);
    },
    [memberId]
  );

  // Member-initiated trigger: intake → router (FAST lane) → next_step.
  // The lane comes from the ROUTER directly (reads the scored instruments, ~5s) — we do
  // NOT block on the slow dossier narrative (>120s under load). The dossier is fired-and-
  // forgotten for the operator + the downloadable summary.
  const handleSeeNextStep = useCallback(async () => {
    setMode("generating");

    const route = await routeMember(memberId); // no dossier_id — fast
    if (route.lane === "crisis") { setMode("crisis"); return; } // defensive (pre-filter normally intercepts)
    if (!route.ok) {
      setMessages((prev) => [...prev, {
        role: "thera",
        content: "I had trouble finding your next step just now — let's keep talking, and we can try again in a moment.",
      }]);
      setMode("intake");
      return;
    }

    // Dossier (narrative for the operator + your downloadable summary) generates in the
    // background — the member never waits on it.
    triggerDossierAsync(memberId);

    setRouterResult(route);
    setMode("next_step");
  }, [memberId]);

  const memberMsgCount = messages.filter((m) => m.role === "me").length;

  return (
    <div className="tend-app">
      <div className="tend-screen">
        {mode === "crisis" ? (
          <CrisisBreakout />
        ) : mode === "next_step" && routerResult ? (
          <NextStep result={routerResult} />
        ) : mode === "generating" ? (
          <GeneratingView />
        ) : (
          <TheraIntakeChat
            messages={messages}
            sending={sending}
            onSend={handleSend}
            onSeeNextStep={memberMsgCount >= 1 ? handleSeeNextStep : undefined}
          />
        )}
      </div>
    </div>
  );
}
