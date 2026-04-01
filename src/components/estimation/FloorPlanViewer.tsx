import { useState } from "react";
import { useFloorPlanData, type FloorPlanRoom } from "@/hooks/useFloorPlanData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// ── Material → Color + Pattern mapping ──
const MAT_STYLES: Record<string, { fill: string; pat?: string; label: string }> = {
  CPT: { fill: "#d4a0a0", pat: "pat-carpet", label: "Carpet Tile" },
  "C-": { fill: "#d4a0a0", pat: "pat-carpet", label: "Carpet Tile" },
  BLC: { fill: "#7888c0", pat: "pat-broadloom", label: "Broadloom" },
  "T-": { fill: "#a8c89a", pat: "pat-brick", label: "Ceramic Tile" },
  "PT-": { fill: "#a8c89a", pat: "pat-brick", label: "Porcelain Tile" },
  "TL-": { fill: "#a8c89a", pat: "pat-brick", label: "Tile" },
  "GT-": { fill: "#a8c89a", pat: "pat-brick", label: "Tile" },
  "WT-": { fill: "#a8c89a", pat: "pat-brick", label: "Wall Tile" },
  LVT: { fill: "#c8b088", pat: "pat-lvt", label: "LVT" },
  VCT: { fill: "#88b8c8", pat: "pat-vct", label: "VCT" },
  SDT: { fill: "#88b8c8", pat: "pat-vct", label: "Static Dissipative" },
  SS: { fill: "#b8a890", pat: "pat-stone", label: "Stone" },
  WF: { fill: "#c8a868", pat: "pat-lvt", label: "Hardwood" },
  EP: { fill: "#a0b8a0", label: "Epoxy" },
  CT: { fill: "#b0b8a0", label: "Concrete Coating" },
  PAINT: { fill: "#c8b8d8", label: "Paint Only" },
  ACT: { fill: "#e8e0d0", label: "ACT Ceiling" },
};

function getStyle(tag: string) {
  if (!tag) return { fill: "#f0e0e0", label: "No Floor" };
  const t = tag.toUpperCase();
  for (const [prefix, style] of Object.entries(MAT_STYLES)) {
    if (t.startsWith(prefix)) return style;
  }
  return { fill: "#ddd8d0", label: tag };
}

