import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { Search, UserPlus, Phone, Mail, Heart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPatient, setNewPatient] = useState({ full_name: "", phone: "", email: "", gender: "female", skin_type: "", preferred_contact: "whatsapp" });
  const { patients, isLoading, stats, createPatient } = useClinicPatients(searchTerm);
  const { toast } = useToast();

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
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Patient</Button>
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

      {isLoading ? (
        <p className="text-muted-foreground">Loading patients...</p>
      ) : patients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No patients found. Add your first patient to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{patient.full_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" /> {patient.phone}
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {patient.email}
                      </div>
                    )}
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
    </div>
  );
}
