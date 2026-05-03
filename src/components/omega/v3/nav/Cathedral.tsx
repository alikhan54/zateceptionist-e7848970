import { useEffect } from "react";
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
  CATHEDRAL_STATS,
  SECTIONS,
  type NavSection,
} from "./sectionsRegistry";

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

/** Color → glow chip used in the radial-gradient pseudo on each card. */
const COLOR_GLOW: Record<NavSection["color"], string> = {
  cyan:    "rgba(34, 211, 238, 0.30)",
  violet:  "rgba(167, 139, 250, 0.30)",
  indigo:  "rgba(99, 102, 241, 0.30)",
  amber:   "rgba(251, 191, 36, 0.30)",
  mint:    "rgba(110, 231, 183, 0.30)",
  rose:    "rgba(248, 113, 113, 0.30)",
  emerald: "rgba(52, 211, 153, 0.30)",
  sky:     "rgba(96, 165, 250, 0.30)",
};

export function Cathedral({ isOpen, onClose }: CathedralProps) {
  const navigate = useNavigate();

  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="v3-cathedral" role="dialog" aria-modal="true" aria-label="All apps">
      <div className="v3-cathedral-inner">
        <header className="v3-cath-header">
          <div className="v3-cath-titles">
            <h2 className="v3-cath-title">Your universe</h2>
            <div className="v3-cath-sub">88 agents · 6 industries · 1 OMEGA</div>
          </div>
          <button type="button" className="v3-cath-close" onClick={onClose} aria-label="Close all apps">
            <span>esc</span>
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <div className="v3-cath-stats">
          {CATHEDRAL_STATS.map((s) => (
            <div className="v3-cath-stat" key={s.label}>
              <div className="lbl">— {s.label}</div>
              <div className="val">{s.value}</div>
              <div className="delta">{s.delta}</div>
            </div>
          ))}
        </div>

        <div className="v3-cath-grid">
          {SECTIONS.map((section) => {
            const Icon = ICON_MAP[section.icon] ?? Home;
            const click = () => {
              if (!section.enabled) return;
              navigate(section.route);
              onClose();
            };
            const pillClass =
              section.pillType === "live"
                ? "v3-cath-pill live"
                : section.pillType === "hot"
                ? "v3-cath-pill hot"
                : "v3-cath-pill";
            return (
              <button
                type="button"
                key={section.id}
                className={`v3-cath-card ${section.enabled ? "" : "disabled"}`}
                onClick={click}
                style={{ ["--card-glow" as string]: COLOR_GLOW[section.color] }}
                aria-label={section.name}
                disabled={!section.enabled}
              >
                <span className={`v3-cath-icon orb-${section.color}`}>
                  <Icon size={22} strokeWidth={1.6} />
                </span>
                <span className="v3-cath-name">{section.name}</span>
                <span className="v3-cath-desc">{section.description}</span>
                <span className="v3-cath-meta">
                  <span className="v3-cath-stat-line">
                    <span className="num">{section.stat.split(" ")[0]}</span>
                    <span className="lbl">{section.stat.split(" ").slice(1).join(" ")}</span>
                  </span>
                  <span className={pillClass}>
                    {section.enabled ? section.pillText : "Coming soon"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
