/* ============================================================================
   Tend — Crisis Breakout (member surface).
   Rendered the instant the crisis pre-filter returns lane='crisis'. It PERSISTS:
   there is intentionally NO prop/handler to dismiss it back into intake or commerce.
   Care, not alarm. One-tap Call/Text 988 + a calm 911 line. Never names a means.
   Per review: footer says "free · 24/7" (NOT "confidential"); does NOT echo the
   member's message back.
   ============================================================================ */
import React from "react";

export default function CrisisBreakout() {
  return (
    <>
      {/* app bar — THERA stays present; intentionally no back / close */}
      <div className="tend-appbar">
        <div className="tend-avatar">TH</div>
        <div>
          <div className="tend-who">THERA</div>
          <div className="tend-state">
            <span className="tend-dot" /> here with you · right now
          </div>
        </div>
        <div className="tend-logo">Tend</div>
      </div>

      <div className="tend-hold">
        <div className="tend-emblem">
          <span className="ring" />
          <span className="ring r2" />
          <span className="core" />
        </div>

        <p className="tend-held-words">
          I'm really glad you told me. What you're feeling matters — and you{" "}
          <b>don't have to carry it alone</b>. I'm right here with you.
        </p>

        {/* the help, gently + one tap each */}
        <div className="tend-help">
          <div className="lab">Free · 24/7</div>
          <div className="title">988 Suicide &amp; Crisis Lifeline</div>
          <div className="desc">Trained people, ready to listen — any time of day or night.</div>
          <div className="tend-taprow">
            <a className="tend-tap call" href="tel:988">
              <span aria-hidden>✆</span> Call 988
            </a>
            <a className="tend-tap text" href="sms:988">
              <span aria-hidden>✉</span> Text 988
            </a>
          </div>
        </div>

        <div className="tend-line911">
          If you're in immediate danger, please call <a href="tel:911">911</a>.
        </div>

        {/* honest — a companion, not a crisis counselor */}
        <div className="tend-honest">
          <span className="h-ic" aria-hidden>♡</span>
          <div>
            I'm a supportive companion here with you — not a crisis counselor. The people at 988 are
            trained for exactly this moment, and I'll stay right here while you reach out.
          </div>
        </div>

        <p className="tend-presence">
          We can keep talking while you reach out. There's nowhere else you need to be.
        </p>
      </div>

      {/* held — no skip / continue / next-step path out of this state */}
      <div className="tend-heldfoot">
        <b>You're held here.</b> No next step to rush to — just this, for as long as you need.
      </div>
    </>
  );
}
