import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface WhatsAppJourney {
  id: string;
  tenant_id: string;
  whatsapp_number: string;
  buyer_name: string | null;
  detected_language: string;
  client_id: string | null;
  current_stage: string;
  qualification_data: Record<string, any>;
  message_count: number;
  last_message_at: string | null;
  conversation_history: Array<{ role: string; message: string; timestamp: string }>;
  shown_property_ids: string[];
  agent_takeover: boolean;
  agent_takeover_reason: string | null;
  created_at: string;
}

export function useWhatsAppJourneys() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ["re-whatsapp-journeys", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("re_whatsapp_journeys" as any).select("*").eq("tenant_id", tenantId).order("last_message_at", { ascending: false });
      return (data || []) as unknown as WhatsAppJourney[];
    },
    enabled: !!tenantId,
  });

  const takeoverMutation = useMutation({
    mutationFn: async (params: { journey_id: string; reason: string }) => {
      const { error } = await supabase.from("re_whatsapp_journeys" as any).update({ agent_takeover: true, agent_takeover_reason: params.reason, current_stage: "agent_handoff" }).eq("id", params.journey_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-whatsapp-journeys"] }),
  });

  const stages = ["initial_contact", "qualifying", "qualified", "properties_shown", "property_selected", "proposal_sent", "viewing_requested", "viewing_scheduled", "post_viewing", "offer_discussion", "agent_handoff", "completed", "dormant"];
  const active = journeys.filter((j) => !["completed", "dormant"].includes(j.current_stage));
  const stats = {
    total: journeys.length,
    active: active.length,
    qualified: journeys.filter((j) => ["qualified", "properties_shown", "property_selected", "proposal_sent", "viewing_requested", "viewing_scheduled", "post_viewing", "offer_discussion"].includes(j.current_stage)).length,
    agentTakeover: journeys.filter((j) => j.agent_takeover).length,
    avgMessages: journeys.length > 0 ? Math.round(journeys.reduce((s, j) => s + j.message_count, 0) / journeys.length) : 0,
  };

  return { journeys, isLoading, stages, active, stats, takeover: takeoverMutation.mutateAsync };
}
