import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type ReminderStatus = "pending" | "sent" | "failed" | "cancelled";
export type ReminderChannel = "email" | "whatsapp" | "sms";
export type ReminderTargetType = "invoice" | "job" | "filing" | "general";

export interface AccountingReminder {
  id: string;
  tenant_id: string;
  target_type: ReminderTargetType;
  target_id: string | null;
  channel: ReminderChannel;
  workflow_type: string | null;
  scheduled_for: string;
  sent_at: string | null;
  mailbox_used: string | null;
  status: ReminderStatus;
  error_message: string | null;
  attempt_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseRemindersFilters {
  status?: ReminderStatus;
  channel?: ReminderChannel;
  targetType?: ReminderTargetType;
  searchTerm?: string;
}

export function useAccountingReminders(filters: UseRemindersFilters = {}) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["accounting_reminders", tenantId, filters],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("accounting_reminders")
        .select("*")
        .eq("tenant_id", tenantId as string);

      if (filters.status) q = q.eq("status", filters.status);
      if (filters.channel) q = q.eq("channel", filters.channel);
      if (filters.targetType) q = q.eq("target_type", filters.targetType);

      q = q.order("scheduled_for", { ascending: true });

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      return (data ?? []) as unknown as AccountingReminder[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`accounting_reminders_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounting_reminders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const scheduleReminder = useMutation({
    mutationFn: async (rem: {
      target_type: ReminderTargetType;
      target_id: string | null;
      channel: ReminderChannel;
      scheduled_for: string;
      workflow_type?: string | null;
    }) => {
      if (!tenantId) throw new Error("No tenant context — cannot schedule reminder");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const payload = {
        tenant_id: tenantId,
        target_type: rem.target_type,
        target_id: rem.target_id,
        channel: rem.channel,
        scheduled_for: rem.scheduled_for,
        workflow_type: rem.workflow_type ?? null,
        status: "pending" as const,
        attempt_count: 0,
        created_by: userId,
        updated_by: userId,
      };

      const { data, error: insErr } = await supabase
        .from("accounting_reminders")
        .insert(payload as never)
        .select("*")
        .single();
      if (insErr) throw insErr;
      return data as unknown as AccountingReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountingReminder> }) => {
      if (!tenantId) throw new Error("No tenant context — cannot update reminder");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const finalPatch = { ...patch, updated_by: userId };

      const { data, error: updErr } = await supabase
        .from("accounting_reminders")
        .update(finalPatch as never)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (updErr) throw updErr;
      return data as unknown as AccountingReminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });

  const cancelReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const { error: updErr } = await supabase
        .from("accounting_reminders")
        .update({ status: "cancelled", updated_by: userId } as never)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });

  const resendReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("accounting_reminders")
        .update({
          status: "pending",
          attempt_count: 0,
          error_message: null,
          scheduled_for: nowIso,
          updated_by: userId,
        } as never)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { error: delErr } = await supabase
        .from("accounting_reminders")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });

  return {
    reminders,
    isLoading,
    error,
    refetch,
    scheduleReminder,
    updateReminder,
    cancelReminder,
    resendReminder,
    deleteReminder,
  };
}
