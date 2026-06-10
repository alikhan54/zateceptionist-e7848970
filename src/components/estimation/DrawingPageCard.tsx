import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detectRoomsV2, renderMarkupV2 } from "@/lib/api/estimationApi";
import { useDrawingRooms, PLAN_TYPES, type DrawingPage } from "@/hooks/useDrawingPages";
import { Loader2, ScanSearch, Paintbrush, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  floor_plan: { label: "Floor Plan", cls: "bg-green-100 text-green-800" },
  finish_plan: { label: "Finish Plan", cls: "bg-green-100 text-green-800" },
  reflected_ceiling_plan: { label: "Ceiling Plan", cls: "bg-teal-100 text-teal-800" },
  unclassified: { label: "Unclassified", cls: "bg-amber-100 text-amber-800" },
  error: { label: "Error", cls: "bg-amber-100 text-amber-800" },
};
const GRAY_BADGE = "bg-gray-100 text-gray-800";

const NON_PLAN_HINT: Record<string, string> = {
  finish_schedule: "This page is a finish schedule — nothing to measure.",
  door_schedule: "This page is a door schedule — nothing to measure.",
  elevation: "This page is an elevation — nothing to measure.",
  unclassified: "This page hasn't been classified yet — run drawing analysis first.",
  error: "This page couldn't be processed — try re-running drawing analysis.",
};
const NON_PLAN_DEFAULT = "This page is a cover sheet, schedule, or notes — nothing to measure.";

interface Props {
  page: DrawingPage;
  projectId: string;
  tenantId: string;
  onChanged: () => void;
}

export default function DrawingPageCard({ page, projectId, tenantId, onChanged }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastDetect, setLastDetect] = useState<{ rooms: number; sf: number } | null>(null);

  const isPlan = PLAN_TYPES.includes(page.page_type || "");
  const { rooms, isLoading: roomsLoading } = useDrawingRooms(projectId, expanded ? page.page_number : undefined);

  const badge =
    TYPE_BADGES[page.page_type || "unclassified"] ||
    { label: (page.page_type || "other").replace(/_/g, " "), cls: GRAY_BADGE };

  const friendlyError = (raw: string): string => {
    if (raw.includes("No vector data")) return "Vectors aren't stored for this page yet — re-run drawing analysis to extract them.";
    if (raw.includes("not a floor plan")) return NON_PLAN_HINT[page.page_type || ""] || NON_PLAN_DEFAULT;
    if (raw.includes("No room labels")) return "No room labels were found on this page — it may be a partial or demolition plan.";
    return "Something went wrong analyzing this page. Please try again.";
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const resp = await detectRoomsV2(projectId, tenantId, page.page_number);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(friendlyError(String(d?.error || (resp as any)?.error || "")));
        return;
      }
      setLastDetect({ rooms: d.rooms_detected, sf: Math.round(d.total_area_sqft || 0) });
      toast.success(`Page ${page.page_number}: ${d.rooms_detected} rooms · ${Math.round(d.total_area_sqft || 0).toLocaleString()} SF`);
      onChanged();
    } catch (e: any) {
      toast.error("Room detection timed out — please try again.");
    } finally {
      setDetecting(false);
    }
  };

  const handleMarkup = async () => {
    setRendering(true);
    try {
      const resp = await renderMarkupV2(projectId, tenantId, page.page_number);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success || !d?.markup_url) {
        toast.error(friendlyError(String(d?.error || (resp as any)?.error || "")));
        return;
      }
      toast.success(`Page ${page.page_number}: markup ready (${d.rooms_rendered} rooms highlighted)`);
      onChanged();
    } catch (e: any) {
      toast.error("Markup rendering timed out — please try again.");
    } finally {
      setRendering(false);
    }
  };

  const roomsCount = lastDetect?.rooms ?? page.rooms_detected;

  return (
    <Card data-testid={`drawing-page-${page.page_number}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold">Page {page.page_number}</div>
            {(page.sheet_number || page.sheet_title) && (
              <div className="text-xs text-muted-foreground">
                {page.sheet_number}{page.sheet_title ? ` — ${page.sheet_title}` : ""}
              </div>
            )}
          </div>
          <Badge className={badge.cls}>{badge.label}</Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Confidence {page.classification_confidence ?? 0}%
          {typeof roomsCount === "number" && roomsCount > 0 && (
            <> · {roomsCount} rooms{lastDetect ? ` · ${lastDetect.sf.toLocaleString()} SF` : ""}</>
          )}
        </div>

        {isPlan ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleDetect} disabled={detecting || rendering}>
                {detecting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ScanSearch className="mr-1 h-3 w-3" />}
                {detecting ? "Detecting..." : "Detect Rooms"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleMarkup} disabled={detecting || rendering}>
                {rendering ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Paintbrush className="mr-1 h-3 w-3" />}
                {rendering ? "Rendering..." : "Generate Markup"}
              </Button>
              {page.markup_url && (
                <Button size="sm" asChild>
                  <a href={page.markup_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" /> View Marked-Up PDF
                  </a>
                </Button>
              )}
            </div>

            {typeof roomsCount === "number" && roomsCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline flex items-center gap-1"
                onClick={() => setExpanded(v => !v)}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Hide rooms" : "Show rooms"}
              </button>
            )}

            {expanded && (
              roomsLoading ? (
                <div className="text-xs text-muted-foreground py-2">Loading rooms...</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1 text-left font-medium">Room</th>
                      <th className="py-1 text-left font-medium">#</th>
                      <th className="py-1 text-right font-medium">Area (SF)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-1">{r.room_name || "—"}</td>
                        <td className="py-1">{r.room_number || "—"}</td>
                        <td className="py-1 text-right">{r.area_sqft?.toLocaleString() || "—"}</td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr><td colSpan={3} className="py-2 text-center text-muted-foreground">No rooms stored yet — click Detect Rooms.</td></tr>
                    )}
                  </tbody>
                </table>
              )
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {NON_PLAN_HINT[page.page_type || ""] || NON_PLAN_DEFAULT}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
