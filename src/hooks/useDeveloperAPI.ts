import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface APIKey {
  id: string;
  tenant_id: string;
  api_key: string;
  key_prefix: string;
  key_name: string;
  allowed_endpoints: string[];
  rate_limit_per_day: number;
  total_calls: number;
  calls_today: number;
  calls_this_month: number;
  last_used_at: string | null;
  billing_plan: string;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export function useDeveloperAPI() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["re-api-keys", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("re_api_keys" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return (data || []) as unknown as APIKey[];
    },
    enabled: !!tenantId,
  });

  const createKeyMutation = useMutation({
    mutationFn: async (params: { key_name: string; allowed_endpoints?: string[] }) => {
      const apiKey = "zate_" + tenantId?.substring(0, 4) + "_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(36)).join("").substring(0, 32);
      const { error } = await supabase.from("re_api_keys" as any).insert({
        tenant_id: tenantId,
        api_key: apiKey,
        key_prefix: apiKey.substring(0, 12),
        key_name: params.key_name,
        allowed_endpoints: params.allowed_endpoints || ["price_predict", "yield_calculator", "cross_border", "mortgage", "market_forecast"],
      });
      if (error) throw error;
      return apiKey;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-api-keys"] }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.from("re_api_keys" as any).update({ status: "revoked" }).eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-api-keys"] }),
  });

  const stats = {
    totalKeys: keys.length,
    activeKeys: keys.filter((k) => k.status === "active").length,
    totalCalls: keys.reduce((s, k) => s + k.total_calls, 0),
    callsToday: keys.reduce((s, k) => s + k.calls_today, 0),
  };

  return { keys, isLoading, stats, createKey: createKeyMutation.mutateAsync, revokeKey: revokeKeyMutation.mutateAsync, isCreating: createKeyMutation.isPending };
}
