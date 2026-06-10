import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";
import { useDrawingPages } from "@/hooks/useDrawingPages";
import DrawingPageCard from "./DrawingPageCard";
import { dissectPdf } from "@/lib/api/estimationApi";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
}

export default function DrawingsTab({ projectId }: Props) {
  const { tenantId } = useTenant();
  const [polling, setPolling] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string>("");

  const { pages, isLoading, refetch } = useDrawingPages(projectId, { poll: polling });

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
        <CardContent className="py-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> AI Drawing Analysis
          </h3>
          <p className="text-emerald-100 text-sm mt-1">
            Upload a bidset, Zate reads every page, finds every room, and marks up your drawings.
          </p>
        </CardContent>
      </Card>

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
              onChanged={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
