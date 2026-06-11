import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detectRoomsV2, renderMarkupV2, qaCheck, parseSchedule } from "@/lib/api/estimationApi";
import { useDrawingRooms, PLAN_TYPES, type DrawingPage } from "@/hooks/useDrawingPages";
import { Loader2, ScanSearch, Paintbrush, ExternalLink, ChevronDown, ChevronUp, ShieldCheck, Table2 } from "lucide-react";
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

/** Architectural label for a scale factor (real inches per drawing inch). */
const SCALE_LABELS: Record<number, string> = {
  192: '1/16″', 128: '3/32″', 96: '1/8″', 64: '3/16″', 48: '1/4″',
  32: '3/8″', 24: '1/2″', 16: '3/4″', 12: '1″', 8: '1½″', 4: '3″',
};
const scaleLabel = (f?: number | null) =>
  f == null ? "?" : SCALE_LABELS[f] ?? `1:${f}`;

interface Props {
  page: DrawingPage;
  projectId: string;
  tenantId: string;
  onChanged: () => void;
  /** From DrawingsTab: detected/unsynced polygon counts for this page. */
  syncState?: { detected: number; unsynced: number };
  /** From DrawingsTab: parsed finish-schedule rows stored for this page. */
  finishesCount?: number;
}

export default function DrawingPageCard({ page, projectId, tenantId, onChanged, syncState, finishesCount }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [parsing, setParsing] = useState(false);
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

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const resp = await qaCheck(projectId, tenantId, page.page_number, true);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(String(d?.error || (resp as any)?.error || "QA check failed — please try again."));
        return;
      }
      const v = d.verdict || {};
      const r = d.repaired || {};
      if (r.rooms_updated_polygons > 0) {
        toast.success(
          `Scale corrected to ${scaleLabel(v.chosen_scale)} — ${r.rooms_updated_polygons} room areas updated` +
          (r.v1_rooms_updated ? ` (${r.v1_rooms_updated} in Takeoff)` : ""),
        );
      } else {
        toast.info(`Scale ${scaleLabel(v.chosen_scale)} confirmed (${v.confidence} confidence) — no changes needed`);
      }
      onChanged();
    } catch {
      toast.error("QA check timed out — please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const isSchedule = page.page_type === "finish_schedule" || page.page_type === "door_schedule";

  const handleParse = async () => {
    setParsing(true);
    try {
      const resp = await parseSchedule(projectId, tenantId, page.page_number);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(String(d?.error || (resp as any)?.error || "Schedule parsing failed — please try again."));
        return;
      }
      if (d.rooms_extracted > 0) {
        const unmatched = (d.tags_not_in_catalog || []).length;
        toast.success(
          `${d.rooms_extracted} rooms, ${(d.distinct_tags || []).length} material tags` +
          (unmatched ? ` (${unmatched} not in catalog — review needed)` : ""),
        );
      } else {
        toast.info("No room rows found — this page looks like a materials legend, not a room schedule.");
      }
      onChanged();
    } catch {
      toast.error("Schedule parsing timed out — please try again.");
    } finally {
      setParsing(false);
    }
  };

  const qa = page.qa_flags;
  const qaFlags: string[] = qa?.flags || [];
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
          <div className="flex flex-col items-end gap-1">
            <Badge className={badge.cls}>{badge.label}</Badge>
            {syncState && syncState.detected > 0 && syncState.unsynced === 0 && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">Synced ✓</Badge>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Confidence {page.classification_confidence ?? 0}%
          {typeof roomsCount === "number" && roomsCount > 0 && (
            <> · {roomsCount} rooms{lastDetect ? ` · ${lastDetect.sf.toLocaleString()} SF` : ""}</>
          )}
        </div>

        {qa && (qa.chosen_scale != null || qaFlags.length > 0) && (
          <div className="flex flex-wrap gap-1" data-testid={`qa-badges-${page.page_number}`}>
            {qa.chosen_scale != null && (
              qa.confidence === "high" ? (
                <Badge variant="outline" className="text-green-700 border-green-300 text-[10px]">
                  Scale ✓ {scaleLabel(qa.chosen_scale)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                  Scale {scaleLabel(qa.chosen_scale)}: review
                </Badge>
              )
            )}
            {qaFlags.includes("area_distribution_suspect") && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">⚠ Areas suspect</Badge>
            )}
            {qaFlags.includes("label_overload") && (
              <Badge variant="outline" className="text-gray-600 border-gray-300 text-[10px]">
                Dense: {qa.labels_on_page} labels
              </Badge>
            )}
            {qaFlags.includes("multi_scale") && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">Multi-scale</Badge>
            )}
          </div>
        )}

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
              <Button size="sm" variant="outline" onClick={handleVerify} disabled={detecting || rendering || verifying}>
                {verifying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-1 h-3 w-3" />}
                {verifying ? "Verifying..." : "Verify Scale & Areas"}
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
        ) : isSchedule ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleParse} disabled={parsing}>
                {parsing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Table2 className="mr-1 h-3 w-3" />}
                {parsing ? "Parsing..." : "Parse Schedule"}
              </Button>
              {(finishesCount ?? 0) > 0 && (
                <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                  Parsed ✓ {finishesCount} rooms
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              AI reads the schedule table into room-by-room material assignments.
            </p>
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
