import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  viewings_this_month: number;
  viewings_last_month: number;
  deals_closed_ytd: number;
  deals_active: number;
  total_commission: number;
  active_listings: number;
  conversion_rate: number;
}

export function useAgentPerformance() {
  const { tenantId } = useTenant();

  const { data: metrics = [], isLoading, error } = useQuery({
    queryKey: ["re-agent-performance", tenantId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

      // Get viewings by agent this month
      const { data: viewingsThisMonth } = await supabase
        .from("re_viewings" as any)
        .select("agent_id")
        .eq("tenant_id", tenantId)
        .gte("scheduled_date", startOfMonth);

      // Get viewings last month
      const { data: viewingsLastMonth } = await supabase
        .from("re_viewings" as any)
        .select("agent_id")
        .eq("tenant_id", tenantId)
        .gte("scheduled_date", startOfLastMonth)
        .lte("scheduled_date", endOfLastMonth);

      // Get deals by agent
      const { data: deals } = await supabase
        .from("re_deals" as any)
        .select("lead_agent_id, lead_agent_name, stage, commission_amount, status, created_at")
        .eq("tenant_id", tenantId);

      // Get listings by agent
      const { data: listings } = await supabase
        .from("re_listings" as any)
        .select("listing_agent_name, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      // Aggregate by agent
      const agentMap = new Map<string, AgentMetrics>();

      const getOrCreate = (id: string, name: string): AgentMetrics => {
        if (!agentMap.has(id)) {
          agentMap.set(id, {
            agent_id: id,
            agent_name: name || "Unassigned",
            viewings_this_month: 0,
            viewings_last_month: 0,
            deals_closed_ytd: 0,
            deals_active: 0,
            total_commission: 0,
            active_listings: 0,
            conversion_rate: 0,
          });
        }
        return agentMap.get(id)!;
      };

      // Count viewings this month
      (viewingsThisMonth || []).forEach((v: any) => {
        if (v.agent_id) getOrCreate(v.agent_id, "").viewings_this_month++;
      });

      // Count viewings last month
      (viewingsLastMonth || []).forEach((v: any) => {
        if (v.agent_id) getOrCreate(v.agent_id, "").viewings_last_month++;
      });

      // Count deals
      (deals || []).forEach((d: any) => {
        const id = d.lead_agent_id || "unassigned";
        const m = getOrCreate(id, d.lead_agent_name || "Unassigned");
        if (d.stage === "completed") {
          m.deals_closed_ytd++;
          m.total_commission += Number(d.commission_amount || 0);
        } else if (d.status === "active") {
          m.deals_active++;
        }
      });

      // Count active listings
      (listings || []).forEach((l: any) => {
        const name = l.listing_agent_name || "Unassigned";
        const existing = Array.from(agentMap.values()).find(a => a.agent_name === name);
        if (existing) {
          existing.active_listings++;
        } else {
          const m = getOrCreate(name, name);
          m.active_listings++;
        }
      });

      // Calculate conversion rates
      agentMap.forEach(m => {
        const totalViewings = m.viewings_this_month + m.viewings_last_month;
        m.conversion_rate = totalViewings > 0 ? Math.round((m.deals_closed_ytd / totalViewings) * 100) : 0;
      });

      return Array.from(agentMap.values()).filter(a => a.agent_name !== "Unassigned" || a.deals_active > 0);
    },
    enabled: !!tenantId,
  });

  const totals = {
    totalViewings: metrics.reduce((s, m) => s + m.viewings_this_month, 0),
    totalDeals: metrics.reduce((s, m) => s + m.deals_closed_ytd, 0),
    totalCommission: metrics.reduce((s, m) => s + m.total_commission, 0),
    totalListings: metrics.reduce((s, m) => s + m.active_listings, 0),
  };

  return { metrics, isLoading, error, totals };
}
