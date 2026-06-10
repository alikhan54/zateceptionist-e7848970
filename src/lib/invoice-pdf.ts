/**
 * Invoice Phase B (2026-06-10) — branded invoice PDF generator (#1877 layout).
 *
 * Renders an A4 invoice from an `accounting_invoices` row + the tenant's
 * `accounting_invoice_settings` (migration 40): navy header band with the firm's
 * white logo, firm name + meta block (date / invoice no / payment terms), BILL TO,
 * line-items table, Subtotal/Discount/VAT/Total/Balance Due, BACS-To bank block,
 * company-registration footer. Brand colours from settings (navy/green/cream
 * defaults); figures set in JetBrains Mono (vendored TTF, registered at runtime).
 *
 * Uses jspdf + jspdf-autotable (already project dependencies — no new packages).
 *
 * VAT display: `accounting_invoices.amount` stores the TOTAL inc. VAT (Phase-1 flat
 * schema, no vat-mode column). Mirroring the Edit-dialog convention ("Best-effort VAT
 * reverse: assume Standard rate"), the totals block reverses at 20% unless the caller
 * passes an explicit breakdown. Proper per-invoice VAT persists in Phase-2 line items.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AccountingInvoice } from "@/hooks/useAccountingInvoices";
import type { InvoiceSettings } from "@/hooks/useInvoiceSettings";
// Vendored font (served same-origin by vite — avoids CORS + offline-safe).
import jetbrainsMonoUrl from "@/assets/fonts/JetBrainsMono-Regular.ttf?url";

export interface InvoicePdfOptions {
  /** Explicit VAT breakdown; when absent, reverse-computes at standard 20%. */
  subtotal?: number;
  vatAmount?: number;
  vatLabel?: string;
  /** Total already paid (drives Balance Due). Default 0. */
  amountPaid?: number;
}

interface Rgb { r: number; g: number; b: number }

