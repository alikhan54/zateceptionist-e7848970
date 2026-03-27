import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PortfolioProperty {
  id: string;
  tenant_id: string;
  client_id: string;
  property_description: string | null;
  purchase_price_aed: number;
  purchase_date: string;
  total_investment_aed: number;
  current_estimated_value_aed: number | null;
  last_valuation_date: string | null;
  capital_gain_aed: number | null;
  capital_gain_pct: number | null;
  is_rented: boolean;
  monthly_rent_aed: number | null;
  annual_rent_aed: number | null;
  gross_yield_pct: number | null;
  net_yield_pct: number | null;
  total_roi_pct: number | null;
  annualized_roi_pct: number | null;
  buyer_nationality: string | null;
  home_currency: string | null;
  current_value_home: number | null;
  tax_deadlines: Array<{ country: string; deadline: string; description: string }>;
  alerts: Array<{ type: string; message: string; date: string; read: boolean }>;
  status: string;
  created_at: string;
}

export function useInvestorPortfolio() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ["re-investment-portfolio", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("re_investment_portfolio" as any).select("*").eq("tenant_id", tenantId).eq("status", "active").order("purchase_date", { ascending: false });
      return (data || []) as unknown as PortfolioProperty[];
    },
    enabled: !!tenantId,
  });

  const addMutation = useMutation({
    mutationFn: async (property: Partial<PortfolioProperty>) => {
      const { error } = await supabase.from("re_investment_portfolio" as any).insert({ ...property, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-investment-portfolio"] }),
  });

  const totalInvestment = properties.reduce((s, p) => s + Number(p.total_investment_aed || p.purchase_price_aed || 0), 0);
  const totalCurrentValue = properties.reduce((s, p) => s + Number(p.current_estimated_value_aed || p.purchase_price_aed || 0), 0);
  const totalGain = totalCurrentValue - totalInvestment;
  const monthlyRental = properties.filter((p) => p.is_rented).reduce((s, p) => s + Number(p.monthly_rent_aed || 0), 0);
  const stats = {
    propertyCount: properties.length,
    totalInvestment,
    totalCurrentValue,
    totalGain,
    totalROIPct: totalInvestment > 0 ? +((totalGain / totalInvestment) * 100).toFixed(1) : 0,
    monthlyRental,
    upcomingDeadlines: properties.flatMap((p) => (p.tax_deadlines || []).map((d) => ({ ...d, property: p.property_description }))),
    unreadAlerts: properties.flatMap((p) => (p.alerts || []).filter((a) => !a.read)),
  };

  return { properties, isLoading, error, stats, addProperty: addMutation.mutateAsync, isAdding: addMutation.isPending };
}
