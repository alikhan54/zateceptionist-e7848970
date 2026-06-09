/* ============================================================================
   Tend — "Your next step" (member surface). Renders the Smart Router lane in
   PLAIN LANGUAGE: no clinical severity labels, no scores, no "safety: clear".
   Lanes: otc (member-chosen catalog) · call ($49) · in_person (self-referral, $75)
   · async (sandbox placeholder; NO live Rx). crisis never reaches here (the
   pre-filter intercepts before routing). Self-referral guarantee shown as a calm
   trust line. Synthetic/mock data only.
   ============================================================================ */
import React, { useState } from "react";
import type { RouterResult } from "@/lib/tend/tendApi";

function AppBar() {
  return (
    <div className="tend-appbar">
      <div className="tend-avatar">TH</div>
      <div>
        <div className="tend-who">Your next step</div>
        <div className="tend-state">prepared with you · private</div>
      </div>
      <div className="tend-logo">Tend</div>
    </div>
  );
}

function SelfReferral() {
  return (
    <div className="tend-selfref">
      🔒 <b>This is yours.</b> The summary we put together stays with you — nothing is shared
      with any clinician or provider unless you choose to. No surprises, no queue-jumping promises.
    </div>
  );
}

function OtcLane({ result }: { result: RouterResult }) {
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const items = result.otc_catalog || [];
  return (
    <div className="tend-ncard">
      <div className="k">● Some options you can try</div>
      <p className="lead">
        Based on our conversation, here are some gentle, over-the-counter and behavioral options
        people often start with. Browse them and pick what feels right for you — there's no rush.
      </p>
      {items.map((it, i) => {
        const key = it.name + i;
        return (
          <div className="tend-otc-item" key={key}>
            {it.category ? <span className="oc">{it.category}</span> : null}
            <div className="ob">
              <div className="on">{it.name}</div>
              {it.description ? <div className="od">{it.description}</div> : null}
            </div>
            <button
              className="tend-choose"
              onClick={() => setChosen((c) => ({ ...c, [key]: !c[key] }))}
            >
              {chosen[key] ? "Added ✓" : "Choose"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CallLane() {
  return (
    <div className="tend-ncard">
      <div className="k">▸ Talk with someone</div>
      <div className="tend-step">
        <div className="num">1</div>
        <div className="body">
          <div className="t">Talk with a licensed clinician</div>
          <div className="d">
            A private call with a licensed clinician who can talk things through with you and help
            you decide what's next. You choose the time.
          </div>
          <div className="tend-ctarow">
            <button className="tend-cta">Book a call</button>
            <span className="tend-fee">Service fee: <b>$49</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InPersonLane({ result }: { result: RouterResult }) {
  const state = result.member_state || "your state";
  const count = result.provider_count;
  const [summaryPrep, setSummaryPrep] = useState(false);
  return (
    <div className="tend-ncard">
      <div className="k">▸ See someone in person</div>
      <div className="tend-step">
        <div className="num">1</div>
        <div className="body">
          <div className="t">See a licensed provider in person</div>
          <div className="d">
            For what you're describing, meeting someone in person is the right next step.
            {count ? ` We found ${count} licensed providers in ${state} you can reach out to directly` : ` We can help you find licensed providers in ${state} you can reach out to directly`} —
            you carry your own summary to share with whoever you choose.
          </div>
          <div className="tend-ctarow">
            <button className="tend-cta">Find a provider</button>
            <button className="tend-cta ghost" onClick={() => setSummaryPrep(true)}>Download my summary</button>
            <span className="tend-fee">Service fee: <b>$75</b></span>
          </div>
          {summaryPrep && (
            <div className="tend-fee" style={{ marginTop: 10 }}>
              📄 Your summary is being prepared — we'll have it ready to download shortly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AsyncLane() {
  return (
    <div className="tend-ncard">
      <div className="k">▸ A clinician will follow up</div>
      <p className="lead">
        Thanks for sharing all of that. A licensed clinician will review what you've told us and
        follow up with you about next steps. In the meantime, you're welcome to keep talking with
        THERA any time.
      </p>
      <div className="tend-fee" style={{ marginTop: 4 }}>
        We'll let you know as soon as there's an update — there's nothing else you need to do right now.
      </div>
    </div>
  );
}

export default function NextStep({ result }: { result: RouterResult }) {
  return (
    <>
      <AppBar />
      <div className="tend-next">
        <h2>Here's your next step</h2>
        <p className="lede">A calm summary of where to go from here, based on our conversation.</p>

        {result.lane === "otc" && <OtcLane result={result} />}
        {result.lane === "call" && <CallLane />}
        {result.lane === "in_person" && <InPersonLane result={result} />}
        {result.lane === "async" && <AsyncLane />}

        <SelfReferral />
        <p className="tend-attrib">Prepared with you by <b>THERA</b></p>
      </div>
    </>
  );
}
