import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

// Wave 2a Phase 3: status is now a configurable code (accounting_job_statuses).
// Keep legacy literals for autocomplete/back-compat while allowing the new
// 13-stage codes (client_reached, paid, chasing, …) as plain strings.
export type AccountingJobStatus =
  | "backlog" | "in_progress" | "review" | "done" | "blocked"
  | (string & {});
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
  /**
   * UK filing category — see `lib/uk-filing-categories.ts`.
   * NULL = untagged (default; existing demo jobs render as "Untagged").
   *
   * Wave 1 (2026-06-02): the column's CHECK constraint was dropped in
   * migration 38 — any text value is accepted; canonical codes are now
   * `accounting_job_types.code` per tenant. Written side-by-side with
   * `job_type_id` until Wave 2 fully migrates.
   */
  category: string | null;
  /**
   * Wave 1 FK to accounting_job_types.id — populated when the picked
   * category matches a job_type row in the tenant. NULL for legacy rows,
   * "Untagged", and tenants without job_types seeded.
   */
  job_type_id: string | null;
  /**
   * Wave 1 Phase C: separate "period covered by the job" from "statutory
   * deadline". Auto-filled by `computeJobDates` on job-type select but
   * always user-editable. NULL when not applicable (e.g. anchor='none').
   */
  period_end: string | null;
  /** Wave 1 Phase C: internal staff-only notes (free text). */
  staff_notes: string | null;
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
  /**
   * Owner filter:
   *  - undefined = all owners
   *  - 'unassigned' = owner_user_id IS NULL
   *  - <uuid> = owner_user_id = <uuid>  (use 'me' semantic at component level — translate to current user's id before passing)
   */
  ownerUserId?: string | "unassigned";
  category?: string;
  /**
   * Phase 4 (2026-06-02): per-client tasking — filter jobs to a single client_id.
   * Driven by /accounting/jobs?client=<uuid> URL param from the Clients page.
   */
  clientId?: string;
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
      if (filters.ownerUserId === "unassigned") {
        q = q.is("owner_user_id", null);
      } else if (filters.ownerUserId) {
        q = q.eq("owner_user_id", filters.ownerUserId);
      }
      if (filters.category) q = q.eq("category", filters.category);
      // Phase 4: per-client tasking filter — driven by ?client=<uuid> URL param.
      if (filters.clientId) q = q.eq("client_id", filters.clientId);

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

      const payload: Record<string, unknown> = {
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
      // Only include category if explicitly set (tolerates pre-migration state where the
      // `category` column does not yet exist; once 36-uk-filing-categories-migration.sql is
      // applied, NULL is the DB default for new rows so omitting is identical to sending null).
      if (job.category !== undefined && job.category !== null) {
        payload.category = job.category;
      }
      // Wave 1 (migration 38): write job_type_id side-by-side when picker resolves a UUID.
      // Omit when null to be migration-tolerant if a clone is rolled back to a pre-38 schema.
      if (job.job_type_id !== undefined && job.job_type_id !== null) {
        payload.job_type_id = job.job_type_id;
      }
      // Wave 1 Phase C: period_end + staff_notes. Same migration-tolerance — omit when null.
      if (job.period_end !== undefined && job.period_end !== null) {
        payload.period_end = job.period_end;
      }
      if (job.staff_notes !== undefined && job.staff_notes !== null) {
        payload.staff_notes = job.staff_notes;
      }

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

      const finalPatch: Record<string, unknown> = {
        ...patch,
        updated_by: userId,
      };

      // Strip `category` from PATCH if it's null/undefined — same migration-tolerance
      // pattern as createJob. Explicit non-null values (e.g. 'vat') pass through.
      if (patch.category === undefined || patch.category === null) {
        delete finalPatch.category;
      }
      // Wave 1: same tolerance for job_type_id. Explicit UUIDs pass through.
      if (patch.job_type_id === undefined || patch.job_type_id === null) {
        delete finalPatch.job_type_id;
      }
      // Wave 1 Phase C: tolerate undefined; explicit null clears period_end / staff_notes.
      if (patch.period_end === undefined) delete finalPatch.period_end;
      if (patch.staff_notes === undefined) delete finalPatch.staff_notes;

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