function hexToRgb(hex: string | null | undefined, fallback: Rgb): Rgb {
  if (!hex) return fallback;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const NAVY: Rgb = { r: 30, g: 58, b: 95 };
const GREEN: Rgb = { r: 58, g: 155, b: 62 };
const CREAM: Rgb = { r: 250, g: 246, b: 237 };
const GREY: Rgb = { r: 105, g: 112, b: 120 };

function gbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function fmtDateUK(value: string | null | undefined): string {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

let monoFontB64: string | null = null;
/** Fetch + cache the vendored JetBrains Mono TTF as base64; null on failure (fallback courier). */
async function loadMonoFont(): Promise<string | null> {
  if (monoFontB64) return monoFontB64;
  try {
    const resp = await fetch(jetbrainsMonoUrl);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    monoFontB64 = btoa(bin);
    return monoFontB64;
  } catch {
    return null;
  }
}

/** Fetch an image URL into a dataURL for jsPDF (null on failure → text fallback). */
async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Build the branded invoice PDF. Returns the jsPDF doc (caller saves or uploads).
 * Async: loads the mono font + logo (both optional — degrades gracefully).
 */
export async function buildInvoicePdf(
  invoice: AccountingInvoice,
  settings: InvoiceSettings | null,
  opts: InvoicePdfOptions = {},
): Promise<jsPDF> {
  const navy = hexToRgb(settings?.brand_primary, NAVY);
  const green = hexToRgb(settings?.brand_accent, GREEN);
  const cream = hexToRgb(settings?.brand_bg, CREAM);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();   // 210
  const pageH = doc.internal.pageSize.getHeight();  // 297
  const margin = 16;

  // Register JetBrains Mono (figures); fall back to courier.
  const monoB64 = await loadMonoFont();
  let monoFont = "courier";
  if (monoB64) {
    doc.addFileToVFS("JetBrainsMono-Regular.ttf", monoB64);
    doc.addFont("JetBrainsMono-Regular.ttf", "JetBrainsMono", "normal");
    monoFont = "JetBrainsMono";
  }

  // ---------- Header band (navy) ----------
  const bandH = 32;
  doc.setFillColor(navy.r, navy.g, navy.b);
  doc.rect(0, 0, pageW, bandH, "F");

  // White logo on the band (left)
  const logoData = settings?.logo_url ? await loadImageDataUrl(settings.logo_url) : null;
  if (logoData) {
    // source 263x209 — keep aspect ratio at 24mm height
    const logoH = 24;
    const logoW = (263 / 209) * logoH;
    doc.addImage(logoData, "PNG", margin, (bandH - logoH) / 2, logoW, logoH);
  } else if (settings?.firm_display_name) {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(settings.firm_display_name, margin, bandH / 2 + 2);
  }

  // "INVOICE" (right, white)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", pageW - margin, bandH / 2 + 3, { align: "right" });

  // ---------- Firm block (left) + meta block (right) ----------
  let y = bandH + 12;
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(settings?.firm_display_name ?? "SMARTLEDGER SOLUTIONS", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  let firmY = y + 5;
  if (settings?.firm_address) {
    for (const line of settings.firm_address.split(/\n|, ?/).slice(0, 3)) {
      doc.text(line, margin, firmY);
      firmY += 4.2;
    }
  }

  const terms = settings?.payment_terms_days ?? 30;
  const metaRows: Array<[string, string, boolean]> = [
    ["DATE", fmtDateUK(invoice.created_at), false],
    ["INVOICE NO.", invoice.invoice_no, true],
    ["PAYMENT TERMS", `Due in ${terms} days`, false],
  ];
  if (invoice.due_at) metaRows.push(["DUE DATE", fmtDateUK(invoice.due_at), false]);
  let metaY = y;
  for (const [label, value, mono] of metaRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    doc.text(label, pageW - margin - 58, metaY);
    doc.setFont(mono ? monoFont : "helvetica", mono ? "normal" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text(value, pageW - margin, metaY, { align: "right" });
    metaY += 6;
  }

  // ---------- BILL TO (cream chip) ----------
  y = Math.max(firmY, metaY) + 8;
  doc.setFillColor(cream.r, cream.g, cream.b);
  doc.roundedRect(margin, y - 5, 92, 22, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(green.r, green.g, green.b);
  doc.text("BILL TO", margin + 4, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(navy.r, navy.g, navy.b);
  doc.text(invoice.accounting_clients?.name ?? "Client", margin + 4, y + 6);
  if (invoice.accounting_clients?.contact_email) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    doc.text(invoice.accounting_clients.contact_email, margin + 4, y + 11.5);
  }

  // ---------- Line items ----------
  y += 26;
  const total = Number(invoice.amount) || 0;
  const subtotal = opts.subtotal ?? total / 1.2;
  const vatAmount = opts.vatAmount ?? total - subtotal;
  const vatLabel = opts.vatLabel ?? "VAT (20%)";
  const paid = opts.amountPaid ?? 0;
  const balanceDue = Math.max(0, total - paid);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["DESCRIPTION", "QTY", "AMOUNT", "TOTAL"]],
    body: [[
      invoice.description?.trim() || `Professional services — invoice ${invoice.invoice_no}`,
      "1",
      gbp(subtotal),
      gbp(subtotal),
    ]],
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 3, textColor: [40, 45, 50] },
    headStyles: { fillColor: [navy.r, navy.g, navy.b], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 102 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 31, halign: "right", font: monoFont },
      3: { cellWidth: 31, halign: "right", font: monoFont },
    },
    alternateRowStyles: { fillColor: [cream.r, cream.g, cream.b] },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---------- Totals (right column) ----------
  const totalsX = pageW - margin - 62;
  const rows: Array<[string, string, "normal" | "bold" | "balance"]> = [
    ["Subtotal", gbp(subtotal), "normal"],
    ["Discount", gbp(0), "normal"],
    [vatLabel, gbp(vatAmount), "normal"],
    ["Total", gbp(total), "bold"],
    ["Balance Due", gbp(balanceDue), "balance"],
  ];
  for (const [label, value, style] of rows) {
    if (style === "balance") {
      doc.setFillColor(green.r, green.g, green.b);
      doc.roundedRect(totalsX - 4, y - 4.5, 66 + 4, 8, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, totalsX, y);
      doc.setFont(monoFont, "normal");
      doc.text(value, pageW - margin, y, { align: "right" });
    } else {
      doc.setTextColor(style === "bold" ? navy.r : GREY.r, style === "bold" ? navy.g : GREY.g, style === "bold" ? navy.b : GREY.b);
      doc.setFont("helvetica", style === "bold" ? "bold" : "normal");
      doc.setFontSize(style === "bold" ? 10.5 : 9.5);
      doc.text(label, totalsX, y);
      doc.setFont(monoFont, "normal");
      doc.text(value, pageW - margin, y, { align: "right" });
    }
    y += style === "balance" ? 9 : 6.5;
  }

  // ---------- BACS block (left, aligned with totals) ----------
  let bacsY = y - rows.length * 6.5 - 2;
  if (settings?.bank_name || settings?.account_number || settings?.sort_code) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(navy.r, navy.g, navy.b);
    doc.text("BACS To:", margin, bacsY);
    bacsY += 6;
    const bacsRows: Array<[string, string | null]> = [
      ["Bank", settings?.bank_name ?? null],
      ["Account number", settings?.account_number ?? null],
      ["Sort code", settings?.sort_code ?? null],
      ["IBAN", settings?.iban ?? null],
    ];
    for (const [label, value] of bacsRows) {
      if (!value) continue;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(GREY.r, GREY.g, GREY.b);
      doc.text(`${label}:`, margin, bacsY);
      doc.setFont(monoFont, "normal");
      doc.setTextColor(navy.r, navy.g, navy.b);
      doc.text(value, margin + 34, bacsY);
      bacsY += 5.5;
    }
  }

  // ---------- Footer ----------
  doc.setFillColor(cream.r, cream.g, cream.b);
  doc.rect(0, pageH - 18, pageW, 18, "F");
  doc.setFillColor(green.r, green.g, green.b);
  doc.rect(0, pageH - 18, pageW, 1.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  const footer =
    settings?.invoice_footer ??
    (settings?.company_registration_number
      ? `Company Registration Number: ${settings.company_registration_number}`
      : "");
  if (footer) doc.text(footer, pageW / 2, pageH - 10, { align: "center" });

  return doc;
}

/** Filename helper: "Invoice-1878-AADAM-TRADERS-LIMITED.pdf" */
export function invoicePdfFilename(invoice: AccountingInvoice): string {
  const client = (invoice.accounting_clients?.name ?? "client").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40);
  const no = invoice.invoice_no.replace(/[^A-Za-z0-9-]+/g, "-");
  return `Invoice-${no}-${client}.pdf`;
}
