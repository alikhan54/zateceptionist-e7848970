import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinicConsultations, ClinicConsultation } from "@/hooks/useClinicConsultations";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { FileText, Plus, Calendar, Stethoscope, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function generateReport(consultation: ClinicConsultation, patientName: string, treatmentName: string): string {
  const date = new Date(consultation.consultation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let report = `CLINICAL CONSULTATION REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `Date: ${date}\n`;
  report += `Patient: ${patientName}\n`;
  report += `Doctor: ${consultation.doctor_name || 'N/A'}\n`;
  report += `Treatment: ${treatmentName || 'General Consultation'}\n`;
  report += `Status: ${consultation.status}\n\n`;
  if (consultation.chief_complaint) report += `CHIEF COMPLAINT:\n${consultation.chief_complaint}\n\n`;
  if (consultation.examination_notes) report += `EXAMINATION NOTES:\n${consultation.examination_notes}\n\n`;
  if (consultation.diagnosis) report += `DIAGNOSIS:\n${consultation.diagnosis}\n\n`;
  if (consultation.treatment_plan) report += `TREATMENT PLAN:\n${consultation.treatment_plan}\n\n`;
  if (consultation.prescriptions_given && consultation.prescriptions_given.length > 0) {
    report += `PRESCRIPTIONS:\n`;
    consultation.prescriptions_given.forEach((rx: any, i: number) => {
      report += `  ${i + 1}. ${typeof rx === 'object' ? `${rx.name} - ${rx.dosage || ''} ${rx.frequency || ''}` : rx}\n`;
    });
    report += `\n`;
  }
  if (consultation.follow_up_date) report += `FOLLOW-UP: ${consultation.follow_up_date}\n`;
  if (consultation.follow_up_notes) report += `Follow-up Notes: ${consultation.follow_up_notes}\n`;
  report += `\n${'='.repeat(50)}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n`;
  report += `This report is for clinical reference only.\n`;
  return report;
}

export default function ConsultationNotes() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { consultations, isLoading, createConsultation } = useClinicConsultations(selectedPatient || undefined);
  const { patients } = useClinicPatients();
  const { treatments } = useClinicTreatments();
  const { toast } = useToast();

  const [newConsultation, setNewConsultation] = useState({
    patient_id: "", treatment_id: "", doctor_name: "", consultation_date: new Date().toISOString().split('T')[0],
    chief_complaint: "", examination_notes: "", diagnosis: "", treatment_plan: "", follow_up_date: "", follow_up_notes: "",
  });

  const handleCreate = async () => {
    if (!newConsultation.patient_id) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }
    try {
      await createConsultation.mutateAsync({
        ...newConsultation,
        treatment_id: newConsultation.treatment_id || null,
        status: 'completed',
      } as any);
      toast({ title: "Success", description: "Consultation saved" });
      setShowAddDialog(false);
      setNewConsultation({ patient_id: "", treatment_id: "", doctor_name: "", consultation_date: new Date().toISOString().split('T')[0], chief_complaint: "", examination_notes: "", diagnosis: "", treatment_plan: "", follow_up_date: "", follow_up_notes: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrintReport = (consultation: ClinicConsultation) => {
    const patient = patients.find(p => p.id === consultation.patient_id);
    const treatment = treatments.find(t => t.id === consultation.treatment_id);
    const report = generateReport(consultation, patient?.full_name || 'Unknown', treatment?.name || '');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${report}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultation Notes</h1>
          <p className="text-muted-foreground">Clinical documentation and doctor reports</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Consultation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Consultation</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Patient *</Label>
                  <Select value={newConsultation.patient_id} onValueChange={(v) => setNewConsultation({...newConsultation, patient_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Treatment</Label>
                  <Select value={newConsultation.treatment_id} onValueChange={(v) => setNewConsultation({...newConsultation, treatment_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select treatment" /></SelectTrigger>
                    <SelectContent>{treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Doctor Name</Label>
                  <Input value={newConsultation.doctor_name} onChange={(e) => setNewConsultation({...newConsultation, doctor_name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input type="date" value={newConsultation.consultation_date} onChange={(e) => setNewConsultation({...newConsultation, consultation_date: e.target.value})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Chief Complaint</Label>
                <Textarea value={newConsultation.chief_complaint} onChange={(e) => setNewConsultation({...newConsultation, chief_complaint: e.target.value})} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Examination Notes</Label>
                <Textarea value={newConsultation.examination_notes} onChange={(e) => setNewConsultation({...newConsultation, examination_notes: e.target.value})} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Diagnosis</Label>
                <Textarea value={newConsultation.diagnosis} onChange={(e) => setNewConsultation({...newConsultation, diagnosis: e.target.value})} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Treatment Plan</Label>
                <Textarea value={newConsultation.treatment_plan} onChange={(e) => setNewConsultation({...newConsultation, treatment_plan: e.target.value})} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Follow-up Date</Label>
                  <Input type="date" value={newConsultation.follow_up_date} onChange={(e) => setNewConsultation({...newConsultation, follow_up_date: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Follow-up Notes</Label>
                  <Input value={newConsultation.follow_up_notes} onChange={(e) => setNewConsultation({...newConsultation, follow_up_notes: e.target.value})} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createConsultation.isPending}>
                {createConsultation.isPending ? "Saving..." : "Save Consultation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-xs">
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger><SelectValue placeholder="All patients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Patients</SelectItem>
            {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading consultations...</p>
      ) : consultations.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No consultations found. Create your first consultation to get started.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {consultations.map((c) => {
            const patient = patients.find(p => p.id === c.patient_id);
            const treatment = treatments.find(t => t.id === c.treatment_id);
            return (
              <Card key={c.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h3 className="font-semibold">{patient?.full_name || 'Unknown Patient'}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {new Date(c.consultation_date).toLocaleDateString()}
                          {c.doctor_name && <><Stethoscope className="h-3 w-3 ml-2" /> Dr. {c.doctor_name}</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.status === 'completed' ? 'default' : 'secondary'}>{c.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => handlePrintReport(c)}>
                        <Printer className="h-3 w-3 mr-1" /> Report
                      </Button>
                    </div>
                  </div>
                  {treatment && <Badge variant="outline" className="mb-2">{treatment.name}</Badge>}
                  <div className="grid gap-2 text-sm">
                    {c.chief_complaint && <div><span className="font-medium">Complaint:</span> {c.chief_complaint}</div>}
                    {c.diagnosis && <div><span className="font-medium">Diagnosis:</span> {c.diagnosis}</div>}
                    {c.treatment_plan && <div><span className="font-medium">Plan:</span> <span className="line-clamp-2">{c.treatment_plan}</span></div>}
                    {c.follow_up_date && <div className="text-muted-foreground">Follow-up: {new Date(c.follow_up_date).toLocaleDateString()}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
