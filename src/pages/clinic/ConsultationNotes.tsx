import { formatDate } from "@/lib/utils";
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
import { FileText, Plus, Calendar, Stethoscope, Printer, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Helpers to unwrap jsonb fields back to display strings
function planText(plan: any): string {
  if (!plan) return "";
  if (typeof plan === "string") return plan;
  if (typeof plan === "object") return plan.notes || plan.text || JSON.stringify(plan);
  return String(plan);
}

function generateReport(consultation: ClinicConsultation, patientName: string): string {
  const date = new Date(consultation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let report = `CLINICAL CONSULTATION REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `Date: ${date}\n`;
  report += `Patient: ${patientName}\n`;
  report += `Practitioner: ${consultation.practitioner_name || 'N/A'}\n`;
  report += `Status: ${consultation.report_status || 'draft'}\n\n`;
  if (consultation.chief_complaint) report += `CHIEF COMPLAINT:\n${consultation.chief_complaint}\n\n`;
  if (consultation.examination_findings) report += `EXAMINATION FINDINGS:\n${consultation.examination_findings}\n\n`;
  if (consultation.diagnosis) report += `DIAGNOSIS:\n${consultation.diagnosis}\n\n`;
  const planStr = planText(consultation.treatment_plan);
  if (planStr) report += `TREATMENT PLAN:\n${planStr}\n\n`;
  if (Array.isArray(consultation.prescriptions) && consultation.prescriptions.length > 0) {
    report += `PRESCRIPTIONS:\n`;
    consultation.prescriptions.forEach((rx: any, i: number) => {
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

const ALL_PATIENTS = "__all__";

export default function ConsultationNotes() {
  const [selectedPatient, setSelectedPatient] = useState<string>(ALL_PATIENTS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { consultations, isLoading, createConsultation, updateConsultation } = useClinicConsultations(
    selectedPatient === ALL_PATIENTS ? undefined : selectedPatient
  );
  const { patients } = useClinicPatients();
  const { toast } = useToast();

  const handleMarkComplete = async (id: string) => {
    try {
      await updateConsultation.mutateAsync({
        id,
        updates: { report_status: "completed", doctor_approved: true } as any,
      });
      toast({ title: "Consultation completed", description: "Status updated." });
    } catch (err: any) {
      toast({ title: "Could not update", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const blankConsult = {
    patient_id: "",
    practitioner_name: "",
    chief_complaint: "",
    examination_findings: "",
    diagnosis: "",
    treatment_plan_text: "",
    follow_up_date: "",
    follow_up_notes: "",
  };
  const [newConsultation, setNewConsultation] = useState(blankConsult);

  const handleCreate = async () => {
    if (!newConsultation.patient_id) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }
    try {
      const payload: any = {
        patient_id: newConsultation.patient_id,
        practitioner_name: newConsultation.practitioner_name || null,
        chief_complaint: newConsultation.chief_complaint || null,
        examination_findings: newConsultation.examination_findings || null,
        diagnosis: newConsultation.diagnosis || null,
        // treatment_plan is jsonb in DB; wrap the free-text input
        treatment_plan: newConsultation.treatment_plan_text
          ? { notes: newConsultation.treatment_plan_text }
          : null,
        follow_up_date: newConsultation.follow_up_date || null,
        follow_up_notes: newConsultation.follow_up_notes || null,
        report_status: 'completed',
      };
      await createConsultation.mutateAsync(payload);
      toast({ title: "Success", description: "Consultation saved" });
      setShowAddDialog(false);
      setNewConsultation(blankConsult);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrintReport = (consultation: ClinicConsultation) => {
    const patient = patients.find(p => p.id === consultation.patient_id);
    const report = generateReport(consultation, patient?.full_name || 'Unknown');
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
            <Button data-testid="new-consultation-button"><Plus className="mr-2 h-4 w-4" /> New Consultation</Button>
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
                  <Label>Practitioner</Label>
                  <Input value={newConsultation.practitioner_name} onChange={(e) => setNewConsultation({...newConsultation, practitioner_name: e.target.value})} placeholder="Dr. Khan" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Chief Complaint</Label>
                <Textarea value={newConsultation.chief_complaint} onChange={(e) => setNewConsultation({...newConsultation, chief_complaint: e.target.value})} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Examination Findings</Label>
                <Textarea value={newConsultation.examination_findings} onChange={(e) => setNewConsultation({...newConsultation, examination_findings: e.target.value})} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Diagnosis</Label>
                <Textarea value={newConsultation.diagnosis} onChange={(e) => setNewConsultation({...newConsultation, diagnosis: e.target.value})} rows={2} />
              </div>
              <div className="grid gap-2">
                <Label>Treatment Plan</Label>
                <Textarea value={newConsultation.treatment_plan_text} onChange={(e) => setNewConsultation({...newConsultation, treatment_plan_text: e.target.value})} rows={3} />
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
            <SelectItem value={ALL_PATIENTS}>All Patients</SelectItem>
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
            const planStr = planText(c.treatment_plan);
            const status = c.report_status || 'draft';
            return (
              <Card key={c.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h3 className="font-semibold">{patient?.full_name || 'Unknown Patient'}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {formatDate(c.created_at, 'medium')}
                          {c.practitioner_name && <><Stethoscope className="h-3 w-3 ml-2" /> {c.practitioner_name}</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'completed' ? 'default' : 'secondary'}>{status}</Badge>
                      {status !== 'completed' && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleMarkComplete(c.id)}
                          disabled={updateConsultation.isPending}
                          data-testid={`mark-complete-${c.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Mark complete
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handlePrintReport(c)}>
                        <Printer className="h-3 w-3 mr-1" /> Report
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {c.chief_complaint && <div><span className="font-medium">Complaint:</span> {c.chief_complaint}</div>}
                    {c.diagnosis && <div><span className="font-medium">Diagnosis:</span> {c.diagnosis}</div>}
                    {planStr && <div><span className="font-medium">Plan:</span> <span className="line-clamp-2">{planStr}</span></div>}
                    {c.follow_up_date && <div className="text-muted-foreground">Follow-up: {formatDate(c.follow_up_date, 'medium')}</div>}
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
