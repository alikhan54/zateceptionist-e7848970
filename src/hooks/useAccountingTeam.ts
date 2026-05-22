import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface AccountingTeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

/**
 * Returns the active staff users for the current tenant. Used by the Jobs page
 * (and future Invoices / Reminders pages) for the "Owner" picker dropdown.
 *
 * Reads `public.users` directly — that table already carries the `role` column,
 * so we don't need to join `public.user_roles` for the picker UX.
 */
export function useAccountingTeam() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["accounting_team", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("tenant_id", tenantId as string)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as AccountingTeamMember[];
    },
  });
}
