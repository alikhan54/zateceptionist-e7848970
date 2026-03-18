import { useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useManualEmailCampaigns } from "@/hooks/useManualEmailCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, AlertTriangle } from "lucide-react";

interface Recipient {
  email: string;
  name?: string;
  company?: string;
  valid: boolean;
}

function parseRecipients(text: string): Recipient[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("email") || firstLine.includes("name") || firstLine.includes("company");
  const startIdx = hasHeader ? 1 : 0;

  let emailIdx = 0, nameIdx = -1, companyIdx = -1;
  if (hasHeader) {
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    emailIdx = headers.findIndex(h => h === "email" || h === "e-mail" || h.includes("mail"));
    nameIdx = headers.findIndex(h => h === "name" || h === "full_name" || h === "contact");
    companyIdx = headers.findIndex(h => h === "company" || h === "organization");
    if (emailIdx === -1) emailIdx = 0;
  }

  return lines.slice(startIdx).map(line => {
    // Handle "Name <email>" format
    const angleMatch = line.match(/^(.+?)\s*<([^>]+)>/);
    if (angleMatch) {
      const email = angleMatch[2].trim().toLowerCase();
      return { email, name: angleMatch[1].trim(), valid: email.includes("@") && email.includes(".") };
    }
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const email = (cols[emailIdx] || "").toLowerCase().trim();
    return {
      email,
      name: nameIdx >= 0 ? cols[nameIdx] : undefined,
      company: companyIdx >= 0 ? cols[companyIdx] : undefined,
      valid: email.includes("@") && email.includes("."),
    };
  });
}

export function EmailCampaignWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenantId, tenantConfig } = useTenant();
  const { createCampaign, startCampaign } = useManualEmailCampaigns(tenantId);
  const { toast } = useToast();

  const smtpConfigured = !!(tenantConfig?.smtp_host);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setStep(1); setName(""); setSubject(""); setBodyHtml("");
    setShowPreview(false); setRecipients([]); setPasteText("");
  };

  const insertVariable = (varName: string) => {
    setBodyHtml(prev => prev + `{{${varName}}}`);
  };

  const insertButton = () => {
    const btnHtml = `<a href="https://your-link.com" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:8px 0;">Click Here</a>`;
    setBodyHtml(prev => prev + "\n" + btnHtml);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRecipients(parseRecipients(ev.target?.result as string));
    reader.readAsText(file);
  }, []);

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    setRecipients(parseRecipients(pasteText));
  };

  const validRecipients = recipients.filter(r => r.valid);
  const invalidRecipients = recipients.filter(r => !r.valid);

  const handleCreate = async (autoStart: boolean) => {
    if (!tenantId || !name.trim() || !subject.trim() || !bodyHtml.trim() || validRecipients.length === 0) return;

    if (autoStart && !smtpConfigured) {
      toast({
        title: "SMTP not configured",
        description: "Go to Settings > Integrations to connect your email first.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const result = await createCampaign.mutateAsync({
        name, subject, body_html: bodyHtml,
        recipients: validRecipients.map(r => ({ email: r.email, name: r.name, company: r.company })),
      });
      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to create", variant: "destructive" });
        return;
      }
      toast({ title: "Campaign created", description: `${validRecipients.length} recipients added.` });
      if (autoStart && (result.data as any)?.campaign_id) {
        const startResult = await startCampaign.mutateAsync((result.data as any).campaign_id);
        if (startResult.success) {
          toast({ title: "Campaign sending", description: "Emails will be sent shortly." });
        } else if (startResult.error === "no_email_provider") {
          toast({ title: "SMTP not configured", description: "Go to Settings > Integrations to connect email.", variant: "destructive" });
        }
      }
      resetForm();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed", variant: "destructive" });
    } finally { setCreating(false); }
  };

  // Sample preview with first recipient's data
  const previewHtml = (() => {
    const sample = validRecipients[0] || { email: "user@example.com", name: "John Doe", company: "Acme" };
    return bodyHtml
      .replace(/\{\{name\}\}/g, sample.name || "there")
      .replace(/\{\{first_name\}\}/g, (sample.name || "").split(" ")[0] || "there")
      .replace(/\{\{company\}\}/g, sample.company || "")
      .replace(/\{\{email\}\}/g, sample.email);
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Email Campaign — Step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g. March Newsletter" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <div className="flex gap-1 mb-1">
                {["name", "first_name", "company"].map(v => (
                  <Button key={v} variant="outline" size="sm" className="text-xs h-6 px-2"
                    onClick={() => setSubject(prev => prev + `{{${v}}}`)}>
                    {`{{${v}}}`}
                  </Button>
                ))}
              </div>
              <Input placeholder="e.g. Hi {{first_name}}, check this out!" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email Body (HTML) *</Label>
              <div className="flex gap-1 mb-1 flex-wrap">
                {["name", "first_name", "company", "email"].map(v => (
                  <Button key={v} variant="outline" size="sm" className="text-xs h-6 px-2"
                    onClick={() => insertVariable(v)}>
                    {`{{${v}}}`}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="text-xs h-6 px-2" onClick={insertButton}>
                  <LinkIcon className="h-3 w-3 mr-1" /> CTA Button
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-6 px-2 ml-auto"
                  onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {showPreview ? (
                <div className="border rounded-lg p-4 min-h-[200px] bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[200px]"
                  placeholder={"<h1>Hi {{first_name}}!</h1>\n<p>We have exciting news...</p>"}
                  value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} />
              )}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}
              disabled={!name.trim() || !subject.trim() || !bodyHtml.trim()}>
              Next: Add Recipients
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Upload CSV</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">CSV with columns: email, name, company (optional)</p>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload}
                  className="text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm" />
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">— or —</div>
            <div className="space-y-2">
              <Label>Paste Emails</Label>
              <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder={"One per line:\njohn@example.com\nJane Doe <jane@example.com>\nemail,name,company"}
                value={pasteText} onChange={e => setPasteText(e.target.value)} />
              <Button variant="outline" size="sm" onClick={handlePaste} disabled={!pasteText.trim()}>Parse Emails</Button>
            </div>

            {recipients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">{validRecipients.length} valid</Badge>
                  {invalidRecipients.length > 0 && <Badge className="bg-red-100 text-red-700">{invalidRecipients.length} invalid</Badge>}
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="p-2 text-left">Email</th><th className="p-2 text-left">Name</th><th className="p-2">Valid</th></tr></thead>
                    <tbody>
                      {recipients.slice(0, 20).map((r, i) => (
                        <tr key={i} className={`border-t ${!r.valid ? "bg-red-50" : ""}`}>
                          <td className="p-2 text-xs">{r.email}</td>
                          <td className="p-2">{r.name || "—"}</td>
                          <td className="p-2 text-center">{r.valid ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recipients.length > 20 && <p className="text-xs text-center text-muted-foreground py-2">...and {recipients.length - 20} more</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={validRecipients.length === 0}>
                Next: Review ({validRecipients.length} recipients)
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 pt-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Campaign</span><span className="font-medium">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span>{subject}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recipients</span><span className="font-bold text-green-600">{validRecipients.length}</span></div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label className="text-sm">Email Preview</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto bg-white text-sm"
                dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>

            {!smtpConfigured && (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-800">
                    SMTP not configured. <a href="/settings" className="underline font-medium">Connect email first</a> to send.
                  </span>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button variant="outline" className="flex-1" onClick={() => handleCreate(false)} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Draft
              </Button>
              <Button className="flex-1" onClick={() => handleCreate(true)} disabled={creating || !smtpConfigured}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create & Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
