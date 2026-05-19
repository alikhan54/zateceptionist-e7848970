import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pill } from "lucide-react";
import { useCreatePrescription } from "@/hooks/useClinicPatient";
import { useToast } from "@/hooks/use-toast";

type Medicine = { name: string; dosage: string; frequency: string; duration: string };
const NO_CONSULTATION = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  consultations?: Array<{ id: string; chief_complaint: string | null; diagnosis: string | null; created_at: string }>;
}

export function AddPrescriptionDialog({ open, onOpenChange, patientId, patientName, consultations = [] }: Props) {
  const { toast } = useToast();
  const create = useCreatePrescription(patientId);
  const [prescribedBy, setPrescribedBy] = useState("");
  const [consultationId, setConsultationId] = useState<string>(NO_CONSULTATION);
  const [notes, setNotes] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);

  const reset = () => {
    setPrescribedBy("");
    setConsultationId(NO_CONSULTATION);
    setNotes("");
    setPharmacyName("");
    setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const updateMed = (idx: number, patch: Partial<Medicine>) => {
    setMedicines(prev => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  const addMed = () => setMedicines(prev => [...prev, { name: "", dosage: "", frequency: "", duration: "" }]);
  const removeMed = (idx: number) => setMedicines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const validMeds = medicines.filter(m => m.name.trim().length > 0);
  const canSubmit = validMeds.length > 0 && !create.isPending;

  const handleSubmit = async () => {
    try {
      await create.mutateAsync({
        patient_id: patientId,
        consultation_id: consultationId === NO_CONSULTATION ? null : consultationId,
        prescribed_by: prescribedBy.trim() || "Practitioner",
        medicines: validMeds.map(m => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || undefined,
          frequency: m.frequency.trim() || undefined,
          duration: m.duration.trim() || undefined,
        })),
        notes: notes.trim() || null,
        pharmacy_name: pharmacyName.trim() || null,
      });
      toast({ title: "Prescription added", description: `${validMeds.length} medicine${validMeds.length > 1 ? "s" : ""} prescribed to ${patientName}.` });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not add prescription",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="add-prescription-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-amber-500" />
            New Prescription
          </DialogTitle>
          <DialogDescription>For {patientName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Practitioner + consultation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rx-prescriber">Prescribed by</Label>
              <Input
                id="rx-prescriber"
                data-testid="rx-prescribed-by"
                placeholder="Dr. Khan"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-consultation">Linked consultation (optional)</Label>
              <Select value={consultationId} onValueChange={setConsultationId}>
                <SelectTrigger id="rx-consultation" data-testid="rx-consultation-select">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONSULTATION}>None</SelectItem>
                  {consultations.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.diagnosis || c.chief_complaint || "Consultation").slice(0, 40)} · {new Date(c.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Medicines list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Medicines</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addMed} data-testid="rx-add-medicine">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add medicine
              </Button>
            </div>
            {medicines.map((m, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Medicine {idx + 1}</span>
                  {medicines.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMed(idx)}
                      aria-label="Remove medicine"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Input
                  data-testid={`rx-med-name-${idx}`}
                  placeholder="Medicine name (required)"
                  value={m.name}
                  onChange={(e) => updateMed(idx, { name: e.target.value })}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    data-testid={`rx-med-dosage-${idx}`}
                    placeholder="Dosage (e.g. 500mg)"
                    value={m.dosage}
                    onChange={(e) => updateMed(idx, { dosage: e.target.value })}
                  />
                  <Input
                    data-testid={`rx-med-frequency-${idx}`}
                    placeholder="Frequency (e.g. BID)"
                    value={m.frequency}
                    onChange={(e) => updateMed(idx, { frequency: e.target.value })}
                  />
                  <Input
                    data-testid={`rx-med-duration-${idx}`}
                    placeholder="Duration (e.g. 7 days)"
                    value={m.duration}
                    onChange={(e) => updateMed(idx, { duration: e.target.value })}
                  />
                </div>
              </div>
            ))}
            {validMeds.length === 0 && (
              <p className="text-xs text-muted-foreground">At least one medicine with a name is required.</p>
            )}
          </div>

          {/* Notes + pharmacy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rx-pharmacy">Pharmacy (optional)</Label>
              <Input
                id="rx-pharmacy"
                data-testid="rx-pharmacy"
                placeholder="Pharmacy name"
                value={pharmacyName}
                onChange={(e) => setPharmacyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-notes">Notes (optional)</Label>
              <Textarea
                id="rx-notes"
                data-testid="rx-notes"
                placeholder="Additional instructions"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="rx-submit"
          >
            {create.isPending ? "Saving..." : "Save prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
