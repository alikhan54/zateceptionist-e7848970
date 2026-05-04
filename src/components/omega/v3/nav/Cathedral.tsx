import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Brain,
  Building2,
  Home,
  Inbox,
  LayoutGrid,
  Megaphone,
  Phone,
  Settings,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  type PulseLayer,
  type PulseSection,
} from "./sectionsRegistry";
import { usePulseData } from "./usePulseData";

interface CathedralProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, typeof Home> = {
  Home,
  Inbox,
  Users,
  TrendingUp,
  Megaphone,
  UserPlus,
  LayoutGrid,
  Phone,
  Building2,
  Brain,
  BarChart3,
  Settings,
};

const LAYER_LABELS: Record<PulseLayer, string> = {
  operations: "— Operations Layer · Doing",
  intelligence: "— Intelligence Layer · Knowing",
  reach: "— Reach Layer · Connecting",
};

const LAYER_ORDER: PulseLayer[] = ["operations", "intelligence", "reach"];

// ---- Count-up helpers ----------------------------------------------------

/** Parses a leading numeric token from a value string. Non-numeric returns null. */
function parseNumeric(v: string): { num: number; prefix: string; suffix: string } | null {
  const m = v.match(/^([+\-$]*)([0-9]+(?:\.[0-9]+)?)([a-zA-Z%/]*)$/);
  if (!m) return null;
  const [, prefix, numStr, suffix] = m;
  return { num: parseFloat(numStr), prefix, suffix };
}

