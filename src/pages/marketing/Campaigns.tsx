import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { format, addDays } from 'date-fns';
import {
  Plus,
  Mail,
  MessageSquare,
  Phone,
  Megaphone,
  Target,
  Users,
  Calendar as CalendarIcon,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit,
  Copy,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Send,
  Eye,
  MousePointer,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Filter,
  Search,
  MoreVertical,
  Layers,
  Zap,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

// Types
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'sms' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  audience: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  scheduledDate?: Date;
  createdAt: Date;
  content: string;
}

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  isAI?: boolean;
}


const campaignTemplates = [
  { id: 't1', name: 'Welcome Series', type: 'email', description: 'Automated welcome emails for new subscribers', icon: Mail },
  { id: 't2', name: 'Promotional Blast', type: 'multi-channel', description: 'Multi-channel promotion campaign', icon: Megaphone },
  { id: 't3', name: 'Abandoned Cart', type: 'email', description: 'Recover abandoned shopping carts', icon: Target },
  { id: 't4', name: 'Flash Sale SMS', type: 'sms', description: 'Time-sensitive SMS promotions', icon: Zap },
];

export default function MarketingCampaigns() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const tenantUuid = tenantConfig?.id || null;

  // Real data hooks
  const { campaigns: rawCampaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useMarketingCampaigns();

  // Map DB fields to UI shape
  const campaigns: Campaign[] = rawCampaigns.map(c => ({
    id: c.id,
    name: c.name,
    type: (c.type as Campaign['type']) || 'email',
    status: (c.status as Campaign['status']) || 'draft',
    audience: 0,
    sent: c.sent_count || 0,
    delivered: c.delivered_count || 0,
    opened: c.opened_count || 0,
    clicked: c.clicked_count || 0,
    converted: c.converted_count || 0,
    scheduledDate: c.scheduled_at ? new Date(c.scheduled_at) : undefined,
    createdAt: new Date(c.created_at),
    content: c.message_template || '',
  }));

  // Real audience segments query
  const { data: segments = [] } = useQuery({
    queryKey: ['audience_segments', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('audience_segments')
        .select('*')
        .eq('tenant_id', tenantUuid);
      if (error) return [];
      return (data || []) as AudienceSegment[];
    },
    enabled: !!tenantUuid,
  });

  // State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Wizard form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'email' as Campaign['type'],
    subject: '',
    content: '',
    selectedSegments: [] as string[],
    scheduleDate: undefined as Date | undefined,
    scheduleTime: '09:00',
    sendNow: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const getTypeIcon = (type: Campaign['type']) => {
    const icons = {
      email: Mail,
      whatsapp: MessageSquare,
      sms: Phone,
      'multi-channel': Layers,
    };
    return icons[type] || Mail;
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const config: Record<Campaign['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      draft: { variant: 'secondary', icon: <Edit className="h-3 w-3 mr-1" /> },
      scheduled: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
      active: { variant: 'default', icon: <Play className="h-3 w-3 mr-1" /> },
      paused: { variant: 'secondary', icon: <Pause className="h-3 w-3 mr-1" /> },
      completed: { variant: 'outline', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status];
    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status}
      </Badge>
    );
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    const matchesType = filterType === 'all' || campaign.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleNextStep = () => {
    if (wizardStep < 5) setWizardStep(wizardStep + 1);
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCampaignForm(prev => ({
      ...prev,
      content: `🎉 ${prev.name}\n\nDear valued customer,\n\nWe're excited to share this exclusive offer with you!\n\n[AI-generated content based on your campaign settings]\n\nBest regards,\nYour Team`
    }));
    setIsGenerating(false);
    toast({
      title: 'Content Generated',
      description: 'AI has created content for your campaign.',
    });
  };

  const handleCreateCampaign = async () => {
    try {
      await createCampaign.mutateAsync({
        name: campaignForm.name,
        type: campaignForm.type,
        message_template: campaignForm.content,
        scheduled_at: campaignForm.scheduleDate?.toISOString(),
        send_now: campaignForm.sendNow,
      });
      setIsWizardOpen(false);
      setWizardStep(1);
      setCampaignForm({
        name: '',
        type: 'email',
        subject: '',
        content: '',
        selectedSegments: [],
        scheduleDate: undefined,
        scheduleTime: '09:00',
        sendNow: false,
      });
      toast({
        title: campaignForm.sendNow ? 'Campaign Launched!' : 'Campaign Scheduled',
        description: campaignForm.sendNow
          ? 'Your campaign is now being sent.'
          : campaignForm.scheduleDate
            ? `Scheduled for ${format(campaignForm.scheduleDate, 'PPP')} at ${campaignForm.scheduleTime}`
            : 'Campaign saved as draft.',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
    }
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    await updateCampaign.mutateAsync({ id: campaign.id, status: 'paused' });
    toast({ title: 'Campaign Paused' });
  };

  const handleResumeCampaign = async (campaign: Campaign) => {
    await updateCampaign.mutateAsync({ id: campaign.id, status: 'active' });
    toast({ title: 'Campaign Resumed' });
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    await createCampaign.mutateAsync({
      name: `${campaign.name} (Copy)`,
      type: campaign.type,
      message_template: campaign.content,
    });
    toast({ title: 'Campaign Duplicated' });
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    await deleteCampaign.mutateAsync(campaign.id);
    toast({ title: 'Campaign Deleted' });
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sent, 0),
    totalOpened: campaigns.reduce((sum, c) => sum + c.opened, 0),
    totalConverted: campaigns.reduce((sum, c) => sum + c.converted, 0),
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="Enter campaign name..."
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <RadioGroup
                value={campaignForm.type}
                onValueChange={(value) => setCampaignForm(prev => ({ ...prev, type: value as Campaign['type'] }))}
              >
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'email', label: 'Email', icon: Mail, desc: 'Send email campaigns' },
                    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'WhatsApp broadcast' },
                    { value: 'sms', label: 'SMS', icon: Phone, desc: 'Text message campaign' },
                    { value: 'multi-channel', label: 'Multi-Channel', icon: Layers, desc: 'Combine multiple channels' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-start space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 font-medium">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                        <p className="text-sm text-muted-foreground font-normal">{option.desc}</p>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Select Audience Segments</Label>
              <div className="space-y-3">
                {segments.map((segment) => (
                  <div 
                    key={segment.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      campaignForm.selectedSegments.includes(segment.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setCampaignForm(prev => ({
                        ...prev,
                        selectedSegments: prev.selectedSegments.includes(segment.id)
                          ? prev.selectedSegments.filter(id => id !== segment.id)
                          : [...prev.selectedSegments, segment.id]
                      }));
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={campaignForm.selectedSegments.includes(segment.id)}
                          onCheckedChange={() => {}}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{segment.name}</p>
                            {segment.isAI && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Segment
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{segment.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{segment.count.toLocaleString()}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total audience: <span className="font-bold text-foreground">
                  {segments
                    .filter(s => campaignForm.selectedSegments.includes(s.id))
                    .reduce((sum, s) => sum + s.count, 0)
                    .toLocaleString()}
                </span> contacts
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {campaignForm.type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject..."
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Generate
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Write your campaign content..."
                rows={10}
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>When to send?</Label>
              <RadioGroup
                value={campaignForm.sendNow ? 'now' : 'scheduled'}
                onValueChange={(value) => setCampaignForm(prev => ({ ...prev, sendNow: value === 'now' }))}
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="now" id="send-now" />
                  <Label htmlFor="send-now" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium">
                      <Send className="h-4 w-4" />
                      Send Now
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      Start sending immediately after review
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <RadioGroupItem value="scheduled" id="send-scheduled" />
                  <Label htmlFor="send-scheduled" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium">
                      <CalendarIcon className="h-4 w-4" />
                      Schedule for Later
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      Choose a specific date and time
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {!campaignForm.sendNow && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {campaignForm.scheduleDate 
                          ? format(campaignForm.scheduleDate, 'PPP')
                          : 'Select date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={campaignForm.scheduleDate}
                        onSelect={(date) => setCampaignForm(prev => ({ ...prev, scheduleDate: date }))}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Select
                    value={campaignForm.scheduleTime}
                    onValueChange={(value) => setCampaignForm(prev => ({ ...prev, scheduleTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        const selectedSegmentCount = segments
          .filter(s => campaignForm.selectedSegments.includes(s.id))
          .reduce((sum, s) => sum + (s.count || 0), 0);

        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign Name</span>
                <span className="font-medium">{campaignForm.name || 'Untitled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{campaignForm.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <span className="font-medium">{selectedSegmentCount.toLocaleString()} contacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segments</span>
                <span className="font-medium">{campaignForm.selectedSegments.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium">
                  {campaignForm.sendNow 
                    ? 'Send immediately' 
                    : campaignForm.scheduleDate 
                      ? `${format(campaignForm.scheduleDate, 'PPP')} at ${campaignForm.scheduleTime}`
                      : 'Not set'
                  }
                </span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <Label className="text-sm text-muted-foreground">Content Preview</Label>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {campaignForm.content || 'No content added'}
              </p>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Ready to launch</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Review the details above and click "Launch Campaign" to proceed.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage marketing campaigns
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Campaigns', value: stats.total, icon: Megaphone, color: 'text-blue-500' },
          { label: 'Active', value: stats.active, icon: Play, color: 'text-green-500' },
          { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-orange-500' },
          { label: 'Total Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-purple-500' },
          { label: 'Total Opens', value: stats.totalOpened.toLocaleString(), icon: Eye, color: 'text-cyan-500' },
          { label: 'Conversions', value: stats.totalConverted.toLocaleString(), icon: Target, color: 'text-pink-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>Start with a pre-built campaign template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {campaignTemplates.map((template) => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setCampaignForm(prev => ({
                    ...prev,
                    name: template.name,
                    type: template.type as Campaign['type'],
                  }));
                  setIsWizardOpen(true);
                }}
              >
                <CardContent className="p-4 text-center">
                  <template.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="multi-channel">Multi-Channel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Campaign</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Audience</th>
                  <th className="text-left p-4 font-medium">Delivered</th>
                  <th className="text-left p-4 font-medium">Open Rate</th>
                  <th className="text-left p-4 font-medium">Click Rate</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => {
                  const TypeIcon = getTypeIcon(campaign.type);
                  const openRate = campaign.delivered > 0 
                    ? ((campaign.opened / campaign.delivered) * 100).toFixed(1) 
                    : '0';
                  const clickRate = campaign.delivered > 0 
                    ? ((campaign.clicked / campaign.delivered) * 100).toFixed(1) 
                    : '0';

                  return (
                    <tr key={campaign.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {format(campaign.createdAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{campaign.type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="p-4">
                        {campaign.audience.toLocaleString()}
                      </td>
                      <td className="p-4">
                        {campaign.delivered.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={Number(openRate) > 30 ? 'text-green-500' : ''}>
                          {openRate}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={Number(clickRate) > 5 ? 'text-green-500' : ''}>
                          {clickRate}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {campaign.status === 'active' && (
                              <DropdownMenuItem onClick={() => handlePauseCampaign(campaign)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'paused' && (
                              <DropdownMenuItem onClick={() => handleResumeCampaign(campaign)}>
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteCampaign(campaign)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Step {wizardStep} of 5: {
                ['Campaign Details', 'Audience Selection', 'Content Creation', 'Schedule', 'Review & Launch'][wizardStep - 1]
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  step <= wizardStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {renderWizardStep()}

          <DialogFooter className="gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {wizardStep < 5 ? (
              <Button onClick={handleNextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreateCampaign}>
                {campaignForm.sendNow ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Launch Campaign
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Campaign
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Sheet */}
      <Sheet open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedCampaign && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCampaign.name}</SheetTitle>
                <SheetDescription>
                  Campaign performance details
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedCampaign.status)}
                  <Badge variant="outline" className="capitalize">{selectedCampaign.type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{selectedCampaign.audience.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Audience</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">{selectedCampaign.delivered.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">
                        {selectedCampaign.delivered > 0 
                          ? ((selectedCampaign.opened / selectedCampaign.delivered) * 100).toFixed(1) 
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Open Rate</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold">
                        {selectedCampaign.delivered > 0 
                          ? ((selectedCampaign.clicked / selectedCampaign.delivered) * 100).toFixed(1) 
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Click Rate</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Conversions</Label>
                  <p className="text-3xl font-bold text-primary">
                    {selectedCampaign.converted.toLocaleString()}
                  </p>
                </div>

                <div className="pt-4 flex gap-2">
                  {selectedCampaign.status === 'active' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        handlePauseCampaign(selectedCampaign);
                        setSelectedCampaign(null);
                      }}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {selectedCampaign.status === 'paused' && (
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        handleResumeCampaign(selectedCampaign);
                        setSelectedCampaign(null);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleDuplicateCampaign(selectedCampaign);
                      setSelectedCampaign(null);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
