import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Syringe, CheckCircle2, PackageMinus, Lock, Gift } from "lucide-react";
import type { ClinicVisit } from "@/hooks/useClinicVisits";
import {
  useClinicTreatmentsList, useOpsConsumables, useTreatmentRecipe, useVisitAdministration,
  usePatientPackages, useAdministerTreatment, type ConsumableLine,
} from "@/hooks/useClinicTreatmentAdmin";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function TreatmentAdminDialog({
  visit, onClose, onAdministered,
}: { visit: ClinicVisit | null; onClose: () => void; onAdministered: () => void }) {
  const { toast } = useToast();
  const { data: treatments = [] } = useClinicTreatmentsList();
  const { data: opsItems = [] } = useOpsConsumables();
  const { data: existing } = useVisitAdministration(visit?.id);
  const { data: patientPackages = [] } = usePatientPackages(visit?.patient_id);
  const administer = useAdministerTreatment();

  const [treatmentId, setTreatmentId] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("");
  const [details, setDetails] = useState("");
  const [lines, setLines] = useState<ConsumableLine[]>([]);
  const { data: recipe = [] } = useTreatmentRecipe(treatmentId || undefined);

  const locked = !!visit?.is_locked;
  const ledger = existing?.treatments ?? [];
  const consumablesByVisit = existing?.consumables ?? [];
  const selectedTreatment = useMemo(() => treatments.find((t) => t.id === treatmentId), [treatments, treatmentId]);
  const coveringPkg = useMemo(
    () => patientPackages.find((p: any) => p.treatment_id === treatmentId && p.status === "active" && Number(p.sessions_remaining) > 0),
    [patientPackages, treatmentId],
  );
  const tName = (id: string) => treatments.find((t) => t.id === id)?.name ?? "Treatment";

  const resetForm = () => { setTreatmentId(""); setDose(""); setDoseUnit(""); setDetails(""); setLines([]); };
  useEffect(() => { resetForm(); }, [visit?.id]);
  // On treatment change: set dose/unit defaults + clear consumable lines.
  useEffect(() => { setDose(selectedTreatment?.default_dose ?? ""); setDoseUnit(selectedTreatment?.dosage_unit ?? ""); setLines([]); }, [treatmentId, selectedTreatment]);
  // When the recipe arrives, prefill ONLY if the user hasn't already added lines (a late
  // recipe must never clobber manual edits).
  useEffect(() => {
    setLines((prev) => prev.length ? prev : recipe.map((r) => ({ stockItemId: r.stock_item_id, quantity: Number(r.default_quantity) || 1 })));
  }, [recipe]);

  if (!visit) return null;

  const submit = async () => {
    if (!treatmentId) { toast({ title: "Pick a treatment", variant: "destructive" }); return; }
    if (!dose.trim()) { toast({ title: "Enter a dose", variant: "destructive" }); return; }
    const consumables = lines.filter((l) => l.stockItemId && Number(l.quantity) > 0);
    try {
      await administer.mutateAsync({
        visitId: visit.id, patientId: visit.patient_id, treatmentId,
        dose: dose.trim(), doseUnit: doseUnit.trim() || "unit", administrationDetails: details.trim(), consumables,
      });
      toast({
        title: "Treatment added to ledger",
        description: `${tName(treatmentId)} recorded${consumables.length ? ` + ${consumables.length} consumable(s) decremented` : ""}${coveringPkg ? " · 1 package session deducted" : ""}.`,
      });
      resetForm();       // ready to stack the next treatment; the committed line is now immutable
      onAdministered();  // refresh board counts
    } catch (e: any) {
      toast({ title: "Could not administer", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="treatment-admin-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4" /> Encounter ledger — {visit.patient?.full_name ?? "Patient"} (Visit #{visit.visit_number})
            {locked && <Badge variant="secondary" className="ml-1"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* committed ledger (read-only; each line is immutable + already decremented) */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Administered (<span data-testid="ledger-count">{ledger.length}</span>)</div>
          {ledger.length === 0
            ? <div className="text-xs text-muted-foreground">No treatments recorded yet.</div>
            : ledger.map((t: any) => (
              <div key={t.id} className="rounded border p-2 text-sm" data-testid="ta-ledger-line">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tName(t.treatment_id)}</span>
                  {t.package_id
                    ? <Badge variant="outline" className="text-[10px]" data-testid="ta-ledger-covered"><Gift className="h-3 w-3 mr-1" />package −1</Badge>
                    : <Badge variant="outline" className="text-[10px]">pay-per-use</Badge>}
                </div>
                <div className="text-muted-foreground">Dose: {t.dose_administered} {t.dose_unit}{t.administration_details ? ` · ${t.administration_details}` : ""}</div>
              </div>
            ))}
          {consumablesByVisit.length > 0 && (
            <div className="text-xs text-muted-foreground" data-testid="ta-ledger-consumables">
              Consumables used: {consumablesByVisit.map((c: any) => `${c.item?.name ?? c.stock_item_id} (−${c.quantity_used})`).join(", ")}
            </div>
          )}
        </div>

        {/* add-treatment form — hidden once the visit is locked */}
        {locked ? (
          <div className="text-sm text-emerald-600 flex items-center gap-2 border-t pt-3" data-testid="ta-locked-note">
            <CheckCircle2 className="h-4 w-4" /> Visit completed — ledger is final; no further treatments or decrements.
          </div>
        ) : (
          <div className="space-y-3 border-t pt-3">
            <div className="text-sm font-medium">Add treatment</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Treatment *</Label>
                <select className={selectClass} data-testid="ta-treatment" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
                  <option value="">— select treatment —</option>
                  {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {coveringPkg && (
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1" data-testid="ta-coverage">
                    <Gift className="h-3 w-3" /> Covered by package — {coveringPkg.sessions_remaining} session(s) left; 1 will be deducted.
                  </div>
                )}
              </div>
              <div className="space-y-1"><Label className="text-xs">Dose *</Label>
                <Input data-testid="ta-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 20" /></div>
              <div className="space-y-1"><Label className="text-xs">Unit</Label>
                <Input data-testid="ta-dose-unit" value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} placeholder="e.g. Units" /></div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Administration details</Label>
                <Input data-testid="ta-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="brand / site / notes" /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1"><PackageMinus className="h-3 w-3" /> Consumables used (decrement inventory)</Label>
                <Button size="sm" variant="outline" data-testid="ta-add-consumable" onClick={() => setLines((p) => [...p, { stockItemId: "", quantity: 1 }])}>
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
                    <Button size="icon" variant="ghost" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    {item && Number(line.quantity) > Number(item.current_stock ?? 0) && (
                      <Badge variant="destructive" className="text-[10px]">over stock</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" data-testid="ta-done-btn" onClick={onClose}>Done</Button>
              <Button data-testid="ta-administer-btn" onClick={submit} disabled={administer.isPending}>
                <Syringe className="h-4 w-4 mr-1" /> {administer.isPending ? "Adding…" : "Administer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
