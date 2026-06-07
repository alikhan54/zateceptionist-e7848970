import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlaskConical, Sparkles, Upload, FileText, Download, Loader2, AlertTriangle,
  CheckCircle2, Clock, ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useHospitalLabReports, inspectWithMedica, flagStatus,
  type HospitalLabReport, type LabFinding,
} from "@/hooks/useHospitalLabReports";
import { EcgLine } from "./hospitalShared";

interface Props {
  patientId?: string;
  patientName?: string;
  labOrders?: { id: string; details?: any }[];
}

export function LabReportPanel({ patientId, patientName, labOrders = [] }: Props) {
  const { toast } = useToast();
  const { reports, upload, signedUrl, refetch } = useHospitalLabReports(patientId);
  const [selectedId, setSelectedId] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [inspecting, setInspecting] = useState(false);
  const [takeaway, setTakeaway] = useState<string>("");
  const [briefErr, setBriefErr] = useState<string>("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!selectedId && reports.length) setSelectedId(reports[0].id); }, [reports, selectedId]);
  useEffect(() => { if (!orderId && labOrders.length) setOrderId(labOrders[0].id); }, [labOrders, orderId]);
  const selected = useMemo(() => reports.find((r) => r.id === selectedId), [reports, selectedId]);
  // reset the takeaway when switching reports
  useEffect(() => { setTakeaway(""); setBriefErr(""); }, [selectedId]);

  async function doUpload(file: File) {
    if (!/\.pdf$/i.test(file.name)) { toast({ title: "PDF only", description: "Upload a lab-report PDF.", variant: "destructive" }); return; }
    try {
      const row = await upload.mutateAsync({ file, orderId: orderId || undefined, patientId });
      setSelectedId(row.id);
      toast({ title: "Report uploaded", description: file.name });
      await runInspect(row.id);                 // auto-inspect a freshly uploaded report
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message || "Try again.", variant: "destructive" });
    }
  }

  async function runInspect(reportId: string) {
    setInspecting(true); setBriefErr(""); setTakeaway("");
    try {
      const r = await inspectWithMedica(reportId);
      setTakeaway(r.takeaway);
      await refetch();                            // pull the structured findings the tool just wrote
    } catch (e: any) {
      setBriefErr(e?.message || "MEDICA is unavailable right now.");
    } finally { setInspecting(false); }
  }

  async function download(rep: HospitalLabReport) {
    const url = await signedUrl(rep.storage_path);
    if (url) window.open(url, "_blank", "noopener");
    else toast({ title: "Could not generate download link", variant: "destructive" });
  }

  return (
    <div className="hx-panel hx-panel--accent hx-rise" data-testid="hx-lab-panel">
      <div className="hx-panel-h">
        <FlaskConical className="h-5 w-5" style={{ color: "var(--hx-accent)" }} />
        <div>
          <div className="hx-eyebrow">Hospital · Laboratory</div>
          <span className="font-semibold text-base">Document Intelligence — MEDICA reads the report</span>
        </div>
        <span className="hx-chip hx-chip--accent ml-auto"><ShieldCheck className="h-3 w-3" /> private · clinic-phi</span>
      </div>
      <div className="hx-panel-b">
        <EcgLine className="mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: upload + report list (secondary) */}
          <div className="lg:col-span-4 space-y-3">
            {labOrders.length > 0 && (
              <div>
                <label className="hx-label">Attach to lab order</label>
                <select className="hx-select" value={orderId} onChange={(e) => setOrderId(e.target.value)} data-testid="hx-lab-order">
                  <option value="">(none)</option>
                  {labOrders.map((o) => <option key={o.id} value={o.id}>{o.details?.item || o.id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}
            <div
              className="rounded-xl text-center cursor-pointer transition-colors"
              style={{ border: `1.5px dashed ${drag ? "var(--hx-accent)" : "var(--hx-border)"}`, background: drag ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.015)", padding: "1.6rem 1rem" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f); }}
              data-testid="hx-lab-dropzone"
            >
              {upload.isPending
                ? <><Loader2 className="h-5 w-5 mx-auto animate-spin mb-1" style={{ color: "var(--hx-accent)" }} /><div className="hx-dim text-xs">Uploading…</div></>
                : <><Upload className="h-5 w-5 mx-auto mb-1" style={{ color: "var(--hx-accent)" }} /><div className="text-sm">Drop a lab-report PDF</div><div className="hx-faint text-xs mt-0.5">or click to choose</div></>}
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.currentTarget.value = ""; }} data-testid="hx-lab-file" />
            </div>
            <div className="space-y-2">
              {reports.length === 0 && <p className="hx-faint text-xs">No reports yet — upload one to begin.</p>}
              {reports.map((r) => {
                const isSel = r.id === selectedId;
                const flagged = (r.findings || []).filter((f) => flagStatus(f.flag) !== "normal").length;
                return (
                  <button key={r.id} onClick={() => setSelectedId(r.id)} data-testid="hx-lab-report-row"
                    className="w-full text-left rounded-lg px-3 py-2 transition-colors"
                    style={{ border: `1px solid ${isSel ? "var(--hx-border-strong)" : "var(--hx-border)"}`, background: isSel ? "rgba(34,211,238,0.07)" : "rgba(255,255,255,0.015)" }}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 hx-faint shrink-0" />
                      <span className="text-sm truncate flex-1">{r.file_name || "report.pdf"}</span>
                      {r.status === "inspected" ? <span className="hx-chip hx-chip--ok" style={{ padding: "0.05rem 0.4rem" }}>{flagged} flag{flagged !== 1 ? "s" : ""}</span>
                        : r.status === "failed" ? <span className="hx-chip hx-chip--warn" style={{ padding: "0.05rem 0.4rem" }}>manual</span>
                        : <span className="hx-chip" style={{ padding: "0.05rem 0.4rem" }}>new</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: the HERO — MEDICA's read */}
          <div className="lg:col-span-8">
            {!selected ? (
              <div className="h-full grid place-items-center text-center py-10">
                <div><Sparkles className="h-7 w-7 mx-auto mb-2" style={{ color: "var(--hx-accent)" }} /><p className="hx-dim">Upload or select a lab report — MEDICA will read it and flag what matters.</p></div>
              </div>
            ) : (
              <div className="space-y-4" data-testid="hx-lab-detail">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 hx-faint" /><span className="text-sm truncate">{selected.file_name}</span>
                    {selected.extracted_via && <span className="hx-chip" style={{ padding: "0.05rem 0.45rem" }}>{selected.extracted_via}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="hx-btn hx-btn--ghost" style={{ padding: "0.4rem 0.7rem" }} onClick={() => download(selected)} data-testid="hx-lab-download"><Download className="h-3.5 w-3.5" /> Original</button>
                    <button className="hx-btn hx-btn--primary" style={{ padding: "0.4rem 0.85rem" }} onClick={() => runInspect(selected.id)} disabled={inspecting} data-testid="hx-lab-inspect">
                      {inspecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : <><Sparkles className="h-4 w-4" /> MEDICA: inspect</>}
                    </button>
                  </div>
                </div>

                {/* analysing */}
                {inspecting && (
                  <div className="hx-analysing hx-panel" style={{ padding: "1rem" }} data-testid="hx-lab-analysing">
                    <div className="flex items-center gap-2.5 mb-3"><span className="hx-pulse-dot" /><span className="hx-dim text-sm">MEDICA is reading the report and flagging abnormal values…</span></div>
                    <div className="space-y-2">{[90, 76, 84, 60].map((w, i) => <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />)}</div>
                  </div>
                )}

                {/* takeaway — the clinical hero */}
                {!inspecting && takeaway && (
                  <div className="hx-panel hx-panel--accent" style={{ padding: "1rem 1.1rem" }} data-testid="hx-lab-takeaway">
                    <div className="hx-eyebrow mb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> MEDICA clinical takeaway</div>
                    <p style={{ fontSize: "1.02rem", lineHeight: 1.5, color: "#fff" }}>{takeaway}</p>
                  </div>
                )}
                {!inspecting && briefErr && (
                  <div className="text-sm" data-testid="hx-lab-error"><span className="hx-chip hx-chip--warn mb-1"><AlertTriangle className="h-3 w-3" /> Briefing unavailable</span><p className="hx-dim">{briefErr}</p></div>
                )}

                {/* flagged findings — two-tier colour */}
                {selected.status === "failed" ? (
                  <div className="hx-panel" style={{ padding: "1rem" }} data-testid="hx-lab-failclosed">
                    <span className="hx-chip hx-chip--warn"><AlertTriangle className="h-3 w-3" /> Manual entry needed</span>
                    <p className="hx-dim text-sm mt-2">This report appears scanned (no text layer) and this tenant is restricted to on-box extraction — cloud OCR was not used. Please enter the values manually.</p>
                  </div>
                ) : (selected.findings && selected.findings.length > 0) ? (
                  <div data-testid="hx-lab-findings">
                    <div className="hx-eyebrow mb-2">Flagged findings</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left hx-faint" style={{ fontSize: "0.66rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <th className="py-1.5">Test</th><th>Value</th><th>Reference</th><th>Flag</th></tr></thead>
                        <tbody>
                          {selected.findings.map((f: LabFinding, i: number) => {
                            const st = flagStatus(f.flag);
                            return (
                              <tr key={i} className="border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-finding-row" data-status={st}>
                                <td className="py-2">{f.test}</td>
                                <td className="hx-mono font-semibold" style={{ color: st === "critical" ? "var(--hx-crit)" : st === "warning" ? "var(--hx-warn)" : "var(--hx-text)" }}>{f.value} <span className="hx-faint text-xs">{f.unit}</span></td>
                                <td className="hx-faint hx-mono text-xs">{f.ref_range || "—"}</td>
                                <td>{st === "normal" ? <span className="hx-faint text-xs">—</span>
                                  : <span className={`hx-chip ${st === "critical" ? "hx-chip--crit" : "hx-chip--warn"}`} style={{ padding: "0.05rem 0.45rem" }}>{(f.flag || "").toUpperCase() || "ABN"}</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : !inspecting && (
                  <p className="hx-dim text-sm">No findings extracted yet — click <strong style={{ color: "#fff" }}>MEDICA: inspect</strong> to read this report.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
