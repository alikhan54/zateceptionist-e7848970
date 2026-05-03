import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic } from "lucide-react";
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

const DEMO_TRANSCRIPT =
  "Five hot leads matched your ideal customer profile this morning. I drafted intro emails for each — want me to send them?";

export function ParticleSphereShell() {
  const [state, setState] = useState<OmegaState>("idle");
  const [transcript, setTranscript] = useState("");
  const demoTimers = useRef<number[]>([]);
  const overlay = useNavOverlay();
  const location = useLocation();

  // Add 'omega-fullscreen' class to body to hide OmegaFloatingChat.
  // CSS rule lives in v2's styles.css (imported via this component's styles.css).
  useEffect(() => {
    document.body.classList.add("omega-fullscreen");
    return () => {
      document.body.classList.remove("omega-fullscreen");
    };
  }, []);

  // Demo cycle: idle → listening → thinking → speaking → idle.
  // Identical timing to v2's NeuralBrainShell for direct comparison.
  const runDemoCycle = () => {
    if (state !== "idle") return;
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];

    setState("listening");
    setTranscript("");

    demoTimers.current.push(
      window.setTimeout(() => {
        setState("thinking");
      }, 1400),
    );
    demoTimers.current.push(
      window.setTimeout(() => {
        setState("speaking");
        let i = 0;
        const typer = window.setInterval(() => {
          i++;
          setTranscript(DEMO_TRANSCRIPT.slice(0, i));
          if (i >= DEMO_TRANSCRIPT.length) clearInterval(typer);
        }, 28);
        demoTimers.current.push(typer as unknown as number);
      }, 1400 + 2200),
    );
    demoTimers.current.push(
      window.setTimeout(
        () => {
          setState("idle");
          window.setTimeout(() => setTranscript(""), 1200);
        },
        1400 + 2200 + 5000,
      ),
    );
  };

  // Auto-run demo 2.4s after mount (matches v2)
  useEffect(() => {
    const id = window.setTimeout(() => runDemoCycle(), 2400);
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

      {/* Slim top bar */}
      <div className="v3-topbar">
        <div className="mark">Z</div>
        <div className="name">
          ZATE SYSTEMS
          <span className="small">tenant · zateceptionist</span>
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

      {/* Minimal command bar */}
      <div className="v3-commandbar">
        <input
          className="v3-input-pill"
          placeholder="Ask OMEGA anything…"
          onKeyDown={(e) => {
            if (e.key === "Enter") runDemoCycle();
          }}
        />
        <button
          className={`v3-mic-btn ${state === "listening" ? "listening" : ""}`}
          onClick={runDemoCycle}
          aria-label="Activate microphone"
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
