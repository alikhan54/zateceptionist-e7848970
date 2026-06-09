import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Blocks, Palette, CreditCard, Building2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useTenantDetail, useUpdateTenantModules, useUpdateWhiteLabel, useUpdatePlan,
} from '@/hooks/useAdminData';

// Each product module -> the features.<X_module> flag the tenant sidebar / dashboard reads,
// plus the matching ai_modules_enabled key (where one exists) so the AI agent aligns.
const MODULES: { key: string; label: string; desc: string; featureKey: string; aiKey: string | null }[] = [
  { key: 'sales', label: 'Sales AI', desc: 'Pipeline, leads, deals, sequences', featureKey: 'sales_module', aiKey: 'sales' },
  { key: 'marketing', label: 'Marketing AI', desc: 'Campaigns, content studio, social, blogs', featureKey: 'marketing_module', aiKey: 'marketing' },
  { key: 'hr', label: 'HR AI', desc: 'Employees, payroll, recruitment', featureKey: 'hr_module', aiKey: 'hr' },
  { key: 'operations', label: 'Operations', desc: 'Inventory, orders, vendors, invoices', featureKey: 'operations_module', aiKey: null },
  { key: 'communications', label: 'Communications', desc: 'Voice AI, WhatsApp, email, SMS', featureKey: 'communications_module', aiKey: 'support' },
  { key: 'analytics', label: 'Analytics & AI', desc: 'Insights, reports, predictions', featureKey: 'analytics_module', aiKey: null },
];

const PLANS = ['free', 'professional', 'enterprise'];

