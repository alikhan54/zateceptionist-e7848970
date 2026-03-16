import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useMemo } from "react";

export interface LtvCacCustomer {
  id: string;
  tenant_id: string;
  customer_id: string;
  lead_id: string | null;
  customer_name: string;
  source: string;
  emails_sent: number;
  sms_sent: number;
  whatsapp_sent: number;
  calls_made: number;
  social_sent: number;
  total_touches: number;
  total_cac: number;
  total_revenue: number;
  deal_count: number;
  first_deal_date: string | null;
  last_deal_date: string | null;
  months_as_customer: number;
  avg_monthly_revenue: number;
  projected_ltv_12m: number;
  ltv_cac_ratio: number;
  health_grade: string;
  insights: Array<{ type: string; text: string }>;
  created_at: string;
  updated_at: string;
}

export interface LtvCacSnapshot {
  id: string;
  tenant_id: string;
  snapshot_date: string;
  total_customers: number;
  customers_with_revenue: number;
  avg_ltv: number;
  median_ltv: number;
  avg_cac: number;
  avg_ltv_cac_ratio: number;
  avg_email_cac: number;
  avg_sms_cac: number;
  avg_whatsapp_cac: number;
  avg_call_cac: number;
  avg_social_cac: number;
  source_breakdown: Record<string, { count: number; avg_ltv: number; avg_cac: number; ratio: number }>;
  grade_distribution: Record<string, number>;
  top_insights: Array<{ text: string; count: number; type: string }>;
  created_at: string;
}

export function useLtvCac() {
  const { tenantId } = useTenant();

  const {
    data: customerData = [],
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["ltv-cac", "customers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("customer_ltv_cac")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("total_revenue", { ascending: false });
      if (error) throw error;
      return (data || []) as LtvCacCustomer[];
    },
    enabled: !!tenantId,
  });

  const {
    data: snapshots = [],
    isLoading: snapshotsLoading,
  } = useQuery({
    queryKey: ["ltv-cac", "snapshots", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data, error } = await supabase
        .from("ltv_cac_snapshots")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("snapshot_date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data || []) as LtvCacSnapshot[];
    },
    enabled: !!tenantId,
  });

  const summary = useMemo(() => {
    if (customerData.length === 0) return null;

    const withRevenue = customerData.filter((c) => c.total_revenue > 0);
    const totalRevenue = customerData.reduce((s, c) => s + c.total_revenue, 0);
    const totalCac = customerData.reduce((s, c) => s + c.total_cac, 0);
    const avgCac = customerData.length > 0 ? totalCac / customerData.length : 0;
    const avgLtv = withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0;
    const avgRatio = avgCac > 0 ? avgLtv / avgCac : 0;
    const roi = totalCac > 0 ? ((totalRevenue - totalCac) / totalCac) * 100 : 0;

    const gradeDistribution: Record<string, number> = {};
    customerData.forEach((c) => {
      gradeDistribution[c.health_grade] = (gradeDistribution[c.health_grade] || 0) + 1;
    });

    const sourceBreakdown: Record<string, { count: number; totalLtv: number; totalCac: number; avgRatio: number }> = {};
    customerData.forEach((c) => {
      const src = c.source || "unknown";
      if (!sourceBreakdown[src]) sourceBreakdown[src] = { count: 0, totalLtv: 0, totalCac: 0, avgRatio: 0 };
      sourceBreakdown[src].count++;
      sourceBreakdown[src].totalLtv += c.total_revenue;
      sourceBreakdown[src].totalCac += c.total_cac;
    });
    Object.keys(sourceBreakdown).forEach((src) => {
      const sb = sourceBreakdown[src];
      sb.avgRatio = sb.totalCac > 0 ? sb.totalLtv / sb.totalCac : 0;
    });

    return {
      totalCustomers: customerData.length,
      customersWithRevenue: withRevenue.length,
      avgCac,
      avgLtv,
      avgRatio,
      roi,
      gradeDistribution,
      sourceBreakdown,
    };
  }, [customerData]);

  const latestSnapshot = useMemo(() => {
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }, [snapshots]);

  return {
    customerData,
    snapshots,
    summary,
    latestSnapshot,
    isLoading: customersLoading || snapshotsLoading,
    refetch: refetchCustomers,
  };
}