// ── SVG Pattern Definitions ──
function PatternDefs() {
  return (
    <defs>
      <pattern id="pat-carpet" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#d4a0a0" />
        <line x1="0" y1="0" x2="10" y2="0" stroke="#c08888" strokeWidth="0.3" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="#c08888" strokeWidth="0.3" />
      </pattern>
      <pattern id="pat-brick" width="20" height="10" patternUnits="userSpaceOnUse">
        <rect width="20" height="10" fill="#a8c89a" />
        <rect x="0.3" y="0.3" width="9.4" height="4.4" fill="#96b888" stroke="#7a9a6e" strokeWidth="0.3" rx="0.3" />
        <rect x="10.3" y="0.3" width="9.4" height="4.4" fill="#96b888" stroke="#7a9a6e" strokeWidth="0.3" rx="0.3" />
        <rect x="5.3" y="5.3" width="9.4" height="4.4" fill="#96b888" stroke="#7a9a6e" strokeWidth="0.3" rx="0.3" />
        <rect x="-4.7" y="5.3" width="9.4" height="4.4" fill="#96b888" stroke="#7a9a6e" strokeWidth="0.3" rx="0.3" />
        <rect x="15.3" y="5.3" width="9.4" height="4.4" fill="#96b888" stroke="#7a9a6e" strokeWidth="0.3" rx="0.3" />
      </pattern>
      <pattern id="pat-lvt" width="18" height="5" patternUnits="userSpaceOnUse">
        <rect width="18" height="5" fill="#c8b088" />
        <rect x="0.2" y="0.2" width="17.6" height="4.6" fill="#bca478" stroke="#a89060" strokeWidth="0.2" rx="0.3" />
        <line x1="9" y1="0" x2="9" y2="5" stroke="#a89060" strokeWidth="0.15" />
      </pattern>
      <pattern id="pat-vct" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#88b8c8" />
        <rect x="0.3" y="0.3" width="7.4" height="7.4" fill="#78a8b8" stroke="#6898a8" strokeWidth="0.3" />
      </pattern>
      <pattern id="pat-stone" width="16" height="12" patternUnits="userSpaceOnUse">
        <rect width="16" height="12" fill="#b8a890" />
        <rect x="0.3" y="0.3" width="7.4" height="5.4" stroke="#98886a" strokeWidth="0.3" fill="#a89878" />
        <rect x="8.3" y="0.3" width="7.4" height="5.4" stroke="#98886a" strokeWidth="0.3" fill="#a89878" />
        <rect x="2.3" y="6.3" width="10.4" height="5.4" stroke="#98886a" strokeWidth="0.3" fill="#a89878" />
      </pattern>
      <pattern id="pat-broadloom" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#7888c0" />
        <line x1="0" y1="6" x2="6" y2="0" stroke="#6878b0" strokeWidth="0.4" />
      </pattern>
      <pattern id="pat-herring" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#d4c8a8" />
        <path d="M0,8 L4,0 L8,8 L4,16 Z" fill="#c8bc98" stroke="#b0a480" strokeWidth="0.3" />
        <path d="M8,8 L12,0 L16,8 L12,16 Z" fill="#c8bc98" stroke="#b0a480" strokeWidth="0.3" />
      </pattern>
      <pattern id="pat-ashlar" width="24" height="14" patternUnits="userSpaceOnUse">
        <rect width="24" height="14" fill="#c4b898" />
        <rect x="0.3" y="0.3" width="10.4" height="6.4" stroke="#a89870" strokeWidth="0.3" fill="#b8ac88" />
        <rect x="11.3" y="0.3" width="12.4" height="6.4" stroke="#a89870" strokeWidth="0.3" fill="#b8ac88" />
        <rect x="4.3" y="7.3" width="14.4" height="6.4" stroke="#a89870" strokeWidth="0.3" fill="#b8ac88" />
      </pattern>
    </defs>
  );
}

// ── Layout: simple row packing ──
interface LayoutRoom extends FloorPlanRoom {
  x: number; y: number; w: number; h: number;
  style: { fill: string; pat?: string; label: string };
}

function layoutRooms(rooms: FloorPlanRoom[], svgW: number): { layouts: LayoutRoom[]; svgH: number } {
  if (rooms.length === 0) return { layouts: [], svgH: 100 };
  const SCALE = 3; // pixels per foot
  const PAD = 2;
  let cx = PAD, cy = PAD, rowH = 0;
  const layouts: LayoutRoom[] = [];

  // Sort: corridors first (full width), then by room_number
  const sorted = [...rooms].sort((a, b) => {
    const aCorr = a.estLength / Math.max(a.estWidth, 1) > 3 ? 0 : 1;
    const bCorr = b.estLength / Math.max(b.estWidth, 1) > 3 ? 0 : 1;
    if (aCorr !== bCorr) return aCorr - bCorr;
    return (a.room_number || "").localeCompare(b.room_number || "");
  });

  for (const room of sorted) {
    const w = Math.max(room.estLength * SCALE, 40);
    const h = Math.max(room.estWidth * SCALE, 25);
    const isCorridor = room.estLength / Math.max(room.estWidth, 1) > 3;

    if (isCorridor) {
      if (cx > PAD) { cy += rowH + PAD; cx = PAD; rowH = 0; }
      layouts.push({ ...room, x: PAD, y: cy, w: svgW - PAD * 2, h: Math.max(h, 20), style: getStyle(room.floorTag) });
      cy += Math.max(h, 20) + PAD;
    } else {
      if (cx + w > svgW - PAD) { cy += rowH + PAD; cx = PAD; rowH = 0; }
      layouts.push({ ...room, x: cx, y: cy, w, h, style: getStyle(room.floorTag) });
      cx += w + PAD;
      rowH = Math.max(rowH, h);
    }
  }

  return { layouts, svgH: cy + rowH + PAD + 30 };
}

