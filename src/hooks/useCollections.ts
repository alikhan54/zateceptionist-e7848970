import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

// === Types ===

export interface CollectionsAccount {
  id: string;
  tenant_id: string;
  account_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  product_type: string;
  original_amount: number;
  outstanding_balance: number;
  monthly_payment: number | null;
  currency: string;
  dpd: number;
  bucket: string;
  status: string;
  due_date: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  ptp_date: string | null;
  ptp_amount: number | null;
  ptp_status: string | null;
  ptp_count: number;
  ptp_kept_count: number;
  ptp_broken_count: number;
  settlement_status: string | null;
  settlement_amount: number | null;
  assigned_agent: string | null;
  assigned_team: string | null;
  total_contact_attempts: number;
  last_contact_date: string | null;
  last_contact_channel: string | null;
  last_contact_outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactLog {
  id: string;
  tenant_id: string;
  account_id: string;
  channel: string;
  direction: string;
  outcome: string;
  ptp_secured: boolean | null;
  ptp_date: string | null;
  ptp_amount: number | null;
  duration_seconds: number | null;
  agent_type: string | null;
  client_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface Settlement {
  id: string;
  tenant_id: string;
  account_id: string;
  original_outstanding: number;
  discount_percent: number | null;
  settled_amount: number;
  offered_by: string | null;
  approved_by: string | null;
  authority_level: string | null;
  status: string;
  offer_date: string | null;
  expiry_date: string | null;
  accepted_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface ComplianceLog {
  id: string;
  tenant_id: string;
  account_id: string | null;
  event_type: string;
  severity: string;
  description: string;
  flagged_by: string | null;
  resolved: boolean;
  created_at: string;
}

export interface CollectionsStats {
  totalAccounts: number;
  totalOutstanding: number;
  activeAccounts: number;
  ptpsDueThisWeek: number;
  ptpsPending: number;
  ptpsKept: number;
  ptpsBroken: number;
  bucketCounts: Record<string, number>;
  bucketAmounts: Record<string, number>;
  cureRate: number;
}

// === Hook ===

export function useCollections(bucketFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Fetch accounts
  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["collections_accounts", tenantId, bucketFilter],
    queryFn: async () => {
      let query = supabase
        .from("collections_accounts" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("dpd", { ascending: false });

      if (bucketFilter) {
        query = query.eq("bucket", bucketFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as CollectionsAccount[];
    },
    enabled: !!tenantId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("collections_accounts_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collections_accounts",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["collections_accounts", tenantId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Stats
  const stats: CollectionsStats = (() => {
    const bucketCounts: Record<string, number> = {};
    const bucketAmounts: Record<string, number> = {};
    let totalOutstanding = 0;
    let activeAccounts = 0;
    let ptpsDueThisWeek = 0;
    let ptpsPending = 0;
    let ptpsKept = 0;
    let ptpsBroken = 0;

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const acct of accounts) {
      // Bucket counts/amounts
      bucketCounts[acct.bucket] = (bucketCounts[acct.bucket] || 0) + 1;
      bucketAmounts[acct.bucket] =
        (bucketAmounts[acct.bucket] || 0) + acct.outstanding_balance;

      if (acct.status === "active") {
        activeAccounts++;
        totalOutstanding += acct.outstanding_balance;
      }

      // PTP stats
      if (acct.ptp_status === "pending") {
        ptpsPending++;
        if (acct.ptp_date) {
          const ptpDate = new Date(acct.ptp_date);
          if (ptpDate <= weekFromNow && ptpDate >= now) {
            ptpsDueThisWeek++;
          }
        }
      }
      ptpsKept += acct.ptp_kept_count || 0;
      ptpsBroken += acct.ptp_broken_count || 0;
    }

    const totalPTPs = ptpsKept + ptpsBroken;
    const cureRate = totalPTPs > 0 ? (ptpsKept / totalPTPs) * 100 : 0;

    return {
      totalAccounts: accounts.length,
      totalOutstanding,
      activeAccounts,
      ptpsDueThisWeek,
      ptpsPending,
      ptpsKept,
      ptpsBroken,
      bucketCounts,
      bucketAmounts,
      cureRate,
    };
  })();

  // Fetch contact logs for a specific account
  const useContactLogs = (accountId: string | null) =>
    useQuery({
      queryKey: ["collections_contact_log", tenantId, accountId],
      queryFn: async () => {
        if (!accountId) return [];
        const { data, error } = await supabase
          .from("collections_contact_log" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("account_id", accountId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as ContactLog[];
      },
      enabled: !!tenantId && !!accountId,
    });

  // Fetch settlements
  const useSettlements = (accountId?: string | null) =>
    useQuery({
      queryKey: ["collections_settlements", tenantId, accountId],
      queryFn: async () => {
        let query = supabase
          .from("collections_settlements" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        if (accountId) {
          query = query.eq("account_id", accountId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as unknown as Settlement[];
      },
      enabled: !!tenantId,
    });

  // Mutation: update account
  const updateAccount = useMutation({
    mutationFn: async ({
      accountId,
      updates,
    }: {
      accountId: string;
      updates: Partial<CollectionsAccount>;
    }) => {
      const { error } = await supabase
        .from("collections_accounts" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", accountId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections_accounts", tenantId],
      });
    },
  });

  // Mutation: record PTP
  const recordPTP = useMutation({
    mutationFn: async ({
      accountId,
      ptpDate,
      ptpAmount,
      paymentMethod,
    }: {
      accountId: string;
      ptpDate: string;
      ptpAmount: number;
      paymentMethod?: string;
    }) => {
      // Find account to get current ptp_count
      const acct = accounts.find((a) => a.id === accountId);
      const { error: updateErr } = await supabase
        .from("collections_accounts" as any)
        .update({
          ptp_date: ptpDate,
          ptp_amount: ptpAmount,
          ptp_status: "pending",
          ptp_count: (acct?.ptp_count || 0) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", accountId)
        .eq("tenant_id", tenantId);
      if (updateErr) throw updateErr;

      // Log contact
      const { error: logErr } = await supabase
        .from("collections_contact_log" as any)
        .insert({
          tenant_id: tenantId,
          account_id: accountId,
          channel: "manual",
          direction: "outbound",
          outcome: "ptp_secured",
          ptp_secured: true,
          ptp_date: ptpDate,
          ptp_amount: ptpAmount,
          ptp_payment_method: paymentMethod || null,
          agent_type: "human",
        } as any);
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections_accounts", tenantId],
      });
    },
  });

  // Mutation: log contact
  const logContact = useMutation({
    mutationFn: async ({
      accountId,
      channel,
      outcome,
      notes,
    }: {
      accountId: string;
      channel: string;
      outcome: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("collections_contact_log" as any)
        .insert({
          tenant_id: tenantId,
          account_id: accountId,
          channel,
          direction: "outbound",
          outcome,
          notes: notes || null,
          agent_type: "human",
        } as any);
      if (error) throw error;

      // Update account contact stats
      const acct = accounts.find((a) => a.id === accountId);
      if (acct) {
        await supabase
          .from("collections_accounts" as any)
          .update({
            total_contact_attempts: (acct.total_contact_attempts || 0) + 1,
            last_contact_date: new Date().toISOString(),
            last_contact_channel: channel,
            last_contact_outcome: outcome,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", accountId)
          .eq("tenant_id", tenantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections_accounts", tenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["collections_contact_log", tenantId],
      });
    },
  });

  return {
    accounts,
    isLoading,
    stats,
    refetch,
    updateAccount,
    recordPTP,
    logContact,
    useContactLogs,
    useSettlements,
  };
}
