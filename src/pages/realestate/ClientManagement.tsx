import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRealEstateClients, REClient } from "@/hooks/useRealEstateClients";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Plus, Phone, Mail, Globe, Star, DollarSign } from "lucide-react";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const tierColors: Record<string, string> = {
  vip: "bg-amber-100 text-amber-800",
  premium: "bg-purple-100 text-purple-800",
  standard: "bg-gray-100 text-gray-800",
  cold: "bg-blue-100 text-blue-800",
};

export default function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{ client_type?: string; client_tier?: string }>({});
  const [showAdd, setShowAdd] = useState(false);
  const { clients, isLoading, stats, createClient } = useRealEstateClients(searchTerm, filters);
  const { toast } = useToast();

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", nationality: "", client_type: "buyer", client_tier: "standard", budget_min: 0, budget_max: 0, financing: "cash", timeline: "browsing" });

  const handleAdd = async () => {
    if (!form.full_name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    try {
      await createClient.mutateAsync({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        nationality: form.nationality || null,
        client_type: form.client_type,
        client_tier: form.client_tier,
        budget_min: form.budget_min || null,
        budget_max: form.budget_max || null,
        financing: form.financing,
        timeline: form.timeline,
      } as Partial<REClient>);
      setShowAdd(false);
      setForm({ full_name: "", email: "", phone: "", nationality: "", client_type: "buyer", client_tier: "standard", budget_min: 0, budget_max: 0, financing: "cash", timeline: "browsing" });
      toast({ title: "Success", description: "Client added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground">Buyers, investors, and tenants</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Client</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+971..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} /></div>
                <div><Label>Type</Label><Select value={form.client_type} onValueChange={v => setForm(f => ({ ...f, client_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="buyer">Buyer</SelectItem><SelectItem value="investor">Investor</SelectItem><SelectItem value="tenant">Tenant</SelectItem><SelectItem value="seller">Seller</SelectItem><SelectItem value="landlord">Landlord</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Budget Min (AED)</Label><Input type="number" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: +e.target.value }))} /></div>
                <div><Label>Budget Max (AED)</Label><Input type="number" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Financing</Label><Select value={form.financing} onValueChange={v => setForm(f => ({ ...f, financing: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="mortgage">Mortgage</SelectItem><SelectItem value="developer_plan">Developer Plan</SelectItem></SelectContent></Select></div>
                <div><Label>Timeline</Label><Select value={form.timeline} onValueChange={v => setForm(f => ({ ...f, timeline: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="immediate">Immediate</SelectItem><SelectItem value="1_3_months">1-3 Months</SelectItem><SelectItem value="3_6_months">3-6 Months</SelectItem><SelectItem value="browsing">Just Browsing</SelectItem></SelectContent></Select></div>
              </div>
              <Button onClick={handleAdd} disabled={createClient.isPending}>{createClient.isPending ? "Adding..." : "Add Client"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search clients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filters.client_type || "all"} onValueChange={v => setFilters(f => ({ ...f, client_type: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="buyer">Buyer</SelectItem><SelectItem value="investor">Investor</SelectItem><SelectItem value="tenant">Tenant</SelectItem><SelectItem value="seller">Seller</SelectItem></SelectContent>
        </Select>
        <Select value={filters.client_tier || "all"} onValueChange={v => setFilters(f => ({ ...f, client_tier: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Tiers</SelectItem><SelectItem value="vip">VIP</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="standard">Standard</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.activeClients}</div><p className="text-xs text-muted-foreground">Active Clients</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.vipClients}</div><p className="text-xs text-muted-foreground">VIP Clients</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.avgScore}</div><p className="text-xs text-muted-foreground">Avg AI Score</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.newThisMonth}</div><p className="text-xs text-muted-foreground">New This Month</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : clients.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No clients found</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{client.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{client.nationality} &middot; {client.client_type} &middot; {client.financing}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={tierColors[client.client_tier] || "bg-gray-100"}>{client.client_tier.toUpperCase()}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>}
                  {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>}
                </div>
                {(client.budget_min || client.budget_max) && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span>Budget: {client.budget_min ? formatAED(client.budget_min) : "?"} - {client.budget_max ? formatAED(client.budget_max) : "?"}</span>
                  </div>
                )}
                {client.preferred_areas?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.preferred_areas.slice(0, 3).map(a => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
                    {client.preferred_areas.length > 3 && <Badge variant="outline" className="text-xs">+{client.preferred_areas.length - 3}</Badge>}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" /> AI Score: {client.ai_score}</span>
                  {client.golden_visa_eligible && <Badge className="bg-amber-50 text-amber-700">Golden Visa</Badge>}
                  {client.assigned_agent_name && <span>{client.assigned_agent_name}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