export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: detail, isLoading } = useTenantDetail(tenantId);

  const updateModules = useUpdateTenantModules();
  const updateWhiteLabel = useUpdateWhiteLabel();
  const updatePlan = useUpdatePlan();

  // Local form state, hydrated from the detail RPC once it loads.
  const [mods, setMods] = useState<Record<string, boolean>>({});
  const [wl, setWl] = useState({ brandName: '', logoUrl: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6', whiteLabel: false, cap: '' });
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    if (!detail) return;
    setMods({
      sales: detail.mod_sales, marketing: detail.mod_marketing, hr: detail.mod_hr,
      operations: detail.mod_operations, communications: detail.mod_communications, analytics: detail.mod_analytics,
    });
    setWl({
      brandName: detail.brand_name || '', logoUrl: detail.logo_url || '',
      primaryColor: detail.primary_color || '#6366f1', secondaryColor: detail.secondary_color || '#8b5cf6',
      whiteLabel: detail.white_label, cap: detail.white_label_tenant_cap != null ? String(detail.white_label_tenant_cap) : '',
    });
    setPlan(detail.subscription_plan || 'free');
  }, [detail]);

  const saveModules = async () => {
    if (!tenantId) return;
    const features: Record<string, boolean> = {};
    const aiModules: Record<string, boolean> = {};
    for (const m of MODULES) {
      features[m.featureKey] = !!mods[m.key];
      if (m.aiKey) aiModules[m.aiKey] = !!mods[m.key];
    }
    try {
      await updateModules.mutateAsync({ tenantId, features, aiModules });
      toast({ title: 'Modules updated', description: `${detail?.company_name}'s modules saved.` });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  const saveWhiteLabel = async () => {
    if (!tenantId) return;
    try {
      await updateWhiteLabel.mutateAsync({
        tenantId, brandName: wl.brandName || null, logoUrl: wl.logoUrl || null,
        primaryColor: wl.primaryColor || null, secondaryColor: wl.secondaryColor || null,
        whiteLabel: wl.whiteLabel, cap: wl.cap ? parseInt(wl.cap, 10) : null,
      });
      toast({ title: 'White-label updated', description: `${detail?.company_name}'s brand saved.` });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  const savePlan = async () => {
    if (!tenantId) return;
    try {
      await updatePlan.mutateAsync({ tenantId, plan });
      toast({ title: 'Plan updated', description: `${detail?.company_name} is now on the ${plan} plan.` });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-4 p-2"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Tenant not found, or you don't have access.</p>
        <Button variant="outline" onClick={() => navigate('/admin/tenants')}><ArrowLeft className="mr-2 h-4 w-4" />Back to tenants</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tenant-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{detail.company_name}</h1>
            <p className="text-sm text-muted-foreground">
              {detail.tenant_id} · {detail.industry} · <Badge variant="outline" className="ml-1 capitalize">{detail.subscription_plan}</Badge>
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules" data-testid="tab-modules"><Blocks className="mr-2 h-4 w-4" />Modules</TabsTrigger>
          <TabsTrigger value="whitelabel" data-testid="tab-whitelabel"><Palette className="mr-2 h-4 w-4" />White-label</TabsTrigger>
          <TabsTrigger value="plan" data-testid="tab-plan"><CreditCard className="mr-2 h-4 w-4" />Plan</TabsTrigger>
        </TabsList>

        {/* MODULES */}
        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Modules &amp; departments</CardTitle>
              <CardDescription>Toggle what {detail.company_name}'s team can use. Changes write the tenant's
                feature flags — its sidebar &amp; AI agents update accordingly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MODULES.map((m) => (
                <div key={m.key} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <Label htmlFor={`mod-${m.key}`} className="font-medium">{m.label}</Label>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <Switch
                    id={`mod-${m.key}`}
                    data-testid={`module-toggle-${m.key}`}
                    checked={!!mods[m.key]}
                    onCheckedChange={(v) => setMods((p) => ({ ...p, [m.key]: v }))}
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button data-testid="save-modules" onClick={saveModules} disabled={updateModules.isPending}>
                  {updateModules.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save modules'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHITE-LABEL */}
        <TabsContent value="whitelabel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>White-label</CardTitle>
              <CardDescription>Productize {detail.company_name}'s identity (Enterprise capability).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="wl-enabled" className="font-medium">White-label enabled</Label>
                  <p className="text-xs text-muted-foreground">Unlocks per-tenant branding across the app.</p>
                </div>
                <Switch id="wl-enabled" data-testid="wl-enabled" checked={wl.whiteLabel}
                  onCheckedChange={(v) => setWl((p) => ({ ...p, whiteLabel: v }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wl-brand">Brand name</Label>
                  <Input id="wl-brand" data-testid="wl-brand-name" value={wl.brandName}
                    placeholder={detail.company_name} onChange={(e) => setWl((p) => ({ ...p, brandName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-logo">Logo URL</Label>
                  <Input id="wl-logo" value={wl.logoUrl} placeholder="https://…/logo.png"
                    onChange={(e) => setWl((p) => ({ ...p, logoUrl: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-primary">Primary colour</Label>
                  <div className="flex gap-2">
                    <Input id="wl-primary" type="color" className="h-10 w-14 p-1" value={wl.primaryColor}
                      onChange={(e) => setWl((p) => ({ ...p, primaryColor: e.target.value }))} />
                    <Input value={wl.primaryColor} onChange={(e) => setWl((p) => ({ ...p, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-secondary">Secondary colour</Label>
                  <div className="flex gap-2">
                    <Input id="wl-secondary" type="color" className="h-10 w-14 p-1" value={wl.secondaryColor}
                      onChange={(e) => setWl((p) => ({ ...p, secondaryColor: e.target.value }))} />
                    <Input value={wl.secondaryColor} onChange={(e) => setWl((p) => ({ ...p, secondaryColor: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-cap">Sub-tenant cap</Label>
                  <Input id="wl-cap" type="number" value={wl.cap} placeholder="—"
                    onChange={(e) => setWl((p) => ({ ...p, cap: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button data-testid="save-whitelabel" onClick={saveWhiteLabel} disabled={updateWhiteLabel.isPending}>
                  {updateWhiteLabel.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save white-label'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLAN */}
        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription plan</CardTitle>
              <CardDescription>Current: <span className="font-medium capitalize">{detail.subscription_plan}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="plan-select">Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger id="plan-select" data-testid="plan-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map((pl) => (
                      <SelectItem key={pl} value={pl} className="capitalize" data-testid={`plan-option-${pl}`}>{pl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button data-testid="save-plan" onClick={savePlan} disabled={updatePlan.isPending || plan === detail.subscription_plan}>
                  {updatePlan.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Change plan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
