import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntegrationsV2, IntegrationWithStatus } from '@/hooks/useIntegrationsV2';
import { IntegrationCard, IntegrationDialog } from '@/components/integrations';
import { INTEGRATION_CATEGORIES } from '@/types/integrations';
import type { IntegrationCategory } from '@/types/integrations';
import { useTenant } from '@/contexts/TenantContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Search, LayoutGrid, List, ChevronDown, Plug, Sparkles, Activity, CreditCard,
  MessageSquare, Calendar, Users, Headphones, ShoppingCart, Brain, Zap, BarChart3,
  FileText, Filter, X, Save, CheckCircle, XCircle, Eye, EyeOff, Globe, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<IntegrationCategory, React.ComponentType<{ className?: string }>> = {
  communication: MessageSquare, scheduling: Calendar, payments: CreditCard, crm: Users,
  support: Headphones, ecommerce: ShoppingCart, ai: Brain, productivity: Zap,
  analytics: BarChart3, forms: FileText,
};

// ═══════════════════════════════════════════
// Marketing Connections Panel
// ═══════════════════════════════════════════
function MarketingConnections() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  // State for all fields — initialized from tenantConfig
  const tc = tenantConfig as any;
  const [meta, setMeta] = useState({
    facebook_page_id: tc?.facebook_page_id || '',
    facebook_access_token: tc?.facebook_access_token || '',
    instagram_page_id: tc?.instagram_page_id || '',
  });
  const [emailProvider, setEmailProvider] = useState(tc?.email_provider || 'smtp');
  const [email, setEmail] = useState({
    smtp_host: tc?.smtp_host || '', smtp_port: tc?.smtp_port || '587',
    smtp_user: tc?.smtp_user || '', smtp_pass: tc?.smtp_pass || '',
    smtp_from_email: tc?.smtp_from_email || '', smtp_from_name: tc?.smtp_from_name || '',
    resend_api_key: tc?.resend_api_key || '',
  });
  const [whatsappProvider, setWhatsappProvider] = useState(tc?.whatsapp_provider || 'cloud_api');
  const [whatsapp, setWhatsapp] = useState({
    whatsapp_phone_id: tc?.whatsapp_phone_id || '',
    whatsapp_access_token: tc?.whatsapp_access_token || '',
  });
  const [linkedin, setLinkedin] = useState({
    linkedin_access_token: tc?.linkedin_access_token || '',
    linkedin_urn: tc?.linkedin_urn || '',
  });
  const [apify, setApify] = useState({ apify_token: tc?.apify_token || '' });
  const [blog, setBlog] = useState({
    company_domain: tc?.company_domain || '',
    wordpress_url: tc?.wordpress_url || '',
    medium_token: tc?.medium_token || '',
    landing_page_base_url: tc?.landing_page_base_url || '',
  });
  const [gcal, setGcal] = useState({
    google_client_id: tc?.google_client_id || '',
    google_client_secret: tc?.google_client_secret || '',
    google_refresh_token: tc?.google_refresh_token || '',
  });

  const saveSection = async (section: string, data: Record<string, any>) => {
    if (!tenantConfig?.id) return;
    setSaving(section);
    try {
      const { error } = await supabase.from('tenant_config').update(data).eq('id', tenantConfig.id);
      if (error) throw error;
      setLastSaved(prev => ({ ...prev, [section]: new Date().toLocaleString() }));
      toast({ title: '✅ Settings saved!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const testMeta = async () => {
    if (!meta.facebook_access_token) { toast({ title: 'Enter token first', variant: 'destructive' }); return; }
    setTesting('meta');
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${meta.facebook_access_token}`);
      if (res.ok) {
        const data = await res.json();
        toast({ title: '🟢 Connected!', description: `Account: ${data.name || data.id}` });
      } else {
        toast({ title: '🔴 Connection failed', description: 'Invalid or expired token', variant: 'destructive' });
      }
    } catch { toast({ title: '🔴 Connection failed', variant: 'destructive' }); }
    finally { setTesting(null); }
  };

  const toggle = (key: string) => setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));
  const masked = (val: string, key: string) => showTokens[key] ? val : val ? '•'.repeat(Math.min(val.length, 20)) : '';

  const StatusDot = ({ connected }: { connected: boolean }) => (
    <span className={`text-xs ${connected ? 'text-green-600' : 'text-red-500'}`}>
      {connected ? '🟢 Connected' : '🔴 Not configured'}
    </span>
  );

  const SaveButton = ({ section, data }: { section: string; data: Record<string, any> }) => (
    <div className="flex items-center gap-3">
      {lastSaved[section] && <span className="text-xs text-muted-foreground">Last saved: {lastSaved[section]}</span>}
      <Button size="sm" onClick={() => saveSection(section, data)} disabled={saving === section}>
        <Save className="h-3 w-3 mr-1" /> {saving === section ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Marketing Connections</h2>
      </div>
      <p className="text-sm text-muted-foreground">Configure tokens and credentials used by Marketing modules. All fields save directly to your tenant configuration.</p>

      <Tabs defaultValue="meta">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="meta">📘 Meta</TabsTrigger>
          <TabsTrigger value="email">📧 Email</TabsTrigger>
          <TabsTrigger value="whatsapp">💬 WhatsApp</TabsTrigger>
          <TabsTrigger value="linkedin">💼 LinkedIn</TabsTrigger>
          <TabsTrigger value="apify">🔍 Apify</TabsTrigger>
          <TabsTrigger value="blog">🌐 Blog/Website</TabsTrigger>
          <TabsTrigger value="gcal">📅 Google Calendar</TabsTrigger>
        </TabsList>

        {/* META */}
        <TabsContent value="meta">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Facebook + Instagram
                <StatusDot connected={!!meta.facebook_access_token} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Facebook Page ID</Label>
                  <Input value={meta.facebook_page_id} onChange={e => setMeta(p => ({ ...p, facebook_page_id: e.target.value }))} placeholder="e.g., 123456789" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Instagram Page ID</Label>
                  <Input value={meta.instagram_page_id} onChange={e => setMeta(p => ({ ...p, instagram_page_id: e.target.value }))} placeholder="e.g., 17841..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Facebook Access Token</Label>
                <div className="flex gap-2">
                  <Input type={showTokens.fb ? 'text' : 'password'} value={meta.facebook_access_token}
                    onChange={e => setMeta(p => ({ ...p, facebook_access_token: e.target.value }))} placeholder="EAA..." className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => toggle('fb')}>
                    {showTokens.fb ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={testMeta} disabled={testing === 'meta'}>
                  {testing === 'meta' ? 'Testing...' : 'Test Connection'}
                </Button>
                <SaveButton section="meta" data={meta} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMAIL */}
        <TabsContent value="email">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Email Configuration
                <StatusDot connected={!!(email.smtp_host || email.resend_api_key)} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <Select value={emailProvider} onValueChange={setEmailProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {emailProvider === 'smtp' ? (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">SMTP Host</Label><Input value={email.smtp_host} onChange={e => setEmail(p => ({ ...p, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Port</Label><Input value={email.smtp_port} onChange={e => setEmail(p => ({ ...p, smtp_port: e.target.value }))} placeholder="587" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Username</Label><Input value={email.smtp_user} onChange={e => setEmail(p => ({ ...p, smtp_user: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input type="password" value={email.smtp_pass} onChange={e => setEmail(p => ({ ...p, smtp_pass: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">From Email</Label><Input value={email.smtp_from_email} onChange={e => setEmail(p => ({ ...p, smtp_from_email: e.target.value }))} placeholder="noreply@company.com" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">From Name</Label><Input value={email.smtp_from_name} onChange={e => setEmail(p => ({ ...p, smtp_from_name: e.target.value }))} placeholder="My Company" /></div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Resend API Key</Label><Input type="password" value={email.resend_api_key} onChange={e => setEmail(p => ({ ...p, resend_api_key: e.target.value }))} placeholder="re_..." /></div>
                  <div className="space-y-1.5"><Label className="text-xs">From Email</Label><Input value={email.smtp_from_email} onChange={e => setEmail(p => ({ ...p, smtp_from_email: e.target.value }))} placeholder="noreply@company.com" /></div>
                </div>
              )}
              <div className="flex justify-end">
                <SaveButton section="email" data={{ email_provider: emailProvider, ...email }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WHATSAPP */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                WhatsApp
                <StatusDot connected={!!whatsapp.whatsapp_phone_id} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <Select value={whatsappProvider} onValueChange={setWhatsappProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud_api">Cloud API</SelectItem>
                    <SelectItem value="wati">WATI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Phone Number ID</Label><Input value={whatsapp.whatsapp_phone_id} onChange={e => setWhatsapp(p => ({ ...p, whatsapp_phone_id: e.target.value }))} placeholder="1234567890" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Access Token</Label>
                  <Input type="password" value={whatsapp.whatsapp_access_token} onChange={e => setWhatsapp(p => ({ ...p, whatsapp_access_token: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <SaveButton section="whatsapp" data={{ whatsapp_provider: whatsappProvider, ...whatsapp }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINKEDIN */}
        <TabsContent value="linkedin">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                LinkedIn
                <StatusDot connected={!!linkedin.linkedin_access_token} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Access Token</Label><Input type="password" value={linkedin.linkedin_access_token} onChange={e => setLinkedin(p => ({ ...p, linkedin_access_token: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Company URN</Label><Input value={linkedin.linkedin_urn} onChange={e => setLinkedin(p => ({ ...p, linkedin_urn: e.target.value }))} placeholder="urn:li:organization:12345" /></div>
              </div>
              <div className="flex justify-end">
                <SaveButton section="linkedin" data={linkedin} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APIFY */}
        <TabsContent value="apify">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Apify (Competitor Scraping)
                <StatusDot connected={!!apify.apify_token} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">API Token</Label>
                <Input type="password" value={apify.apify_token} onChange={e => setApify({ apify_token: e.target.value })} placeholder="apify_api_..." />
              </div>
              <p className="text-xs text-muted-foreground">
                {apify.apify_token ? '🟢 Competitor scraping will use live Apify data' : '🟡 Without a token, competitor analysis uses sample data'}
              </p>
              <div className="flex justify-end">
                <SaveButton section="apify" data={apify} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOG/WEBSITE */}
        <TabsContent value="blog">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Blog &amp; Website
                <StatusDot connected={!!blog.company_domain} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Company Domain</Label><Input value={blog.company_domain} onChange={e => setBlog(p => ({ ...p, company_domain: e.target.value }))} placeholder="company.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">WordPress URL (optional)</Label><Input value={blog.wordpress_url} onChange={e => setBlog(p => ({ ...p, wordpress_url: e.target.value }))} placeholder="https://blog.company.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Medium Token (optional)</Label><Input type="password" value={blog.medium_token} onChange={e => setBlog(p => ({ ...p, medium_token: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Landing Page Base URL</Label><Input value={blog.landing_page_base_url} onChange={e => setBlog(p => ({ ...p, landing_page_base_url: e.target.value }))} placeholder="https://pages.company.com" /></div>
              </div>
              <div className="flex justify-end">
                <SaveButton section="blog" data={blog} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* GOOGLE CALENDAR */}
        <TabsContent value="gcal">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Google Calendar (Appointments)
                <StatusDot connected={!!gcal.google_refresh_token} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Client ID</Label><Input value={gcal.google_client_id} onChange={e => setGcal(p => ({ ...p, google_client_id: e.target.value }))} placeholder="xxxx.apps.googleusercontent.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Client Secret</Label><Input type="password" value={gcal.google_client_secret} onChange={e => setGcal(p => ({ ...p, google_client_secret: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Refresh Token</Label>
                <Input type="password" value={gcal.google_refresh_token} onChange={e => setGcal(p => ({ ...p, google_refresh_token: e.target.value }))} placeholder="1//0..." />
              </div>
              <p className="text-xs text-muted-foreground">Required for syncing appointments. Get credentials from the Google Cloud Console &gt; OAuth 2.0.</p>
              <div className="flex justify-end">
                <SaveButton section="gcal" data={gcal} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Integrations Page
// ═══════════════════════════════════════════
export default function Integrations() {
  const { tenantConfig } = useTenant();
  const { tier } = useSubscription();
  const {
    integrations, isLoading, connectIntegration, disconnectIntegration,
    testConnection, getWebhookUrl, getStoredCredentials, getStoredSettings,
    connectedCount, totalCount,
  } = useIntegrationsV2();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationWithStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      const matchesSearch = !search || integration.name.toLowerCase().includes(search.toLowerCase()) || integration.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'connected' && integration.status === 'connected') || (statusFilter === 'disconnected' && integration.status !== 'connected');
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [integrations, search, categoryFilter, statusFilter]);

  const groupedIntegrations = useMemo(() => {
    const groups: Record<IntegrationCategory, IntegrationWithStatus[]> = {
      communication: [], scheduling: [], payments: [], crm: [], support: [],
      ecommerce: [], ai: [], productivity: [], analytics: [], forms: [],
    };
    filteredIntegrations.forEach(i => groups[i.category].push(i));
    return groups;
  }, [filteredIntegrations]);

  const toggleCategory = (c: string) => setOpenCategories(prev => ({ ...prev, [c]: !prev[c] }));

  const handleOpenDialog = (i: IntegrationWithStatus) => { setSelectedIntegration(i); setIsDialogOpen(true); };
  const handleCloseDialog = () => { setIsDialogOpen(false); setSelectedIntegration(null); };
  const handleSave = async (credentials: Record<string, string>, settings?: Record<string, any>) => {
    if (!selectedIntegration) return;
    await connectIntegration.mutateAsync({ integrationId: selectedIntegration.id, credentials, settings });
    handleCloseDialog();
  };
  const handleDisconnect = async (i: IntegrationWithStatus) => { await disconnectIntegration.mutateAsync(i.id); };
  const handleTest = async () => { if (selectedIntegration) await testConnection.mutateAsync(selectedIntegration.id); };
  const clearFilters = () => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); };
  const hasActiveFilters = search || categoryFilter !== 'all' || statusFilter !== 'all';

  if (isLoading) {
    return <div className="space-y-6 p-6"><Skeleton className="h-10 w-64" /><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(9)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div></div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Marketing Connections Panel — top section */}
        <MarketingConnections />

        <div className="border-t pt-6" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">All Integrations</h1>
            <p className="text-muted-foreground">Connect your favorite tools and services</p>
          </div>
          <div className="flex gap-3">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2"><Plug className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{connectedCount}</span><span className="text-sm text-muted-foreground">/ {totalCount}</span></div>
              <p className="text-xs text-muted-foreground">Connected</p>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium capitalize">{tier}</span></div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(INTEGRATION_CATEGORIES).map(([key, cat]) => <SelectItem key={key} value={key}>{cat.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><Activity className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="rounded-none"><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="rounded-none"><List className="h-4 w-4" /></Button>
          </div>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>}
        </div>

        {hasActiveFilters && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Showing {filteredIntegrations.length} of {totalCount} integrations</span></div>}

        {/* Categories */}
        <div className="space-y-4">
          {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => {
            if (categoryIntegrations.length === 0) return null;
            const categoryInfo = INTEGRATION_CATEGORIES[category as IntegrationCategory];
            const CategoryIcon = CATEGORY_ICONS[category as IntegrationCategory];
            const isOpen = openCategories[category] !== false;
            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${categoryInfo.color}20` }}><CategoryIcon className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h2 className="font-semibold">{categoryInfo.label}</h2>
                        <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">{categoryIntegrations.filter(i => i.status === 'connected').length} / {categoryIntegrations.length}</Badge>
                    </div>
                    <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AnimatePresence mode="wait">
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className={cn('pt-4', viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3')}>
                      {categoryIntegrations.map(integration => (
                        <IntegrationCard key={integration.id} integration={integration}
                          onConnect={() => handleOpenDialog(integration)}
                          onDisconnect={() => handleDisconnect(integration)}
                          onConfigure={() => handleOpenDialog(integration)} />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No integrations found</h3>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}

        <IntegrationDialog integration={selectedIntegration} isOpen={isDialogOpen} onClose={handleCloseDialog}
          onSave={handleSave} onTest={handleTest}
          storedCredentials={selectedIntegration ? getStoredCredentials(selectedIntegration) : {}}
          storedSettings={selectedIntegration ? getStoredSettings(selectedIntegration.id) : {}}
          webhookUrl={selectedIntegration ? getWebhookUrl(selectedIntegration.id) : undefined}
          isConnected={selectedIntegration?.status === 'connected'}
          isSaving={connectIntegration.isPending} isTesting={testConnection.isPending} />
      </div>
    </TooltipProvider>
  );
}
