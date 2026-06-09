/* ============================================================================
   Tend — THERA intake chat (member surface, presentational).
   The calm conversational intake. Ambient 988 line in the FOOTER only (member view
   is plain-language: no clinical labels, no safety badge). Send flow + the crisis
   gate live in the parent (TendIntakePage).
   ============================================================================ */
import React, { useEffect, useRef, useState } from "react";

export interface TendMessage {
  role: "thera" | "me";
  content: string;
}

interface Props {
  messages: TendMessage[];
  sending: boolean;
  onSend: (text: string) => void;
  onSeeNextStep?: () => void;
}

export default function TheraIntakeChat({ messages, sending, onSend, onSeeNextStep }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const submit = () => {
    const t = input.trim();
    if (!t || sending) return;
    setInput("");
    onSend(t);
  };

  return (
    <>
      <div className="tend-appbar">
        <div className="tend-avatar">TH</div>
        <div>
          <div className="tend-who">THERA</div>
          <div className="tend-state">
            <span className="tend-dot" /> here with you · private
          </div>
        </div>
        <div className="tend-logo">Tend</div>
      </div>

      <div className="tend-chat" ref={scrollRef}>
        <div className="tend-day">Today</div>
        {messages.map((m, i) => (
          <div key={i} className={`tend-msg ${m.role === "me" ? "tend-me" : "tend-thera"}`}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="tend-typing" aria-label="THERA is typing">
            <i /><i /><i />
          </div>
        )}
      </div>

      {onSeeNextStep && (
        <div className="tend-readybar">
          <button className="tend-ready" onClick={onSeeNextStep} disabled={sending}>
            I'm ready — show my next step →
          </button>
        </div>
      )}

      {/* ambient 988 — footer only; member view: free · 24/7 (no "confidential" claim) */}
      <div className="tend-safety">
        In crisis or thinking about harming yourself? Call or text <b>988</b> — anytime, free, 24/7.
      </div>

      <div className="tend-composer">
        <input
          className="tend-field"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          disabled={sending}
          aria-label="Message THERA"
        />
        <button className="tend-send" onClick={submit} disabled={sending || !input.trim()} aria-label="Send">
          ↑
        </button>
      </div>
    </>
  );
}
