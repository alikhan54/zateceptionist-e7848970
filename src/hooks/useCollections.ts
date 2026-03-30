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

export interface CollectionsPTP {
  id: string;
  tenant_id: string;
  account_id: string;
  promised_amount: number;
  promised_date: string;
  promised_method: string | null;
  status: string;
  actual_amount: number | null;
  actual_date: string | null;
  follow_up_date: string | null;
  broken_count: number;
  agent_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BucketConfig {
  id: string;
  tenant_id: string;
  bucket: string;
  dpd_min: number;
  dpd_max: number;
  max_daily_calls: number;
  max_daily_sms: number;
  max_daily_email: number;
  max_daily_whatsapp: number;
  settlement_authority: string;
  settlement_max_discount: number | null;
  ai_mode: string;
  call_start_hour: number;
  call_end_hour: number;
  friday_restricted: boolean;
  escalation_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface CollectionsKPI {
  id: string;
  tenant_id: string;
  kpi_date: string;
  agent_id: string | null;
  agent_name: string | null;
  total_calls: number;
  connected_calls: number;
  right_party_contacts: number;
  ptps_secured: number;
  ptps_amount: number;
  ptps_kept: number;
  ptps_broken: number;
  settlements_offered: number;
  settlements_accepted: number;
  settlements_amount: number;
  payments_collected: number;
  payments_amount: number;
  contact_rate: number | null;
  ptp_rate: number | null;
  pkr: number | null;
  cure_rate: number | null;
  created_at: string;
}

export interface ComplianceRule {
  id: string;
  tenant_id: string;
  rule_code: string;
  regulation: string;
  rule_type: string;
  description: string;
  rule_config: Record<string, any>;
  severity: string;
  is_active: boolean;
  created_at: string;
}

export interface FieldVisit {
  id: string;
  tenant_id: string;
  account_id: string;
  visit_date: string;
  address: string | null;
  agent: string | null;
  status: string;
  result: string | null;
  amount_collected: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  photos: string[] | null;
  notes: string | null;
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

  // Fetch PTPs for an account
  const usePTPs = (accountId: string | null) =>
    useQuery({
      queryKey: ["collections_ptp", tenantId, accountId],
      queryFn: async () => {
        if (!accountId) return [];
        const { data, error } = await supabase
          .from("collections_ptp" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("account_id", accountId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as CollectionsPTP[];
      },
      enabled: !!tenantId && !!accountId,
    });

  // Fetch bucket configuration
  const useBucketConfig = () =>
    useQuery({
      queryKey: ["collections_bucket_config", tenantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("collections_bucket_config" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .order("dpd_min", { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as BucketConfig[];
      },
      enabled: !!tenantId,
    });

  // Fetch KPIs
  const useKPIs = (days: number = 30) =>
    useQuery({
      queryKey: ["collections_kpis", tenantId, days],
      queryFn: async () => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const { data, error } = await supabase
          .from("collections_kpis" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("kpi_date", since.toISOString().split("T")[0])
          .order("kpi_date", { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as CollectionsKPI[];
      },
      enabled: !!tenantId,
    });

  // Fetch compliance rules
  const useComplianceRules = () =>
    useQuery({
      queryKey: ["collections_compliance_rules", tenantId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("collections_compliance_rules" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .order("rule_code", { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as ComplianceRule[];
      },
      enabled: !!tenantId,
    });

  // Fetch field visits for an account
  const useFieldVisits = (accountId: string | null) =>
    useQuery({
      queryKey: ["collections_field_visits", tenantId, accountId],
      queryFn: async () => {
        if (!accountId) return [];
        const { data, error } = await supabase
          .from("collections_field_visits" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("account_id", accountId)
          .order("visit_date", { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as FieldVisit[];
      },
      enabled: !!tenantId && !!accountId,
    });

  // Fetch compliance log events
  const useComplianceLogs = (accountId?: string | null) =>
    useQuery({
      queryKey: ["collections_compliance_log", tenantId, accountId],
      queryFn: async () => {
        let query = supabase
          .from("collections_compliance_log" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });
        if (accountId) {
          query = query.eq("account_id", accountId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as unknown as ComplianceLog[];
      },
      enabled: !!tenantId,
    });

  // Mutation: create PTP record in new collections_ptp table
  const createPTP = useMutation({
    mutationFn: async ({
      accountId,
      promisedAmount,
      promisedDate,
      promisedMethod,
      agentName,
      notes,
    }: {
      accountId: string;
      promisedAmount: number;
      promisedDate: string;
      promisedMethod?: string;
      agentName?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("collections_ptp" as any).insert({
        tenant_id: tenantId,
        account_id: accountId,
        promised_amount: promisedAmount,
        promised_date: promisedDate,
        promised_method: promisedMethod || null,
        status: "pending",
        agent_name: agentName || null,
        notes: notes || null,
        broken_count: 0,
      } as any);
      if (error) throw error;

      // Also update inline PTP on the account
      const acct = accounts.find((a) => a.id === accountId);
      await supabase
        .from("collections_accounts" as any)
        .update({
          ptp_date: promisedDate,
          ptp_amount: promisedAmount,
          ptp_status: "pending",
          ptp_count: (acct?.ptp_count || 0) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", accountId)
        .eq("tenant_id", tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections_accounts", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["collections_ptp", tenantId] });
    },
  });

  // Mutation: create settlement
  const createSettlement = useMutation({
    mutationFn: async ({
      accountId,
      settledAmount,
      discountPercent,
      offeredBy,
      expiryDate,
      notes,
    }: {
      accountId: string;
      settledAmount: number;
      discountPercent?: number;
      offeredBy?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      const acct = accounts.find((a) => a.id === accountId);
      const { error } = await supabase
        .from("collections_settlements" as any)
        .insert({
          tenant_id: tenantId,
          account_id: accountId,
          original_outstanding: acct?.outstanding_balance || 0,
          settled_amount: settledAmount,
          discount_percent: discountPercent || null,
          offered_by: offeredBy || null,
          status: "pending_approval",
          offer_date: new Date().toISOString().split("T")[0],
          expiry_date: expiryDate || null,
        } as any);
      if (error) throw error;

      // Update account settlement status
      await supabase
        .from("collections_accounts" as any)
        .update({
          settlement_status: "pending_approval",
          settlement_amount: settledAmount,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", accountId)
        .eq("tenant_id", tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections_accounts", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["collections_settlements", tenantId] });
    },
  });

  // Mutation: approve settlement
  const approveSettlement = useMutation({
    mutationFn: async ({
      settlementId,
      approvedBy,
      authorityLevel,
    }: {
      settlementId: string;
      approvedBy: string;
      authorityLevel: string;
    }) => {
      const { error } = await supabase
        .from("collections_settlements" as any)
        .update({
          status: "approved",
          approved_by: approvedBy,
          authority_level: authorityLevel,
        } as any)
        .eq("id", settlementId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections_settlements", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["collections_accounts", tenantId] });
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
    usePTPs,
    useBucketConfig,
    useKPIs,
    useComplianceRules,
    useFieldVisits,
    useComplianceLogs,
    createPTP,
    createSettlement,
    approveSettlement,
  };
}
