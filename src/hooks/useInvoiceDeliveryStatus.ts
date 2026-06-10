import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Email-delivery-layer v1 (2026-06-10) — per-invoice delivery status for the FE.
 *
 * Reads the tenant's invoice-send rows from `message_queue` (RLS: the existing
 * "Tenant isolation" policy matches tenant_id = get_user_tenant_uuid(), so the
 * authenticated FE sees only its own rows). Rows are produced by useSendInvoice
 * (`source='smart_ledger_invoice_send'`, `message_params.invoice_id`) and delivered
 * by the email-delivery-service (:8131), which stamps status + metadata.delivery
 * (message_id, smtp_response, mailbox_used).
 *
 * Lifecycle surfaced: pending/processing → "queued"/"sending", sent → "sent"
 * (+ SMTP message-id), failed → "failed" (+ error). metadata.delivery.bounced
 * (Phase-2 DSN reconciliation) → "bounced".
 */
export type DeliveryState = "queued" | "sending" | "sent" | "failed" | "bounced";

export interface InvoiceDelivery {
  invoiceId: string;
  state: DeliveryState;
  messageId: string | null;
  mailbox: string | null;
  error: string | null;
  sentAt: string | null;
  attempts: number;
}

interface QueueRow {
  id: string;
  status: string;
  attempts: number;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  message_params: { invoice_id?: string } | string | null;
  metadata: { delivery?: { message_id?: string; mailbox_used?: string; bounced?: boolean } } | string | null;
}

/** Comm v3.8's ENQUEUE.2 JSON.stringify()s params before insert, so jsonb values are
 * often double-encoded STRINGS. Normalize either shape to an object. */
function asObject<T>(v: T | string | null): T | Record<string, never> {
  if (v == null) return {};
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return p && typeof p === "object" ? (p as T) : {};
    } catch {
      return {};
    }
  }
  return v as T;
}

function toState(row: QueueRow, delivery: { bounced?: boolean }): DeliveryState {
  if (delivery.bounced) return "bounced";
  if (row.status === "sent") return "sent";
  if (row.status === "failed") return "failed";
  if (row.status === "processing") return "sending";
  return "queued"; // pending / anything else pre-terminal
}

export function useInvoiceDeliveryStatus() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["invoice_delivery_status", tenantUuid],
    enabled: !!tenantUuid,
    refetchInterval: 20_000, // delivery resolves within ~1 poll tick (15s)
    queryFn: async (): Promise<Record<string, InvoiceDelivery>> => {
      const { data, error } = await supabase
        .from("message_queue")
        .select("id, status, attempts, sent_at, error_message, created_at, message_params, metadata")
        .eq("tenant_id", tenantUuid as string)
        .eq("channel", "email")
        .eq("source", "smart_ledger_invoice_send")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const byInvoice: Record<string, InvoiceDelivery> = {};
      for (const r of (data ?? []) as unknown as QueueRow[]) {
        const params = asObject<{ invoice_id?: string }>(r.message_params);
        const meta = asObject<{ delivery?: { message_id?: string; mailbox_used?: string; bounced?: boolean } }>(r.metadata);
        const delivery = meta.delivery ?? {};
        const invoiceId = params.invoice_id;
        if (!invoiceId || byInvoice[invoiceId]) continue; // newest row per invoice wins
        byInvoice[invoiceId] = {
          invoiceId,
          state: toState(r, delivery),
          messageId: delivery.message_id ?? null,
          mailbox: delivery.mailbox_used ?? null,
          error: r.error_message,
          sentAt: r.sent_at,
          attempts: r.attempts,
        };
      }
      return byInvoice;
    },
  });

  // Realtime nudge: queue-row changes for this tenant refresh the map.
  useEffect(() => {
    if (!tenantUuid) return;
    const channel = supabase
      .channel(`invoice_delivery_${tenantUuid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_queue", filter: `tenant_id=eq.${tenantUuid}` },
        () => queryClient.invalidateQueries({ queryKey: ["invoice_delivery_status", tenantUuid] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, queryClient]);

  return query;
}
