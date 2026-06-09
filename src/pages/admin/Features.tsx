import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Layers, Search, Building2, Settings, Loader2, ExternalLink, Info, Blocks, ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useAllTenants, useTenantDetail, useUpdateTenantModules,
  useLifecycleSignals, LIFECYCLE_CONFIG,
} from '@/hooks/useAdminData';

// The product modules each tenant can run. Mirrors TenantDetail (2B): each writes
// the tenant's features.<X_module> flag (read by isEnabled in the sidebar) plus the
// matching ai_modules_enabled key. Toggling here writes the SAME fields the tenant reads.
const MODULES: { key: string; label: string; desc: string; featureKey: string; aiKey: string | null }[] = [
  { key: 'sales', label: 'Sales AI', desc: 'Pipeline, leads, deals, sequences', featureKey: 'sales_module', aiKey: 'sales' },
  { key: 'marketing', label: 'Marketing AI', desc: 'Campaigns, content studio, social, blogs', featureKey: 'marketing_module', aiKey: 'marketing' },
  { key: 'hr', label: 'HR AI', desc: 'Employees, payroll, recruitment', featureKey: 'hr_module', aiKey: 'hr' },
  { key: 'operations', label: 'Operations', desc: 'Inventory, orders, vendors, invoices', featureKey: 'operations_module', aiKey: null },
  { key: 'communications', label: 'Communications', desc: 'Voice AI, WhatsApp, email, SMS', featureKey: 'communications_module', aiKey: 'support' },
  { key: 'analytics', label: 'Analytics & AI', desc: 'Insights, reports, predictions', featureKey: 'analytics_module', aiKey: null },
];

export default function FeatureFlags() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tenants, isLoading } = useAllTenants();
  const { data: lifecycle } = useLifecycleSignals();
  const lifecycleMap = new Map((lifecycle || []).map((l) => [l.tenant_id, l]));

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: detail, isLoading: detailLoading } = useTenantDetail(selectedId || undefined);
  const updateModules = useUpdateTenantModules();

  // Local toggle state, hydrated from the tenant's REAL module flags when detail loads.
  const [mods, setMods] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!detail) return;
    setMods({
      sales: detail.mod_sales, marketing: detail.mod_marketing, hr: detail.mod_hr,
      operations: detail.mod_operations, communications: detail.mod_communications, analytics: detail.mod_analytics,
    });
  }, [detail]);

  const list = tenants || [];
  const filtered = list.filter((t) => {
    const matchesSearch = t.company_name?.toLowerCase().includes(search.toLowerCase()) ||
                          t.tenant_id?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const stats = {
    total: list.length,
    paid: list.filter((t) => t.plan === 'enterprise' || t.plan === 'professional').length,
    trial: list.filter((t) => t.status === 'trial').length,
    free: list.filter((t) => t.plan === 'free' || !t.plan).length,
  };

  const save = async () => {
    if (!selectedId) return;
    const features: Record<string, boolean> = {};
    const aiModules: Record<string, boolean> = {};
    for (const m of MODULES) {
      features[m.featureKey] = !!mods[m.key];
      if (m.aiKey) aiModules[m.aiKey] = !!mods[m.key];
    }
    try {
      await updateModules.mutateAsync({ tenantId: selectedId, features, aiModules });
      toast({ title: 'Modules updated', description: `${detail?.company_name}'s modules saved.` });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  const enabledCount = MODULES.filter((m) => mods[m.key]).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Feature Control</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Turn product modules on or off <span className="font-medium text-foreground">per tenant</span>.
          Pick a tenant, toggle a module, and save — it writes that tenant's feature flags, so its sidebar
          and AI agents update for the whole organization.
        </p>
      </div>

      {/* Real platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tenants</p>
          <p className="text-2xl font-bold">{isLoading ? '—' : stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Paid plans</p>
          <p className="text-2xl font-bold text-chart-2">{isLoading ? '—' : stats.paid}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Trial</p>
          <p className="text-2xl font-bold text-yellow-500">{isLoading ? '—' : stats.trial}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Free</p>
          <p className="text-2xl font-bold">{isLoading ? '—' : stats.free}</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        {/* LEFT — tenant picker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenants</CardTitle>
            <CardDescription>Select a tenant to manage its modules</CardDescription>
            <div className="flex flex-col gap-2 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tenants…" className="pl-9" value={search}
                  onChange={(e) => setSearch(e.target.value)} data-testid="feature-search" />
              </div>
              <div className="flex gap-2">
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[28rem] overflow-y-auto divide-y">
              {isLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No tenants match.</p>
              ) : filtered.map((t) => {
                const sig = lifecycleMap.get(t.tenant_id);
                const selected = selectedId === t.tenant_id;
                return (
                  <button
                    key={t.tenant_id}
                    data-testid={`feature-tenant-row-${t.tenant_id}`}
                    onClick={() => setSelectedId(t.tenant_id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2 ${selected ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.tenant_id}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sig && (
                        <Badge variant="outline" className={`hidden sm:inline-flex ${LIFECYCLE_CONFIG[sig.lifecycle_stage].className}`}>
                          {LIFECYCLE_CONFIG[sig.lifecycle_stage].label}
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">{t.plan}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — module control for the selected tenant */}
        <Card>
          {!selectedId ? (
            <CardContent className="flex flex-col items-center justify-center text-center gap-3 py-20">
              <Blocks className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Pick a tenant to manage its modules</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Module states shown here are this tenant's real feature flags. Toggling and saving turns the
                module on/off for that whole organization.
              </p>
            </CardContent>
          ) : detailLoading ? (
            <CardContent className="space-y-3 py-6">
              <Skeleton className="h-8 w-48" />
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </CardContent>
          ) : !detail ? (
            <CardContent className="py-20 text-center text-muted-foreground">Tenant not found, or no access.</CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{detail.company_name}</CardTitle>
                      <CardDescription className="truncate">
                        {detail.tenant_id} · {detail.industry} · <span className="capitalize">{detail.subscription_plan}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" data-testid="open-control-panel"
                    onClick={() => navigate(`/admin/tenants/${selectedId}`)}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />Full Control Panel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />{enabledCount} of {MODULES.length} modules enabled · reflects real feature flags
                </p>
                {MODULES.map((m) => (
                  <div key={m.key} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1 pr-3">
                      <Label htmlFor={`fc-${m.key}`} className="font-medium">{m.label}</Label>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <Switch id={`fc-${m.key}`} data-testid={`feature-module-toggle-${m.key}`}
                      checked={!!mods[m.key]} onCheckedChange={(v) => setMods((p) => ({ ...p, [m.key]: v }))} />
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tenants/${selectedId}`)}>
                    White-label &amp; plan <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <Button data-testid="feature-save" onClick={save} disabled={updateModules.isPending}>
                    {updateModules.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Settings className="mr-2 h-4 w-4" />Save modules</>}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
