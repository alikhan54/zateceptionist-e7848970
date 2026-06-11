/**
 * Phase F — Organization Brain page shell.
 *
 * Full-screen fixed inset-0 overlay (Phase 1 sphere pattern) covering the
 * Layout chrome. Hosts the 3D force-directed system map (BrainGraph) plus the
 * top bar (tenant name + system constants + live counts), the 10-row legend,
 * a hint pill, and Esc / X exit → navigate(-1).
 *
 * Adds body.omega-fullscreen while mounted (same class the sphere shells use)
 * so the OMEGA floating chat FAB stays hidden on this full-screen experience.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { BrainGraph } from "@/components/brain/BrainGraph";
import { useBrainData } from "@/components/brain/useBrainData";
import {
  BRAIN_LINK_COUNT,
  BRAIN_NODE_COUNT,
  CORE_COLOR,
  DEPARTMENTS,
  TOOL_COLOR,
} from "@/components/brain/brainManifest";

const LEGEND_ROWS: Array<{ label: string; color: string }> = [
  { label: "OMEGA Core", color: CORE_COLOR },
  ...DEPARTMENTS.map((d) => ({ label: d.name, color: d.color })),
  { label: "Voice Tools", color: TOOL_COLOR },
];

export default function OrganizationBrain() {
  const navigate = useNavigate();
  // Phase 2B.1 company-name fallback chain (same as the sphere shell top bar).
  const { tenantId, tenantConfig } = useTenant();
  const businessName =
    tenantConfig?.company_name ??
    tenantId?.replace(/-/g, " ").toUpperCase() ??
    "OMEGA";

  const data = useBrainData();

  // Hide the OMEGA floating chat FAB while the Brain is open.
  useEffect(() => {
    document.body.classList.add("omega-fullscreen");
    return () => {
      document.body.classList.remove("omega-fullscreen");
    };
  }, []);

  // Esc → leave the Brain.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const liveChips: Array<{ label: string; value: number | null }> = [
    { label: "Leads", value: data.leads },
    { label: "Customers", value: data.customers },
    { label: "Conversations", value: data.conversations },
    { label: "Appointments", value: data.appointments },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: "#030509" }}
      data-testid="organization-brain"
    >
      <BrainGraph counts={data} />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <div
            className="truncate text-[11px] uppercase tracking-[0.28em] text-slate-400"
            data-testid="brain-tenant"
          >
            {businessName}
          </div>
          <h1
            className="mt-0.5 text-lg text-violet-100 sm:text-xl"
            style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
          >
            Organization Brain
          </h1>
          <div
            className="mt-1 text-[11px] text-slate-400"
            data-testid="brain-counts"
          >
            <span data-testid="brain-entities">{BRAIN_NODE_COUNT}</span>
            {" entities · "}
            <span data-testid="brain-connections">{BRAIN_LINK_COUNT}</span>
            {" connections"}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {liveChips
              .filter((c) => c.value !== null)
              .map((c) => (
                <span
                  key={c.label}
                  className="rounded-full border border-slate-700/70 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  {c.label} {c.value!.toLocaleString()}
                </span>
              ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close Organization Brain"
          onClick={() => navigate(-1)}
          className="pointer-events-auto rounded-full border border-slate-700/70 bg-slate-900/70 p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          data-testid="brain-close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Legend — 10 rows: core, 8 departments, voice tools */}
      <div
        className="pointer-events-none absolute bottom-4 left-4 hidden rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2.5 backdrop-blur-sm sm:block"
        data-testid="brain-legend"
      >
        {LEGEND_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-2 py-[2.5px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: row.color, boxShadow: `0 0 6px ${row.color}` }}
            />
            <span className="text-[10.5px] text-slate-300">{row.label}</span>
          </div>
        ))}
      </div>

      {/* Hint pill */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-800/80 bg-slate-950/70 px-3 py-1 text-[10.5px] text-slate-400 backdrop-blur-sm">
        drag to orbit · click a node to fly in · Esc to exit
      </div>

      {/* Tooltip styling for the engine's .scene-tooltip content */}
      <style>{`
        .brain-tip {
          display: flex; flex-direction: column; gap: 2px;
          padding: 6px 10px; border-radius: 8px;
          background: rgba(5, 8, 18, 0.92);
          border: 1px solid rgba(124, 141, 181, 0.35);
          font-family: Georgia, serif;
        }
        .brain-tip b { color: #EDE9FE; font-size: 12.5px; font-weight: 600; }
        .brain-tip span { color: #94A3B8; font-size: 10.5px; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}
