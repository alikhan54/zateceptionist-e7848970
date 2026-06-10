import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2, Plus, Search, Filter, MoreHorizontal, Users, MessageSquare,
  Eye, UserCog, Pause, Trash2, ArrowUpDown, Download, RefreshCw, Calendar,
  Activity, Settings, AlertTriangle, TrendingUp, Target
} from 'lucide-react';
import { useAllTenants, useUpdateTenantStatus, useCreateAuditLog, useLifecycleSignals, useTenantUsage, LIFECYCLE_CONFIG, LifecycleStage, TenantData } from '@/hooks/useAdminData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import AdminActivation from './Activation';

const statuses = ['active', 'trial', 'suspended', 'churned'];

export default function AllTenants() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: tenants, isLoading, refetch } = useAllTenants();
  const { data: lifecycle } = useLifecycleSignals();
  const { data: usage } = useTenantUsage();
  const updateStatus = useUpdateTenantStatus();
  const createLog = useCreateAuditLog();

  // Map of tenant_id -> real lifecycle signal (last_active + stage), from the
  // derive_lifecycle_signals RPC. Powers the real Last Activity column + the
  // Lifecycle column/filter. Tenants without a signal fall back gracefully.
  const lifecycleMap = new Map((lifecycle || []).map((l) => [l.tenant_id, l]));
  // Map of tenant_id -> real 7d/total usage counts, from master_admin_tenant_usage.
  const usageMap = new Map((usage || []).map((u) => [u.tenant_id, u]));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');

  const filteredTenants = (tenants || []).filter(tenant => {
    const matchesSearch = tenant.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.subscription_status === statusFilter;
    const matchesIndustry = industryFilter === 'all' || tenant.industry === industryFilter;
    const matchesPlan = planFilter === 'all' || tenant.subscription_plan === planFilter;
    const matchesLifecycle = lifecycleFilter === 'all' ||
      lifecycleMap.get(tenant.tenant_id)?.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesStatus && matchesIndustry && matchesPlan && matchesLifecycle;
  });

  // Stat-card aggregates from the full cross-tenant RPC result (not the filtered view).
  // Replaces the previous hardcoded 156 / 142 / 8 / $48.5K placeholders.
  const totalTenants = (tenants || []).length;
  const activeTenants = (tenants || []).filter((t) => t.status === 'active').length;
  const trialTenants = (tenants || []).filter((t) => t.status === 'trial').length;
  const totalMrr = (tenants || [])
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + (t.monthly_value || 0), 0);

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ tenantId, status: newStatus });
      await createLog.mutateAsync({
        tenant_id: tenantId,
        user_email: authUser?.email || '',
        action: `tenant.status.${newStatus}`,
        resource: 'tenant',
        details: `Tenant status changed to ${newStatus}`,
        ip_address: 'web-client',
        level: 'info',
        metadata: {},
      });
      toast({
        title: 'Status Updated',
        description: `Tenant status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tenant status',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trial: { variant: 'secondary', label: 'Trial' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      churned: { variant: 'outline', label: 'Churned' },
    };
    const { variant, label } = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Real lifecycle badge from derive_lifecycle_signals (never fabricated).
  const getLifecycleBadge = (tenantId: string) => {
    const sig = lifecycleMap.get(tenantId);
    if (!sig) return <span className="text-xs text-muted-foreground">—</span>;
    const cfg = LIFECYCLE_CONFIG[sig.lifecycle_stage];
    return <Badge variant="outline" className={cfg.className} title={cfg.hint}>{cfg.label}</Badge>;
  };

  // Real last activity = MAX(auth.users.last_sign_in_at) across the tenant's users.
  // No signal / never logged in => honest "Never" (not a fabricated date).
  const renderLastActivity = (tenantId: string) => {
    const sig = lifecycleMap.get(tenantId);
    if (!sig || !sig.last_active) return <span className="text-muted-foreground">Never</span>;
    return (
      <span className="text-muted-foreground" title={new Date(sig.last_active).toLocaleString()}>
        {formatDistanceToNow(new Date(sig.last_active), { addSuffix: true })}
      </span>
    );
  };

  // Combined 7-day activity across the four usage tables (real counts from
  // master_admin_tenant_usage). Honest muted 0 when there's no recent activity.
  const renderUsage7d = (tenantId: string) => {
    const u = usageMap.get(tenantId);
    const sum = u ? (u.conversations_7d + u.messages_7d + u.leads_7d + u.appointments_7d) : 0;
    if (sum === 0) return <span className="text-muted-foreground">0</span>;
    return (
      <span
        className="font-medium"
        title={`Conversations ${u!.conversations_7d} · Messages ${u!.messages_7d} · Leads ${u!.leads_7d} · Appointments ${u!.appointments_7d} (last 7 days)`}
      >
        {sum}
      </span>
    );
  };

  // Activation Command view — reachable at /admin/tenants?view=activation (no new
  // route, zero App.tsx/sidebar edits). All hooks above run unconditionally first.
  if (searchParams.get('view') === 'activation') return <AdminActivation />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage all organizations on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/tenants?view=activation')} data-testid="open-activation">
            <Target className="h-4 w-4 mr-2" />
            Activation
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {/* The previous Create Tenant control opened a 6-step mock wizard whose
              final button only closed the dialog — nothing was provisioned. Disabled
              until a real provisioning backend exists (tenants come via onboarding). */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled data-testid="create-tenant-disabled">
                  <Plus className="h-4 w-4 mr-2" />Create Tenant
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming soon — tenants are provisioned via onboarding for now</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{totalTenants}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-chart-2">{activeTenants}</p>
              </div>
              <Activity className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trial</p>
                <p className="text-2xl font-bold text-yellow-500">{trialTenants}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential MRR</p>
                <p className="text-2xl font-bold">${totalMrr.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">plan-assigned · $0 collected</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search tenants..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                <SelectTrigger className="w-40" data-testid="lifecycle-filter">
                  <SelectValue placeholder="Lifecycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lifecycle</SelectItem>
                  {(Object.keys(LIFECYCLE_CONFIG) as LifecycleStage[])
                    .sort((a, b) => LIFECYCLE_CONFIG[a].order - LIFECYCLE_CONFIG[b].order)
                    .map((stage) => (
                      <SelectItem key={stage} value={stage}>{LIFECYCLE_CONFIG[stage].label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center" title="Combined conversations, messages, leads & appointments in the last 7 days">Usage (7d)</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Plan Value</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map(tenant => (
                <TableRow
                  key={tenant.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/tenants/${tenant.tenant_id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{tenant.company_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{tenant.company_name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.tenant_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.industry}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{tenant.plan}</Badge></TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell className="text-center">{tenant.users_count || 0}</TableCell>
                  <TableCell className="text-center">{renderUsage7d(tenant.tenant_id)}</TableCell>
                  <TableCell>{getLifecycleBadge(tenant.tenant_id)}</TableCell>
                  <TableCell>{renderLastActivity(tenant.tenant_id)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {tenant.monthly_value && tenant.monthly_value > 0
                      ? `$${tenant.monthly_value.toLocaleString()}/mo`
                      : <span className="text-muted-foreground">Free</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`control-${tenant.tenant_id}`}
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${tenant.tenant_id}`); }}
                      >
                        <Settings className="h-4 w-4 mr-1.5" />Control Panel
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${tenant.tenant_id}`); }}><Eye className="h-4 w-4 mr-2" />Control Panel</DropdownMenuItem>
                          {/* The items below had no handlers at all — clickable but inert. Disabled until real backends exist. */}
                          <DropdownMenuItem disabled><UserCog className="h-4 w-4 mr-2" />Impersonate (coming soon)</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled><Pause className="h-4 w-4 mr-2" />Suspend (coming soon)</DropdownMenuItem>
                          <DropdownMenuItem disabled><Trash2 className="h-4 w-4 mr-2" />Delete (coming soon)</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
