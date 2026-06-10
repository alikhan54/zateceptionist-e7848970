/**
 * Invoice Phase B (2026-06-10) — branded invoice email renderer (pure; no side effects).
 * Extracted from useSendInvoice so it can be unit-exercised + reviewed standalone.
 */
import type { AccountingInvoice } from "@/hooks/useAccountingInvoices";
import type { InvoiceSettings } from "@/hooks/useInvoiceSettings";

/** Signed-URL lifetime for the emailed PDF link: 60 days (client has ample time to download). */
export const PDF_LINK_TTL_SECONDS = 60 * 24 * 60 * 60;

function gbp(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function fmtDateUK(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Invoice Phase B (2026-06-10) — BRANDED HTML invoice email (replaces the plain-text
 * body that claimed an attachment it didn't have). Navy header with the firm logo,
 * invoice meta, a green "Download invoice (PDF)" button (secure signed link), the
 * BACS payment block, and the company-registration footer. Inline CSS only
 * (email-client-safe). Settings absent → sensible navy/green/cream defaults.
 */
export function renderInvoiceEmailHtml(
  invoice: AccountingInvoice,
  settings: InvoiceSettings | null,
  pdfUrl: string | null,
  companyName: string,
  fromMailbox: string,
): string {
  const navy = settings?.brand_primary ?? "#1e3a5f";
  const green = settings?.brand_accent ?? "#3a9b3e";
  const cream = settings?.brand_bg ?? "#faf6ed";
  const firm = settings?.firm_display_name ?? companyName;
  const clientName = invoice.accounting_clients?.name ?? "Client";
  const amt = gbp(Number(invoice.amount) || 0, invoice.currency || "GBP");
  const terms = settings?.payment_terms_days;
  const dueLine = invoice.due_at
    ? `due on <strong>${fmtDateUK(invoice.due_at)}</strong>`
    : terms
      ? `due in <strong>${terms} days</strong>`
      : "due on receipt";
  // Email header band is navy → the white logo (settings.logo_url) renders correctly on it.
  const headerLogo = settings?.logo_url ?? null;

  const bacs =
    settings?.bank_name || settings?.account_number || settings?.sort_code
      ? `<table cellspacing="0" cellpadding="0" border="0" style="background:${cream};border-radius:8px;margin:20px 0 0;width:100%;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#333;line-height:1.7;">
            <strong style="color:${navy};">BACS payment details</strong><br>
            ${settings?.bank_name ? `Bank: <strong>${settings.bank_name}</strong><br>` : ""}
            ${settings?.account_number ? `Account number: <strong style="font-family:Consolas,Menlo,monospace;">${settings.account_number}</strong><br>` : ""}
            ${settings?.sort_code ? `Sort code: <strong style="font-family:Consolas,Menlo,monospace;">${settings.sort_code}</strong><br>` : ""}
            ${settings?.iban ? `IBAN: <strong style="font-family:Consolas,Menlo,monospace;">${settings.iban}</strong>` : ""}
          </td></tr>
        </table>`
      : "";

  const button = pdfUrl
    ? `<table cellspacing="0" cellpadding="0" border="0" style="margin:22px auto;"><tr>
        <td style="background:${green};border-radius:6px;">
          <a href="${pdfUrl}" target="_blank"
             style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
            Download invoice (PDF)
          </a>
        </td></tr></table>
        <p style="font-size:11px;color:#888;text-align:center;margin:0 0 6px;">
          If the button doesn't work, copy this link:<br>
          <a href="${pdfUrl}" style="color:${navy};word-break:break-all;font-size:10px;">${pdfUrl}</a>
        </p>`
    : "";

  const footer =
    settings?.invoice_footer ??
    (settings?.company_registration_number
      ? `Company Registration Number: ${settings.company_registration_number}`
      : "");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${cream};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;">
  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:28px 0;"><tr><td align="center">
    <table cellspacing="0" cellpadding="0" border="0" width="600" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.07);">
      <tr><td style="background:${navy};padding:22px 32px;" align="center">
        ${headerLogo ? `<img src="${headerLogo}" alt="${firm}" height="56" style="height:56px;display:inline-block;" />` : `<span style="color:#fff;font-size:20px;font-weight:bold;letter-spacing:1px;">${firm}</span>`}
      </td></tr>
      <tr><td style="padding:30px 32px 10px;">
        <h1 style="margin:0 0 14px;font-size:21px;color:${navy};">Invoice ${invoice.invoice_no}</h1>
        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 8px;">Dear ${clientName},</p>
        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px;">
          Your invoice <strong>${invoice.invoice_no}</strong> from <strong>${firm}</strong> for
          <strong style="font-family:Consolas,Menlo,monospace;">${amt}</strong> is ready — ${dueLine}.
        </p>
        ${invoice.description ? `<p style="font-size:13px;color:#666;background:${cream};border-left:3px solid ${green};padding:10px 14px;margin:0 0 6px;">${invoice.description}</p>` : ""}
        ${button}
        ${bacs}
        <p style="font-size:14px;color:#444;line-height:1.6;margin:20px 0 0;">
          If you have any questions, just reply to this email.<br><br>
          Kind regards,<br><strong>${firm}</strong><br>
          <span style="font-size:12px;color:#888;">${fromMailbox}</span>
        </p>
      </td></tr>
      <tr><td style="background:${cream};border-top:3px solid ${green};padding:14px 32px;text-align:center;font-size:11px;color:#777;">
        ${footer}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

