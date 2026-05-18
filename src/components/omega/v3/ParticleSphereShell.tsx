import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { sanitizeResponse } from "@/lib/security/sanitizeResponse";
import { ParticleSphere, type OmegaState } from "./ParticleSphere";
import { NavRail } from "./nav/NavRail";
import { Spotlight } from "./nav/Spotlight";
import { Cathedral } from "./nav/Cathedral";
import { useNavOverlay } from "./nav/useNavOverlay";
import "./styles.css";

const STATE_LABEL: Record<OmegaState, string> = {
  idle: "IDLE",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
};

// First-load intro line. Shown once on mount as a teaser; real user
// questions hit the OMEGA chat webhook and replace this with the live
// response. Kept short so it doesn't get mistaken for a real answer.
const INTRO_TRANSCRIPT =
  "Ask me anything about your business — I have full access to your data, workflows, and AI agents.";

export function ParticleSphereShell() {
  const [state, setState] = useState<OmegaState>("idle");
  const [transcript, setTranscript] = useState("");
  const [inputValue, setInputValue] = useState("");
  const demoTimers = useRef<number[]>([]);
  const overlay = useNavOverlay();
  const location = useLocation();
  // Phase 2B.1 — top bar reads from useTenant() instead of hardcoded text.
  const { tenantId, tenantConfig } = useTenant();
  const { user, isAdmin } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const businessName =
    tenantConfig?.company_name ??
    tenantId?.replace(/-/g, " ").toUpperCase() ??
    "OMEGA";
  const tenantLabel = tenantId ?? "guest";
  const markLetter = (businessName[0] ?? "O").toUpperCase();

  // Add 'omega-fullscreen' class to body to hide OmegaFloatingChat.
  // CSS rule lives in v2's styles.css (imported via this component's styles.css).
  useEffect(() => {
    document.body.classList.add("omega-fullscreen");
    return () => {
      document.body.classList.remove("omega-fullscreen");
    };
  }, []);

  // Type out `text` character-by-character into the transcript at ~28ms/char.
  // Cleans up any prior demo timers first so a new query doesn't race with
  // a previous one.
  const typeTranscript = (text: string) => {
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];
    setTranscript("");
    setState("speaking");
    let i = 0;
    const typer = window.setInterval(() => {
      i++;
      setTranscript(text.slice(0, i));
      if (i >= text.length) clearInterval(typer);
    }, 28);
    demoTimers.current.push(typer as unknown as number);
    demoTimers.current.push(
      window.setTimeout(() => setState("idle"), text.length * 28 + 3000),
    );
  };

  // Intro cycle on first mount — short teaser that the input is live.
  const runIntroCycle = () => {
    if (state !== "idle") return;
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];

    setState("listening");
    setTranscript("");
    demoTimers.current.push(window.setTimeout(() => setState("thinking"), 1400));
    demoTimers.current.push(
      window.setTimeout(() => typeTranscript(INTRO_TRANSCRIPT), 1400 + 1200),
    );
  };

  // Submit a real OMEGA query — POSTs to the /omega-chat n8n webhook
  // (same path used by OmegaFloatingChat) and replaces the transcript with
  // the real response. Graceful fallback transcript on error so the UI
  // never goes silent.
  const sendQuery = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || state === "thinking" || state === "speaking") return;
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];
    setInputValue("");
    setState("listening");
    setTranscript(message);
    // brief listening pulse so the state pill reads naturally
    await new Promise((r) => setTimeout(r, 350));
    setState("thinking");
    try {
      const res = await callWebhook(
        WEBHOOKS.OMEGA_CHAT,
        {
          message,
          channel: "web_chat",
          sender_identifier: user?.email || "",
          sender_type: isAdmin ? "admin" : "team_member",
          tenant_uuid: tenantUuid || "",
        },
        tenantId,
      );
      const data = (res?.data ?? {}) as any;
      const reply =
        data.response ||
        data.message ||
        data.error ||
        (res?.success ? "OMEGA returned an empty response." : "OMEGA is temporarily unavailable.");
      typeTranscript(sanitizeResponse(reply));
    } catch {
      typeTranscript("OMEGA is temporarily unavailable. Try again in a moment.");
    }
  };

  // Auto-run intro 2.4s after mount.
  useEffect(() => {
    const id = window.setTimeout(() => runIntroCycle(), 2400);
    return () => {
      clearTimeout(id);
      demoTimers.current.forEach((tid) => clearTimeout(tid));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="omega-shell-v3">
      <ParticleSphere state={state} className="stage-canvas" />
      <div className="v3-vignette" />

      {/* Slim top bar — reads tenant identity from useTenant() (Phase 2B.1) */}
      <div className="v3-topbar">
        <div className="mark">{markLetter}</div>
        <div className="name">
          {businessName.toUpperCase()}
          <span className="small">tenant · {tenantLabel}</span>
        </div>
        <div className="telemetry">
          <span>
            SEQ <b>14</b>
          </span>
          <span>
            HOT <b>27</b>
          </span>
          <span>
            LEADS <b>171</b>
          </span>
        </div>
        <div className="search-hint">⌘K · SEARCH</div>
        <div className="avatar">A</div>
      </div>

      {/* Dramatic OMEGA wordmark + subhead */}
      <div className="v3-wordmark">
        <h1>OMEGA</h1>
        <div className="sub">
          core intelligence · <em>always thinking</em>
        </div>
      </div>

      {/* Floating transcript (single line, no card) */}
      <div className="v3-transcript">{transcript}</div>

      {/* State pill */}
      <div className={`v3-state-pill ${state}`}>
        <span className="dot" />
        {STATE_LABEL[state]}
      </div>

      {/* Minimal command bar — Enter submits a real OMEGA query.
          The mic button replays the intro teaser; speech recognition lives in
          OmegaFloatingChat for now. */}
      <div className="v3-commandbar">
        <input
          className="v3-input-pill"
          placeholder="Ask OMEGA anything…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendQuery(inputValue);
          }}
          disabled={state === "thinking" || state === "speaking"}
        />
        <button
          className={`v3-mic-btn ${state === "listening" ? "listening" : ""}`}
          onClick={() => (inputValue.trim() ? sendQuery(inputValue) : runIntroCycle())}
          aria-label="Submit query or replay intro"
        >
          <Mic size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* Phase 2A — navigation. Pure additions: NavRail (left), Spotlight (⌘K modal),
          Cathedral ("All apps" overlay). None of the existing elements above are changed. */}
      <NavRail
        onOpenSpotlight={overlay.openSpotlight}
        onOpenCathedral={overlay.openCathedral}
        currentPath={location.pathname}
      />
      <Spotlight isOpen={overlay.spotlightOpen} onClose={overlay.closeSpotlight} />
      <Cathedral isOpen={overlay.cathedralOpen} onClose={overlay.closeCathedral} />
    </div>
  );
}
