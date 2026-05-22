import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface PatientLike {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  allergies: any;
  notes: string | null;
}

interface EditPatientDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: PatientLike;
}

function allergiesToString(v: any): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && Array.isArray(v.items)) return v.items.join(", ");
  return "";
}

export function EditPatientDialog({ open, onOpenChange, patient }: EditPatientDialogProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(patient.full_name);
  const [phone, setPhone] = useState(patient.phone || "");
  const [email, setEmail] = useState(patient.email || "");
  const [dob, setDob] = useState(patient.date_of_birth || "");
  const [gender, setGender] = useState(patient.gender || "");
  const [allergies, setAllergies] = useState(allergiesToString(patient.allergies));
  const [notes, setNotes] = useState(patient.notes || "");

  useEffect(() => {
    if (open) {
      setFullName(patient.full_name);
      setPhone(patient.phone || "");
      setEmail(patient.email || "");
      setDob(patient.date_of_birth || "");
      setGender(patient.gender || "");
      setAllergies(allergiesToString(patient.allergies));
      setNotes(patient.notes || "");
    }
  }, [open, patient]);

  const updatePatient = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const name = fullName.trim();
      if (!name) throw new Error("Full name is required");
      const allergyList = allergies.split(",").map(s => s.trim()).filter(Boolean);
      const { error } = await supabase
        .from("clinic_patients" as any)
        .update({
          full_name: name,
          phone: phone.trim() || null,
          email: email.trim() || null,
          date_of_birth: dob || null,
          gender: gender || null,
          allergies: allergyList.length ? allergyList : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", patient.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_patient", tenantId, patient.id] });
      queryClient.invalidateQueries({ queryKey: ["clinic_patients", tenantId] });
      toast({ title: "Patient updated" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Could not update", description: e?.message || "Unknown error", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="edit-patient-dialog">
        <DialogHeader>
          <DialogTitle>Edit patient</DialogTitle>
          <DialogDescription>{patient.full_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Full name</Label>
            <Input id="ep-name" data-testid="edit-patient-name-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-phone">Phone</Label>
              <Input id="ep-phone" data-testid="edit-patient-phone-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-email">Email</Label>
              <Input id="ep-email" type="email" data-testid="edit-patient-email-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ep-dob">Date of birth</Label>
              <Input id="ep-dob" type="date" data-testid="edit-patient-dob-input" value={dob || ""} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-gender">Gender</Label>
              <select
                id="ep-gender"
                data-testid="edit-patient-gender-input"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">(unspecified)</option>
                <option value="female">female</option>
                <option value="male">male</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-allergies">Allergies <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
            <Input id="ep-allergies" data-testid="edit-patient-allergies-input" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. penicillin, latex" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-notes">Notes</Label>
            <Textarea id="ep-notes" data-testid="edit-patient-notes-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => updatePatient.mutate()}
            disabled={updatePatient.isPending}
            data-testid="edit-patient-submit"
          >
            {updatePatient.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
