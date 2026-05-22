import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface AccountingClientLite {
  id: string;
  name: string;
}

export function useAccountingClientsList() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["accounting_clients_list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_clients")
        .select("id, name")
        .eq("tenant_id", tenantId as string)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as AccountingClientLite[];
    },
  });
}
