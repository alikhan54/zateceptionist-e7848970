import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type AccountingJobStatus = "backlog" | "in_progress" | "review" | "done" | "blocked";
export type AccountingJobPriority = "urgent" | "high" | "medium" | "low";

export interface AccountingJobChecklistItem {
  label: string;
  done: boolean;
}

export interface AccountingJob {
  id: string;
  tenant_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: AccountingJobStatus;
  priority: AccountingJobPriority;
  owner_user_id: string | null;
  deadline: string | null;
  completed_at: string | null;
  checklist: AccountingJobChecklistItem[] | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  accounting_clients?: { name: string } | null;
}

export interface UseAccountingJobsFilters {
  status?: AccountingJobStatus;
  priority?: AccountingJobPriority;
  searchTerm?: string;
}

export function useAccountingJobs(filters: UseAccountingJobsFilters = {}) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["accounting_jobs", tenantId, filters],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("accounting_jobs")
        .select("*, accounting_clients(name)")
        .eq("tenant_id", tenantId as string);

      if (filters.status) q = q.eq("status", filters.status);
      if (filters.priority) q = q.eq("priority", filters.priority);
      if (filters.searchTerm) q = q.ilike("title", `%${filters.searchTerm}%`);

      // Open jobs first (alphabetically 'backlog' < 'blocked' < 'done' — ordering by deadline takes precedence)
      // Deadline asc with nulls last so dated work bubbles up; done jobs sink via secondary sort
      q = q
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      return (data ?? []) as unknown as AccountingJob[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`accounting_jobs_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounting_jobs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounting_jobs", tenantId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const createJob = useMutation({
    mutationFn: async (job: Partial<AccountingJob>) => {
      if (!tenantId) throw new Error("No tenant context — cannot create job");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const payload = {
        tenant_id: tenantId,
        title: job.title,
        description: job.description ?? null,
        client_id: job.client_id ?? null,
        status: (job.status ?? "backlog") as AccountingJobStatus,
        priority: (job.priority ?? "medium") as AccountingJobPriority,
        owner_user_id: job.owner_user_id ?? userId,
        deadline: job.deadline ?? null,
        checklist: job.checklist ?? null,
        created_by: userId,
        updated_by: userId,
      };

      const { data, error: insErr } = await supabase
        .from("accounting_jobs")
        .insert(payload as never)
        .select("*, accounting_clients(name)")
        .single();
      if (insErr) throw insErr;
      return data as unknown as AccountingJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_jobs", tenantId] });
    },
  });

  const updateJob = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountingJob> }) => {
      if (!tenantId) throw new Error("No tenant context — cannot update job");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const finalPatch: Partial<AccountingJob> & { updated_by: string | null } = {
        ...patch,
        updated_by: userId,
      };

      // Auto-stamp completed_at when transitioning to done; clear when reopened
      if (patch.status === "done") {
        finalPatch.completed_at = new Date().toISOString();
      } else if (patch.status && patch.status !== "done") {
        finalPatch.completed_at = null;
      }

      const { data, error: updErr } = await supabase
        .from("accounting_jobs")
        .update(finalPatch as never)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*, accounting_clients(name)")
        .single();
      if (updErr) throw updErr;
      return data as unknown as AccountingJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_jobs", tenantId] });
    },
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context — cannot delete job");
      const { error: delErr } = await supabase
        .from("accounting_jobs")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_jobs", tenantId] });
    },
  });

  return { jobs, isLoading, error, refetch, createJob, updateJob, deleteJob };
}
