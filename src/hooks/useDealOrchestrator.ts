import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface DealOrchestration {
  id: string;
  tenant_id: string;
  deal_id: string | null;
  client_id: string;
  listing_id: string | null;
  match_id: string | null;
  current_stage: string;
  pending_action: Record<string, any>;
  agent_approved: boolean | null;
  agent_notes: string | null;
  approved_at: string | null;
  stage_history: Array<Record<string, any>>;
  closing_probability: number;
  ai_next_action: string | null;
  ai_risk_factors: string[];
  days_in_current_stage: number;
  notification_channel: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string;
  listing_title?: string;
}

export function useDealOrchestrator() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: orchestrations = [], isLoading } = useQuery({
    queryKey: ["re-deal-orchestrations", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("re_deal_orchestrations" as any).select("*").eq("tenant_id", tenantId).order("closing_probability", { ascending: false });
      const { data: clients } = await supabase.from("re_clients" as any).select("id, full_name, first_name, last_name").eq("tenant_id", tenantId);
      const { data: listings } = await supabase.from("re_listings" as any).select("id, title").eq("tenant_id", tenantId);
      const clientMap = new Map((clients || []).map((c: any) => [c.id, c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()]));
      const listingMap = new Map((listings || []).map((l: any) => [l.id, l.title]));
      return (data || []).map((o: any) => ({ ...o, client_name: clientMap.get(o.client_id) || "Unknown", listing_title: listingMap.get(o.listing_id) || "No listing" })) as DealOrchestration[];
    },
    enabled: !!tenantId,
  });

  const approveMutation = useMutation({
    mutationFn: async (params: { orchestration_id: string; action: "approve" | "reject" | "modify"; agent_notes?: string }) => {
      return callWebhook("/re-deal-orchestrator-approve", params as any, tenantId || "");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-deal-orchestrations"] }),
  });

  const stages = ["match_detected", "presentation_ready", "presentation_sent", "viewing_proposed", "viewing_scheduled", "viewing_completed", "followup_ready", "followup_sent", "offer_ready", "offer_sent", "negotiation", "deal_agreed", "compliance_tracking", "completed", "stalled", "lost"];
  const byStage = (stage: string) => orchestrations.filter((o) => o.current_stage === stage);
  const pendingApproval = orchestrations.filter((o) => o.pending_action?.type && !o.agent_approved);
  const stats = {
    total: orchestrations.length,
    active: orchestrations.filter((o) => !["completed", "lost"].includes(o.current_stage)).length,
    stalled: orchestrations.filter((o) => o.current_stage === "stalled").length,
    pendingApproval: pendingApproval.length,
    avgProbability: orchestrations.length > 0 ? Math.round(orchestrations.reduce((s, o) => s + o.closing_probability, 0) / orchestrations.length) : 0,
  };

  return { orchestrations, isLoading, stages, byStage, pendingApproval, stats, approve: approveMutation.mutateAsync, isApproving: approveMutation.isPending };
}
