import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import {
  useClinicTreatmentsList, useClinicPackageTemplates, useCreatePackageTemplate,
  useSellPackage, type TemplateLineInput,
} from "@/hooks/useClinicTreatmentAdmin";
import { Plus, Trash2, Package, Gift, ShoppingCart } from "lucide-react";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const METHODS = ["cash", "card", "tabby", "tamara", "bank_transfer"];

export default function ClinicPackages() {
  const { isHealthcareClinic } = useTenant();
  const { toast } = useToast();
  const { data: treatments = [] } = useClinicTreatmentsList();
  const { patients } = useClinicPatients();
  const { data: templates = [] } = useClinicPackageTemplates();
  const createTpl = useCreatePackageTemplate();
  const sell = useSellPackage();

  // builder state
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [lines, setLines] = useState<TemplateLineInput[]>([{ treatmentId: "", sessions: 6, isComplimentary: false }]);

  // sell state
  const [sellTpl, setSellTpl] = useState("");
  const [sellPatient, setSellPatient] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [sellMethod, setSellMethod] = useState("cash");

  if (!isHealthcareClinic) {
    return (
      <div className="space-y-6 p-6" data-testid="clinic-packages-not-available">
        <h1 className="text-3xl font-bold tracking-tight">Packages</h1>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Packages are only available for healthcare clinic workspaces.</CardContent></Card>
      </div>
    );
  }
  const tName = (id: string) => treatments.find((t) => t.id === id)?.name ?? id;

  const createTemplate = async () => {
    if (!name.trim()) { toast({ title: "Name the package", variant: "destructive" }); return; }
    try {
      await createTpl.mutateAsync({ name: name.trim(), description: desc.trim(), basePrice: Number(price) || 0, lines });
      toast({ title: "Package template created" });
      setName(""); setDesc(""); setPrice(""); setLines([{ treatmentId: "", sessions: 6, isComplimentary: false }]);
    } catch (e: any) { toast({ title: "Could not create template", description: e.message, variant: "destructive" }); }
  };
  const sellPackage = async () => {
    if (!sellTpl || !sellPatient) { toast({ title: "Pick a template and a patient", variant: "destructive" }); return; }
    try {
      await sell.mutateAsync({ patientId: sellPatient, templateId: sellTpl, amountPaid: Number(sellAmount) || 0, paymentMethod: sellMethod });
      toast({ title: "Package sold", description: "Patient package(s) + payment recorded." });
      setSellAmount("");
    } catch (e: any) { toast({ title: "Could not sell package", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Package className="h-6 w-6" />Packages</h1>
        <p className="text-muted-foreground">Prepaid treatment bundles — build once, sell to patients, auto-deduct sessions on the floor.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Template builder */}
        <Card>
          <CardHeader><CardTitle className="text-base">Build a template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Name *</Label><Input data-testid="pkg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Botox 6-pack" /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Input data-testid="pkg-desc" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Base price (excl. VAT)</Label><Input data-testid="pkg-price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 3000" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Treatments × sessions</Label>
                <Button size="sm" variant="outline" data-testid="pkg-add-line" onClick={() => setLines((p) => [...p, { treatmentId: "", sessions: 6, isComplimentary: false }])}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2" data-testid="pkg-line">
                  <select className={selectClass} data-testid={`pkg-line-treatment-${i}`} value={l.treatmentId}
                    onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, treatmentId: e.target.value } : x))}>
                    <option value="">— treatment —</option>
                    {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Input type="number" className="w-20" data-testid={`pkg-line-sessions-${i}`} value={String(l.sessions)}
                    onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, sessions: Number(e.target.value) } : x))} />
                  <label className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <input type="checkbox" data-testid={`pkg-line-comp-${i}`} checked={l.isComplimentary}
                      onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, isComplimentary: e.target.checked } : x))} />
                    <Gift className="h-3 w-3" />free
                  </label>
                  <Button size="icon" variant="ghost" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end"><Button data-testid="pkg-create-btn" onClick={createTemplate} disabled={createTpl.isPending}>Create template</Button></div>
          </CardContent>
        </Card>

        {/* Sell to patient */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Sell to a patient</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Package *</Label>
              <select className={selectClass} data-testid="sell-template" value={sellTpl} onChange={(e) => setSellTpl(e.target.value)}>
                <option value="">— select package —</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name} (AED {t.base_price})</option>)}
              </select></div>
            <div className="space-y-1"><Label className="text-xs">Patient *</Label>
              <select className={selectClass} data-testid="sell-patient" value={sellPatient} onChange={(e) => setSellPatient(e.target.value)}>
                <option value="">— select patient —</option>
                {(patients as any[]).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Amount paid</Label><Input data-testid="sell-amount" type="number" step="0.01" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Method</Label>
                <select className={selectClass} data-testid="sell-method" value={sellMethod} onChange={(e) => setSellMethod(e.target.value)}>
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select></div>
            </div>
            <div className="flex justify-end"><Button data-testid="sell-btn" onClick={sellPackage} disabled={sell.isPending}>Sell package</Button></div>
            <p className="text-[11px] text-muted-foreground">No payment gateway — records amount/method only. Sessions auto-deduct when a covered treatment is administered on the Visit Board.</p>
          </CardContent>
        </Card>
      </div>

      {/* Template list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Templates ({templates.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0
            ? <div className="text-sm text-muted-foreground">No templates yet — build one above.</div>
            : templates.map((t: any) => (
              <div key={t.id} className="rounded border p-2 text-sm" data-testid="pkg-template-row">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">AED {t.base_price}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(t.lines || []).map((l: any) => `${tName(l.treatment_id)} ×${l.sessions}${l.is_complimentary ? " (free)" : ""}`).join(" · ") || "no treatments"}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
