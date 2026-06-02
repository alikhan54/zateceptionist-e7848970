import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Wave 2a Phase 3 — unfiltered per-status job counts for the pipeline chip strip.
 * Fetches just the `status` column (lightweight) and reduces client-side, so the
 * chips show the true distribution regardless of the active list filter.
 */
export function useAccountingJobStatusCounts() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["accounting_job_status_counts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_jobs")
        .select("status")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of (data ?? []) as Array<{ status: string }>) {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
      }
      return counts;
    },
  });

  // Keep counts fresh when jobs change.
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`acc_job_status_counts_${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_jobs", filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ["accounting_job_status_counts", tenantId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, queryClient]);

  return query;
}
