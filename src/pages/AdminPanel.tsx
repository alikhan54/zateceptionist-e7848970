import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant, IndustryType } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Users,
  Settings,
  CreditCard,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  Pause,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  Activity,
  Server,
  Database,
  MessageSquare,
  Phone,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Shield,
  KeyRound,
  UserX,
  Crown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Mock data for tenants
const mockTenants = [
  {
    id: 'tenant-1',
    tenant_id: 'tenant-1',
    company_name: 'HealthFirst Clinic',
    industry: 'healthcare' as IndustryType,
    logo_url: null,
    status: 'active',
    plan: 'professional',
    users_count: 12,
    last_activity: '2024-01-15T10:30:00Z',
    email: 'admin@healthfirst.com',
    messages_used: 4500,
    messages_limit: 10000,
    calls_used: 120,
    calls_limit: 500,
    created_at: '2023-06-15T00:00:00Z'
  },
  {
    id: 'tenant-2',
    tenant_id: 'tenant-2',
    company_name: 'Prime Realty',
    industry: 'real_estate' as IndustryType,
    logo_url: null,
    status: 'active',
    plan: 'enterprise',
    users_count: 25,
    last_activity: '2024-01-15T09:45:00Z',
    email: 'contact@primerealty.com',
    messages_used: 8200,
    messages_limit: 25000,
    calls_used: 450,
    calls_limit: 1000,
    created_at: '2023-03-20T00:00:00Z'
  },
  {
    id: 'tenant-3',
    tenant_id: 'tenant-3',
    company_name: 'Bella Salon',
    industry: 'salon' as IndustryType,
    logo_url: null,
    status: 'suspended',
    plan: 'starter',
    users_count: 5,
    last_activity: '2024-01-10T14:20:00Z',
    email: 'hello@bellasalon.com',
    messages_used: 1200,
    messages_limit: 2000,
    calls_used: 45,
    calls_limit: 100,
    created_at: '2023-09-01T00:00:00Z'
  },
  {
    id: 'tenant-4',
    tenant_id: 'tenant-4',
    company_name: 'Urban Bistro',
    industry: 'restaurant' as IndustryType,
    logo_url: null,
    status: 'active',
    plan: 'professional',
    users_count: 8,
    last_activity: '2024-01-15T11:00:00Z',
    email: 'manager@urbanbistro.com',
    messages_used: 3800,
    messages_limit: 10000,
    calls_used: 85,
    calls_limit: 500,
    created_at: '2023-07-10T00:00:00Z'
  }
];

// Mock users across tenants
const mockAllUsers = [
  { id: '1', name: 'Dr. Sarah Chen', email: 'sarah@healthfirst.com', role: 'admin', tenant_id: 'tenant-1', tenant_name: 'HealthFirst Clinic', status: 'active', last_active: '2024-01-15T10:30:00Z' },
  { id: '2', name: 'John Miller', email: 'john@primerealty.com', role: 'admin', tenant_id: 'tenant-2', tenant_name: 'Prime Realty', status: 'active', last_active: '2024-01-15T09:45:00Z' },
  { id: '3', name: 'Maria Santos', email: 'maria@bellasalon.com', role: 'admin', tenant_id: 'tenant-3', tenant_name: 'Bella Salon', status: 'inactive', last_active: '2024-01-10T14:20:00Z' },
  { id: '4', name: 'Chef Antonio', email: 'antonio@urbanbistro.com', role: 'manager', tenant_id: 'tenant-4', tenant_name: 'Urban Bistro', status: 'active', last_active: '2024-01-15T11:00:00Z' },
  { id: '5', name: 'Nurse Emily', email: 'emily@healthfirst.com', role: 'staff', tenant_id: 'tenant-1', tenant_name: 'HealthFirst Clinic', status: 'active', last_active: '2024-01-15T08:00:00Z' },
  { id: '6', name: 'Agent Mike', email: 'mike@primerealty.com', role: 'staff', tenant_id: 'tenant-2', tenant_name: 'Prime Realty', status: 'active', last_active: '2024-01-14T16:30:00Z' },
];

