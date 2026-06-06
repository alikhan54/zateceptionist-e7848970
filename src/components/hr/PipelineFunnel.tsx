import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users } from "lucide-react";

// Reads the hr_pipeline_summary VIEW (security_invoker=true), which aggregates
// hr_candidates per (requisition, stage) and is auto-scoped to the caller's
// tenant by the underlying hr_candidates RLS (get_user_tenant_uuid()). We still
// filter by tenant_id explicitly for parity with the rest of the HR data layer.
interface PipelineRow {
  tenant_id: string;
  job_requisition_id: string | null;
  job_title: string | null;
  stage: string | null;
  count: number | string | null;
  avg_score: number | string | null;
  earliest: string | null;
  latest_update: string | null;
}

interface StageAgg {
  stage: string;
  count: number;
  avgScore: number | null;
}

// Canonical hiring-stage order; unknown stages are appended in arrival order.
const STAGE_ORDER = [
  "applied",
  "screening",
  "phone_screen",
  "assessment",
  "interview",
  "reference_check",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

const STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function prettyStage(stage: string): string {
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PipelineFunnel({ jobRequisitionId }: { jobRequisitionId?: string } = {}) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["hr-pipeline-summary", tenantUuid, jobRequisitionId ?? "all"],
    queryFn: async () => {
      if (!tenantUuid) return [] as StageAgg[];
      const { data, error } = await supabase
        .from("hr_pipeline_summary")
        .select("*")
        .eq("tenant_id", tenantUuid);
      if (error) return [] as StageAgg[]; // view may be unavailable; degrade quietly

      const allRows = (data || []) as PipelineRow[];
      // Scope to one opening when a requisition is selected; otherwise aggregate all.
      const rows = jobRequisitionId
        ? allRows.filter((r) => r.job_requisition_id === jobRequisitionId)
        : allRows;
      const byStage = new Map<string, { count: number; scoreSum: number; scoreWeight: number }>();
      for (const r of rows) {
        const stage = r.stage || "unknown";
        const c = Number(r.count) || 0;
        const entry = byStage.get(stage) || { count: 0, scoreSum: 0, scoreWeight: 0 };
        entry.count += c;
        if (r.avg_score != null) {
          entry.scoreSum += Number(r.avg_score) * c;
          entry.scoreWeight += c;
        }
        byStage.set(stage, entry);
      }

      const aggregated: StageAgg[] = Array.from(byStage.entries()).map(([stage, e]) => ({
        stage,
        count: e.count,
        avgScore: e.scoreWeight > 0 ? Math.round(e.scoreSum / e.scoreWeight) : null,
      }));

      aggregated.sort((a, b) => {
        const ia = STAGE_ORDER.indexOf(a.stage);
        const ib = STAGE_ORDER.indexOf(b.stage);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      return aggregated;
    },
    enabled: !!tenantUuid,
  });

  const total = stages.reduce((acc, s) => acc + s.count, 0);
  const maxCount = stages.reduce((acc, s) => Math.max(acc, s.count), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recruitment Funnel
            </CardTitle>
            <CardDescription>Candidate volume and average match score by hiring stage</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {total} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="text-center py-10">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No pipeline data yet</p>
            <p className="text-sm text-muted-foreground">
              Candidates will appear here as they move through hiring stages
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((s, i) => {
              const widthPct = maxCount > 0 ? Math.max((s.count / maxCount) * 100, 6) : 0;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm font-medium truncate" title={prettyStage(s.stage)}>
                    {prettyStage(s.stage)}
                  </span>
                  <div className="flex-1 h-9 bg-muted/40 rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length],
                      }}
                    >
                      <span className="text-xs font-semibold text-background">{s.count}</span>
                    </div>
                  </div>
                  <span className="w-20 shrink-0 text-right">
                    {s.avgScore != null ? (
                      <Badge variant="outline" className="text-xs">
                        {s.avgScore}% avg
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PipelineFunnel;
