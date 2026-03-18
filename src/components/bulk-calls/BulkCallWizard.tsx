import { useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useBulkCallCampaigns } from "@/hooks/useBulkCallCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Contact {
  phone: string;
  name?: string;
  company?: string;
  email?: string;
  valid: boolean;
}

function parseCSV(text: string): Contact[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("phone") || firstLine.includes("number") || firstLine.includes("name");
  const startIdx = hasHeader ? 1 : 0;

  // Parse header columns
  let phoneIdx = 0, nameIdx = -1, companyIdx = -1, emailIdx = -1;
  if (hasHeader) {
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("number") || h === "mobile" || h === "cell");
    nameIdx = headers.findIndex(h => h === "name" || h === "contact_name" || h === "contact" || h === "full_name");
    companyIdx = headers.findIndex(h => h === "company" || h === "company_name" || h === "organization");
    emailIdx = headers.findIndex(h => h === "email" || h === "e-mail");
    if (phoneIdx === -1) phoneIdx = 0;
  }

  return lines.slice(startIdx).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const phone = (cols[phoneIdx] || "").replace(/[\s\-\(\)]/g, "");
    const normalized = phone.startsWith("+") ? phone : phone.length === 10 ? "+1" + phone : "+" + phone;
    return {
      phone: normalized,
      name: nameIdx >= 0 ? cols[nameIdx] : undefined,
      company: companyIdx >= 0 ? cols[companyIdx] : undefined,
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
      valid: normalized.length >= 10 && /^\+\d+$/.test(normalized),
    };
  });
}

export function BulkCallWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenantId } = useTenant();
  const { createCampaign, startCampaign } = useBulkCallCampaigns(tenantId);
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("cold_call");
  const [scriptType, setScriptType] = useState("ai_guided");
  const [script, setScript] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setStep(1); setName(""); setPurpose("cold_call"); setScriptType("ai_guided");
    setScript(""); setContacts([]); setPasteText("");
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setContacts(parseCSV(text));
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    // Support: one number per line, or CSV format
    const parsed = parseCSV(pasteText);
    setContacts(parsed);
  };

  const validContacts = contacts.filter(c => c.valid);
  const invalidContacts = contacts.filter(c => !c.valid);

  const handleCreate = async (autoStart: boolean) => {
    if (!tenantId || !name.trim() || validContacts.length === 0) return;
    setCreating(true);
    try {
      const result = await createCampaign.mutateAsync({
        name, purpose, script: script || undefined, script_type: scriptType,
        contacts: validContacts.map(c => ({ phone: c.phone, name: c.name, company: c.company, email: c.email })),
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to create", variant: "destructive" });
        return;
      }
      toast({ title: "Campaign created", description: `${validContacts.length} contacts added.` });
      if (autoStart && result.data?.campaign_id) {
        await startCampaign.mutateAsync(result.data.campaign_id);
        toast({ title: "Campaign started", description: "Calls will begin shortly." });
      }
      resetForm();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Bulk Call Campaign — Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. Cold Call - UAE March" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Call Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="product_demo">Product Demo</SelectItem>
                  <SelectItem value="follow_up">Follow-Up</SelectItem>
                  <SelectItem value="appointment">Book Appointment</SelectItem>
                  <SelectItem value="custom">Custom Script</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Script Type</Label>
              <div className="flex gap-2">
                {[
                  { value: "ai_guided", label: "AI Guided" },
                  { value: "strict_script", label: "Strict Script" },
                  { value: "hybrid", label: "Hybrid" },
                ].map(opt => (
                  <Button key={opt.value} variant={scriptType === opt.value ? "default" : "outline"} size="sm"
                    onClick={() => setScriptType(opt.value)}>{opt.label}</Button>
                ))}
              </div>
            </div>
            {(purpose === "custom" || scriptType !== "ai_guided") && (
              <div className="space-y-2">
                <Label>Script / Instructions</Label>
                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                  placeholder="Enter your call script or instructions..."
                  value={script} onChange={e => setScript(e.target.value)} />
              </div>
            )}
            <Button className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>
              Next: Upload Contacts
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Upload CSV</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">CSV with columns: phone, name, company (optional)</p>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload}
                  className="text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm" />
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">— or —</div>
            <div className="space-y-2">
              <Label>Paste Numbers</Label>
              <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder={"One per line:\n+971501234567\n+12025551234,John,Acme Inc"}
                value={pasteText} onChange={e => setPasteText(e.target.value)} />
              <Button variant="outline" size="sm" onClick={handlePaste} disabled={!pasteText.trim()}>Parse Numbers</Button>
            </div>

            {contacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">{validContacts.length} valid</Badge>
                  {invalidContacts.length > 0 && (
                    <Badge className="bg-red-100 text-red-700">{invalidContacts.length} invalid</Badge>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Status</th></tr></thead>
                    <tbody>
                      {contacts.slice(0, 20).map((c, i) => (
                        <tr key={i} className={`border-t ${!c.valid ? "bg-red-50" : ""}`}>
                          <td className="p-2 font-mono text-xs">{c.phone}</td>
                          <td className="p-2">{c.name || "—"}</td>
                          <td className="p-2">{c.valid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contacts.length > 20 && <p className="text-xs text-center text-muted-foreground py-2">...and {contacts.length - 20} more</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={validContacts.length === 0}>
                Next: Review ({validContacts.length} contacts)
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 pt-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Campaign</span><span className="font-medium">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span className="capitalize">{purpose.replace("_", " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Script Type</span><span className="capitalize">{scriptType.replace("_", " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valid Contacts</span><span className="font-bold text-green-600">{validContacts.length}</span></div>
                {invalidContacts.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Excluded (invalid)</span><span className="text-red-500">{invalidContacts.length}</span></div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button variant="outline" className="flex-1" onClick={() => handleCreate(false)} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Draft
              </Button>
              <Button className="flex-1" onClick={() => handleCreate(true)} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create & Start
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
