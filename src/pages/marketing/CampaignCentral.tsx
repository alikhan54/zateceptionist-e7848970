import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { callWebhook, WEBHOOKS } from '@/integrations/supabase';
import {
  Search,
  Plus,
  Mail,
  MessageSquare,
  Phone,
  Calendar as CalendarIcon,
  Filter,
  Trash2,
  Copy,
  Eye,
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  BarChart3,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileEdit,
  Megaphone
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  type: 'marketing' | 'promotional' | 'reminder' | 'follow_up';
  channel: 'whatsapp' | 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  audience_size: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  scheduled_at?: string;
  sent_at?: string;
}

interface Recipient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at?: string;
  error?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

// Mock data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Sale Blast',
    type: 'promotional',
    channel: 'whatsapp',
    status: 'sent',
    audience_size: 500,
    sent_count: 485,
    delivered_count: 470,
    read_count: 380,
    failed_count: 15,
    created_at: '2024-01-10T10:00:00Z',
    sent_at: '2024-01-15T09:00:00Z',
  },
  {
    id: '2',
    name: 'Monthly Newsletter',
    type: 'marketing',
    channel: 'email',
    status: 'scheduled',
    audience_size: 1200,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    failed_count: 0,
    created_at: '2024-01-18T14:00:00Z',
    scheduled_at: '2024-01-25T08:00:00Z',
  },
  {
    id: '3',
    name: 'Appointment Reminders',
    type: 'reminder',
    channel: 'sms',
    status: 'sending',
    audience_size: 150,
    sent_count: 85,
    delivered_count: 80,
    read_count: 60,
    failed_count: 5,
    created_at: '2024-01-20T11:00:00Z',
  },
  {
    id: '4',
    name: 'New Product Launch',
    type: 'promotional',
    channel: 'whatsapp',
    status: 'draft',
    audience_size: 800,
    sent_count: 0,
    delivered_count: 0,
    read_count: 0,
    failed_count: 0,
    created_at: '2024-01-22T16:00:00Z',
  },
  {
    id: '5',
    name: 'Follow-up Series',
    type: 'follow_up',
    channel: 'email',
    status: 'sent',
    audience_size: 300,
    sent_count: 295,
    delivered_count: 290,
    read_count: 145,
    failed_count: 5,
    created_at: '2024-01-05T09:00:00Z',
    sent_at: '2024-01-08T10:00:00Z',
  },
  {
    id: '6',
    name: 'Flash Sale Alert',
    type: 'promotional',
    channel: 'sms',
    status: 'failed',
    audience_size: 200,
    sent_count: 50,
    delivered_count: 45,
    read_count: 30,
    failed_count: 150,
    created_at: '2024-01-12T13:00:00Z',
    sent_at: '2024-01-12T14:00:00Z',
  },
];

const mockRecipients: Recipient[] = [
  { id: '1', name: 'John Smith', phone: '+1234567890', status: 'read', sent_at: '2024-01-15T09:01:00Z' },
  { id: '2', name: 'Sarah Johnson', phone: '+1234567891', status: 'delivered', sent_at: '2024-01-15T09:01:00Z' },
  { id: '3', name: 'Mike Brown', phone: '+1234567892', status: 'failed', error: 'Invalid number' },
  { id: '4', name: 'Emily Davis', phone: '+1234567893', status: 'read', sent_at: '2024-01-15T09:02:00Z' },
  { id: '5', name: 'Chris Wilson', phone: '+1234567894', status: 'pending' },
];

