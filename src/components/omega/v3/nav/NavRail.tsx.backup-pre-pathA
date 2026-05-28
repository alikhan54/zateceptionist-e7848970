import { useLocation, useNavigate } from "react-router-dom";
import { Home, Inbox, Users, LayoutGrid } from "lucide-react";

interface NavRailProps {
  onOpenSpotlight: () => void; // unused for now; Spotlight opens via ⌘K. Kept for future affordance.
  onOpenCathedral: () => void;
  currentPath: string;
}

interface RailItem {
  id: string;
  label: string;
  shortcut: string;
  Icon: typeof Home;
  /** Either route (navigation) or action (overlay open). Mutually exclusive. */
  route?: string;
  action?: "cathedral";
}

const ITEMS: RailItem[] = [
  { id: "home",      label: "OMEGA",    shortcut: "⌘1", Icon: Home,        route: "/dashboard" },
  { id: "inbox",     label: "Inbox",    shortcut: "⌘2", Icon: Inbox,       route: "/inbox" },
  { id: "clients",   label: "Clients",  shortcut: "⌘3", Icon: Users,       route: "/customers" },
  { id: "all-apps",  label: "All apps", shortcut: "⌘K", Icon: LayoutGrid,  action: "cathedral" },
];

export function NavRail({ onOpenCathedral, currentPath }: NavRailProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active rail item from current path.
  const isHomeActive =
    currentPath === "/dashboard" ||
    currentPath === "/" ||
    location.pathname === "/dashboard";
  const isActive = (item: RailItem): boolean => {
    if (item.action) return false;
    if (item.id === "home") return isHomeActive;
    if (!item.route) return false;
    // Match the route prefix so /sales/pipeline still highlights "sales", etc.
    // For these top-level rail items the prefix match is fine.
    return currentPath === item.route || currentPath.startsWith(item.route + "/");
  };

  return (
    <nav className="v3-rail" aria-label="Primary navigation">
      {ITEMS.map((item, i) => {
        const active = isActive(item);
        const Icon = item.Icon;
        const click = () => {
          if (item.action === "cathedral") onOpenCathedral();
          else if (item.route) navigate(item.route);
        };
        return (
          <div className="v3-rail-item-wrap" key={item.id}>
            {/* Divider before the last (overlay-trigger) item */}
            {i === ITEMS.length - 1 ? <span className="v3-rail-divider" aria-hidden /> : null}
            <button
              type="button"
              className={`v3-rail-item ${active ? "active" : ""}`}
              onClick={click}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {active ? <span className="v3-rail-accent" aria-hidden /> : null}
              <Icon size={18} strokeWidth={1.8} />
              <span className="v3-rail-tooltip">
                <span className="lbl">{item.label}</span>
                <kbd>{item.shortcut}</kbd>
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
