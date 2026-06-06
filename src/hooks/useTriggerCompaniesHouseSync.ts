import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// n8n webhook URLs are ALWAYS at /webhook/<path> — bare /<path> is NOT an alias
// (documented in CLAUDE.md). Make the URL self-healing: if VITE_N8N_WEBHOOK_URL
// is set without the /webhook segment, append it. Else fall back to the canonical
// prod URL. Phase 3 (2026-06-02) — previous version produced ".../companies-house-sync"
// without /webhook/ when the env var was set, which caused "Failed to fetch" on prod.
function buildChWebhookUrl(): string {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: { VITE_N8N_WEBHOOK_URL?: string } }).env
      : undefined;
  const base = env?.VITE_N8N_WEBHOOK_URL?.replace(/\/+$/, "");
  if (!base) return "https://webhooks.zatesystems.com/webhook/companies-house-sync";
  // If the env var already includes /webhook, just append the path; else add /webhook/.
  return /\/webhook$/.test(base)
    ? `${base}/companies-house-sync`
    : `${base}/webhook/companies-house-sync`;
}
const CH_WEBHOOK_URL = buildChWebhookUrl();

interface ChSyncResponse {
  ok: boolean;
  tenant_id?: string;
  total_attempted?: number;
  synced?: number;
  cached?: number;
  not_found?: number;
  failed?: number;
  rate_limited?: number;
  errors?: Array<{ company_no: string; error: string }>;
  error?: string;
  message?: string;
}

/**
 * Triggers the 420 Companies House Sync workflow for a list of company numbers
 * for the current tenant. Calls the n8n webhook + invalidates accounting_clients
 * queries on success so the UI re-renders enriched data.
 *
 * Requires the workflow `RCLewTLovTg1GxV4` to be activated server-side AND
 * `COMPANIES_HOUSE_API_KEY` set in the n8n container env.
 */
export function useTriggerCompaniesHouseSync() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (companyNos: string[]): Promise<ChSyncResponse> => {
      if (!tenantId) throw new Error("No tenant context");
      const cleaned = companyNos.filter((c) => !!c && c.trim() !== "");
      if (cleaned.length === 0) throw new Error("No company numbers provided");

      const resp = await fetch(CH_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          company_numbers: cleaned,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as ChSyncResponse;
      if (!resp.ok || !json.ok) {
        throw new Error(
          json.error || json.message || `Companies House sync HTTP ${resp.status}`,
        );
      }

      // Wave 2b Phase A — the webhook's synced/cached counters are cosmetic (often
      // 0 even on a successful PATCH). The SOURCE OF TRUTH is the DB column
      // companies_house_sync_status, written by the workflow before it responds.
      // Re-read it for the requested CRNs and report the real outcome so a working
      // sync no longer shows "0 refreshed".
      const wantCrns = cleaned.map((c) => c.toUpperCase());
      let dbSynced = 0, dbNotFound = 0, dbFailed = 0;
      try {
        const { data: rows } = await supabase
          .from("accounting_clients")
          .select("company_no, companies_house_sync_status")
          .eq("tenant_id", tenantId)
          .in("company_no", wantCrns);
        for (const r of (rows ?? []) as Array<{ companies_house_sync_status: string | null }>) {
          const st = r.companies_house_sync_status;
          if (st === "synced") dbSynced++;
          else if (st === "not_found") dbNotFound++;
          else if (st === "failed" || st === "rate_limited") dbFailed++;
        }
      } catch {
        /* if the read fails, fall back to webhook ok=true as success below */
      }
      return { ...json, db_synced: dbSynced, db_not_found: dbNotFound, db_failed: dbFailed, requested: cleaned.length };
    },
    onSuccess: (json, companyNos) => {
      // Invalidate every queryKey that surfaces client data so the UI refetches
      // the just-enriched rows (no manual refresh).
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance_clients_lite", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });

      // Wave 2b Phase A — toast from DB sync_status, not cosmetic counters.
      const total = companyNos.length;
      const r = json as ChSyncResponse & { db_synced?: number; db_not_found?: number; db_failed?: number };
      const synced = r.db_synced ?? 0;
      const notFound = r.db_not_found ?? 0;
      const failed = r.db_failed ?? 0;

      if (notFound > 0 || failed > 0) {
        toast({
          title: "Companies House sync partial",
          description: `${synced}/${total} updated${notFound ? `; ${notFound} not found on CH` : ""}${failed ? `; ${failed} failed` : ""}`,
          variant: notFound + failed > synced ? "destructive" : "default",
        });
      } else {
        // ok=true with no not_found/failed → success. If the DB read returned
        // nothing (e.g. timing), still report success since the webhook returned ok.
        const n = synced || total;
        toast({
          title: "Companies House sync complete",
          description: `${n} client${n === 1 ? "" : "s"} refreshed from Companies House`,
        });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast({ title: "CH sync failed", description: msg, variant: "destructive" });
    },
  });
}
