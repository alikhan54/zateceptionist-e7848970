import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Syringe, CheckCircle2, PackageMinus } from "lucide-react";
import type { ClinicVisit } from "@/hooks/useClinicVisits";
import {
  useClinicTreatmentsList, useOpsConsumables, useTreatmentRecipe,
  useVisitAdministration, useAdministerTreatment, type ConsumableLine,
} from "@/hooks/useClinicTreatmentAdmin";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function TreatmentAdminDialog({
  visit, onClose, onAdministered,
}: { visit: ClinicVisit | null; onClose: () => void; onAdministered: () => void }) {
  const { toast } = useToast();
  const { data: treatments = [] } = useClinicTreatmentsList();
  const { data: opsItems = [] } = useOpsConsumables();
  const { data: existing } = useVisitAdministration(visit?.id);
  const administer = useAdministerTreatment();

  const [treatmentId, setTreatmentId] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("");
  const [details, setDetails] = useState("");
  const [lines, setLines] = useState<ConsumableLine[]>([]);
  const { data: recipe = [] } = useTreatmentRecipe(treatmentId || undefined);

  const alreadyAdministered = (existing?.treatments?.length ?? 0) > 0;
  const selectedTreatment = useMemo(() => treatments.find((t) => t.id === treatmentId), [treatments, treatmentId]);

  // reset the form whenever the dialog target changes
  useEffect(() => {
    setTreatmentId(""); setDose(""); setDoseUnit(""); setDetails(""); setLines([]);
  }, [visit?.id]);

  // when a treatment is chosen, prefill dose/unit + the recipe's default consumables
  useEffect(() => {
    if (!treatmentId) return;
    setDose(selectedTreatment?.default_dose ?? "");
    setDoseUnit(selectedTreatment?.dosage_unit ?? "");
  }, [treatmentId, selectedTreatment]);
  useEffect(() => {
    if (!treatmentId) return;
    setLines(recipe.map((r) => ({ stockItemId: r.stock_item_id, quantity: Number(r.default_quantity) || 1 })));
  }, [treatmentId, recipe]);

  if (!visit) return null;

  const submit = async () => {
    if (!treatmentId) { toast({ title: "Pick a treatment", variant: "destructive" }); return; }
    if (!dose.trim()) { toast({ title: "Enter a dose", variant: "destructive" }); return; }
    const consumables = lines.filter((l) => l.stockItemId && Number(l.quantity) > 0);
    try {
      await administer.mutateAsync({
        visitId: visit.id, treatmentId, dose: dose.trim(), doseUnit: doseUnit.trim() || "unit",
        administrationDetails: details.trim(), consumables,
      });
      toast({ title: "Treatment administered", description: `Recorded + ${consumables.length} consumable(s) decremented from inventory.` });
      onAdministered();
    } catch (e: any) {
      toast({ title: "Could not administer", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="treatment-admin-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4" /> Administer Treatment — {visit.patient?.full_name ?? "Patient"} (Visit #{visit.visit_number})
          </DialogTitle>
        </DialogHeader>

        {alreadyAdministered ? (
          <div className="space-y-3" data-testid="ta-recorded">
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Treatment already recorded for this visit (inventory was decremented once — re-administering is blocked).
            </div>
            {existing!.treatments.map((t: any) => (
              <div key={t.id} className="rounded border p-2 text-sm">
                <div className="font-medium">{treatments.find((x) => x.id === t.treatment_id)?.name ?? "Treatment"}</div>
                <div className="text-muted-foreground">Dose: {t.dose_administered} {t.dose_unit}{t.administration_details ? ` · ${t.administration_details}` : ""}</div>
              </div>
            ))}
            <div className="text-sm font-medium pt-1">Consumables used</div>
            {existing!.consumables.length === 0
              ? <div className="text-xs text-muted-foreground">None recorded.</div>
              : existing!.consumables.map((c: any) => (
                <div key={c.id} className="text-xs flex items-center justify-between border-b py-1" data-testid="ta-recorded-consumable">
                  <span>{c.item?.name ?? c.stock_item_id}</span>
                  <span className="text-muted-foreground">−{c.quantity_used} {c.item?.unit ?? ""}</span>
                </div>
              ))}
            <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Treatment *</Label>
                <select className={selectClass} data-testid="ta-treatment" value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}>
                  <option value="">— select treatment —</option>
                  {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dose *</Label>
                <Input data-testid="ta-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Input data-testid="ta-dose-unit" value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} placeholder="e.g. Units" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Administration details</Label>
                <Input data-testid="ta-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="brand / site / notes" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1"><PackageMinus className="h-3 w-3" /> Consumables used (decrement inventory)</Label>
                <Button size="sm" variant="outline" data-testid="ta-add-consumable"
                  onClick={() => setLines((p) => [...p, { stockItemId: "", quantity: 1 }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {lines.length === 0 && <div className="text-xs text-muted-foreground">No consumables — add the items this treatment uses.</div>}
              {lines.map((line, i) => {
                const item = opsItems.find((o) => o.id === line.stockItemId);
                return (
                  <div key={i} className="flex items-center gap-2" data-testid="ta-consumable-row">
                    <select className={selectClass} data-testid={`ta-consumable-item-${i}`} value={line.stockItemId}
                      onChange={(e) => setLines((p) => p.map((l, j) => j === i ? { ...l, stockItemId: e.target.value } : l))}>
                      <option value="">— select item —</option>
                      {opsItems.map((o) => <option key={o.id} value={o.id}>{o.name} (stock {o.current_stock ?? 0}{o.unit ? ` ${o.unit}` : ""})</option>)}
                    </select>
                    <Input type="number" step="0.01" className="w-24" data-testid={`ta-consumable-qty-${i}`}
                      value={String(line.quantity)} onChange={(e) => setLines((p) => p.map((l, j) => j === i ? { ...l, quantity: Number(e.target.value) } : l))} />
                    <Button size="icon" variant="ghost" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {item && Number(line.quantity) > Number(item.current_stock ?? 0) && (
                      <Badge variant="destructive" className="text-[10px]" data-testid={`ta-overstock-${i}`}>over stock</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button data-testid="ta-administer-btn" onClick={submit} disabled={administer.isPending}>
                <Syringe className="h-4 w-4 mr-1" /> Administer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