// System stats
const systemStats = {
  totalTenants: 156,
  activeTenants: 142,
  totalUsers: 1834,
  activeUsers: 1567,
  messagesThisMonth: 245678,
  callsThisMonth: 12456,
  serverStatus: 'healthy',
  databaseStatus: 'healthy',
  apiLatency: '45ms',
  uptime: '99.97%',
  recentErrors: [
    { id: 1, type: 'API Error', message: 'Rate limit exceeded for tenant-5', timestamp: '2024-01-15T09:30:00Z' },
    { id: 2, type: 'Database', message: 'Slow query on messages table', timestamp: '2024-01-15T08:45:00Z' },
  ],
  webhookStatus: {
    n8n: 'connected',
    vapi: 'connected',
    whatsapp: 'connected',
    email: 'connected'
  }
};

// Billing data
const billingData = {
  monthlyRevenue: 45670,
  previousMonthRevenue: 42300,
  activeSubscriptions: 142,
  trialUsers: 14,
  churnRate: 2.3,
  revenueByPlan: [
    { plan: 'Starter', count: 45, revenue: 4500 },
    { plan: 'Professional', count: 67, revenue: 20100 },
    { plan: 'Enterprise', count: 30, revenue: 21000 },
  ]
};

const planColors: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  trial: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isMasterAdmin, authUser } = useAuth();
  const { setTenantId, tenantId: currentTenantId, tenantConfig } = useTenant();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('tenants');
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<typeof mockTenants[0] | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [impersonatingTenant, setImpersonatingTenant] = useState<typeof mockTenants[0] | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Add tenant wizard state
  const [newTenant, setNewTenant] = useState({
    company_name: '',
    industry: 'general' as IndustryType,
    email: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    features: {
      whatsapp: true,
      email: true,
      voice: false,
      instagram: false,
      facebook: false,
      linkedin: false,
      hr_module: false,
      marketing_module: true,
      sales_module: true
    },
    plan: 'professional',
    messages_limit: 10000,
    calls_limit: 500
  });

  // Redirect non-master admins
  useEffect(() => {
    if (!isMasterAdmin) {
      navigate('/dashboard');
    }
  }, [isMasterAdmin, navigate]);

  if (!isMasterAdmin) {
    return null;
  }

  const handleImpersonate = (tenant: typeof mockTenants[0]) => {
    setImpersonatingTenant(tenant);
    setTenantId(tenant.tenant_id);
    toast({
      title: 'Impersonation Active',
      description: `Now viewing as ${tenant.company_name}`,
    });
  };

  const handleExitImpersonation = () => {
    if (authUser?.tenant_id) {
      setTenantId(authUser.tenant_id);
    }
    setImpersonatingTenant(null);
    toast({
      title: 'Impersonation Ended',
      description: 'Returned to admin view',
    });
  };

  const handleSuspendTenant = (tenant: typeof mockTenants[0]) => {
    toast({
      title: 'Tenant Suspended',
      description: `${tenant.company_name} has been suspended.`,
    });
  };

  const handleDeleteTenant = (tenant: typeof mockTenants[0]) => {
    toast({
      title: 'Tenant Deleted',
      description: `${tenant.company_name} has been deleted.`,
      variant: 'destructive',
    });
  };

  const handleAddTenant = async () => {
    setIsCreating(true);
    try {
      // 1. Generate slug from company name
      const slug = newTenant.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) + '-' + Date.now().toString(36);

      console.log('Creating tenant with slug:', slug);

      // 2. Insert into tenant_config (main tenant table)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_config')
        .insert({
          tenant_id: slug,
          company_name: newTenant.company_name,
          industry: newTenant.industry,
          email: newTenant.email,
          subscription_status: 'active',
          subscription_plan: newTenant.plan,
          subscription_tier: newTenant.plan,
          monthly_message_limit: newTenant.messages_limit,
          monthly_call_limit: newTenant.calls_limit,
          has_whatsapp: newTenant.features.whatsapp,
          has_email: newTenant.features.email,
          has_voice: newTenant.features.voice,
          has_instagram: newTenant.features.instagram,
          has_facebook: newTenant.features.facebook,
          has_linkedin: newTenant.features.linkedin,
          is_active: true,
          ai_mode: 'assisted',
          timezone: 'UTC',
          currency: 'USD',
        })
        .select()
        .single();

      if (tenantError) {
        console.error('tenant_config insert error:', tenantError);
        throw tenantError;
      }

      console.log('tenant_config created:', tenantData);

      // 3. Insert into organizations (for team management)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newTenant.company_name,
          slug: slug,
          industry: newTenant.industry,
          email: newTenant.email,
          timezone: 'UTC',
          subscription_status: 'active',
          is_active: true,
          is_verified: true,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (orgError) {
        console.error('organizations insert error:', orgError);
        // Don't fail completely - tenant_config is more important
      } else {
        console.log('Organization created:', orgData);
      }

      // 4. Create admin user if email/password provided
      if (newTenant.admin_email && newTenant.admin_password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newTenant.admin_email,
          password: newTenant.admin_password,
          options: {
            data: {
              full_name: newTenant.admin_name,
              tenant_id: slug,
            },
          },
        });

        if (authError) {
          console.error('Auth signup error:', authError);
          toast({
            title: 'Warning',
            description: `Tenant created but admin user failed: ${authError.message}`,
            variant: 'destructive',
          });
        } else if (authData.user) {
          // Insert into users table
          await supabase.from('users').insert({
            auth_id: authData.user.id,
            email: newTenant.admin_email,
            full_name: newTenant.admin_name,
            tenant_id: slug,
            role: 'admin',
            is_active: true,
          });
          console.log('Admin user created:', authData.user.id);
        }
      }

      // 5. Success!
      toast({
        title: 'Tenant Created',
        description: `${newTenant.company_name} has been created successfully.`,
      });

      // 6. Reset form and close wizard
      setIsAddWizardOpen(false);
      setWizardStep(1);
      setNewTenant({
        company_name: '',
        industry: 'general',
        email: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        features: {
          whatsapp: true,
          email: true,
          voice: false,
          instagram: false,
          facebook: false,
          linkedin: false,
          hr_module: false,
          marketing_module: true,
          sales_module: true
        },
        plan: 'professional',
        messages_limit: 10000,
        calls_limit: 500
      });

      // 7. Refresh the tenant list (if using react-query)
      // queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    } catch (error: any) {
      console.error('Create tenant failed:', error);
      toast({
        title: 'Error Creating Tenant',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTenants = mockTenants.filter(tenant =>
    tenant.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = mockAllUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTenant = tenantFilter === 'all' || user.tenant_id === tenantFilter;
    return matchesSearch && matchesTenant;
  });

  return (
    <div className="space-y-6">
      {/* Impersonation Banner */}
      {impersonatingTenant && (
        <div className="bg-amber-500 text-amber-950 px-4 py-3 flex items-center justify-between rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5" />
            <span className="font-medium">
              Viewing as <strong>{impersonatingTenant.company_name}</strong>
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExitImpersonation}
            className="bg-amber-950/20 hover:bg-amber-950/30 text-amber-950"
          >
            Exit Impersonation
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all tenants, users, and system settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="tenants" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>All Tenants</CardTitle>
                  <CardDescription>Manage all registered organizations</CardDescription>
                </div>
                <Button onClick={() => setIsAddWizardOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tenant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={tenant.logo_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {tenant.company_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{tenant.company_name}</p>
                              <p className="text-sm text-muted-foreground">{tenant.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{tenant.industry.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[tenant.status]}>
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={planColors[tenant.plan]}>
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{tenant.users_count}</TableCell>
                        <TableCell>
                          {new Date(tenant.last_activity).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedTenant(tenant);
                                setIsEditSheetOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleImpersonate(tenant)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Impersonate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSuspendTenant(tenant)}
                                className="text-amber-600"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                {tenant.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTenant(tenant)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Manage users across all tenants</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {mockTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.tenant_id}>
                        {tenant.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.tenant_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[user.status]}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.last_active).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* Health Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.activeTenants} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {systemStats.activeUsers.toLocaleString()} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages This Month</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.messagesThisMonth.toLocaleString()}</div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calls This Month</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.callsThisMonth.toLocaleString()}</div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +8% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span>Server Status</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {systemStats.serverStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span>Database Status</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {systemStats.databaseStatus}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">API Latency</span>
                  <span className="font-medium">{systemStats.apiLatency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="font-medium">{systemStats.uptime}</span>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Webhook Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(systemStats.webhookStatus).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="capitalize">{service}</span>
                    <Badge className={status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Recent Issues
              </CardTitle>
              <CardDescription>System errors and warnings from the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              {systemStats.recentErrors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent issues</p>
              ) : (
                <div className="space-y-3">
                  {systemStats.recentErrors.map((error) => (
                    <div key={error.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{error.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{error.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Revenue Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${billingData.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{(((billingData.monthlyRevenue - billingData.previousMonthRevenue) / billingData.previousMonthRevenue) * 100).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{billingData.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">
                  {billingData.trialUsers} on trial
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{billingData.churnRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Monthly average
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+7.9%</div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Healthy growth
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
              <CardDescription>Monthly recurring revenue breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingData.revenueByPlan.map((plan) => (
                  <div key={plan.plan} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={planColors[plan.plan.toLowerCase()]}>
                          {plan.plan}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {plan.count} subscriptions
                        </span>
                      </div>
                      <span className="font-medium">${plan.revenue.toLocaleString()}/mo</span>
                    </div>
                    <Progress
                      value={(plan.revenue / billingData.monthlyRevenue) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Usage Overview</CardTitle>
              <CardDescription>Resource usage by tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.company_name}</TableCell>
                        <TableCell>
                          <Badge className={planColors[tenant.plan]}>{tenant.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {tenant.messages_used.toLocaleString()} / {tenant.messages_limit.toLocaleString()}
                            </div>
                            <Progress
                              value={(tenant.messages_used / tenant.messages_limit) * 100}
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {tenant.calls_used} / {tenant.calls_limit}
                            </div>
                            <Progress
                              value={(tenant.calls_used / tenant.calls_limit) * 100}
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>
                        <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Tenant Wizard Dialog */}
      <Dialog open={isAddWizardOpen} onOpenChange={setIsAddWizardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Step {wizardStep} of 4: {
                wizardStep === 1 ? 'Basic Information' :
                wizardStep === 2 ? 'Admin User' :
                wizardStep === 3 ? 'Features' :
                'Subscription'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < wizardStep ? 'bg-primary text-primary-foreground' :
                  step === wizardStep ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {step < wizardStep ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 4 && (
                  <ChevronRight className={`h-4 w-4 mx-1 ${step < wizardStep ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
              </div>
            ))}
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 p-1">
              {wizardStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      placeholder="Acme Inc."
                      value={newTenant.company_name}
                      onChange={(e) => setNewTenant({ ...newTenant, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={newTenant.industry}
                      onValueChange={(value: IndustryType) => setNewTenant({ ...newTenant, industry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="salon">Salon</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Email</Label>
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      value={newTenant.email}
                      onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    />
                  </div>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Admin Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={newTenant.admin_name}
                      onChange={(e) => setNewTenant({ ...newTenant, admin_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      placeholder="admin@company.com"
                      value={newTenant.admin_email}
                      onChange={(e) => setNewTenant({ ...newTenant, admin_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newTenant.admin_password}
                      onChange={(e) => setNewTenant({ ...newTenant, admin_password: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      User will be prompted to change on first login
                    </p>
                  </div>
                </>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Communication Channels</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries({
                      whatsapp: 'WhatsApp',
                      email: 'Email',
                      voice: 'Voice AI',
                      instagram: 'Instagram',
                      facebook: 'Facebook',
                      linkedin: 'LinkedIn'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key}>{label}</Label>
                        <Switch
                          id={key}
                          checked={newTenant.features[key as keyof typeof newTenant.features]}
                          onCheckedChange={(checked) => setNewTenant({
                            ...newTenant,
                            features: { ...newTenant.features, [key]: checked }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <h4 className="font-medium">Modules</h4>
                  <div className="space-y-3">
                    {Object.entries({
                      sales_module: 'Sales Automation',
                      marketing_module: 'Marketing Engine',
                      hr_module: 'HR Management'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key}>{label}</Label>
                        <Switch
                          id={key}
                          checked={newTenant.features[key as keyof typeof newTenant.features]}
                          onCheckedChange={(checked) => setNewTenant({
                            ...newTenant,
                            features: { ...newTenant.features, [key]: checked }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <>
                  <div className="space-y-2">
                    <Label>Subscription Plan</Label>
                    <Select
                      value={newTenant.plan}
                      onValueChange={(value) => setNewTenant({ ...newTenant, plan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter - $99/mo</SelectItem>
                        <SelectItem value="professional">Professional - $299/mo</SelectItem>
                        <SelectItem value="enterprise">Enterprise - $699/mo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Message Limit</Label>
                    <Input
                      type="number"
                      value={newTenant.messages_limit}
                      onChange={(e) => setNewTenant({ ...newTenant, messages_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Call Limit</Label>
                    <Input
                      type="number"
                      value={newTenant.calls_limit}
                      onChange={(e) => setNewTenant({ ...newTenant, calls_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {wizardStep < 4 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleAddTenant} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Tenant
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Tenant</SheetTitle>
            <SheetDescription>
              Modify settings for {selectedTenant?.company_name}
            </SheetDescription>
          </SheetHeader>

          {selectedTenant && (
            <Tabs defaultValue="general" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="danger">Danger</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue={selectedTenant.company_name} />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select defaultValue={selectedTenant.industry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" defaultValue={selectedTenant.email} />
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select defaultValue={selectedTenant.plan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Message Limit</Label>
                    <Input type="number" defaultValue={selectedTenant.messages_limit} />
                  </div>
                  <div className="space-y-2">
                    <Label>Call Limit</Label>
                    <Input type="number" defaultValue={selectedTenant.calls_limit} />
                  </div>
                </div>
                <Button className="w-full">Save Changes</Button>
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-4">
                <h4 className="font-medium">Communication Channels</h4>
                <div className="space-y-3">
                  {['WhatsApp', 'Email', 'Voice AI', 'Instagram', 'Facebook', 'LinkedIn'].map((channel) => (
                    <div key={channel} className="flex items-center justify-between">
                      <Label>{channel}</Label>
                      <Switch defaultChecked={channel === 'Email'} />
                    </div>
                  ))}
                </div>
                <Separator />
                <h4 className="font-medium">Modules</h4>
                <div className="space-y-3">
                  {['Sales Automation', 'Marketing Engine', 'HR Management'].map((module) => (
                    <div key={module} className="flex items-center justify-between">
                      <Label>{module}</Label>
                      <Switch defaultChecked={module !== 'HR Management'} />
                    </div>
                  ))}
                </div>
                <Button className="w-full">Save Features</Button>
              </TabsContent>

              <TabsContent value="danger" className="space-y-4 mt-4">
                <Card className="border-amber-200 dark:border-amber-900">
                  <CardHeader>
                    <CardTitle className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Pause className="h-5 w-5" />
                      Suspend Tenant
                    </CardTitle>
                    <CardDescription>
                      Temporarily disable access for this organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                      onClick={() => handleSuspendTenant(selectedTenant)}
                    >
                      {selectedTenant.status === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant'}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Delete Tenant
                    </CardTitle>
                    <CardDescription>
                      Permanently delete this organization and all its data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDeleteTenant(selectedTenant)}
                    >
                      Delete Tenant
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
