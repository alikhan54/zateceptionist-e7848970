import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Brain,
  Building2,
  FileText,
  Flame,
  GitBranch,
  Home,
  Inbox,
  Layers,
  LayoutGrid,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { SPOTLIGHT_ROWS, type SpotlightRow } from "./sectionsRegistry";

interface SpotlightProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Minimal lucide icon registry — keeps the bundle small by hand-listing
 *  only icons referenced by sectionsRegistry. */
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
  GitBranch,
  Flame,
  Search,
  Layers,
  Sparkles,
  FileText,
  Share2,
  Package,
  ShoppingCart,
  MessageCircle,
  Mail,
  Plus,
  Send,
};

function rowMatches(row: SpotlightRow, q: string): boolean {
  if (!q) return true;
  const haystack = `${row.name} ${row.sub} ${row.group}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export function Spotlight({ isOpen, onClose }: SpotlightProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter rows by query
  const filteredRows = useMemo(
    () => SPOTLIGHT_ROWS.filter((r) => rowMatches(r, query)),
    [query],
  );

  // Group rows for display
  const groupedRows = useMemo(() => {
    const groups: { group: string; rows: SpotlightRow[] }[] = [];
    let current: { group: string; rows: SpotlightRow[] } | null = null;
    for (const row of filteredRows) {
      if (!current || current.group !== row.group) {
        current = { group: row.group, rows: [] };
        groups.push(current);
      }
      current.rows.push(row);
    }
    return groups;
  }, [filteredRows]);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      // Focus after the DOM has the element
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation while open
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(filteredRows.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = filteredRows[selectedIdx];
        if (!row || !row.enabled) return;
        if (e.metaKey || e.ctrlKey) {
          // Open in new tab
          if (row.route) window.open(row.route, "_blank", "noopener");
        } else {
          if (row.route) navigate(row.route);
          onClose();
        }
      }
      // Escape is handled globally by useNavOverlay
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filteredRows, selectedIdx, navigate, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const sel = listRef.current.querySelector<HTMLElement>(".v3-spot-row.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!isOpen) return null;

  // Compute global index for selection highlight as we render groups
  let globalIdx = -1;

  return (
    <div className="v3-spot-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="v3-spot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="v3-spot-input-row">
          <Search size={18} className="v3-spot-search-icon" aria-hidden />
          <input
            ref={inputRef}
            className="v3-spot-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, agents, leads, conversations..."
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="v3-spot-esc">esc</kbd>
        </div>

        <div className="v3-spot-results" ref={listRef}>
          {groupedRows.length === 0 ? (
            <div className="v3-spot-empty">No matches for "{query}"</div>
          ) : null}
          {groupedRows.map((g) => (
            <div className="v3-spot-group" key={g.group}>
              <div className="v3-spot-group-label">{g.group}</div>
              {g.rows.map((row) => {
                globalIdx += 1;
                const Icon = ICON_MAP[row.icon] ?? Home;
                const selected = globalIdx === selectedIdx;
                const idx = globalIdx;
                return (
                  <div
                    key={row.id}
                    className={`v3-spot-row ${selected ? "selected" : ""} ${row.enabled ? "" : "disabled"}`}
                    onClick={() => {
                      if (!row.enabled) return;
                      if (row.route) navigate(row.route);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    role="option"
                    aria-selected={selected}
                  >
                    <span className={`v3-spot-icon orb-${row.color}`}>
                      <Icon size={14} strokeWidth={1.8} />
                    </span>
                    <span className="v3-spot-text">
                      <span className="name">{row.name}</span>
                      <span className="sub">{row.sub}</span>
                    </span>
                    {row.shortcut ? <kbd className="v3-spot-shortcut">{row.shortcut}</kbd> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="v3-spot-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>⌘↵</kbd> open in new tab</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
