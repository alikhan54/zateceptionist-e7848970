import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, N8N_WEBHOOK_BASE } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { AccountingInvoice } from "@/hooks/useAccountingInvoices";
import type { InvoiceSettings } from "@/hooks/useInvoiceSettings";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
import { renderInvoiceEmailHtml, PDF_LINK_TTL_SECONDS } from "@/lib/invoice-email";

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

/**
 * Upload the branded PDF to the PRIVATE `invoices` bucket (tenant-scoped storage RLS,
 * migration 40) and return a signed download URL + storage path. Returns nulls on any
 * failure — the email then goes out without the link (send must not be blocked by
 * storage hiccups).
 */
async function uploadInvoicePdf(
  invoice: AccountingInvoice,
  settings: InvoiceSettings | null,
  tenantId: string,
): Promise<{ url: string | null; path: string | null }> {
  try {
    const doc = await buildInvoicePdf(invoice, settings);
    const blob = doc.output("blob");
    const path = `${tenantId}/${invoice.id}/${invoicePdfFilename(invoice)}`;
    const { error: upErr } = await supabase.storage
      .from("invoices")
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) return { url: null, path: null };
    const { data: signed, error: signErr } = await supabase.storage
      .from("invoices")
      .createSignedUrl(path, PDF_LINK_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) return { url: null, path };
    return { url: signed.signedUrl, path };
  } catch {
    return { url: null, path: null };
  }
}

export function useSendInvoice(settings?: InvoiceSettings | null) {
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

      // 2. Generate + upload the branded PDF (Phase B); best-effort — null link on failure.
      const pdf = await uploadInvoicePdf(invoice, settings ?? null, tenantId);

      // 3. Render the BRANDED HTML email body (Phase B — replaces plain text).
      const companyName = tenantConfig.company_name ?? "Smart Ledger Solutions Ltd";
      const body = renderInvoiceEmailHtml(invoice, settings ?? null, pdf.url, companyName, mailbox);
      const subject = `Invoice ${invoice.invoice_no} from ${settings?.firm_display_name ?? companyName}`;

      // 4. Enqueue to Communication v3.8 (mechanics unchanged — sacred workflow, never modified)
      // CRITICAL contracts (verified against ENQUEUE.2/ENQUEUE.4, 2026-06-10):
      //  - message_queue.tenant_id is UUID (tenant_config.id), NOT slug
      //  - the webhook reads `params` (NOT `message_params`) into message_queue.message_params
      //  - a TOP-LEVEL `subject` is parsed but never inserted — subject must ride INSIDE params
      // The email-delivery-service reads params.subject / params.content_type /
      // params.mailbox_used / params.workflow_type; the FE delivery-status hook keys
      // off params.invoice_id.
      const enqResp = await fetch(`${N8N_WEBHOOK_BASE}/queue/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantConfig.id,
          channel: "email",
          recipient_identifier: recipient,
          recipient_name: invoice.accounting_clients?.name ?? null,
          message_content: body,
          priority: 5,
          scheduled_at: new Date().toISOString(),
          max_attempts: 3,
          source: "smart_ledger_invoice_send",
          source_module: "accounting",
          workflow: "D7-C Invoices UI",
          params: {
            subject,
            invoice_id: invoice.id,
            workflow_type: "invoice",
            mailbox_used: mailbox,
            content_type: "html",
            pdf_url: pdf.url,
            pdf_storage_path: pdf.path,
          },
        }),
      });
      const enqJson = (await enqResp.json()) as EnqueueResponse;
      if (!enqResp.ok || !enqJson.success) {
        throw new Error(
          enqJson.error || enqJson.message || `Enqueue HTTP ${enqResp.status}`,
        );
      }

      // 5. Update invoice: status=sent, sent_at=now, sent_via_mailbox + persist pdf_url
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const { error: updErr } = await supabase
        .from("accounting_invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_via_mailbox: mailbox,
          pdf_url: pdf.url,
          updated_by: userId,
        } as never)
        .eq("id", invoice.id)
        .eq("tenant_id", tenantId);
      if (updErr) throw updErr;

      return { mailbox, queueId: enqJson.queue_id, pdfUrl: pdf.url };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });
}
