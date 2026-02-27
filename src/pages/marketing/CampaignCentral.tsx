import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { logSystemEvent } from '@/lib/api/systemEvents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Mail, MessageSquare, Phone, Calendar as CalendarIcon, Copy, Eye, Send,
  CheckCircle, XCircle, Clock, RefreshCw, Users, ChevronLeft, ChevronRight,
  AlertCircle, FileEdit, Megaphone, Sparkles, UserPlus, Star, ShieldCheck, Loader2, Activity,
} from 'lucide-react';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

// M2: Channel icons with emoji
const channelDisplay: Record<string, { icon: React.ReactNode; emoji: string }> = {
  whatsapp: { icon: <MessageSquare className="h-4 w-4 text-green-500" />, emoji: '💬' },
  email: { icon: <Mail className="h-4 w-4 text-blue-500" />, emoji: '📧' },
  sms: { icon: <Phone className="h-4 w-4 text-purple-500" />, emoji: '📱' },
  instagram: { icon: <Sparkles className="h-4 w-4 text-pink-500" />, emoji: '📸' },
  facebook: { icon: <Users className="h-4 w-4 text-blue-600" />, emoji: '📘' },
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: <FileEdit className="h-3 w-3" />, label: 'Draft' },
  scheduled: { color: 'bg-blue-500/10 text-blue-500', icon: <Clock className="h-3 w-3" />, label: 'Scheduled' },
  sending: { color: 'bg-yellow-500/10 text-yellow-500', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Sending...' },
  sent: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed ✓' },
  active: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" />, label: 'Active' },
  completed: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed ✓' },
  cancelled: { color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" />, label: 'Cancelled' },
  failed: { color: 'bg-destructive/10 text-destructive', icon: <AlertCircle className="h-3 w-3" />, label: 'Failed' },
};

export default function CampaignCentral() {
  const { tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { campaigns, isLoading, stats, sendCampaign, deleteCampaign, refetch } = useMarketingCampaigns();

  const tenantUuid = tenantConfig?.id || null;

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: 'email', subject: '', content: '' });

  // Campaign activity log
  const { data: campaignLog = [] } = useQuery({
    queryKey: ['campaign_activity_log', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .ilike('event_type', '%campaign%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) { console.warn('Campaign log query failed:', error); return []; }
      return data || [];
    },
    enabled: !!tenantUuid,
    refetchInterval: 15000,
  });

  // Customer count for send confirmation
  const { data: customerCount = 0 } = useQuery({
    queryKey: ['campaign-customer-count', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const tc = tenantConfig as any;
      const slug = tc?.tenant_id || tenantUuid;
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', slug);
      return count || 0;
    },
    enabled: !!tenantUuid,
  });

  // Connected channels from tenantConfig
  const connectedChannels = useMemo(() => {
    const channels: string[] = [];
    const tc = tenantConfig as any;
    if (tc?.smtp_host || tc?.resend_api_key) channels.push('📧 Email');
    if (tc?.whatsapp_phone_id) channels.push('💬 WhatsApp');
    if (tc?.meta_page_token) channels.push('📘 Facebook');
    if (tc?.instagram_page_id) channels.push('📸 Instagram');
    if (tc?.linkedin_access_token) channels.push('🔗 LinkedIn');
    return channels;
  }, [tenantConfig]);


  const filterCampaigns = (statusFilter?: string[]) => {
    return campaigns.filter((campaign: any) => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = channelFilter === 'all' || campaign.type === channelFilter;
      const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
      const matchesStatus = !statusFilter || statusFilter.includes(campaign.status);
      let matchesDate = true;
      if (dateRange.from) {
        const campaignDate = new Date(campaign.scheduled_at || campaign.created_at);
        matchesDate = campaignDate >= dateRange.from;
        if (dateRange.to) matchesDate = matchesDate && campaignDate <= dateRange.to;
      }
      return matchesSearch && matchesChannel && matchesType && matchesStatus && matchesDate;
    });
  };

  const filteredCampaigns = useMemo(() => {
    switch (activeTab) {
      case 'scheduled': return filterCampaigns(['scheduled']);
      case 'drafts': return filterCampaigns(['draft']);
      case 'completed': return filterCampaigns(['sent', 'completed', 'cancelled', 'failed']);
      default: return filterCampaigns();
    }
  }, [campaigns, searchQuery, channelFilter, typeFilter, dateRange, activeTab]);

  const scheduledCampaigns = campaigns.filter((c: any) => c.status === 'scheduled' && c.scheduled_at);

  const handleSelectAll = (checked: boolean) => setSelectedCampaigns(checked ? filteredCampaigns.map((c: any) => c.id) : []);
  const handleSelectCampaign = (id: string, checked: boolean) => setSelectedCampaigns(prev => checked ? [...prev, id] : prev.filter(cid => cid !== id));
  const handleBulkDelete = async () => { for (const id of selectedCampaigns) await deleteCampaign.mutateAsync(id); setSelectedCampaigns([]); };
  const handleViewDetails = (campaign: any) => { setSelectedCampaign(campaign); setIsDetailOpen(true); };
  const getCalendarDays = () => eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const getCampaignsForDay = (day: Date) => scheduledCampaigns.filter((c: any) => c.scheduled_at && isSameDay(new Date(c.scheduled_at), day));
  const getDeliveryRate = (c: any) => c.sent_count > 0 ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
  const getReadRate = (c: any) => c.delivered_count > 0 ? Math.round((c.opened_count / c.delivered_count) * 100) : 0;
  const getClickRate = (c: any) => c.opened_count > 0 ? Math.round((c.clicked_count / c.opened_count) * 100) : 0;

  // Create new campaign
  const handleCreateCampaign = async () => {
    if (!tenantConfig?.id || !newCampaign.name.trim()) return;
    try {
      const { error } = await supabase.from('marketing_campaigns').insert({
        tenant_id: tenantConfig.id,
        name: newCampaign.name.trim(),
        type: newCampaign.type,
        subject: newCampaign.subject.trim() || null,
        content: newCampaign.content.trim() || null,
        status: 'draft',
        sent_count: 0, delivered_count: 0, opened_count: 0, clicked_count: 0, converted_count: 0,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
      setIsCreateOpen(false);
      setNewCampaign({ name: '', type: 'email', subject: '', content: '' });
      toast({ title: '✅ Campaign Created', description: `"${newCampaign.name}" saved as draft. You can send it when ready.` });
      logSystemEvent({ tenantId: tenantConfig.id, eventType: 'campaign_created', sourceModule: 'marketing', eventData: { campaign_name: newCampaign.name, channel: newCampaign.type } });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create campaign', variant: 'destructive' });
    }
  };

  // Confirm and send with detailed toast
  const handleConfirmSend = async () => {
    if (!confirmSendCampaign) return;
    try {
      await sendCampaign.mutateAsync(confirmSendCampaign.id);
      toast({ title: "🚀 Campaign Sending!", description: `Sending "${confirmSendCampaign.name}" — check back in a few minutes for delivery stats.` });
    } catch (err: any) {
      toast({ title: "Send Failed", description: err?.message || "Campaign delivery failed. Please try again.", variant: "destructive" });
    }
    setConfirmSendCampaign(null);
  };

  // M2: Duplicate campaign
  const handleDuplicate = async (campaign: any) => {
    if (!tenantConfig?.id) return;
    try {
      const { error } = await supabase.from('marketing_campaigns').insert({
        tenant_id: tenantConfig.id,
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        status: 'draft',
        content: campaign.content,
        subject: campaign.subject,
        sent_count: 0, delivered_count: 0, opened_count: 0, clicked_count: 0, converted_count: 0,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
      toast({ title: "Campaign Duplicated" });
    } catch { toast({ title: "Duplication Failed", variant: "destructive" }); }
  };

  if (tenantLoading || isLoading) {
    return (<div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="flex gap-4"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div><Skeleton className="h-96" /></div>);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Central</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all your marketing campaigns</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
      </div>

      {/* DNC Banner with connected channels */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p>📋 Campaigns auto-check DNC lists and consent records before sending.</p>
          <p className="mt-1">
            Connected channels: {connectedChannels.length > 0
              ? connectedChannels.join(' • ')
              : <span className="text-muted-foreground">None configured — <a href="/settings/integrations" className="underline text-primary">Set up in Settings → Integrations</a></span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search campaigns..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Channels</SelectItem><SelectItem value="whatsapp">💬 WhatsApp</SelectItem><SelectItem value="email">📧 Email</SelectItem><SelectItem value="sms">📱 SMS</SelectItem><SelectItem value="instagram">📸 Instagram</SelectItem><SelectItem value="facebook">📘 Facebook</SelectItem></SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="gap-2"><CalendarIcon className="h-4 w-4" />{dateRange.from ? (dateRange.to ? <>{format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}</> : format(dateRange.from, 'MMM d, yyyy')) : 'Date Range'}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end"><Calendar mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={range => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={2} /></PopoverContent>
            </Popover>
          </div>
          {selectedCampaigns.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t"><span className="text-sm text-muted-foreground">{selectedCampaigns.length} selected</span><Button variant="outline" size="sm" onClick={handleBulkDelete}><Copy className="h-4 w-4 mr-1" />Delete</Button></div>
          )}
        </CardContent>
      </Card>

      {/* AI Campaign Suggestions */}
      {campaigns.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI-Suggested Campaigns</CardTitle>
            <CardDescription>One-click to create these proven campaigns</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Welcome Campaign', desc: 'Automatically welcome new leads with a personalized sequence.', icon: UserPlus, stat: '+40% conversion', emails: '5-email sequence' },
              { name: 'Re-engagement', desc: 'Win back inactive customers with special offers.', icon: RefreshCw, stat: '+25% reactivation', emails: '3-email sequence' },
              { name: 'Review Request', desc: 'Automatically request reviews after service completion.', icon: Star, stat: '+60% reviews', emails: '2-email sequence' },
            ].map(item => (
              <Card key={item.name} className="border-dashed hover:border-primary cursor-pointer transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-lg bg-primary/10"><item.icon className="h-5 w-5 text-primary" /></div><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.emails}</p></div></div>
                  <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                  <div className="flex items-center justify-between text-xs"><span className="text-primary">{item.stat}</span><Button size="sm" onClick={() => { setNewCampaign({ name: item.name, type: 'email', subject: item.name, content: item.desc }); setIsCreateOpen(true); }}>Create</Button></div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2"><Megaphone className="h-4 w-4" />All<Badge variant="secondary" className="ml-1">{stats.total}</Badge></TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2"><Clock className="h-4 w-4" />Scheduled<Badge variant="secondary" className="ml-1">{stats.scheduled}</Badge></TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2"><FileEdit className="h-4 w-4" />Drafts<Badge variant="secondary" className="ml-1">{stats.draft}</Badge></TabsTrigger>
          <TabsTrigger value="completed" className="gap-2"><CheckCircle className="h-4 w-4" />Completed<Badge variant="secondary" className="ml-1">{stats.completed}</Badge></TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4" />Calendar</TabsTrigger>
        </TabsList>

        {['all', 'scheduled', 'drafts', 'completed'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="pt-4">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-12"><Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" /><p className="text-muted-foreground">No campaigns found</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"><Checkbox checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign: any) => {
                        const sc = statusConfig[campaign.status] || statusConfig.draft;
                        const ch = channelDisplay[campaign.type];
                        return (
                          <TableRow key={campaign.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <TableCell><Checkbox checked={selectedCampaigns.includes(campaign.id)} onCheckedChange={checked => handleSelectCampaign(campaign.id, !!checked)} /></TableCell>
                            <TableCell>
                              <div><p className="font-medium">{campaign.name}</p><p className="text-sm text-muted-foreground">{campaign.scheduled_at ? format(new Date(campaign.scheduled_at), 'MMM d, h:mm a') : format(new Date(campaign.created_at), 'MMM d')}</p></div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">{ch?.emoji || '📧'} <span className="capitalize">{campaign.type}</span></div>
                            </TableCell>
                            <TableCell><Badge className={`gap-1 ${sc.color}`}>{sc.icon}{sc.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground" />{campaign.sent_count || 0}</div>
                            </TableCell>
                            <TableCell>
                              {campaign.sent_count > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs"><span className="w-16">Delivered:</span><Progress value={getDeliveryRate(campaign)} className="h-1.5 flex-1" /><span className="w-8 text-right">{getDeliveryRate(campaign)}%</span></div>
                                  <div className="flex items-center gap-2 text-xs"><span className="w-16">Opened:</span><Progress value={getReadRate(campaign)} className="h-1.5 flex-1" /><span className="w-8 text-right">{getReadRate(campaign)}%</span></div>
                                  <div className="flex items-center gap-2 text-xs"><span className="w-16">Clicked:</span><Progress value={getClickRate(campaign)} className="h-1.5 flex-1" /><span className="w-8 text-right">{getClickRate(campaign)}%</span></div>
                                </div>
                              ) : (campaign.sent_count === 0 && ['completed', 'active', 'sent'].includes(campaign.status)) ? (
                                <span className="text-xs text-amber-500 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> No sends recorded
                                </span>
                              ) : <span className="text-sm text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(campaign)}><Eye className="h-4 w-4" /></Button>
                                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setConfirmSendCampaign(campaign)}><Send className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>Send now</TooltipContent></Tooltip></TooltipProvider>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDuplicate(campaign)}><Copy className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scheduled Campaigns</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-medium min-w-32 text-center">{format(calendarMonth, 'MMMM yyyy')}</span>
                  <Button variant="outline" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="bg-muted p-2 text-center text-sm font-medium">{day}</div>)}
                {getCalendarDays().map(day => {
                  const dayCampaigns = getCampaignsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={`bg-background min-h-24 p-2 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                      <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</span>
                      <div className="mt-1 space-y-1">
                        {dayCampaigns.slice(0, 2).map((c: any) => <div key={c.id} className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20" onClick={() => handleViewDetails(c)}>{c.name}</div>)}
                        {dayCampaigns.length > 2 && <p className="text-xs text-muted-foreground">+{dayCampaigns.length - 2} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Confirmation Dialog */}
      <Dialog open={!!confirmSendCampaign} onOpenChange={() => setConfirmSendCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Ready to send "<span className="font-medium">{confirmSendCampaign?.name}</span>"?</p>
              <ul className="list-none space-y-1 mt-2 text-sm">
                <li>• Eligible contacts: <span className="font-semibold">{customerCount.toLocaleString()}</span></li>
                <li>• DNC list will be auto-checked</li>
                <li>• Consent verification is automatic</li>
                <li>• Channel: <span className="font-medium capitalize">{confirmSendCampaign?.type || 'email'}</span></li>
              </ul>
              {customerCount === 0 && (
                <div className="flex items-start gap-2 p-2 mt-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>No eligible contacts found. Add contacts before sending.</span>
                </div>
              )}
              <p className="text-destructive text-xs mt-2">This cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSendCampaign(null)}>Cancel</Button>
            <Button onClick={handleConfirmSend} disabled={sendCampaign.isPending || customerCount === 0}>
              {sendCampaign.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Confirm Send</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>Set up your campaign details. You can send it when ready.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input placeholder="e.g., Welcome New Leads" value={newCampaign.name} onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={newCampaign.type} onValueChange={v => setNewCampaign(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="sms">📱 SMS</SelectItem>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input placeholder="Email subject or message headline" value={newCampaign.subject} onChange={e => setNewCampaign(prev => ({ ...prev, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea placeholder="Campaign message content... Use {{first_name}} for personalization." value={newCampaign.content} onChange={e => setNewCampaign(prev => ({ ...prev, content: e.target.value }))} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign} disabled={!newCampaign.name.trim()}>
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedCampaign && (
            <>
              <SheetHeader><SheetTitle className="flex items-center gap-2">{selectedCampaign.name}</SheetTitle></SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="flex items-center gap-2">
                  <Badge className={`gap-1 ${(statusConfig[selectedCampaign.status] || statusConfig.draft).color}`}>
                    {(statusConfig[selectedCampaign.status] || statusConfig.draft).icon}
                    {(statusConfig[selectedCampaign.status] || statusConfig.draft).label}
                  </Badge>
                  {selectedCampaign.scheduled_at && <span className="text-xs text-muted-foreground">{format(new Date(selectedCampaign.scheduled_at), 'PPP p')}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card><CardContent className="pt-4"><div className="text-center"><p className="text-2xl font-bold">{selectedCampaign.sent_count}</p><p className="text-sm text-muted-foreground">Sent</p></div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-center"><p className="text-2xl font-bold">{selectedCampaign.delivered_count}</p><p className="text-sm text-muted-foreground">Delivered</p></div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-center"><p className="text-2xl font-bold text-green-500">{getDeliveryRate(selectedCampaign)}%</p><p className="text-sm text-muted-foreground">Delivery Rate</p></div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-center"><p className="text-2xl font-bold text-primary">{getReadRate(selectedCampaign)}%</p><p className="text-sm text-muted-foreground">Open Rate</p></div></CardContent></Card>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Performance Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm">Sent</span><span className="font-medium">{selectedCampaign.sent_count}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-green-500">Delivered</span><span className="font-medium">{selectedCampaign.delivered_count}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-primary">Opened</span><span className="font-medium">{selectedCampaign.opened_count}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-blue-500">Clicked</span><span className="font-medium">{selectedCampaign.clicked_count}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-orange-500">Converted</span><span className="font-medium">{selectedCampaign.converted_count}</span></div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Campaign Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Campaign Activity Log</CardTitle>
          <CardDescription>Recent campaign events from the automation system</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignLog.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No campaign events yet. Send a campaign to see activity here.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {campaignLog.map((event: any) => {
                  const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data || '{}') : (event.event_data || {});
                  const isSuccess = event.event_type?.includes('sent') || event.event_type?.includes('completed') || event.event_type?.includes('delivered');
                  const isFail = event.event_type?.includes('failed') || event.event_type?.includes('error');
                  const icon = isSuccess ? '🟢' : isFail ? '🔴' : '🔵';
                  const detail = eventData.message || eventData.campaign_name || event.event_type?.replace(/_/g, ' ') || 'Event';
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{detail}</p>
                        {eventData.channel && <p className="text-xs text-muted-foreground capitalize">Channel: {eventData.channel}</p>}
                        {eventData.sent_count && <p className="text-xs text-muted-foreground">📧 Sent: {eventData.sent_count} {eventData.delivered_count ? `| 📬 Delivered: ${eventData.delivered_count}` : ''}</p>}
                        {eventData.error && <p className="text-xs text-destructive mt-1">{eventData.error}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
