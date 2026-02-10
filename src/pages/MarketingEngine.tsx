import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { callWebhook, WEBHOOKS } from '@/integrations/supabase';
import { 
  Plus, 
  Send, 
  Mail, 
  MessageSquare, 
  Phone, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Eye, 
  Copy,
  XCircle,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';


export default function MarketingEngine() {
  const { tenantId, translate, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { campaigns, isLoading, stats, createCampaign, sendCampaign, refetch } = useMarketingCampaigns();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [generatingContent, setGeneratingContent] = useState(false);

  // Campaign wizard state
  const [campaignData, setCampaignData] = useState({
    name: '',
    type: 'marketing' as string,
    channel: 'whatsapp' as string,
    audienceFilter: 'all',
    temperatureFilter: [] as string[],
    lifecycleFilter: [] as string[],
    message: '',
    mediaUrl: '',
    scheduleType: 'now',
    scheduledDate: undefined as Date | undefined,
    scheduledTime: '09:00',
  });

  const [audienceCount, setAudienceCount] = useState(0);

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-500/10 text-blue-500',
    sending: 'bg-yellow-500/10 text-yellow-500',
    sent: 'bg-green-500/10 text-green-500',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  const channelIcons: Record<string, React.ReactNode> = {
    whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
    email: <Mail className="h-4 w-4 text-blue-500" />,
    sms: <Phone className="h-4 w-4 text-purple-500" />,
  };

  const handleGenerateContent = async () => {
    if (!tenantId) return;
    
    setGeneratingContent(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.GENERATE_CONTENT,
        {
          type: campaignData.type,
          channel: campaignData.channel,
          prompt: `Generate a ${campaignData.type} message for ${campaignData.channel}`,
        },
        tenantId
      );
      
      if (result.success && result.data) {
        setCampaignData(prev => ({
          ...prev,
          message: (result.data as { content?: string })?.content || 'Generated content here...',
        }));
        toast({
          title: 'Content Generated',
          description: 'AI-generated content has been added to your message.',
        });
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Could not generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!tenantId) return;
    
    try {
      const scheduledAt = campaignData.scheduleType === 'schedule' && campaignData.scheduledDate
        ? `${format(campaignData.scheduledDate, 'yyyy-MM-dd')}T${campaignData.scheduledTime}:00`
        : undefined;

      const created = await createCampaign.mutateAsync({
        name: campaignData.name,
        type: campaignData.type,
        message_template: campaignData.message,
        media_url: campaignData.mediaUrl || undefined,
        scheduled_at: scheduledAt,
        send_now: campaignData.scheduleType === 'now',
      });

      if (campaignData.scheduleType === 'now' && created?.id) {
        await sendCampaign.mutateAsync(created.id);
      }

      setIsWizardOpen(false);
      resetWizard();
    } catch (error) {
      toast({
        title: 'Campaign Failed',
        description: 'Could not send campaign. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCampaignData({
      name: '',
      type: 'marketing',
      channel: 'whatsapp',
      audienceFilter: 'all',
      temperatureFilter: [],
      lifecycleFilter: [],
      message: '',
      mediaUrl: '',
      scheduleType: 'now',
      scheduledDate: undefined,
      scheduledTime: '09:00',
    });
    setAudienceCount(0);
  };

  const updateAudienceFilter = () => {
    // In real implementation, this would query the database
    // For demo, just show a random number
    const baseCount = 500;
    let count = baseCount;
    if (campaignData.audienceFilter !== 'all') {
      count = Math.floor(count * 0.3);
    }
    if (campaignData.temperatureFilter.length > 0) {
      count = Math.floor(count * (campaignData.temperatureFilter.length / 3));
    }
    if (campaignData.lifecycleFilter.length > 0) {
      count = Math.floor(count * (campaignData.lifecycleFilter.length / 5));
    }
    setAudienceCount(count);
  };


  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="Enter campaign name"
                value={campaignData.name}
                onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select
                value={campaignData.type}
                onValueChange={(value: string) => 
                  setCampaignData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Channel</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['whatsapp', 'email', 'sms'] as const).map((channel) => (
                  <Button
                    key={channel}
                    type="button"
                    variant={campaignData.channel === channel ? 'default' : 'outline'}
                    className="justify-start gap-2"
                    onClick={() => setCampaignData(prev => ({ ...prev, channel }))}
                  >
                    {channelIcons[channel]}
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={campaignData.audienceFilter}
                onValueChange={(value) => {
                  setCampaignData(prev => ({ ...prev, audienceFilter: value }));
                  updateAudienceFilter();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {translate('customers')}</SelectItem>
                  <SelectItem value="filtered">Filtered Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {campaignData.audienceFilter === 'filtered' && (
              <>
                <div className="space-y-2">
                  <Label>Filter by Temperature</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['HOT', 'WARM', 'COLD'].map((temp) => (
                      <div key={temp} className="flex items-center space-x-2">
                        <Checkbox
                          id={`temp-${temp}`}
                          checked={campaignData.temperatureFilter.includes(temp)}
                          onCheckedChange={(checked) => {
                            setCampaignData(prev => ({
                              ...prev,
                              temperatureFilter: checked
                                ? [...prev.temperatureFilter, temp]
                                : prev.temperatureFilter.filter(t => t !== temp)
                            }));
                            updateAudienceFilter();
                          }}
                        />
                        <Label htmlFor={`temp-${temp}`} className="text-sm">{temp}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Filter by Lifecycle Stage</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['new', 'contacted', 'qualified', 'converted', 'churned'].map((stage) => (
                      <div key={stage} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stage-${stage}`}
                          checked={campaignData.lifecycleFilter.includes(stage)}
                          onCheckedChange={(checked) => {
                            setCampaignData(prev => ({
                              ...prev,
                              lifecycleFilter: checked
                                ? [...prev.lifecycleFilter, stage]
                                : prev.lifecycleFilter.filter(s => s !== stage)
                            }));
                            updateAudienceFilter();
                          }}
                        />
                        <Label htmlFor={`stage-${stage}`} className="text-sm capitalize">{stage}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Audience Preview:</span>
                  <span className="text-2xl font-bold text-primary">
                   {audienceCount || stats.totalSent}
                  </span>
                  <span className="text-muted-foreground">{translate('customers')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message Content</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateContent}
                  disabled={generatingContent}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {generatingContent ? 'Generating...' : 'AI Generate'}
                </Button>
              </div>
              <Textarea
                id="message"
                placeholder="Write your message here..."
                rows={6}
                value={campaignData.message}
                onChange={(e) => setCampaignData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-2">
                {['{name}', '{company}', '{first_name}', '{email}', '{phone}'].map((v) => (
                  <Badge 
                    key={v} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => setCampaignData(prev => ({ 
                      ...prev, 
                      message: prev.message + ' ' + v 
                    }))}
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="media">Media URL (Optional)</Label>
              <Input
                id="media"
                placeholder="https://example.com/image.jpg"
                value={campaignData.mediaUrl}
                onChange={(e) => setCampaignData(prev => ({ ...prev, mediaUrl: e.target.value }))}
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>When to send</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={campaignData.scheduleType === 'now' ? 'default' : 'outline'}
                  onClick={() => setCampaignData(prev => ({ ...prev, scheduleType: 'now' }))}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
                <Button
                  type="button"
                  variant={campaignData.scheduleType === 'schedule' ? 'default' : 'outline'}
                  onClick={() => setCampaignData(prev => ({ ...prev, scheduleType: 'schedule' }))}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
            
            {campaignData.scheduleType === 'schedule' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {campaignData.scheduledDate 
                          ? format(campaignData.scheduledDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={campaignData.scheduledDate}
                        onSelect={(date) => setCampaignData(prev => ({ ...prev, scheduledDate: date }))}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={campaignData.scheduledTime}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  />
                </div>
              </div>
            )}
            
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{campaignData.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{campaignData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel:</span>
                  <span className="font-medium capitalize">{campaignData.channel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audience:</span>
                  <span className="font-medium">{audienceCount || stats.totalSent} recipients</span>
                </div>
                {campaignData.scheduleType === 'schedule' && campaignData.scheduledDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scheduled for:</span>
                    <span className="font-medium">
                      {format(campaignData.scheduledDate, 'PPP')} at {campaignData.scheduledTime}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Engine</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage marketing campaigns
          </p>
        </div>
        <Dialog open={isWizardOpen} onOpenChange={(open) => {
          setIsWizardOpen(open);
          if (!open) resetWizard();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Create Campaign - Step {wizardStep} of 4
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full ${
                    step <= wizardStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            {renderWizardStep()}
            
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setWizardStep(prev => prev - 1)}
                disabled={wizardStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              {wizardStep < 4 ? (
                <Button
                  onClick={() => setWizardStep(prev => prev + 1)}
                  disabled={wizardStep === 1 && !campaignData.name}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSendCampaign}>
                  <Send className="h-4 w-4 mr-2" />
                  {campaignData.scheduleType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaigns</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{stats.totalDelivered > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{stats.avgOpenRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{stats.avgClickRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setCampaignData(prev => ({ ...prev, channel: 'whatsapp' }));
          setIsWizardOpen(true);
        }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold">WhatsApp Campaign</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Send bulk WhatsApp messages
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setCampaignData(prev => ({ ...prev, channel: 'email' }));
          setIsWizardOpen(true);
        }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold">Email Campaign</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Send targeted email campaigns
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
          setGeneratingContent(false);
          handleGenerateContent();
        }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold">AI Content Generator</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generate campaign content with AI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Active Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns created yet</p>
              <p className="text-sm">Create your first campaign to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="capitalize">{campaign.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {channelIcons[campaign.type] || <Mail className="h-4 w-4" />}
                        <span className="capitalize">{campaign.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[campaign.status] || ''}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {campaign.sent_count} / {campaign.delivered_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={(campaign.open_rate || 0) >= 90 ? 'text-green-500' : (campaign.open_rate || 0) >= 70 ? 'text-yellow-500' : 'text-destructive'}>
                        {campaign.open_rate || 0}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Duplicate"
                          onClick={() => {
                            setCampaignData({
                              name: `${campaign.name} (Copy)`,
                              type: campaign.type as any,
                              channel: campaign.type as any,
                              audienceFilter: 'all',
                              temperatureFilter: [],
                              lifecycleFilter: [],
                              message: campaign.message_template || '',
                              mediaUrl: campaign.media_url || '',
                              scheduleType: 'now',
                              scheduledDate: undefined,
                              scheduledTime: '09:00',
                            });
                            setIsWizardOpen(true);
                            setWizardStep(1);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {campaign.status === 'scheduled' && (
                          <Button variant="ghost" size="icon" title="Cancel">
                            <XCircle className="h-4 w-4" />
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
    </div>
  );
}
