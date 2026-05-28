import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { ReminderTargetType } from "./useAccountingReminders";

export interface ReminderTargetOption {
  id: string;
  label: string;
  sublabel?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function useReminderTargets(targetType: ReminderTargetType | "") {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["reminder_targets", tenantId, targetType],
    enabled: !!tenantId && !!targetType,
    queryFn: async (): Promise<ReminderTargetOption[]> => {
      if (!targetType) return [];

      if (targetType === "invoice") {
        const { data, error } = await supabase
          .from("accounting_invoices")
          .select("id, invoice_no, amount, status, due_at, accounting_clients(name, contact_email, contact_phone)")
          .eq("tenant_id", tenantId as string)
          .in("status", ["sent", "partial", "overdue"])
          .order("due_at", { ascending: true, nullsFirst: false });
        if (error) throw error;
        return (data ?? []).map((r: any) => ({
          id: r.id as string,
          label: `${r.invoice_no} — £${Number(r.amount ?? 0).toFixed(2)} ${r.status}`,
          sublabel: r.accounting_clients?.name ?? null,
          contactEmail: r.accounting_clients?.contact_email ?? null,
          contactPhone: r.accounting_clients?.contact_phone ?? null,
        }));
      }

      if (targetType === "job") {
        const { data, error } = await supabase
          .from("accounting_jobs")
          .select("id, title, status, deadline, accounting_clients(name, contact_email, contact_phone)")
          .eq("tenant_id", tenantId as string)
          .neq("status", "done")
          .order("deadline", { ascending: true, nullsFirst: false });
        if (error) throw error;
        return (data ?? []).map((r: any) => ({
          id: r.id as string,
          label: `${r.title} (${r.status})`,
          sublabel: r.accounting_clients?.name ?? null,
          contactEmail: r.accounting_clients?.contact_email ?? null,
          contactPhone: r.accounting_clients?.contact_phone ?? null,
        }));
      }

      // 'general' and 'filing' both target a client row
      const { data, error } = await supabase
        .from("accounting_clients")
        .select("id, name, contact_email, contact_phone")
        .eq("tenant_id", tenantId as string)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id as string,
        label: r.name as string,
        sublabel: r.contact_email ?? null,
        contactEmail: r.contact_email ?? null,
        contactPhone: r.contact_phone ?? null,
      }));
    },
  });
}
