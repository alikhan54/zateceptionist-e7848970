import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOmegaVoice } from "@/hooks/useOmegaVoice";
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

// Holding phrases — spoken INSTANTLY (browser TTS) the moment a query is
// submitted, so there's no dead air while the brain thinks. Rotated without an
// immediate repeat. (Editable; user can tune the set later.)
const HOLDING_PHRASES = [
  "Let me pull that together for you.",
  "One moment — gathering the details.",
  "Looking into that now.",
  "Give me a breath while I check the numbers.",
  "On it — fetching the latest for you.",
  "Let me dig into that.",
  "Checking across your data now.",
  "A moment while I bring this together.",
];

// Optional soft nudge if the brain reply takes longer than NUDGE_DELAY_MS.
// Toggle with NUDGE_ENABLED.
const NUDGE_ENABLED = true;
const NUDGE_DELAY_MS = 7000;
const NUDGE_PHRASES = ["Still on it…", "Almost there…", "Just a moment more…"];

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
  // Mic-fix: reuse the existing voice hook (Web Speech in + Edge/browser TTS out).
  const voice = useOmegaVoice();
  const prevListening = useRef(false);
  // Rotating-phrase picker (no immediate repeat) for holding + nudge sets.
  const lastPhraseRef = useRef<Record<string, number>>({ hold: -1, nudge: -1 });
  const pickPhrase = (list: string[], key: string) => {
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPhraseRef.current[key]) i = (i + 1) % list.length;
    lastPhraseRef.current[key] = i;
    return list[i];
  };
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
    // HOLDING PHRASE — spoken INSTANTLY (browser TTS, no network) the moment the
    // query is submitted, so there's no dead air while the brain thinks.
    voice.speakFiller(pickPhrase(HOLDING_PHRASES, "hold"));
    // brief listening pulse so the state pill reads naturally
    await new Promise((r) => setTimeout(r, 350));
    setState("thinking");
    // Optional soft nudge if the brain takes a while — cleared the instant the
    // reply arrives so it never talks over the answer.
    let replied = false;
    const nudgeTimer = NUDGE_ENABLED
      ? window.setTimeout(() => {
          if (!replied) voice.speakFiller(pickPhrase(NUDGE_PHRASES, "nudge"));
        }, NUDGE_DELAY_MS)
      : 0;
    if (nudgeTimer) demoTimers.current.push(nudgeTimer as unknown as number);
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
      replied = true;
      if (nudgeTimer) clearTimeout(nudgeTimer);
      const data = (res?.data ?? {}) as any;
      const reply =
        data.response ||
        data.message ||
        data.error ||
        (res?.success ? "OMEGA returned an empty response." : "OMEGA is temporarily unavailable.");
      const clean = sanitizeResponse(reply);
      // Clean hand-off: cut any holding phrase still playing, then WRITE + SPEAK
      // the answer CONCURRENTLY (typewriter + TTS start together — not voice-last).
      voice.stopSpeaking();
      typeTranscript(clean);
      voice.speakText(clean);
    } catch {
      replied = true;
      if (nudgeTimer) clearTimeout(nudgeTimer);
      voice.stopSpeaking();
      typeTranscript("OMEGA is temporarily unavailable. Try again in a moment.");
    }
  };

  // ---- Mic (voice) wiring — reuse useOmegaVoice; turn-based, no barge-in. ----
  // Reflect the REAL SpeechRecognition flag in the sphere + show live transcript.
  useEffect(() => {
    if (voice.isListening) {
      setState("listening");
      if (voice.transcript) setTranscript(voice.transcript);
    }
  }, [voice.isListening, voice.transcript]);

  // When a listening turn ENDS (final result or manual stop): submit the
  // transcript through the SAME path as typed input; if empty, return to idle.
  useEffect(() => {
    if (prevListening.current && !voice.isListening) {
      const t = voice.transcript.trim();
      if (t) sendQuery(t);
      else setState("idle");
    }
    prevListening.current = voice.isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isListening]);

  // Mic button → toggle listening. Graceful when Web Speech is unsupported.
  const handleMic = () => {
    if (!voice.speechSupported) {
      if (inputValue.trim()) sendQuery(inputValue);
      else runIntroCycle();
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
    } else {
      demoTimers.current.forEach((id) => clearTimeout(id));
      demoTimers.current = [];
      setTranscript("");
      voice.startListening();
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
      <div className="v3-transcript" data-testid="omega-transcript">{transcript}</div>

      {/* State pill with progress hint — Phase 5d UX polish.
          LangGraph + MEDICA round-trips take 30-90s; without a hint users
          assumed the chat was frozen. Now the "THINKING" state shows
          animated dots, and we surface that responses can take up to 90s. */}
      <div className={`v3-state-pill ${state}`} data-testid="omega-state-pill">
        <span className="dot" />
        {STATE_LABEL[state]}
        {(state === "thinking" || state === "listening") && (
          <span
            aria-label="working"
            style={{ marginLeft: 8, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}
          >
            <span className="omega-dot omega-dot-1">·</span>
            <span className="omega-dot omega-dot-2">·</span>
            <span className="omega-dot omega-dot-3">·</span>
          </span>
        )}
      </div>
      {state === "thinking" && (
        <div
          className="omega-progress-hint"
          data-testid="omega-progress-hint"
          style={{
            position: "absolute",
            bottom: "calc(50% - 220px)",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            opacity: 0.55,
            pointerEvents: "none",
          }}
        >
          OMEGA is consulting the brain — typically 30–90s for clinical queries.
        </div>
      )}

      {/* Minimal command bar — Enter submits a typed query; the mic toggles
          live voice (Web Speech via useOmegaVoice); the speaker mutes voice-out. */}
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
          className={`v3-mic-btn ${voice.isListening ? "listening" : ""}`}
          onClick={handleMic}
          aria-label={voice.isListening ? "Stop listening" : "Talk to OMEGA"}
          title={voice.isListening ? "Stop listening" : "Talk to OMEGA"}
        >
          {voice.isListening ? <MicOff size={22} strokeWidth={2.2} /> : <Mic size={22} strokeWidth={2.2} />}
        </button>
        <button
          className="v3-mic-btn"
          onClick={() => {
            if (voice.isSpeaking) voice.stopSpeaking();
            voice.setVoiceEnabled(!voice.voiceEnabled);
          }}
          aria-label={voice.voiceEnabled ? "Mute OMEGA voice" : "Unmute OMEGA voice"}
          title={voice.isSpeaking ? "Stop speaking" : voice.voiceEnabled ? "Mute voice" : "Unmute voice"}
        >
          {voice.voiceEnabled ? <Volume2 size={20} strokeWidth={2.2} /> : <VolumeX size={20} strokeWidth={2.2} />}
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
