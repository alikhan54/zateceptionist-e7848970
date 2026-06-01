import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { buildReminderSchedule } from "@/lib/reminder-cadence";

/**
 * Wave 1 Phase F — bulk-enroll a job's deadline-reminder cadence into
 * `accounting_reminders`. The UK Reminders Engine workflow (n8n
 * iuCAelOlyPluKdHg) picks the rows up automatically via REM.4 + REM.7
 * (which already has a `target_type='job'` branch) — no n8n edit needed.
 *
 * Idempotency: before INSERTing, we check whether any pending/sent
 * reminder exists for the (tenant_id, target_type='job', target_id=jobId)
 * triple. If yes, we skip the whole enrollment — re-saving a job won't
 * spawn duplicates. The decision to overwrite-on-deadline-change is
 * Wave 2 (would need cancel+re-enroll); Wave 1 enrolls once on create.
 *
 * Cadence is hardcoded (T-30 → every 4 days to T-7 → every 2 days in
 * final week → T-0) per Wave-1 decision #5. Per-job-type custom cadences
 * are Wave 2.
 */
export interface ScheduleJobRemindersArgs {
  jobId: string;
  deadline: string | Date | null;
  channel?: "email" | "sms" | "whatsapp" | "voice";
  workflowType?: string; // SMTP mailbox routing key (e.g. 'accounts', 'vat')
}

export interface ScheduleJobRemindersResult {
  inserted: number;
  skipped_existing: boolean;
  skipped_reason?: string;
  fire_dates_iso: string[];
}

export function useScheduleJobReminders() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ScheduleJobRemindersArgs): Promise<ScheduleJobRemindersResult> => {
      if (!tenantId) throw new Error("No tenant context — cannot schedule reminders");

      const channel = args.channel ?? "email";
      const workflow_type = args.workflowType ?? "accounts";

      // Build the planned cadence (filtered to future only).
      const planned = buildReminderSchedule(args.deadline);
      if (planned.length === 0) {
        return { inserted: 0, skipped_existing: false, skipped_reason: "no_deadline_or_past", fire_dates_iso: [] };
      }

      // Idempotency: existing pending or sent reminders for this job ⇒ skip.
      const { data: existing, error: existErr } = await supabase
        .from("accounting_reminders")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("target_type", "job")
        .eq("target_id", args.jobId)
        .in("status", ["pending", "sent"]);
      if (existErr) throw existErr;
      if ((existing ?? []).length > 0) {
        return {
          inserted: 0,
          skipped_existing: true,
          skipped_reason: `already enrolled (${(existing ?? []).length} existing pending/sent)`,
          fire_dates_iso: [],
        };
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const rows = planned.map((p) => ({
        tenant_id: tenantId,
        target_type: "job" as const,
        target_id: args.jobId,
        channel,
        workflow_type,
        scheduled_for: p.scheduled_for.toISOString(),
        status: "pending" as const,
        attempt_count: 0,
        created_by: userId,
        updated_by: userId,
      }));

      const { data, error: insErr } = await supabase
        .from("accounting_reminders")
        .insert(rows as never)
        .select("id, scheduled_for");
      if (insErr) throw insErr;

      return {
        inserted: (data ?? []).length,
        skipped_existing: false,
        fire_dates_iso: (data ?? []).map((r) => (r as { scheduled_for: string }).scheduled_for),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_reminders", tenantId] });
    },
  });
}