const mockActivityLog: ActivityLog[] = [
  { id: '1', action: 'Campaign created', timestamp: '2024-01-10T10:00:00Z' },
  { id: '2', action: 'Content updated', timestamp: '2024-01-12T14:30:00Z', details: 'Message text modified' },
  { id: '3', action: 'Campaign scheduled', timestamp: '2024-01-14T09:00:00Z', details: 'Scheduled for Jan 15, 9:00 AM' },
  { id: '4', action: 'Campaign started', timestamp: '2024-01-15T09:00:00Z' },
  { id: '5', action: 'Campaign completed', timestamp: '2024-01-15T09:45:00Z', details: '485 messages sent' },
];

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
  email: <Mail className="h-4 w-4 text-blue-500" />,
  sms: <Phone className="h-4 w-4 text-purple-500" />,
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: <FileEdit className="h-3 w-3" /> },
  scheduled: { color: 'bg-blue-500/10 text-blue-500', icon: <Clock className="h-3 w-3" /> },
  sending: { color: 'bg-yellow-500/10 text-yellow-500', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  sent: { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { color: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
  failed: { color: 'bg-destructive/10 text-destructive', icon: <AlertCircle className="h-3 w-3" /> },
};

const recipientStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  delivered: 'bg-green-500/10 text-green-500',
  read: 'bg-primary/10 text-primary',
  failed: 'bg-destructive/10 text-destructive',
};

export default function CampaignCentral() {
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('all');

  const filterCampaigns = (statusFilter?: string[]) => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = channelFilter === 'all' || campaign.channel === channelFilter;
      const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
      const matchesStatus = !statusFilter || statusFilter.includes(campaign.status);
      
      let matchesDate = true;
      if (dateRange.from) {
        const campaignDate = new Date(campaign.scheduled_at || campaign.sent_at || campaign.created_at);
        matchesDate = campaignDate >= dateRange.from;
        if (dateRange.to) {
          matchesDate = matchesDate && campaignDate <= dateRange.to;
        }
      }
      
      return matchesSearch && matchesChannel && matchesType && matchesStatus && matchesDate;
    });
  };

  const filteredCampaigns = useMemo(() => {
    switch (activeTab) {
      case 'scheduled':
        return filterCampaigns(['scheduled']);
      case 'drafts':
        return filterCampaigns(['draft']);
      case 'completed':
        return filterCampaigns(['sent', 'cancelled', 'failed']);
      default:
        return filterCampaigns();
    }
  }, [campaigns, searchQuery, channelFilter, typeFilter, dateRange, activeTab]);

  const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled' && c.scheduled_at);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, id]);
    } else {
      setSelectedCampaigns(prev => prev.filter(cid => cid !== id));
    }
  };

  const handleBulkDelete = () => {
    toast({
      title: 'Campaigns Deleted',
      description: `${selectedCampaigns.length} campaign(s) have been deleted.`,
    });
    setSelectedCampaigns([]);
  };

  const handleBulkDuplicate = () => {
    toast({
      title: 'Campaigns Duplicated',
      description: `${selectedCampaigns.length} campaign(s) have been duplicated.`,
    });
    setSelectedCampaigns([]);
  };

  const handleRetryFailed = async (campaign: Campaign) => {
    if (!tenantId) return;
    
    try {
      await callWebhook(
        WEBHOOKS.SEND_CAMPAIGN,
        {
          campaign_id: campaign.id,
          action: 'retry_failed',
        },
        tenantId
      );
      toast({
        title: 'Retry Initiated',
        description: `Retrying ${campaign.failed_count} failed messages.`,
      });
    } catch {
      toast({
        title: 'Retry Failed',
        description: 'Could not retry failed messages. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDetailOpen(true);
  };

  const getCalendarDays = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  };

  const getCampaignsForDay = (day: Date) => {
    return scheduledCampaigns.filter(c => 
      c.scheduled_at && isSameDay(new Date(c.scheduled_at), day)
    );
  };

  const getDeliveryRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.delivered_count / campaign.sent_count) * 100);
  };

  const getReadRate = (campaign: Campaign) => {
    if (campaign.delivered_count === 0) return 0;
    return Math.round((campaign.read_count / campaign.delivered_count) * 100);
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Central</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all your marketing campaigns
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </>
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
                    )
                  ) : (
                    'Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Bulk Actions */}
          {selectedCampaigns.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedCampaigns.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleBulkDuplicate}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Megaphone className="h-4 w-4" />
            All Campaigns
            <Badge variant="secondary" className="ml-1">{campaigns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduled
            <Badge variant="secondary" className="ml-1">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <FileEdit className="h-4 w-4" />
            Drafts
            <Badge variant="secondary" className="ml-1">
              {campaigns.filter(c => c.status === 'draft').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed
            <Badge variant="secondary" className="ml-1">
              {campaigns.filter(c => ['sent', 'cancelled', 'failed'].includes(c.status)).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Campaign Table Tabs */}
        {['all', 'scheduled', 'drafts', 'completed'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="pt-4">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No campaigns found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCampaigns.includes(campaign.id)}
                              onCheckedChange={(checked) => handleSelectCampaign(campaign.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {campaign.type.replace('_', ' ')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {channelIcons[campaign.channel]}
                              <span className="capitalize">{campaign.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {campaign.audience_size.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${statusConfig[campaign.status].color}`}>
                              {statusConfig[campaign.status].icon}
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {campaign.scheduled_at ? (
                                <span>Scheduled: {format(new Date(campaign.scheduled_at), 'MMM d, h:mm a')}</span>
                              ) : campaign.sent_at ? (
                                <span>Sent: {format(new Date(campaign.sent_at), 'MMM d, h:mm a')}</span>
                              ) : (
                                <span className="text-muted-foreground">Not scheduled</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {campaign.sent_count > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-16">Delivered:</span>
                                  <Progress value={getDeliveryRate(campaign)} className="h-1.5 flex-1" />
                                  <span className="w-8 text-right">{getDeliveryRate(campaign)}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-16">Read:</span>
                                  <Progress value={getReadRate(campaign)} className="h-1.5 flex-1" />
                                  <span className="w-8 text-right">{getReadRate(campaign)}%</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewDetails(campaign)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Copy className="h-4 w-4" />
                              </Button>
                              {campaign.status === 'failed' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleRetryFailed(campaign)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scheduled Campaigns</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-32 text-center">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
                    {day}
                  </div>
                ))}
                {getCalendarDays().map((day, idx) => {
                  const dayCampaigns = getCampaignsForDay(day);
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, new Date());
                  
                  // Add empty cells for days before the first of the month
                  const startPadding = idx === 0 ? new Array(day.getDay()).fill(null) : [];
                  
                  return (
                    <>
                      {startPadding.map((_, i) => (
                        <div key={`pad-${i}`} className="bg-background min-h-24 p-2" />
                      ))}
                      <div
                        key={day.toISOString()}
                        className={`bg-background min-h-24 p-2 ${
                          !isCurrentMonth ? 'opacity-50' : ''
                        } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                      >
                        <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayCampaigns.slice(0, 2).map((campaign) => (
                            <div
                              key={campaign.id}
                              className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                              onClick={() => handleViewDetails(campaign)}
                            >
                              {channelIcons[campaign.channel]}
                              <span className="ml-1">{campaign.name}</span>
                            </div>
                          ))}
                          {dayCampaigns.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{dayCampaigns.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedCampaign && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {channelIcons[selectedCampaign.channel]}
                  {selectedCampaign.name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  <Badge className={`gap-1 ${statusConfig[selectedCampaign.status].color}`}>
                    {statusConfig[selectedCampaign.status].icon}
                    {selectedCampaign.status}
                  </Badge>
                  {selectedCampaign.status === 'failed' && (
                    <Button size="sm" onClick={() => handleRetryFailed(selectedCampaign)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Failed
                    </Button>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedCampaign.audience_size}</p>
                        <p className="text-sm text-muted-foreground">Total Audience</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedCampaign.sent_count}</p>
                        <p className="text-sm text-muted-foreground">Messages Sent</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-500">
                          {getDeliveryRate(selectedCampaign)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Delivery Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {getReadRate(selectedCampaign)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Read Rate</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sent</span>
                      <span className="font-medium">{selectedCampaign.sent_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-500">Delivered</span>
                      <span className="font-medium">{selectedCampaign.delivered_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-primary">Read</span>
                      <span className="font-medium">{selectedCampaign.read_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-destructive">Failed</span>
                      <span className="font-medium">{selectedCampaign.failed_count}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recipients */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recipients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {mockRecipients.map((recipient) => (
                          <div 
                            key={recipient.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div>
                              <p className="font-medium text-sm">{recipient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.phone || recipient.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={recipientStatusColors[recipient.status]}>
                                {recipient.status}
                              </Badge>
                              {recipient.error && (
                                <p className="text-xs text-destructive mt-1">{recipient.error}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Activity Log */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Activity Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {mockActivityLog.map((log) => (
                          <div key={log.id} className="flex gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{log.action}</p>
                              {log.details && (
                                <p className="text-xs text-muted-foreground">{log.details}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