// ── Legend ──
function Legend({ rooms }: { rooms: LayoutRoom[] }) {
  const seen = new Map<string, { fill: string; pat?: string; label: string }>();
  for (const r of rooms) {
    if (!seen.has(r.style.label)) seen.set(r.style.label, r.style);
  }
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {[...seen.entries()].map(([label, s]) => (
        <div key={label} className="flex items-center gap-1 text-xs">
          <div className="w-4 h-3 rounded-sm border" style={{ backgroundColor: s.fill }} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──
export default function FloorPlanViewer({ projectId }: { projectId: string }) {
  const { data: rooms, isLoading } = useFloorPlanData(projectId);
  const [selected, setSelected] = useState<LayoutRoom | null>(null);

  if (isLoading) return <Card><CardContent className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading floor plan...</CardContent></Card>;
  if (!rooms || rooms.length === 0) return <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">No rooms to visualize.</CardContent></Card>;

  const SVG_W = 800;
  const { layouts, svgH } = layoutRooms(rooms, SVG_W);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Floor Plan — Material Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-x-auto border rounded-lg bg-white">
          <svg viewBox={`0 0 ${SVG_W} ${svgH}`} className="w-full h-auto" style={{ minHeight: 200, maxHeight: 600 }}>
            <PatternDefs />
            <rect width={SVG_W} height={svgH} fill="#f8f7f5" />

            {layouts.map((r) => {
              const isSelected = selected?.id === r.id;
              return (
                <g key={r.id} onClick={() => setSelected(isSelected ? null : r)} className="cursor-pointer">
                  <rect
                    x={r.x} y={r.y} width={r.w} height={r.h}
                    fill={r.style.pat ? `url(#${r.style.pat})` : r.style.fill}
                    stroke={r.hasMissing ? "#ef4444" : isSelected ? "#3b82f6" : "#888"}
                    strokeWidth={r.hasMissing ? 1.5 : isSelected ? 2 : 0.5}
                    rx={1}
                  />
                  {/* Room number */}
                  <text x={r.x + 3} y={r.y + 9} fontSize={7} fontWeight="bold" fill="#333">{r.room_number}</text>
                  {/* Room name */}
                  {r.w > 50 && <text x={r.x + 3} y={r.y + 17} fontSize={5.5} fill="#555">{r.room_name.substring(0, Math.floor(r.w / 4))}</text>}
                  {/* Material tags */}
                  {r.w > 70 && r.h > 30 && (
                    <text x={r.x + 3} y={r.y + r.h - 4} fontSize={4.5} fill="#444" fontFamily="monospace">
                      F:{r.floorTag || "—"} B:{r.baseTag || "—"}
                    </text>
                  )}
                  {/* Area */}
                  {r.w > 55 && r.h > 25 && (
                    <text x={r.x + r.w - 3} y={r.y + 9} fontSize={5} fill="#666" textAnchor="end">{Math.round(r.area_sqft)} SF</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <Legend rooms={layouts} />

        {/* Selected room detail */}
        {selected && (
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <div className="font-semibold">{selected.room_number} — {selected.room_name}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>Area: <strong>{Math.round(selected.area_sqft)} SF</strong></div>
              <div>Est. dims: <strong>{selected.estLength.toFixed(0)}' x {selected.estWidth.toFixed(0)}'</strong></div>
              <div>Floor: <Badge className="text-[10px] ml-1" variant="outline">{selected.floorTag || "None"}</Badge></div>
              <div>Wall: <Badge className="text-[10px] ml-1" variant="outline">{selected.wallTags.join(", ") || "None"}</Badge></div>
              <div>Base: <Badge className="text-[10px] ml-1" variant="outline">{selected.baseTag || "None"}</Badge></div>
              <div>Ceiling: <Badge className="text-[10px] ml-1" variant="outline">{selected.ceilTag || "ACT (assumed)"}</Badge></div>
            </div>
            {selected.hasMissing && <div className="text-red-600 text-xs font-medium mt-1">Missing surface assignment</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