function formatCount(num: number, suffix: string, prefix: string, targetIsInt: boolean): string {
  let formatted: string;
  if (targetIsInt) {
    formatted = Math.round(num).toString();
  } else if (num >= 100) {
    formatted = num.toFixed(0);
  } else {
    formatted = num.toFixed(1);
  }
  return `${prefix}${formatted}${suffix}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpValueProps {
  value: string;
  trigger: boolean;
  delay?: number;
}

/** Shows a numeric value with a count-up animation on `trigger`.
 *  Non-numeric values render as-is. Stagger via `delay` (ms). */
function CountUpValue({ value, trigger, delay = 0 }: CountUpValueProps) {
  const parsed = parseNumeric(value);
  const targetIsInt = parsed ? Number.isInteger(parsed.num) : false;
  const [display, setDisplay] = useState<string>(() =>
    parsed ? formatCount(0, parsed.suffix, parsed.prefix, targetIsInt) : value,
  );

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    if (!trigger) return;

    let frameId = 0;
    let startTime = 0;
    const target = parsed.num;
    const duration = 800;

    const animate = (t: number) => {
      if (!startTime) startTime = t;
      const elapsed = t - startTime - delay;
      if (elapsed < 0) {
        frameId = requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      setDisplay(formatCount(target * eased, parsed.suffix, parsed.prefix, targetIsInt));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, value, delay]);

  return <>{display}</>;
}

/** Mini upward-trending sparkline for the bottom of a card. */
function Sparkline({ color }: { color: string }) {
  const points = "0,16 10,14 20,15 30,12 40,13 50,10 60,11 70,8 80,9 90,5 100,4";
  return (
    <svg className="pulse-card-spark" viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ---- Card --------------------------------------------------------------

interface PulseCardProps {
  section: PulseSection;
  index: number;
  cathedralOpen: boolean;
  onClick: () => void;
}

function PulseCard({ section, index, cathedralOpen, onClick }: PulseCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const Icon = ICON_MAP[section.icon] ?? Home;

  // Mouse-tracked parallax tilt — capped at 6 degrees on either axis.
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = cardRef.current;
    if (!card || section.enabled === false) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    const rotY = dx * 6;
    const rotX = -dy * 6;
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
  };
  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0)";
  };

  // Stagger the count-up: card[i] starts at i * 40ms.
  const revealDelay = index * 40;
  const cardStyle: React.CSSProperties = {
    ["--card-color" as string]: `var(--pulse-${section.color})`,
  };
  const sparkColor = `var(--pulse-${section.color})`;

  return (
    <button
      ref={cardRef}
      type="button"
      className={`pulse-card ${section.enabled ? "" : "disabled"}`}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={!section.enabled}
      aria-label={section.name}
    >
      <span className="pulse-card-icon">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <span className="pulse-card-name">{section.name}</span>
      <span className="pulse-card-meta">{section.meta}</span>
      <span className="pulse-card-divider" aria-hidden />
      <ul className="pulse-card-metrics">
        {section.metrics.map((m, i) => {
          // Phase 2B.1 — metrics with no real per-tenant data source render
          // "—" plus a small italic "not configured" hint instead of a fake
          // hardcoded number. Flag is set in registry (genuinely unwireable
          // metrics) and toggled by usePulseData per-query outcome.
          if (m.notConfigured) {
            return (
              <li
                key={`${section.id}-m-${i}`}
                className="pulse-metric"
                style={{ opacity: 0.85 }}
              >
                <span
                  className="num"
                  style={{ color: "var(--pulse-ink-3)", opacity: 0.55 }}
                >
                  —
                </span>
                <span className="lbl">
                  {m.label}
                  <em
                    style={{
                      display: "block",
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontStyle: "italic",
                      fontSize: "9.5px",
                      color: "var(--pulse-ink-3)",
                      opacity: 0.6,
                      marginTop: "2px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    not configured
                  </em>
                </span>
              </li>
            );
          }
          return (
            <li
              key={`${section.id}-m-${i}`}
              className={`pulse-metric ${m.isWarning ? "warning" : ""}`}
            >
              <span className="num">
                <CountUpValue value={m.value} trigger={cathedralOpen} delay={revealDelay} />
              </span>
              <span className="lbl">{m.label}</span>
            </li>
          );
        })}
      </ul>
      <Sparkline color={sparkColor} />
      <span className={`pulse-card-pill pulse-pill-${section.pillType}`}>{section.pillText}</span>
    </button>
  );
}

// ---- Cathedral ---------------------------------------------------------

export function Cathedral({ isOpen, onClose }: CathedralProps) {
  const navigate = useNavigate();

  // Phase 2B: per-tenant data via Supabase. Falls back silently to hardcoded
  // values when queries fail or columns don't exist.
  const { sections: SECTIONS, heroStats: CATHEDRAL_STATS } = usePulseData(isOpen);

  // Lock background scroll while open (preserved from Phase 2A).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Group sections by layer in fixed order. Track a global card index so the
  // stagger delay is monotonic across layers (operations cards animate first).
  const grouped: Record<PulseLayer, PulseSection[]> = {
    operations: [],
    intelligence: [],
    reach: [],
  };
  for (const s of SECTIONS) {
    grouped[s.layer].push(s);
  }
  let cardIdx = 0;

  return (
    <div
      className="pulse-cathedral"
      role="dialog"
      aria-modal="true"
      aria-label="Pulse — live across every department"
    >
      <div className="pulse-cathedral-inner">
        <header className="pulse-cath-header">
          <div className="pulse-cath-titles">
            <h2 className="pulse-cath-title">Pulse</h2>
            <div className="pulse-cath-sub">
              live · across every department · across every layer
            </div>
          </div>
          <button
            type="button"
            className="pulse-cath-close"
            onClick={onClose}
            aria-label="Close Pulse"
          >
            <span>esc</span>
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        {/* Hero stats — fixes Phase 2A invisible-numbers bug by binding text
            color to var(--pulse-ink) inside the .pulse-cathedral scope. */}
        <div className="pulse-cath-stats">
          {CATHEDRAL_STATS.map((s, i) => (
            <div className="pulse-cath-stat" key={s.label}>
              <div className="lbl">— {s.label}</div>
              <div className="val">
                <CountUpValue value={s.value} trigger={isOpen} delay={i * 40} />
              </div>
              <div className="delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {LAYER_ORDER.map((layer) => {
          const sections = grouped[layer];
          if (sections.length === 0) return null;
          return (
            <section className={`pulse-cath-layer pulse-layer-${layer}`} key={layer}>
              <div className="pulse-layer-label">{LAYER_LABELS[layer]}</div>
              <div className="pulse-grid">
                {sections.map((section) => {
                  const idx = cardIdx++;
                  const click = () => {
                    if (!section.enabled) return;
                    navigate(section.route);
                    onClose();
                  };
                  return (
                    <PulseCard
                      key={section.id}
                      section={section}
                      index={idx}
                      cathedralOpen={isOpen}
                      onClick={click}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
