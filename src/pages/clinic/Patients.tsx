import { useState, useMemo } from "react";
import { useBulkSelect } from "@/hooks/useBulkSelect";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { Search, UserPlus, Phone, Mail, Heart, Star, ChevronRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return String(age);
}

export default function Patients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPatient, setNewPatient] = useState({ full_name: "", phone: "", email: "", gender: "female", skin_type: "", preferred_contact: "whatsapp" });
  const { patients, isLoading, stats, createPatient } = useClinicPatients(searchTerm);

  // Phase 12.C — bulk + filter
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState("created");
  const [bulkBusy, setBulkBusy] = useState(false);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a: any, b: any) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      if (sortBy === "spent") return (b.total_spent || 0) - (a.total_spent || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [patients, sortBy]);

  const bulk = useBulkSelect<string>(sortedPatients.map((p: any) => p.id));

  const handleBulkArchive = async () => {
    if (bulk.count === 0) return;
    setBulkBusy(true);
    try {
      // clinic_patients doesn't have is_active per schema; use tags instead — non-destructive.
      // Tag each selected patient with "archived" to mark.
      for (const id of bulk.selectedIds) {
        const row = patients.find((p: any) => p.id === id);
        if (!row) continue;
        const tags = Array.isArray(row.tags) ? row.tags : [];
        if (!tags.includes("archived")) tags.push("archived");
        await supabase.from("clinic_patients" as any).update({ tags, updated_at: new Date().toISOString() } as any).eq("id", id).eq("tenant_id", tenantId);
      }
      toast({ title: `Archived ${bulk.count} patient${bulk.count === 1 ? "" : "s"}` });
      bulk.clear();
      queryClient.invalidateQueries({ queryKey: ["clinic_patients"] });
    } catch (err: any) {
      toast({ title: "Bulk archive failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };
  const { toast } = useToast();

  const handleExportCsv = () => {
    const headers = ['id', 'name', 'phone', 'email', 'gender', 'age', 'skin_type', 'loyalty_tier', 'total_visits', 'total_spent', 'created_at'];
    const rows = (patients || []).map((p: any) => [
      p.id, p.full_name, p.phone, p.email, p.gender,
      calcAge(p.date_of_birth), p.skin_type, p.loyalty_tier,
      p.total_visits ?? 0, p.total_spent ?? 0, p.created_at,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Patients exported", description: `${rows.length} row${rows.length === 1 ? "" : "s"} downloaded` });
  };

  const handleAddPatient = async () => {
    if (!newPatient.full_name || !newPatient.phone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    try {
      await createPatient.mutateAsync(newPatient as any);
      toast({ title: "Success", description: "Patient added successfully" });
      setShowAddDialog(false);
      setNewPatient({ full_name: "", phone: "", email: "", gender: "female", skin_type: "", preferred_contact: "whatsapp" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">Manage patient profiles and history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={!patients || patients.length === 0}
            data-testid="export-patients-csv"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-patient-button"><UserPlus className="mr-2 h-4 w-4" /> Add Patient</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Patient</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name *</Label>
                <Input value={newPatient.full_name} onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})} placeholder="e.g. Aisha Al Maktoum" />
              </div>
              <div className="grid gap-2">
                <Label>Phone *</Label>
                <Input value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} placeholder="+971501234567" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})} placeholder="patient@email.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({...newPatient, gender: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Skin Type</Label>
                  <Select value={newPatient.skin_type} onValueChange={(v) => setNewPatient({...newPatient, skin_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="oily">Oily</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="combination">Combination</SelectItem>
                      <SelectItem value="sensitive">Sensitive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddPatient} disabled={createPatient.isPending}>
                {createPatient.isPending ? "Adding..." : "Add Patient"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search patients by name, phone, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.totalPatients}</div><p className="text-xs text-muted-foreground">Total Patients</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.vipPatients}</div><p className="text-xs text-muted-foreground">VIP Patients</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.newThisMonth}</div><p className="text-xs text-muted-foreground">New This Month</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">AED {stats.totalRevenue.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total Revenue</p></CardContent></Card>
      </div>

      <FilterBar
        value={searchTerm}
        onSearch={setSearchTerm}
        placeholder="Search patients by name or phone…"
        sort={{
          value: sortBy,
          onChange: setSortBy,
          options: [
            { value: "created", label: "Sort: newest first" },
            { value: "name", label: "Sort: name (A→Z)" },
            { value: "spent", label: "Sort: lifetime spend" },
          ],
        }}
        testidPrefix="patients-filter"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading patients...</p>
      ) : patients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No patients found. Add your first patient to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPatients.map((patient) => (
            <Card
              key={patient.id}
              role="link"
              tabIndex={0}
              data-testid={`patient-card-${patient.id}`}
              data-patient-name={patient.full_name}
              onClick={() => navigate(`/clinic/patients/${patient.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/clinic/patients/${patient.id}`);
                }
              }}
              className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      onClick={(e) => { e.stopPropagation(); }}
                      onKeyDown={(e) => { e.stopPropagation(); }}
                      className="pt-0.5"
                    >
                      <Checkbox
                        checked={bulk.isSelected(patient.id)}
                        onCheckedChange={() => bulk.toggleId(patient.id)}
                        data-testid={`patient-select-${patient.id}`}
                        aria-label={`Select ${patient.full_name}`}
                      />
                    </span>
                    <div className="min-w-0">
                    <h3 className="font-semibold flex items-center gap-1.5">
                      {patient.full_name}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" /> {patient.phone}
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {patient.email}
                      </div>
                    )}
                  </div>
                  </div>
                  <Badge variant={patient.loyalty_tier === 'VIP' ? 'default' : 'outline'}>{patient.loyalty_tier}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                  <span>{patient.total_visits} visits</span>
                  <span>AED {(patient.total_spent || 0).toLocaleString()}</span>
                  <span>{patient.skin_type || 'N/A'} skin</span>
                  {patient.loyalty_points > 0 && (
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> {patient.loyalty_points}</span>
                  )}
                </div>
                {patient.allergies && patient.allergies.length > 0 && patient.allergies[0] !== 'None known' && (
                  <div className="flex items-center gap-1 mt-2">
                    <Heart className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">Allergies: {patient.allergies.join(', ')}</span>
                  </div>
                )}
                {patient.tags && patient.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {patient.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BulkActionBar
        count={bulk.count}
        onClear={bulk.clear}
        onArchive={handleBulkArchive}
        busy={bulkBusy}
        entityNoun="patient"
      />
    </div>
  );
}
