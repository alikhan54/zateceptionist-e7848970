import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

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
      return json;
    },
    onSuccess: (json, companyNos) => {
      // Phase 3 (2026-06-02) — invalidate ALL queryKeys that surface client data
      // so the UI refetches the just-enriched rows. Previously this only invalidated
      // ["accounting_clients", ...] which never existed (real key is *_full); the
      // table didn't refresh after sync, masking the success.
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_full", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance_clients_lite", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_clients_list", tenantId] });

      const updated = (json.synced ?? 0) + (json.cached ?? 0);
      const total = companyNos.length;
      const notFound = json.not_found ?? 0;
      const failed = json.failed ?? 0;

      if (failed > 0 || notFound > 0) {
        toast({
          title: "CH sync partial",
          description: `${updated}/${total} updated; ${notFound} not found, ${failed} failed`,
          variant: notFound + failed > updated ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Companies House sync complete",
          description: `${updated} of ${total} client${total === 1 ? "" : "s"} refreshed`,
        });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast({ title: "CH sync failed", description: msg, variant: "destructive" });
    },
  });
}
