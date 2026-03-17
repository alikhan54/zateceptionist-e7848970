/**
 * Construction Estimation — Export Utilities
 * Phase 7E-B: Browser-side file generation from n8n export JSON
 *
 * Supports: XLSX (quantities + cost sheet), PDF (qualification + color-coded), CSV
 * Uses: SheetJS (xlsx), jsPDF + jspdf-autotable
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ────────────────────────────────────────────────────────────

export interface ExportTradeGroup {
  trade: string;
  items: ExportItem[];
}

export interface ExportItem {
  room_name?: string;
  room_number?: string;
  surface_type?: string;
  material_tag?: string;
  material_name?: string;
  net_area_sqft?: number;
  waste_factor_pct?: number;
  total_quantity_with_waste?: number;
  linear_ft?: number;
  piece_count?: number;
  unit_of_measure?: string;
  unit_price?: number;
  total_material_cost?: number;
  labor_rate_per_unit?: number;
  total_labor_cost?: number;
  trade?: string;
}

export interface ExportData {
  project_name: string;
  project_number?: string;
  client_name?: string;
  columns: string[];
  groups: ExportTradeGroup[];
  totals?: Record<string, number>;
  qualification?: {
    assumptions?: string;
    exclusions?: string;
    clarifications?: string;
    notes?: string;
  };
}

// ── Trade Colors (for color-coded PDF) ──────────────────────────────

const TRADE_COLORS: Record<string, [number, number, number]> = {
  tile: [66, 133, 244],
  flooring: [66, 133, 244],
  epoxy: [234, 67, 53],
  stone: [251, 188, 4],
  concrete_coating: [52, 168, 83],
  terrazzo: [153, 102, 204],
  carpet: [255, 152, 0],
  lvt: [0, 172, 193],
  resilient: [0, 172, 193],
  hardwood: [121, 85, 72],
  wood: [121, 85, 72],
  wallcovering: [156, 39, 176],
  paint: [33, 150, 243],
  base: [96, 125, 139],
  accessory: [120, 144, 156],
  default: [158, 158, 158],
};

function getTradeColor(trade: string): [number, number, number] {
  return TRADE_COLORS[trade.toLowerCase().replace(/\s+/g, "_")] || TRADE_COLORS.default;
}

// ── Utility: trigger file download ──────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 1. Quantities XLSX (14-column Cava format) ─────────────────────

export function exportQuantitiesXlsx(data: ExportData, filename?: string) {
  const wb = XLSX.utils.book_new();
  const title = `${new Date().toLocaleDateString()}-${data.project_name}-Takeoff - Proposal`;

  // 14-column headers matching Cava Pflugerville format
  const headers = [
    "Floor", "Area", "Item Name", "Trade", "Description",
    "Vendor", "VendorSku", "Unit", "Qty", "Labor",
    "Taxable", "Net Area", "Waste Add-on", "Extra Info",
  ];

  // Flatten all groups into one sheet sorted by trade
  const dataRows: (string | number)[][] = [];
  for (const group of data.groups) {
    for (const item of group.items) {
      const wastePct = item.waste_factor_pct || 0;
      dataRows.push([
        "1", // Floor (default 1 if not available)
        `${item.room_name || ""} ${item.room_number || ""}`.trim() || "Unknown",
        item.material_name || item.material_tag || "",
        (item.trade || group.trade || "").replace(/_/g, " "),
        (item.surface_type || "").toUpperCase(),
        "", // Vendor
        "", // VendorSku
        item.unit_of_measure || "SF",
        item.total_quantity_with_waste || 0,
        "Yes",
        (item.trade || group.trade) === "accessory" ? "No" : "Yes",
        item.net_area_sqft || 0,
        wastePct > 1 ? wastePct / 100 : wastePct, // Normalize to decimal
        item.piece_count ? `${item.piece_count} pcs` : "",
      ]);
    }
  }

  const wsData = [
    [title],    // Row 1: title
    [],         // Row 2: blank
    headers,    // Row 3: headers
    ...dataRows // Row 4+: data
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 6 },  { wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 6 },  { wch: 10 }, { wch: 6 },
    { wch: 8 },  { wch: 10 }, { wch: 12 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Quantities");

  // Also add per-trade sheets for detailed view
  for (const group of data.groups) {
    const rows = group.items.map((item) => ({
      Room: item.room_name || "",
      "Room #": item.room_number || "",
      Surface: item.surface_type || "",
      Material: item.material_name || item.material_tag || "",
      "Net Area": item.net_area_sqft || 0,
      "Waste %": item.waste_factor_pct || 0,
      "Total Qty": item.total_quantity_with_waste || 0,
      UOM: item.unit_of_measure || "SF",
      "Unit Price": item.unit_price || 0,
      "Material Cost": item.total_material_cost || 0,
      "Labor Rate": item.labor_rate_per_unit || 0,
      "Labor Cost": item.total_labor_cost || 0,
    }));
    if (rows.length === 0) continue;
    const tradeWs = XLSX.utils.json_to_sheet(rows);
    const sheetName = group.trade.substring(0, 31).replace(/[/\\?*[\]]/g, "_");
    XLSX.utils.book_append_sheet(wb, tradeWs, sheetName);
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, filename || `${data.project_name}_Quantities.xlsx`);
}

// ── 2. Cost Sheet XLSX ──────────────────────────────────────────────

export function exportCostSheetXlsx(data: ExportData, filename?: string) {
  const wb = XLSX.utils.book_new();

  for (const group of data.groups) {
    const rows = group.items.map((item) => ({
      Room: item.room_name || "",
      "Room #": item.room_number || "",
      Surface: item.surface_type || "",
      Trade: item.trade || group.trade,
      Material: item.material_tag || item.material_name || "",
      "Net Area (SF)": item.net_area_sqft || 0,
      "Waste %": item.waste_factor_pct || 0,
      "Total Qty": item.total_quantity_with_waste || 0,
      "Linear Ft": item.linear_ft || 0,
      UOM: item.unit_of_measure || "SF",
      "Unit Price": item.unit_price || 0,
      "Material Cost": item.total_material_cost || 0,
      "Labor Rate": item.labor_rate_per_unit || 0,
      "Labor Cost": item.total_labor_cost || 0,
      "Total Line": (item.total_material_cost || 0) + (item.total_labor_cost || 0),
      Notes: "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 6 },
      { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
    ];

    const sheetName = group.trade.substring(0, 31).replace(/[/\\?*[\]]/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Summary sheet
  const summaryRows = data.groups.map((g) => {
    const matCost = g.items.reduce((s, i) => s + (i.total_material_cost || 0), 0);
    const labCost = g.items.reduce((s, i) => s + (i.total_labor_cost || 0), 0);
    return {
      Trade: g.trade,
      Items: g.items.length,
      "Material Cost": matCost,
      "Labor Cost": labCost,
      "Trade Total": matCost + labCost,
    };
  });
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, filename || `${data.project_name}_CostSheet.xlsx`);
}

// ── 3. Qualification Letter PDF ─────────────────────────────────────

export function exportQualificationPdf(data: ExportData, filename?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("QUALIFICATION LETTER", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Project: ${data.project_name}`, 14, y);
  y += 6;
  if (data.project_number) { doc.text(`Project #: ${data.project_number}`, 14, y); y += 6; }
  if (data.client_name) { doc.text(`Client: ${data.client_name}`, 14, y); y += 6; }
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Trades scope
  const trades = data.groups.map((g) => g.trade);
  if (trades.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("SCOPE OF WORK", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    trades.forEach((t) => {
      doc.text(`  - ${t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`, 14, y);
      y += 5;
    });
    y += 5;
  }

  // Qualification sections
  const qual = data.qualification;
  if (qual) {
    const sections = [
      { title: "ASSUMPTIONS", content: qual.assumptions },
      { title: "EXCLUSIONS", content: qual.exclusions },
      { title: "CLARIFICATIONS", content: qual.clarifications },
      { title: "NOTES", content: qual.notes },
    ];

    for (const section of sections) {
      if (!section.content) continue;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.title, 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(section.content, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 6;
    }
  }

  // Totals
  if (data.totals) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PRICING SUMMARY", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (data.totals.subtotal) { doc.text(`Subtotal: $${data.totals.subtotal.toLocaleString()}`, 14, y); y += 5; }
    if (data.totals.grand_total) {
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: $${data.totals.grand_total.toLocaleString()}`, 14, y);
      y += 5;
    }
  }

  doc.save(filename || `${data.project_name}_Qualification.pdf`);
}

// ── 4. Color-Coded PDF ──────────────────────────────────────────────

export function exportColorCodedPdf(data: ExportData, filename?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.project_name} — Color-Coded Takeoff`, pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 21, { align: "center" });

  // Build table body with trade-colored rows
  const tableBody: unknown[][] = [];
  for (const group of data.groups) {
    for (const item of group.items) {
      tableBody.push([
        group.trade.replace(/_/g, " "),
        item.room_name || "",
        item.surface_type || "",
        item.material_tag || item.material_name || "",
        item.net_area_sqft?.toLocaleString() || "0",
        item.waste_factor_pct != null ? `${item.waste_factor_pct}%` : "",
        item.total_quantity_with_waste?.toLocaleString() || "0",
        item.unit_price ? `$${item.unit_price}` : "",
        item.total_material_cost ? `$${item.total_material_cost.toLocaleString()}` : "$0",
        item.total_labor_cost ? `$${item.total_labor_cost.toLocaleString()}` : "$0",
      ]);
    }
  }

  // Track which trade each row belongs to for coloring
  let rowIdx = 0;
  const tradeForRow: string[] = [];
  for (const group of data.groups) {
    for (let i = 0; i < group.items.length; i++) {
      tradeForRow[rowIdx] = group.trade;
      rowIdx++;
    }
  }

  autoTable(doc, {
    startY: 26,
    head: [["Trade", "Room", "Surface", "Material", "Net SF", "Waste %", "Total Qty", "Unit $", "Mat Cost", "Labor Cost"]],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 0) {
        const trade = tradeForRow[hookData.row.index] || "";
        const [r, g, b] = getTradeColor(trade);
        hookData.cell.styles.fillColor = [r, g, b];
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  // Trade legend
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 180;
  let legendY = finalY + 10;
  if (legendY > 180) { doc.addPage(); legendY = 20; }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Trade Legend:", 14, legendY);
  legendY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const group of data.groups) {
    const [r, g, b] = getTradeColor(group.trade);
    doc.setFillColor(r, g, b);
    doc.rect(14, legendY - 3, 8, 4, "F");
    doc.text(
      `  ${group.trade.replace(/_/g, " ")} (${group.items.length} items)`,
      24,
      legendY,
    );
    legendY += 5;
  }

  doc.save(filename || `${data.project_name}_ColorCoded.pdf`);
}

// ── 5. CSV Export ───────────────────────────────────────────────────

export function exportCsv(data: ExportData, filename?: string) {
  const headers = [
    "Trade", "Room", "Room #", "Surface", "Material",
    "Net Area SF", "Waste %", "Total Qty", "Linear Ft", "Pieces",
    "UOM", "Unit Price", "Material Cost", "Labor Rate", "Labor Cost",
  ];

  const rows: string[][] = [headers];

  for (const group of data.groups) {
    for (const item of group.items) {
      rows.push([
        group.trade,
        item.room_name || "",
        item.room_number || "",
        item.surface_type || "",
        item.material_tag || item.material_name || "",
        String(item.net_area_sqft || 0),
        String(item.waste_factor_pct || 0),
        String(item.total_quantity_with_waste || 0),
        String(item.linear_ft || 0),
        String(item.piece_count || 0),
        item.unit_of_measure || "SF",
        String(item.unit_price || 0),
        String(item.total_material_cost || 0),
        String(item.labor_rate_per_unit || 0),
        String(item.total_labor_cost || 0),
      ]);
    }
  }

  const csvContent = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename || `${data.project_name}_Export.csv`);
}
