import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine, Camera, Loader2, RotateCcw } from "lucide-react";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export interface ExtractedId {
  full_name?: string | null; date_of_birth?: string | null; emirates_id?: string | null;
  nationality?: string | null; gender?: string | null; expiry_date?: string | null; address?: string | null;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// "Scan Emirates ID" accelerator for the registration form. Captures/uploads the ID image(s),
// sends them to the server-side OCR Edge Function (420 Gemini), and prefills the form.
// Degrades gracefully: if the OCR endpoint isn't deployed/available, the user just types manually.
export function EmiratesIdScan({ onExtracted }: { onExtracted: (d: ExtractedId) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("emirates_id");
  const [front, setFront] = useState<string>("");
  const [back, setBack] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    side === "front" ? setFront(url) : setBack(url);
    e.target.value = "";
  };

  const reset = () => { setFront(""); setBack(""); setDocType("emirates_id"); };

  const extract = async () => {
    if (!front) { toast({ title: "Capture the front of the ID first", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-emirates-id", {
        body: { frontImage: front, backImage: back || undefined, documentType: docType },
      });
      if (error) throw error;
      if (data?.success && data?.data) {
        onExtracted(data.data as ExtractedId);
        toast({ title: "ID scanned", description: "Details prefilled — please review before saving." });
        setOpen(false); reset();
      } else {
        throw new Error(data?.error || "Could not read the document");
      }
    } catch (e: any) {
      // Graceful: OCR not deployed yet, or unreadable image → fall back to manual entry.
      toast({
        title: "Couldn’t scan the ID",
        description: "Enter the details manually (Emirates-ID OCR may not be enabled yet).",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" data-testid="emirates-scan-open" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4 mr-1" /> Scan Emirates ID
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); } }}>
        <DialogContent className="max-w-md" data-testid="emirates-scan-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> Scan document</DialogTitle>
            <DialogDescription>Capture the ID to auto-fill the form. Images go to private storage; OCR runs server-side.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Document type</Label>
              <select className={selectClass} data-testid="emirates-doctype" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="emirates_id">Emirates ID</option>
                <option value="passport">Passport</option>
                <option value="other">Other</option>
              </select>
            </div>

            <input ref={frontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e, "front")} />
            <input ref={backRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e, "back")} />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Front *</Label>
                {front
                  ? <button type="button" className="w-full aspect-[1.586/1] rounded border overflow-hidden" onClick={() => frontRef.current?.click()}><img src={front} alt="front" className="w-full h-full object-cover" /></button>
                  : <Button type="button" variant="outline" className="w-full" data-testid="emirates-front-btn" onClick={() => frontRef.current?.click()}><Camera className="h-4 w-4 mr-1" /> Front</Button>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Back (optional)</Label>
                {back
                  ? <button type="button" className="w-full aspect-[1.586/1] rounded border overflow-hidden" onClick={() => backRef.current?.click()}><img src={back} alt="back" className="w-full h-full object-cover" /></button>
                  : <Button type="button" variant="outline" className="w-full" onClick={() => backRef.current?.click()}><Camera className="h-4 w-4 mr-1" /> Back</Button>}
              </div>
            </div>
          </div>

          <DialogFooter>
            {(front || back) && <Button type="button" variant="ghost" onClick={reset} disabled={busy}><RotateCcw className="h-4 w-4 mr-1" /> Reset</Button>}
            <Button type="button" onClick={extract} disabled={busy || !front} data-testid="emirates-extract">
              {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Reading…</> : <>Extract details</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
