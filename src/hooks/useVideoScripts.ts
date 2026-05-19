import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface VideoScript {
  id: string;
  tenant_id: string;
  patient_id: string;
  health_analysis_id: string | null;
  script_sections: any;
  full_script: string | null;
  estimated_duration_seconds: number | null;
  video_url: string | null;
  video_status: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch doctor-avatar video scripts for a given patient (latest first) and
// subscribe to realtime UPDATEs so the UI flips from "rendering" to "ready"
// without a refresh once the n8n Doctor Avatar workflow writes `video_url`.
export function useVideoScripts(patientId: string | null | undefined) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const queryKey = ["clinic_video_scripts", tenantId, patientId];

  const { data: scripts = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("clinic_video_scripts" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VideoScript[];
    },
    enabled: !!tenantId && !!patientId,
  });

  // Realtime subscription — when n8n flips video_url from null to a URL,
  // invalidate the cache so the player swaps from skeleton to <video>.
  useEffect(() => {
    if (!tenantId || !patientId) return;
    const channel = supabase
      .channel(`video_scripts_${patientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_video_scripts", filter: `patient_id=eq.${patientId}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, patientId, queryClient]);

  const latest = scripts[0] ?? null;
  const ready = !!latest?.video_url;

  return { scripts, latest, ready, isLoading, refetch };
}
