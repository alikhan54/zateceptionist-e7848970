import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, N8N_WEBHOOK_BASE } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { AccountingInvoice } from "@/hooks/useAccountingInvoices";

interface SmtpRouterResponse {
  ok: boolean;
  email_address?: string;
  sending_account_id?: string;
  smtp_host?: string;
  smtp_user?: string;
  smtp_pass_encrypted?: string;
  fallback_used?: string | null;
  error?: string;
  message?: string;
}

interface EnqueueResponse {
  success?: boolean;
  queue_id?: string;
  error?: string;
  message?: string;
}

function renderInvoiceEmail(invoice: AccountingInvoice, fromMailbox: string, companyName: string): string {
  const amt = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: invoice.currency || "GBP",
  }).format(Number(invoice.amount) || 0);
  const due = invoice.due_at ?? "the date listed";
  const clientName = invoice.accounting_clients?.name ?? "Client";

  return [
    `Dear ${clientName},`,
    ``,
    `Please find attached invoice ${invoice.invoice_no} for ${amt}, due on ${due}.`,
    ``,
    invoice.description ? `Notes: ${invoice.description}` : "",
    ``,
    `If you have any questions, please reply to this email.`,
    ``,
    `Kind regards,`,
    companyName || "Smart Ledger Solutions Ltd",
    fromMailbox,
  ]
    .filter(Boolean)
    .join("\n");
}

export function useSendInvoice() {
  const { tenantId, tenantConfig } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: AccountingInvoice) => {
      if (!tenantId) throw new Error("No tenant context");
      if (!tenantConfig?.id) throw new Error("Tenant config not loaded");
      const recipient = invoice.accounting_clients?.contact_email;
      if (!recipient) {
        throw new Error("Client has no contact email — cannot send invoice");
      }

      // 1. SMTP router lookup (workflow_type='invoice'; falls back to primary if not configured)
      const smtpResp = await fetch(`${N8N_WEBHOOK_BASE}/get-sending-account-by-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          workflow_type: "invoice",
          strict_routing: false,
        }),
      });
      const smtpJson = (await smtpResp.json()) as SmtpRouterResponse;
      if (!smtpResp.ok || !smtpJson.ok || !smtpJson.email_address) {
        throw new Error(
          smtpJson.error || smtpJson.message || `SMTP router HTTP ${smtpResp.status}`,
        );
      }
      const mailbox = smtpJson.email_address;

      // 2. Render email body
      const body = renderInvoiceEmail(
        invoice,
        mailbox,
        tenantConfig.company_name ?? "Smart Ledger Solutions Ltd",
      );
      const subject = `Invoice ${invoice.invoice_no} from ${tenantConfig.company_name ?? "Smart Ledger"}`;

      // 3. Enqueue to Communication v3.8
      // CRITICAL: message_queue.tenant_id is UUID (FK to tenant_config.id), NOT slug
      const enqResp = await fetch(`${N8N_WEBHOOK_BASE}/queue/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantConfig.id,
          channel: "email",
          recipient_identifier: recipient,
          recipient_name: invoice.accounting_clients?.name ?? null,
          message_content: body,
          subject,
          priority: 5,
          scheduled_at: new Date().toISOString(),
          max_attempts: 3,
          source: "smart_ledger_invoice_send",
          source_module: "accounting",
          workflow: "D7-C Invoices UI",
          message_params: { invoice_id: invoice.id, mailbox_used: mailbox },
        }),
      });
      const enqJson = (await enqResp.json()) as EnqueueResponse;
      if (!enqResp.ok || !enqJson.success) {
        throw new Error(
          enqJson.error || enqJson.message || `Enqueue HTTP ${enqResp.status}`,
        );
      }

      // 4. Update invoice: status=sent, sent_at=now, sent_via_mailbox=mailbox
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const { error: updErr } = await supabase
        .from("accounting_invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_via_mailbox: mailbox,
          updated_by: userId,
        } as never)
        .eq("id", invoice.id)
        .eq("tenant_id", tenantId);
      if (updErr) throw updErr;

      return { mailbox, queueId: enqJson.queue_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });
}
