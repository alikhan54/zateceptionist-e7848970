import { useEffect, useMemo, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { NeuralBrain, NEURAL_REGIONS, type OmegaState } from "./NeuralBrain";
import { AGENT_DATA, AGENT_TOTAL, type Agent } from "./agentRegistry";
import "./styles.css";

const RAIL_ITEMS = [
  { mark: "N", label: "NEXUS" },
  { mark: "S", label: "SALES" },
  { mark: "M", label: "MARKETING" },
  { mark: "H", label: "HR" },
  { mark: "R", label: "REAL ESTATE" },
  { mark: "F", label: "FINANCE" },
  { mark: "C", label: "CLINIC" },
  { mark: "D", label: "DATA" },
  { mark: "⌘", label: "COMMAND" },
];

const STATE_LABEL: Record<OmegaState, string> = {
  idle: "IDLE",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
};

const SAMPLE_LEADS = [
  { name: "Sarah Chen — Acme Corp", score: 92 },
  { name: "Marcus Rivera — TechFlow", score: 88 },
  { name: "Priya Patel — NorthStar", score: 84 },
  { name: "James O'Brien — Cosmic Inc", score: 81 },
  { name: "Hana Sato — Lumen Labs", score: 78 },
];

const DEMO_TRANSCRIPT =
  "Five hot leads matched your ideal customer profile this morning. I drafted intro emails for each — want me to send them?";

function HudCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg
      className={`hud-corner ${pos}`}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 18 L2 2 L18 2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12 L8 8 L12 8" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
    </svg>
  );
}

function Sparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 24; i++) {
      const x = (i / 23) * 100;
      const y = 50 + Math.sin(i * 0.6 + Math.random()) * 15 + (Math.random() - 0.5) * 8;
      out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return out.join(" ");
  }, []);
  return (
    <svg className="spark" viewBox="0 0 100 60" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NeuralBrainShell() {
  const [state, setState] = useState<OmegaState>("idle");
  const [transcript, setTranscript] = useState("");
  const [showAction, setShowAction] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [activeRail, setActiveRail] = useState("N");

  const labelLayerRef = useRef<HTMLDivElement>(null);
  const regionLabelsRef = useRef<HTMLDivElement[]>([]);
  const regionRatesRef = useRef<HTMLSpanElement[]>([]);
  const demoTimers = useRef<number[]>([]);

  // ---- 1. Add 'omega-fullscreen' class to body to hide OmegaFloatingChat
  // (Layout.tsx is sacred and unconditionally renders it; we hide via CSS.)
  useEffect(() => {
    document.body.classList.add("omega-fullscreen");
    return () => {
      document.body.classList.remove("omega-fullscreen");
    };
  }, []);

  // ---- 2. Region label projection — runs on every animation frame.
  // Hooks into the same camera/brainGroup state by querying the canvas's WebGL position.
  // Simpler approach: re-derive screen position from a known camera + group rotation.
  // The rotation happens inside NeuralBrain's loop; we read brainGroup transform via the
  // canvas's matrix snapshot. Since we don't have direct access, we approximate by reading
  // the canvas bounds and projecting against an estimated camera (z=6 default).
  // For Phase 1, we use a self-contained loop that mirrors NeuralBrain's auto-rotate so
  // labels stay roughly aligned. (Mouse-drag is the only divergence; acceptable for Phase 1.)
  useEffect(() => {
    let frameId = 0;
    let t0 = performance.now();
    const render = () => {
      const layer = labelLayerRef.current;
      if (!layer) {
        frameId = requestAnimationFrame(render);
        return;
      }
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const now = performance.now();
      const elapsed = (now - t0) / 1000;
      // approximate auto-rotation so labels follow the 3D positions
      const rotY = elapsed * 0.0008 * 60;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      // simple perspective: cameraZ=6, fov=45deg
      const fov = (45 * Math.PI) / 180;
      const focal = h / (2 * Math.tan(fov / 2));

      NEURAL_REGIONS.forEach((region, i) => {
        const el = regionLabelsRef.current[i];
        if (!el) return;
        // rotate around Y axis to track auto-rotation
        const x = region.pos[0] * cosY + region.pos[2] * sinY;
        const z = -region.pos[0] * sinY + region.pos[2] * cosY;
        const y = region.pos[1];
        const camZ = 6 - z;
        if (camZ <= 0.1) {
          el.style.opacity = "0";
          return;
        }
        const screenX = w / 2 + (x / camZ) * focal;
        const screenY = h / 2 - (y / camZ) * focal;
        const depthOpacity = Math.max(0.3, 1 - (1 - z / 3) * 0.5);
        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        el.style.opacity = `${depthOpacity}`;
      });
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ---- 3. Firing-rate label updater (4× per second, jittered numbers)
  useEffect(() => {
    const id = window.setInterval(() => {
      NEURAL_REGIONS.forEach((region, i) => {
        const el = regionRatesRef.current[i];
        if (!el) return;
        const v = (region.fire + (Math.random() - 0.5) * 0.1).toFixed(2);
        el.textContent = `${v} Hz`;
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // ---- 4. Demo state-cycle on mic click (idle → listening → thinking → speaking → idle).
  const runDemoCycle = () => {
    if (state !== "idle") return;
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];

    setState("listening");
    setTranscript("");
    setShowAction(false);

    demoTimers.current.push(
      window.setTimeout(() => {
        setState("thinking");
      }, 1400),
    );
    demoTimers.current.push(
      window.setTimeout(() => {
        setState("speaking");
        setShowAction(true);
        // type out
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
          setShowAction(false);
          window.setTimeout(() => setTranscript(""), 1200);
        },
        1400 + 2200 + 6500,
      ),
    );
  };

  // ---- 5. Auto-run demo 2.4s after mount, once
  useEffect(() => {
    const id = window.setTimeout(() => runDemoCycle(), 2400);
    return () => {
      clearTimeout(id);
      demoTimers.current.forEach((tid) => clearTimeout(tid));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return AGENT_DATA;
    const q = search.toLowerCase();
    const out: Record<string, Agent[]> = {};
    Object.entries(AGENT_DATA).forEach(([section, agents]) => {
      const matched = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sub.toLowerCase().includes(q) ||
          section.toLowerCase().includes(q),
      );
      if (matched.length) out[section] = matched;
    });
    return out;
  }, [search]);

  return (
    <div className="omega-shell">
      {/* layered backdrop */}
      <div className="stage" />
      <NeuralBrain state={state} className="brain-canvas" />
      <div className="label-layer" ref={labelLayerRef}>
        {NEURAL_REGIONS.map((r, i) => (
          <div
            key={r.name}
            ref={(el) => {
              if (el) regionLabelsRef.current[i] = el;
            }}
            className="region-label"
          >
            {r.name}
            <span
              className="rate"
              ref={(el) => {
                if (el) regionRatesRef.current[i] = el;
              }}
            >
              {r.fire.toFixed(2)} Hz
            </span>
          </div>
        ))}
      </div>
      <div className="vignette" />
      <div className="grain" />

      {/* HUD frame corners */}
      <HudCorner pos="tl" />
      <HudCorner pos="tr" />
      <HudCorner pos="bl" />
      <HudCorner pos="br" />

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-mark">Z</div>
        <div className="topbar-name">
          <span className="n1">ZATE SYSTEMS</span>
          <span className="n2">tenant · zateceptionist</span>
        </div>
        <div className="telemetry">
          <span>
            SEQ <b>14</b>
          </span>
          <span>
            CALLS <b>3</b>
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

      {/* Left rail */}
      <div className="rail">
        <div className="rail-z">Z</div>
        {RAIL_ITEMS.map((item) => (
          <div
            key={item.mark}
            className={`rail-item ${activeRail === item.mark ? "active" : ""}`}
            onClick={() => setActiveRail(item.mark)}
            title={item.label}
          >
            {item.mark}
          </div>
        ))}
      </div>

      {/* Left agents panel */}
      <div className={`panel left ${leftCollapsed ? "collapsed" : ""}`}>
        <div className="panel-head">
          <h4>Agents · {AGENT_TOTAL}</h4>
        </div>
        <input
          className="panel-search"
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="panel-body">
          {Object.entries(filteredAgents).map(([section, agents]) => (
            <div key={section}>
              <div className="section-title">{section}</div>
              {agents.map((a) => (
                <div className="agent-row" key={`${section}-${a.name}`}>
                  <div className={`orb ${a.orb}`}>{a.mark}</div>
                  <div className="agent-meta">
                    <b>{a.name}</b>
                    <i>{a.sub}</i>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        className={`panel-toggle left ${leftCollapsed ? "collapsed" : ""}`}
        onClick={() => setLeftCollapsed((v) => !v)}
        title={leftCollapsed ? "Show agents" : "Hide agents"}
      >
        {leftCollapsed ? "›" : "‹"}
      </button>

      {/* Right metrics panel */}
      <div className={`panel right ${rightCollapsed ? "collapsed" : ""}`}>
        <div className="panel-head">
          <h4>Live · 24h</h4>
        </div>
        <div className="panel-body">
          <div className="stat-card">
            <div className="lbl">Leads</div>
            <div className="val">171</div>
            <div className="delta">▲ 12 today</div>
            <Sparkline color="#22d3ee" />
          </div>
          <div className="stat-card">
            <div className="lbl">Appointments</div>
            <div className="val">8</div>
            <div className="delta">▲ 2 today</div>
            <Sparkline color="#fbbf24" />
          </div>
          <div className="stat-card">
            <div className="lbl">Conversations</div>
            <div className="val">42</div>
            <div className="delta">▲ 6 today</div>
            <Sparkline color="#a78bfa" />
          </div>
          <div className="stat-card">
            <div className="lbl">Active Clients</div>
            <div className="val">11</div>
            <div className="delta down">▼ 1 today</div>
            <Sparkline color="#f87171" />
          </div>
        </div>
      </div>
      <button
        className={`panel-toggle right ${rightCollapsed ? "collapsed" : ""}`}
        onClick={() => setRightCollapsed((v) => !v)}
        title={rightCollapsed ? "Show metrics" : "Hide metrics"}
      >
        {rightCollapsed ? "‹" : "›"}
      </button>

      {/* OMEGA name label */}
      <div className="name-label">
        <div className="n">OMEGA</div>
        <div className="s">— CORE INTELLIGENCE · LIVE —</div>
      </div>

      {/* Action card (slides in when speaking) */}
      <div className={`action-card ${showAction ? "show" : ""}`}>
        <h5>Top matches · ICP</h5>
        {SAMPLE_LEADS.map((l) => (
          <div className="lead-row" key={l.name}>
            <span className="lead-name">{l.name}</span>
            <span className="lead-score">{l.score}</span>
          </div>
        ))}
        <div className="row-actions">
          <button>Review</button>
          <button className="primary">Send all</button>
        </div>
      </div>

      {/* State pill + transcript */}
      <div className="transcript">{transcript}</div>
      <div className={`state-pill ${state}`}>
        <span className="dot" />
        {STATE_LABEL[state]}
      </div>

      {/* Command bar */}
      <div className="commandbar">
        <input
          className="input-pill"
          placeholder="Ask OMEGA anything…"
          onKeyDown={(e) => {
            if (e.key === "Enter") runDemoCycle();
          }}
        />
        <button
          className={`mic-btn ${state === "listening" ? "listening" : ""}`}
          onClick={runDemoCycle}
          aria-label="Activate microphone"
        >
          <Mic size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* Status lines */}
      <div className="status-line left">
        {AGENT_TOTAL} AGENTS · 8 SECTIONS · ACTIVE
      </div>
      <div className="status-line right">v2.0 · NEURAL CORE · PHASE 1</div>
    </div>
  );
}
