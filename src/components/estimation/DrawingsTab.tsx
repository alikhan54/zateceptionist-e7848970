import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTenant } from "@/contexts/TenantContext";
import { useDrawingPages } from "@/hooks/useDrawingPages";
import DrawingPageCard from "./DrawingPageCard";
import { dissectPdf, syncToV1, applyFinishes } from "@/lib/api/estimationApi";
import { Loader2, Sparkles, Send, PackageCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
}

export default function DrawingsTab({ projectId }: Props) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [applyPlan, setApplyPlan] = useState<any>(null);

  const { pages, isLoading, refetch } = useDrawingPages(projectId, { poll: polling });

  // Per-page polygon sync state: how many detected rooms exist / are not yet in Takeoff.
  const { data: polySync = [] } = useQuery({
    queryKey: ["estimation_polygons_sync", tenantId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_room_polygons" as any)
        .select("page_number,synced_to_v1")
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .eq("detection_status", "detected");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && !!projectId,
  });
  const unsyncedCount = polySync.filter((r: any) => !r.synced_to_v1).length;
  const syncByPage: Record<number, { detected: number; unsynced: number }> = {};
  for (const r of polySync as any[]) {
    const s = (syncByPage[r.page_number] ||= { detected: 0, unsynced: 0 });
    s.detected += 1;
    if (!r.synced_to_v1) s.unsynced += 1;
  }

  // Parsed finish-schedule rows per source page (drives the Parsed badge + Apply button).
  const { data: finishes = [] } = useQuery({
    queryKey: ["estimation_room_finishes", tenantId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_room_finishes" as any)
        .select("source_page")
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && !!projectId,
  });
  const finishesByPage: Record<number, number> = {};
  for (const f of finishes as any[]) {
    finishesByPage[f.source_page] = (finishesByPage[f.source_page] || 0) + 1;
  }

  const invalidateAfterChange = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["estimation_polygons_sync", tenantId, projectId] });
    queryClient.invalidateQueries({ queryKey: ["estimation_room_finishes", tenantId, projectId] });
  };

  const handleApplyMaterials = async () => {
    if (!tenantId) return;
    setApplying(true);
    try {
      // Dry run is mandatory: always show the plan before anything is written.
      const resp = await applyFinishes(projectId, tenantId, true);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(String(d?.error || (resp as any)?.error || "Could not build the material plan."));
        return;
      }
      setApplyPlan(d);
      setPlanOpen(true);
    } catch {
      toast.error("Material plan timed out — please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!tenantId) return;
    setApplying(true);
    try {
      const resp = await applyFinishes(projectId, tenantId, false);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(String(d?.error || (resp as any)?.error || "Apply failed."));
        return;
      }
      toast.success(`${d.items_created} takeoff items created — review them in the Takeoff tab`);
      setPlanOpen(false);
      invalidateAfterChange();
      queryClient.invalidateQueries({ queryKey: ["estimation_rooms", tenantId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["estimation_takeoff", tenantId, projectId] });
    } catch {
      toast.error("Apply timed out — please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleSendToTakeoff = async () => {
    if (!tenantId) return;
    setSending(true);
    try {
      const resp = await syncToV1(projectId, tenantId);
      const d = ((resp as any)?.data || resp) as any;
      if (!d?.success) {
        toast.error(d?.error || (resp as any)?.error || "Send to Takeoff failed — please try again.");
        return;
      }
      if (d.synced > 0) {
        toast.success(
          `${d.synced} room${d.synced === 1 ? "" : "s"} added to Takeoff — assign materials in the Takeoff tab` +
          (d.skipped_existing ? ` (${d.skipped_existing} already there)` : ""),
        );
      } else {
        toast.info(`Nothing new to send — ${d.skipped_existing} room${d.skipped_existing === 1 ? "" : "s"} already in Takeoff`);
      }
      invalidateAfterChange();
      queryClient.invalidateQueries({ queryKey: ["estimation_rooms", tenantId, projectId] });
      queryClient.invalidateQueries({ queryKey: ["estimation_takeoff", tenantId, projectId] });
    } catch {
      toast.error("Send to Takeoff timed out — please try again.");
    } finally {
      setSending(false);
    }
  };

  // Project dissection status — polled while an analysis is running.
  const { data: proj } = useQuery({
    queryKey: ["estimation_project_dissection", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_projects" as any)
        .select("dissection_status,total_drawing_pages")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!projectId,
    refetchInterval: polling ? 5000 : false,
  });

  useEffect(() => {
    if (!polling || !proj) return;
    if (proj.dissection_status === "completed") {
      setPolling(false);
      refetch();
      toast.success("Drawing analysis complete");
    } else if (proj.dissection_status === "failed") {
      setPolling(false);
      toast.error("Drawing analysis failed — check the PDF and try again");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, proj?.dissection_status]);

  // This project's uploaded bidset PDFs (picker source).
  const { data: bidsets = [] } = useQuery({
    queryKey: ["estimation_bidsets_pdfs", tenantId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_bidsets" as any)
        .select("id,document_name,document_type,file_url,is_latest")
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .not("file_url", "is", null)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!tenantId && !!projectId,
  });

  const handleAnalyze = async () => {
    if (!selectedPdf || !tenantId) return;
    setPolling(true);
    toast.info("Reading your drawings — pages will appear as they're classified");
    try {
      const resp = await dissectPdf(projectId, selectedPdf, tenantId);
      if ((resp as any)?.success === false) {
        setPolling(false);
        toast.error((resp as any)?.error || "Could not start the analysis");
      }
    } catch {
      setPolling(false);
      toast.error("Could not start the analysis");
    }
  };

  return (
    <div className="space-y-4" data-testid="drawings-tab">
      {/* Header strip */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> AI Drawing Analysis
            </h3>
            <p className="text-emerald-100 text-sm mt-1">
              Upload a bidset, Zate reads every page, finds every room, and marks up your drawings.
            </p>
          </div>
          {finishes.length > 0 && (
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
              onClick={handleApplyMaterials}
              disabled={applying}
              data-testid="apply-materials"
            >
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Apply Materials
            </Button>
          )}
          {polySync.length > 0 && (
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
              onClick={handleSendToTakeoff}
              disabled={sending || unsyncedCount === 0}
              data-testid="send-to-takeoff"
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending
                ? "Sending..."
                : unsyncedCount > 0
                  ? `Send ${unsyncedCount} room${unsyncedCount === 1 ? "" : "s"} to Takeoff`
                  : "All rooms in Takeoff ✓"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dry-run plan dialog: mandatory review before any real apply */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply materials — review the plan</DialogTitle>
          </DialogHeader>
          {applyPlan && (
            <div className="space-y-2 text-sm max-h-80 overflow-y-auto" data-testid="apply-plan">
              <p>
                <strong>{applyPlan.rooms_matched}</strong> rooms matched ·{" "}
                <strong>{(applyPlan.plan || []).reduce((n: number, e: any) => n + (e.items?.length || 0), 0)}</strong> items to create ·{" "}
                <strong>{(applyPlan.unmatched_rooms || []).length}</strong> schedule rows unmatched
              </p>
              {(applyPlan.plan || []).filter((e: any) => e.items?.length || e.skipped?.length).slice(0, 30).map((e: any, i: number) => (
                <div key={i} className="border rounded px-2 py-1">
                  <div className="font-medium">{e.room} <span className="text-xs text-muted-foreground">({e.matched_by})</span></div>
                  {(e.items || []).map((it: any, j: number) => (
                    <div key={j} className="text-xs">+ {it.surface}: {it.tag} ({it.trade}) — {it.qty} {it.unit}</div>
                  ))}
                  {(e.skipped || []).map((s: string, j: number) => (
                    <div key={j} className="text-xs text-muted-foreground">– {s}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmApply} disabled={applying} data-testid="confirm-apply">
              {applying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Create {(applyPlan?.plan || []).reduce((n: number, e: any) => n + (e.items?.length || 0), 0)} items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {polling && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading your drawings — pages appear as they're classified
          {proj?.total_drawing_pages ? ` (${pages.length}/${proj.total_drawing_pages} pages)` : "..."}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading drawing pages...</div>
      ) : pages.length === 0 ? (
        /* State 1 — nothing dissected yet */
        <Card>
          <CardContent className="py-8 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              No drawings analyzed yet. Pick a bidset PDF and let the AI read it.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Select value={selectedPdf} onValueChange={setSelectedPdf}>
                <SelectTrigger className="w-80" data-testid="bidset-picker">
                  <SelectValue placeholder="Choose a bidset PDF..." />
                </SelectTrigger>
                <SelectContent>
                  {bidsets.map(b => (
                    <SelectItem key={b.id} value={b.file_url}>
                      {b.document_name || b.file_url.split("/").pop()} {b.is_latest ? " (latest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAnalyze} disabled={!selectedPdf || polling}>
                <Sparkles className="mr-1 h-4 w-4" /> Analyze Drawings
              </Button>
            </div>
            {bidsets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No PDFs uploaded for this project yet — add one in the AI Analysis tab first.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* State 2 — page grid */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map(p => (
            <DrawingPageCard
              key={p.id}
              page={p}
              projectId={projectId}
              tenantId={tenantId || ""}
              onChanged={invalidateAfterChange}
              syncState={syncByPage[p.page_number]}
              finishesCount={finishesByPage[p.page_number]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
