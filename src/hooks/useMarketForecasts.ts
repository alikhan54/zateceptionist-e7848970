import { useQuery } from "@tanstack/react-query";
import { supabase, callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMutation } from "@tanstack/react-query";

export interface MarketForecast {
  id: string;
  tenant_id: string;
  location: string;
  property_type: string;
  metric: string;
  current_value: number;
  forecast_date: string;
  forecast_3m: number;
  forecast_6m: number;
  forecast_12m: number;
  forecast_3m_change_pct: number;
  forecast_6m_change_pct: number;
  forecast_12m_change_pct: number;
  confidence_score: number;
  trend_direction: string;
  ai_narrative: string;
  investment_recommendation: string;
  risk_factors: string[];
  data_points_used: number;
  model_used: string;
  created_at: string;
}

export function useMarketForecasts() {
  const { tenantId } = useTenant();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["re-market-forecasts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("re_market_forecasts" as any).select("*").eq("tenant_id", tenantId).order("forecast_date", { ascending: false });
      return (data || []) as unknown as MarketForecast[];
    },
    enabled: !!tenantId,
  });

  const locations = [...new Set(forecasts.map((f) => f.location))];
  const getForLocation = (loc: string) => forecasts.filter((f) => f.location === loc);

  const advisorMutation = useMutation({
    mutationFn: async (params: { budget_aed: number; nationality: string; purpose: string; preferred_areas: string[] }) => {
      return callWebhook("/re-investment-advisor", params as any, tenantId || "");
    },
  });

  return { forecasts, isLoading, locations, getForLocation, getAdvice: advisorMutation.mutateAsync, isAdvising: advisorMutation.isPending, advice: advisorMutation.data };
}
