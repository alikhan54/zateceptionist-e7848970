import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Phone, Eye, UserCog, Pause, Trash2, ChevronRight, ChevronLeft, Check,
  ArrowUpDown, Download, RefreshCw, Calendar, Activity, CreditCard, Settings,
  AlertTriangle, TrendingUp
} from 'lucide-react';
import { useAllTenants, useUpdateTenantStatus, useCreateAuditLog, useLifecycleSignals, LIFECYCLE_CONFIG, LifecycleStage, TenantData } from '@/hooks/useAdminData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const industries = ['Technology', 'Healthcare', 'Retail', 'Legal', 'Education', 'Manufacturing', 'Finance', 'Real Estate'];
const plans = ['Starter', 'Growth', 'Professional', 'Enterprise'];
const statuses = ['active', 'trial', 'suspended', 'churned'];

const features = [
  { id: 'sales', label: 'Sales Module', description: 'Pipeline, leads, deals' },
  { id: 'marketing', label: 'Marketing Module', description: 'Campaigns, automation' },
  { id: 'hr', label: 'HR Module', description: 'Employees, payroll' },
  { id: 'operations', label: 'Operations Module', description: 'Inventory, invoices' },
  { id: 'voice', label: 'Voice AI', description: 'AI-powered calls' },
  { id: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp messaging' },
  { id: 'email', label: 'Email Campaigns', description: 'Email marketing' },
  { id: 'sms', label: 'SMS', description: 'SMS messaging' },
];

export default function AllTenants() {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tenants, isLoading, refetch } = useAllTenants();
  const { data: lifecycle } = useLifecycleSignals();
  const updateStatus = useUpdateTenantStatus();
  const createLog = useCreateAuditLog();

  // Map of tenant_id -> real lifecycle signal (last_active + stage), from the
  // derive_lifecycle_signals RPC. Powers the real Last Activity column + the
  // Lifecycle column/filter. Tenants without a signal fall back gracefully.
  const lifecycleMap = new Map((lifecycle || []).map((l) => [l.tenant_id, l]));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['sales', 'marketing']);

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

  const wizardSteps = [
    'Company Details',
    'Admin User',
    'Features',
    'Plan & Limits',
    'Industry Setup',
    'Review',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Tenants</h1>
          <p className="text-muted-foreground mt-1">Manage all organizations on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateWizard} onOpenChange={setShowCreateWizard}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Tenant</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Step {wizardStep} of 6: {wizardSteps[wizardStep - 1]}
                </DialogDescription>
              </DialogHeader>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-6">
                {wizardSteps.map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index + 1 < wizardStep ? 'bg-primary text-primary-foreground' :
                      index + 1 === wizardStep ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1 < wizardStep ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < wizardSteps.length - 1 && (
                      <div className={`h-0.5 w-8 mx-1 ${
                        index + 1 < wizardStep ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[300px]">
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input placeholder="Enter company name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry *</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {industries.map(industry => (
                              <SelectItem key={industry} value={industry.toLowerCase()}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Company Website</Label>
                      <Input placeholder="https://example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Address</Label>
                      <Input placeholder="Enter address" />
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Admin First Name *</Label>
                        <Input placeholder="First name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Admin Last Name *</Label>
                        <Input placeholder="Last name" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Admin Email *</Label>
                      <Input type="email" placeholder="admin@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Checkbox id="sendInvite" defaultChecked />
                      <Label htmlFor="sendInvite" className="text-sm">Send welcome email with login instructions</Label>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Select which features to enable for this tenant:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {features.map(feature => (
                        <div key={feature.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Checkbox 
                            id={feature.id}
                            checked={selectedFeatures.includes(feature.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFeatures([...selectedFeatures, feature.id]);
                              } else {
                                setSelectedFeatures(selectedFeatures.filter(f => f !== feature.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label htmlFor={feature.id} className="font-medium">{feature.label}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subscription Plan *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map(plan => (
                            <SelectItem key={plan} value={plan.toLowerCase()}>
                              {plan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Max Users</Label>
                        <Input type="number" defaultValue="25" />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Messages</Label>
                        <Input type="number" defaultValue="10000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Voice Minutes</Label>
                        <Input type="number" defaultValue="500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Trial Days</Label>
                      <Input type="number" defaultValue="14" />
                    </div>
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Configure industry-specific settings:</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Default Deal Stages</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Use industry default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Industry Default</SelectItem>
                            <SelectItem value="custom">Custom Stages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Lead Scoring Model</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Standard B2B" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="b2b">Standard B2B</SelectItem>
                            <SelectItem value="b2c">B2C E-commerce</SelectItem>
                            <SelectItem value="services">Professional Services</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label>Enable AI Lead Scoring</Label>
                          <p className="text-xs text-muted-foreground">Use AI to score leads automatically</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 6 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h4 className="font-semibold">Review Configuration</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Company:</span> New Company Inc</div>
                        <div><span className="text-muted-foreground">Industry:</span> Technology</div>
                        <div><span className="text-muted-foreground">Admin:</span> admin@newcompany.com</div>
                        <div><span className="text-muted-foreground">Plan:</span> Professional</div>
                        <div><span className="text-muted-foreground">Features:</span> {selectedFeatures.length} enabled</div>
                        <div><span className="text-muted-foreground">Trial:</span> 14 days</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-chart-2/10 border border-chart-2/30 rounded-lg">
                      <Check className="h-5 w-5 text-chart-2" />
                      <span className="text-sm">Everything looks good! Click create to provision the tenant.</span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                    disabled={wizardStep === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  {wizardStep < 6 ? (
                    <Button onClick={() => setWizardStep(wizardStep + 1)}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={() => setShowCreateWizard(false)}>
                      <Check className="h-4 w-4 mr-2" />
                      Create Tenant
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                          <DropdownMenuItem><UserCog className="h-4 w-4 mr-2" />Impersonate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><Pause className="h-4 w-4 mr-2" />Suspend</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
