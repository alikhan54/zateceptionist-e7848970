import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, FileSignature, Send, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Template {
  id: string;
  title: string;
  body_markdown: string;
  treatment_id: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
}
interface ConsentForm {
  id: string;
  patient_id: string;
  template_id: string | null;
  treatment_id: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
}
interface Signature {
  id: string;
  consent_form_id: string;
  signed_by_name: string;
  signature_data: string | null;
  signed_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  signed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  declined: "bg-red-100 text-red-700 border-red-300",
  expired: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function ConsentFormsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { patients } = useClinicPatients();
  const { treatments } = useClinicTreatments();

  // Template dialog
  const [tplOpen, setTplOpen] = useState(false);
  const [tplTitle, setTplTitle] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplTreatment, setTplTreatment] = useState<string>("");
  const [tplSaving, setTplSaving] = useState(false);

  // Assign dialog
  const [asnOpen, setAsnOpen] = useState(false);
  const [asnPatient, setAsnPatient] = useState<string>("");
  const [asnTemplate, setAsnTemplate] = useState<string>("");
  const [asnTreatment, setAsnTreatment] = useState<string>("");
  const [asnSaving, setAsnSaving] = useState(false);

  // Signature viewer
  const [sigForm, setSigForm] = useState<ConsentForm | null>(null);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["consent_templates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_consent_templates" as any)
        .select("*").eq("tenant_id", tenantId).eq("is_active", true).order("created_at", { ascending: false });
      if (error) return [];
      return (data || []) as unknown as Template[];
    },
    enabled: !!tenantId,
  });

  const { data: forms = [] } = useQuery<ConsentForm[]>({
    queryKey: ["consent_forms", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_consent_forms" as any)
        .select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50);
      if (error) return [];
      return (data || []) as unknown as ConsentForm[];
    },
    enabled: !!tenantId,
  });

  const { data: sigData } = useQuery<Signature | null>({
    queryKey: ["consent_signature", sigForm?.id],
    queryFn: async () => {
      if (!sigForm) return null;
      const { data } = await supabase.from("consent_signatures" as any)
        .select("*").eq("consent_form_id", sigForm.id).maybeSingle();
      return (data || null) as unknown as Signature | null;
    },
    enabled: !!sigForm,
  });

  const handleCreateTemplate = async () => {
    if (!tplTitle.trim() || !tplBody.trim()) { toast({ title: "Title and body required", variant: "destructive" }); return; }
    setTplSaving(true);
    try {
      const { error } = await supabase.from("clinic_consent_templates" as any).insert({
        tenant_id: tenantId, title: tplTitle.trim(), body_markdown: tplBody.trim(),
        treatment_id: tplTreatment || null, is_active: true, version: 1,
      } as any);
      if (error) throw error;
      toast({ title: "Template created" });
      setTplOpen(false); setTplTitle(""); setTplBody(""); setTplTreatment("");
      queryClient.invalidateQueries({ queryKey: ["consent_templates", tenantId] });
    } catch (err: any) { toast({ title: "Save failed", description: err?.message || "Unknown error", variant: "destructive" }); }
    finally { setTplSaving(false); }
  };

  const handleAssign = async () => {
    if (!asnPatient || !asnTemplate) { toast({ title: "Patient and template required", variant: "destructive" }); return; }
    setAsnSaving(true);
    try {
      const { error } = await supabase.from("clinic_consent_forms" as any).insert({
        tenant_id: tenantId, patient_id: asnPatient, template_id: asnTemplate,
        treatment_id: asnTreatment || null, status: "pending", sent_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast({ title: "Consent form assigned", description: "Status: pending — awaiting patient signature" });
      setAsnOpen(false); setAsnPatient(""); setAsnTemplate(""); setAsnTreatment("");
      queryClient.invalidateQueries({ queryKey: ["consent_forms", tenantId] });
    } catch (err: any) { toast({ title: "Assign failed", description: err?.message || "Unknown error", variant: "destructive" }); }
    finally { setAsnSaving(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-7 w-7" /> Consent Forms</h1>
        <p className="text-muted-foreground">Templates and patient consent tracking</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT: Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><FileSignature className="h-4 w-4" /> Templates</CardTitle>
              <Button size="sm" onClick={() => setTplOpen(true)} data-testid="create-template-button">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No templates yet. Create one to start.</p>
            ) : (
              <div className="space-y-2" data-testid="templates-list">
                {templates.map(t => (
                  <Card key={t.id} className="bg-muted/30" data-testid={`template-${t.id}`}>
                    <CardContent className="py-2 px-3">
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 whitespace-pre-line">{t.body_markdown.slice(0, 150)}{t.body_markdown.length > 150 ? "…" : ""}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                        {t.treatment_id && <Badge variant="outline" className="text-[10px]">treatment-linked</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Active forms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Active forms</CardTitle>
              <Button size="sm" onClick={() => setAsnOpen(true)} disabled={templates.length === 0 || patients.length === 0} data-testid="assign-consent-button">
                <Plus className="h-3.5 w-3.5 mr-1" /> Assign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No forms assigned yet.</p>
            ) : (
              <div className="space-y-2" data-testid="consent-forms-list">
                {forms.map(f => {
                  const patient = patients.find((p: any) => p.id === f.patient_id);
                  const template = templates.find(t => t.id === f.template_id);
                  return (
                    <Card key={f.id} className="bg-muted/30" data-testid={`consent-form-${f.id}`}>
                      <CardContent className="py-2 px-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{patient?.full_name || "Unknown patient"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{template?.title || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(f.created_at, "short")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${STATUS_COLOR[f.status] || ""}`}>{f.status}</Badge>
                          {f.status === "signed" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSigForm(f)} data-testid={`view-signature-${f.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create template dialog */}
      <Dialog open={tplOpen} onOpenChange={(v) => { if (!v) setTplOpen(false); }}>
        <DialogContent className="max-w-lg" data-testid="create-template-dialog">
          <DialogHeader><DialogTitle>Create consent template</DialogTitle><DialogDescription>Markdown supported in body</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input data-testid="template-title-input" value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Treatment (optional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={tplTreatment} onChange={(e) => setTplTreatment(e.target.value)} data-testid="template-treatment-input">
                <option value="">— general (any treatment) —</option>
                {treatments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Body (markdown)</Label><Textarea rows={8} data-testid="template-body-input" value={tplBody} onChange={(e) => setTplBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={tplSaving} data-testid="template-save-submit">{tplSaving ? "Saving…" : "Create template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={asnOpen} onOpenChange={(v) => { if (!v) setAsnOpen(false); }}>
        <DialogContent className="max-w-md" data-testid="assign-consent-dialog">
          <DialogHeader><DialogTitle>Assign consent form</DialogTitle><DialogDescription>Status will start as 'pending' until patient signs</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Patient *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={asnPatient} onChange={(e) => setAsnPatient(e.target.value)} data-testid="assign-patient-input">
                <option value="">— pick a patient —</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Template *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={asnTemplate} onChange={(e) => setAsnTemplate(e.target.value)} data-testid="assign-template-input">
                <option value="">— pick a template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Treatment (optional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={asnTreatment} onChange={(e) => setAsnTreatment(e.target.value)} data-testid="assign-treatment-input">
                <option value="">— optional —</option>
                {treatments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsnOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={asnSaving} data-testid="assign-submit">{asnSaving ? "Assigning…" : "Assign consent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature viewer */}
      <Dialog open={!!sigForm} onOpenChange={(v) => { if (!v) setSigForm(null); }}>
        <DialogContent className="max-w-lg" data-testid="signature-viewer-dialog">
          <DialogHeader><DialogTitle>Signed consent</DialogTitle><DialogDescription>{sigData?.signed_by_name} · {sigData?.signed_at ? formatDate(sigData.signed_at, "medium") : ""}</DialogDescription></DialogHeader>
          {sigData?.signature_data ? (
            <img src={sigData.signature_data.startsWith("data:") ? sigData.signature_data : `data:image/png;base64,${sigData.signature_data}`} alt="Signature" className="w-full rounded border bg-white" />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No signature image stored.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
