import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface AccountingClientLite {
  id: string;
  name: string;
  /**
   * Wave 1 Phase C: CH-populated fields used by the Create Job dialog's
   * auto-date engine (ch_accounts + ch_confstmt anchors) and the read-only
   * Client Type display. All nullable for legacy / unsynced rows.
   */
  company_type: string | null;
  accounts_last_made_up: string | null;
  accounts_next_due: string | null;
  confirmation_statement_last_made_up: string | null;
  confirmation_statement_next_due: string | null;
}

export function useAccountingClientsList() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["accounting_clients_list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_clients")
        .select(
          "id, name, company_type, accounts_last_made_up, accounts_next_due, confirmation_statement_last_made_up, confirmation_statement_next_due",
        )
        .eq("tenant_id", tenantId as string)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as AccountingClientLite[];
    },
  });
}
