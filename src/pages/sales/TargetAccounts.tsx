import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Plus, Search, Building2, Users, MapPin, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TargetAccount {
  id: string;
  tenant_id: string;
  company_name: string;
  company_domain?: string;
  company_website?: string;
  linkedin_url?: string;
  industry?: string;
  employee_count?: string;
  headquarters?: string;
  tier: string;
  contacts: any[];
  engagement_score: number;
  research_notes?: string;
  key_challenges: string[];
  personalization_hooks: string[];
  status: string;
  created_at?: string;
}

const TIER_COLORS: Record<string, string> = {
  A: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  B: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  C: "bg-orange-700/20 text-orange-400 border-orange-700/30",
};

const STATUS_COLORS: Record<string, string> = {
  researching: "bg-blue-500/20 text-blue-400",
  ready: "bg-green-500/20 text-green-400",
  engaged: "bg-purple-500/20 text-purple-400",
  opportunity: "bg-amber-500/20 text-amber-400",
  customer: "bg-emerald-500/20 text-emerald-400",
  lost: "bg-red-500/20 text-red-400",
  paused: "bg-gray-500/20 text-gray-400",
};

export default function TargetAccounts() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({ company_name: "", company_domain: "", company_website: "", industry: "", tier: "B" });
  const [researchingId, setResearchingId] = useState<string | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["target_accounts", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("target_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("tier", { ascending: true })
        .order("engagement_score", { ascending: false });
      if (error) throw error;
      return (data || []) as TargetAccount[];
    },
    enabled: !!tenantId,
  });

  const addMutation = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      const { error } = await (supabase as any)
        .from("target_accounts")
        .insert({ ...account, tenant_id: tenantId, status: "researching" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target_accounts", tenantId] });
      toast.success("Target account added");
      setShowAddDialog(false);
      setNewAccount({ company_name: "", company_domain: "", company_website: "", industry: "", tier: "B" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const researchMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setResearchingId(accountId);
      const result = await callWebhook("/abm-research", { tenant_id: tenantId, account_id: accountId }, tenantId);
      return result;
    },
    onSuccess: (result: any) => {
      setResearchingId(null);
      queryClient.invalidateQueries({ queryKey: ["target_accounts", tenantId] });
      if (result?.success) {
        toast.success(`Researched: ${result.challenges_found} challenges, ${result.hooks_found} hooks found`);
      } else {
        toast.error(result?.message || "Research failed");
      }
    },
    onError: (e: any) => { setResearchingId(null); toast.error(e.message); },
  });

  const filtered = accounts.filter((a) => {
    if (filterTier !== "all" && a.tier !== filterTier) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery && !a.company_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tierCounts = { A: 0, B: 0, C: 0 };
  const statusCounts: Record<string, number> = {};
  accounts.forEach((a) => {
    tierCounts[a.tier as keyof typeof tierCounts] = (tierCounts[a.tier as keyof typeof tierCounts] || 0) + 1;
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Crosshair className="h-8 w-8" /> Target Accounts</h1>
          <p className="text-muted-foreground mt-1">Account-Based Marketing — target specific companies</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Target Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Target Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Company Name *" value={newAccount.company_name} onChange={(e) => setNewAccount({ ...newAccount, company_name: e.target.value })} />
              <Input placeholder="Domain (e.g. company.com)" value={newAccount.company_domain} onChange={(e) => setNewAccount({ ...newAccount, company_domain: e.target.value })} />
              <Input placeholder="Website URL" value={newAccount.company_website} onChange={(e) => setNewAccount({ ...newAccount, company_website: e.target.value })} />
              <Input placeholder="Industry" value={newAccount.industry} onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })} />
              <Select value={newAccount.tier} onValueChange={(v) => setNewAccount({ ...newAccount, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Tier A — Strategic</SelectItem>
                  <SelectItem value="B">Tier B — ABM Lite</SelectItem>
                  <SelectItem value="C">Tier C — Programmatic</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={() => addMutation.mutate(newAccount)} disabled={!newAccount.company_name}>Add Account</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-400">{tierCounts.A}</div><div className="text-xs text-muted-foreground">Tier A</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-slate-300">{tierCounts.B}</div><div className="text-xs text-muted-foreground">Tier B</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{statusCounts.ready || 0}</div><div className="text-xs text-muted-foreground">Researched</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-purple-400">{statusCounts.engaged || 0}</div><div className="text-xs text-muted-foreground">Engaged</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{statusCounts.customer || 0}</div><div className="text-xs text-muted-foreground">Converted</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="Search accounts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <Select value={filterTier} onValueChange={setFilterTier}><SelectTrigger className="w-32"><SelectValue placeholder="Tier" /></SelectTrigger><SelectContent><SelectItem value="all">All Tiers</SelectItem><SelectItem value="A">Tier A</SelectItem><SelectItem value="B">Tier B</SelectItem><SelectItem value="C">Tier C</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="researching">Researching</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="engaged">Engaged</SelectItem><SelectItem value="opportunity">Opportunity</SelectItem></SelectContent></Select>
      </div>

      {/* Account Cards */}
      <div className="grid gap-4">
        {filtered.map((account) => (
          <Card key={account.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{account.company_name}</h3>
                    <Badge className={TIER_COLORS[account.tier]}>{account.tier}</Badge>
                    <Badge className={STATUS_COLORS[account.status] || "bg-gray-500/20"}>{account.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {account.industry && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{account.industry}</span>}
                    {account.employee_count && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{account.employee_count}</span>}
                    {account.headquarters && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{account.headquarters}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => researchMutation.mutate(account.id)} disabled={researchingId === account.id}>
                  {researchingId === account.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Research
                </Button>
              </div>

              {/* Engagement Score */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span>Engagement</span><span>{account.engagement_score}/100</span></div>
                <div className="h-2 bg-muted rounded-full"><div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${account.engagement_score}%` }} /></div>
              </div>

              {/* Challenges + Hooks */}
              {account.key_challenges?.length > 0 && (
                <div className="mb-2"><span className="text-xs text-muted-foreground">Challenges: </span>{account.key_challenges.map((c, i) => <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">{c}</Badge>)}</div>
              )}
              {account.personalization_hooks?.length > 0 && (
                <div className="mb-2"><span className="text-xs text-muted-foreground">Hooks: </span>{account.personalization_hooks.map((h, i) => <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs bg-blue-500/10 text-blue-400">{h}</Badge>)}</div>
              )}

              {/* Contacts */}
              {Array.isArray(account.contacts) && account.contacts.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <span className="text-xs text-muted-foreground block mb-2">Buying Committee:</span>
                  <div className="flex flex-wrap gap-2">
                    {account.contacts.map((c: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{c.name} — {c.title} {c.email ? `(${c.email})` : ""}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">No target accounts found. Add your first target account above.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
