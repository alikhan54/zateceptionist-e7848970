import { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatientVisits } from "@/hooks/useClinicVisits";
import { SignaturePad, type SignaturePadHandle } from "@/components/clinic/SignaturePad";
import { FileSignature, Check } from "lucide-react";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export interface SignableForm {
  id: string; patient_id: string; template_id: string | null; treatment_id: string | null;
}
export interface SignTemplate { id: string; title: string; body_markdown: string; consent_text_ar?: string | null; }
export interface SignPatient { id: string; full_name: string; language?: string | null; }

function replacePlaceholders(text: string, patientName: string, treatmentName: string, date: Date): string {
  const d = date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return (text || "")
    .replace(/\[patient[_' ]?s?[ _]?name\]/gi, patientName)
    .replace(/\[treatment[_ ]?name\]/gi, treatmentName)
    .replace(/\[treatment\]/gi, treatmentName)
    .replace(/\[date\]/gi, d);
}

export function ConsentSignDialog({
  open, onOpenChange, form, template, patient, treatmentName, onSigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: SignableForm | null;
  template: SignTemplate | null;
  patient: SignPatient | null;
  treatmentName?: string;
  onSigned: () => void;
}) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState("");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [visitId, setVisitId] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: visits = [] } = useClinicPatientVisits(patient?.id);

  // Seed signer name + preferred language whenever a new form opens.
  useMemo(() => {
    if (open && patient) {
      setSignerName(patient.full_name || "");
      setLang(patient.language === "ar" ? "ar" : "en");
      setVisitId("");
    }
  }, [open, patient]);

  if (!form || !template || !patient) return null;

  const enText = replacePlaceholders(template.body_markdown || "", patient.full_name, treatmentName || "", new Date());
  const arText = template.consent_text_ar
    ? replacePlaceholders(template.consent_text_ar, patient.full_name, treatmentName || "", new Date())
    : "";
  const shown = lang === "ar" && arText ? arText : enText;

  const buildPdf = (signatureDataUrl: string): Blob => {
    // jsPDF core fonts are Latin-only, so the archived PDF always embeds the ENGLISH
    // body_markdown as the legal record + notes which language the patient signed against.
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = margin;
    doc.setFontSize(16);
    doc.text(template.title || "Consent Form", margin, y); y += 22;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Patient: ${patient.full_name}   ·   Signed language: ${lang.toUpperCase()}`, margin, y); y += 18;
    doc.setTextColor(20);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(enText || "(no consent text)", 515);
    doc.text(lines, margin, y); y += lines.length * 12 + 18;
    if (y > 640) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.text("Patient signature:", margin, y); y += 6;
    try { doc.addImage(signatureDataUrl, "PNG", margin, y, 200, 80); } catch { /* ignore bad image */ }
    y += 92;
    doc.text(`Signed by: ${signerName}`, margin, y); y += 14;
    doc.text(`Date: ${new Date().toLocaleString("en-GB")}`, margin, y);
    return doc.output("blob");
  };

  const sign = async () => {
    if (padRef.current?.isEmpty()) { toast({ title: "Signature required", description: "Please sign before submitting.", variant: "destructive" }); return; }
    if (!signerName.trim()) { toast({ title: "Signer name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const sigDataUrl = padRef.current!.toDataURL();
      const sigBlob = await (await fetch(sigDataUrl)).blob();
      const pdfBlob = buildPdf(sigDataUrl);

      // PRIVATE clinic-phi storage; tenant-slug-prefixed so the storage RLS folder check passes.
      const base = `${tenantId}/consent/${form.patient_id}/${form.id}`;
      const sigPath = `${base}_signature.png`;
      const pdfPath = `${base}_consent.pdf`;
      const up1 = await supabase.storage.from("clinic-phi").upload(sigPath, sigBlob, { contentType: "image/png", upsert: true });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from("clinic-phi").upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
      if (up2.error) throw up2.error;

      const { error } = await supabase.from("clinic_consent_forms" as any).update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signature_url: sigPath,   // store the PATH, never a public URL — fetched via signed URL on demand
        pdf_url: pdfPath,
        language: lang,
        visit_id: visitId || null,
      } as any).eq("id", form.id).eq("tenant_id", tenantId);
      if (error) throw error;

      toast({ title: "Consent signed", description: "Signed PDF archived to private storage." });
      onSigned();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save consent", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="consent-sign-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Sign consent — {template.title}</DialogTitle>
          <DialogDescription>{patient.full_name}{treatmentName ? ` · ${treatmentName}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Language</Label>
            <div className="flex gap-1">
              <Badge variant={lang === "en" ? "default" : "outline"} className="cursor-pointer" data-testid="consent-lang-en" onClick={() => setLang("en")}>English</Badge>
              {arText && <Badge variant={lang === "ar" ? "default" : "outline"} className="cursor-pointer" data-testid="consent-lang-ar" onClick={() => setLang("ar")}>العربية</Badge>}
            </div>
          </div>

          <div
            className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm max-h-56 overflow-y-auto"
            dir={lang === "ar" && arText ? "rtl" : "ltr"}
            data-testid="consent-text"
          >
            {shown || "(no consent text)"}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Signed by *</Label>
              <Input data-testid="consent-signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Link to visit (optional)</Label>
              <select className={selectClass} data-testid="consent-visit" value={visitId} onChange={(e) => setVisitId(e.target.value)}>
                <option value="">— none (walk-in) —</option>
                {visits.map((v) => <option key={v.id} value={v.id}>Visit #{v.visit_number} · {v.current_status}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Patient signature *</Label>
            <SignaturePad ref={padRef} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={sign} disabled={saving} data-testid="consent-sign-submit">
            <Check className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Sign & archive PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
