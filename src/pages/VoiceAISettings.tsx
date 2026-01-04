import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  Phone,
  Mic,
  Settings,
  MessageSquare,
  CreditCard,
  History,
  BarChart3,
  CheckCircle,
  XCircle,
  Play,
  PhoneCall,
  PhoneOff,
  Clock,
  Calendar as CalendarIcon,
  Download,
  FileText,
  Volume2,
  Bot,
  Globe,
  Timer,
  Voicemail,
  ArrowRightLeft,
  Coins,
  TrendingUp,
  Users,
  RefreshCw,
  Search,
  Filter,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface CallRecord {
  id: string;
  phone: string;
  customer_name?: string;
  duration: number;
  status: 'completed' | 'missed' | 'failed' | 'voicemail';
  outcome?: string;
  recording_url?: string;
  transcript?: string;
  created_at: string;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
}

const voices = [
  { value: 'alloy', label: 'Alloy - Neutral' },
  { value: 'echo', label: 'Echo - Male' },
  { value: 'fable', label: 'Fable - British' },
  { value: 'onyx', label: 'Onyx - Deep Male' },
  { value: 'nova', label: 'Nova - Female' },
  { value: 'shimmer', label: 'Shimmer - Soft Female' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
];

const models = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Economy)' },
];

// Mock data
const mockCallHistory: CallRecord[] = [
  {
    id: '1',
    phone: '+1 (555) 123-4567',
    customer_name: 'John Smith',
    duration: 185,
    status: 'completed',
    outcome: 'Appointment booked',
    recording_url: '#',
    transcript: 'Hello, this is a sample transcript of the call...',
    created_at: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    phone: '+1 (555) 234-5678',
    customer_name: 'Sarah Johnson',
    duration: 92,
    status: 'completed',
    outcome: 'Information provided',
    recording_url: '#',
    created_at: '2024-01-20T13:15:00Z',
  },
  {
    id: '3',
    phone: '+1 (555) 345-6789',
    duration: 0,
    status: 'missed',
    created_at: '2024-01-20T11:45:00Z',
  },
  {
    id: '4',
    phone: '+1 (555) 456-7890',
    customer_name: 'Mike Brown',
    duration: 45,
    status: 'voicemail',
    created_at: '2024-01-20T10:20:00Z',
  },
  {
    id: '5',
    phone: '+1 (555) 567-8901',
    duration: 0,
    status: 'failed',
    created_at: '2024-01-19T16:00:00Z',
  },
];

const creditPackages: CreditPackage[] = [
  { id: '1', name: 'Starter', credits: 100, price: 10 },
  { id: '2', name: 'Growth', credits: 500, price: 40, popular: true },
  { id: '3', name: 'Business', credits: 1500, price: 100 },
  { id: '4', name: 'Enterprise', credits: 5000, price: 300 },
];

const mockAnalytics = {
  callsToday: 12,
  callsThisWeek: 78,
  callsThisMonth: 324,
  avgDuration: 142,
  successRate: 87,
  commonOutcomes: [
    { outcome: 'Appointment booked', count: 145, percentage: 45 },
    { outcome: 'Information provided', count: 98, percentage: 30 },
    { outcome: 'Transferred to human', count: 48, percentage: 15 },
    { outcome: 'Voicemail left', count: 33, percentage: 10 },
  ],
};

export default function VoiceAISettings() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  // Connection status
  const [isConnected, setIsConnected] = useState(true);
  const [vapiPhoneNumber] = useState('+1 (555) 000-0000');
  
  // Assistant configuration
  const [assistantConfig, setAssistantConfig] = useState({
    assistant_id: '',
    first_message: 'Hello! Thank you for calling. How can I assist you today?',
    voice: 'nova',
    language: 'en',
    model: 'gpt-4o',
  });
  
  // Call settings
  const [callSettings, setCallSettings] = useState({
    max_duration: 300,
    voicemail_detection: true,
    recording_enabled: true,
    transfer_number: '',
  });
  
  // Prompts
  const [prompts, setPrompts] = useState({
    system_prompt: `You are a helpful AI assistant for ${tenantConfig?.company_name || 'our company'}. 
You help customers with inquiries, booking appointments, and providing information about our services.
Be friendly, professional, and concise. Always try to understand the customer's needs and provide helpful solutions.`,
    greeting_message: 'Hello! Thank you for calling. How can I help you today?',
    fallback_responses: [
      "I'm sorry, I didn't quite catch that. Could you please repeat?",
      "Let me transfer you to a human agent who can better assist you.",
      "Is there anything else I can help you with today?",
    ],
  });
  
  // Credits
  const [credits] = useState({
    balance: 250,
    usedThisMonth: 74,
    limit: 500,
  });
  
  // Call history filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateRange, setHistoryDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Transcript dialog
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/10 text-green-500',
    missed: 'bg-yellow-500/10 text-yellow-500',
    failed: 'bg-destructive/10 text-destructive',
    voicemail: 'bg-blue-500/10 text-blue-500',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="h-3 w-3" />,
    missed: <PhoneOff className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    voicemail: <Voicemail className="h-3 w-3" />,
  };

  const handleTestCall = () => {
    toast({
      title: 'Test Call Initiated',
      description: 'A test call is being placed to verify your configuration.',
    });
  };

  const handleSaveAssistantConfig = () => {
    toast({
      title: 'Configuration Saved',
      description: 'Your assistant settings have been updated.',
    });
  };

  const handleSaveCallSettings = () => {
    toast({
      title: 'Call Settings Saved',
      description: 'Your call settings have been updated.',
    });
  };

  const handleSavePrompts = () => {
    toast({
      title: 'Prompts Saved',
      description: 'Your AI prompts have been updated.',
    });
  };

  const handleViewTranscript = (call: CallRecord) => {
    setSelectedCall(call);
    setTranscriptDialogOpen(true);
  };

  const filteredCallHistory = mockCallHistory.filter(call => {
    const matchesSearch = !historySearch || 
      call.phone.includes(historySearch) ||
      call.customer_name?.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus = historyStatusFilter === 'all' || call.status === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
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
          <h1 className="text-3xl font-bold">Voice AI Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your AI-powered phone assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge className="bg-green-500/10 text-green-500 gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge className="bg-destructive/10 text-destructive gap-1">
              <XCircle className="h-3 w-3" />
              Disconnected
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-semibold">{vapiPhoneNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <PhoneCall className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calls Today</p>
                <p className="text-2xl font-bold">{mockAnalytics.callsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{mockAnalytics.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Coins className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{credits.balance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assistant" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="assistant" className="gap-2">
            <Bot className="h-4 w-4" />
            Assistant
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Call Settings
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Credits
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Call History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Assistant Configuration Tab */}
        <TabsContent value="assistant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Your VAPI integration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
                  <div>
                    <p className="font-medium">VAPI Connection</p>
                    <p className="text-sm text-muted-foreground">
                      {isConnected ? 'Your phone assistant is active and receiving calls' : 'Not connected to VAPI'}
                    </p>
                  </div>
                </div>
                <Button onClick={handleTestCall}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Call
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assistant Configuration</CardTitle>
              <CardDescription>Configure your AI phone assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assistantId">Assistant ID</Label>
                  <Input
                    id="assistantId"
                    value={assistantConfig.assistant_id}
                    onChange={(e) => setAssistantConfig(prev => ({ ...prev, assistant_id: e.target.value }))}
                    placeholder="Enter your VAPI Assistant ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select 
                    value={assistantConfig.voice}
                    onValueChange={(v) => setAssistantConfig(prev => ({ ...prev, voice: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map(voice => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={assistantConfig.language}
                    onValueChange={(v) => setAssistantConfig(prev => ({ ...prev, language: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select 
                    value={assistantConfig.model}
                    onValueChange={(v) => setAssistantConfig(prev => ({ ...prev, model: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstMessage">First Message</Label>
                <Textarea
                  id="firstMessage"
                  value={assistantConfig.first_message}
                  onChange={(e) => setAssistantConfig(prev => ({ ...prev, first_message: e.target.value }))}
                  placeholder="The first thing your AI says when answering a call"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveAssistantConfig}>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Settings</CardTitle>
              <CardDescription>Configure how calls are handled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Max Call Duration (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={callSettings.max_duration}
                    onChange={(e) => setCallSettings(prev => ({ ...prev, max_duration: parseInt(e.target.value) }))}
                    min={60}
                    max={1800}
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(callSettings.max_duration / 60)} minutes maximum per call
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer Number
                  </Label>
                  <Input
                    value={callSettings.transfer_number}
                    onChange={(e) => setCallSettings(prev => ({ ...prev, transfer_number: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number to transfer calls when requested
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Voicemail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Voicemail Detection</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically detect and handle voicemail
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={callSettings.voicemail_detection}
                    onCheckedChange={(v) => setCallSettings(prev => ({ ...prev, voicemail_detection: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Call Recording</p>
                      <p className="text-sm text-muted-foreground">
                        Record calls for quality and training purposes
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={callSettings.recording_enabled}
                    onCheckedChange={(v) => setCallSettings(prev => ({ ...prev, recording_enabled: v }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCallSettings}>Save Call Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>Define your AI assistant's personality and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompts.system_prompt}
                onChange={(e) => setPrompts(prev => ({ ...prev, system_prompt: e.target.value }))}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt defines how your AI assistant behaves during calls. Be specific about your business, 
                services, and how you want the AI to interact with callers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Greeting Message</CardTitle>
              <CardDescription>The first thing your AI says when answering</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={prompts.greeting_message}
                onChange={(e) => setPrompts(prev => ({ ...prev, greeting_message: e.target.value }))}
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fallback Responses</CardTitle>
              <CardDescription>Responses for common situations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {prompts.fallback_responses.map((response, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={response}
                    onChange={(e) => {
                      const newResponses = [...prompts.fallback_responses];
                      newResponses[index] = e.target.value;
                      setPrompts(prev => ({ ...prev, fallback_responses: newResponses }));
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSavePrompts}>Save Prompts</Button>
          </div>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Your voice call credits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-4xl font-bold">{credits.balance}</p>
                  <p className="text-muted-foreground">Credits remaining</p>
                </div>
                <Button>
                  <Coins className="h-4 w-4 mr-2" />
                  Buy Credits
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used this month</span>
                  <span>{credits.usedThisMonth} / {credits.limit}</span>
                </div>
                <Progress value={(credits.usedThisMonth / credits.limit) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credit Packages</CardTitle>
              <CardDescription>Choose a package that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {creditPackages.map((pkg) => (
                  <Card key={pkg.id} className={pkg.popular ? 'border-primary' : ''}>
                    <CardContent className="pt-4">
                      {pkg.popular && (
                        <Badge className="mb-2">Most Popular</Badge>
                      )}
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <p className="text-3xl font-bold my-2">${pkg.price}</p>
                      <p className="text-muted-foreground text-sm mb-4">
                        {pkg.credits.toLocaleString()} credits
                      </p>
                      <Button variant={pkg.popular ? 'default' : 'outline'} className="w-full">
                        Purchase
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Call History</CardTitle>
                  <CardDescription>View and manage your call records</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search calls..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone / Customer</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallHistory.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{call.phone}</p>
                          {call.customer_name && (
                            <p className="text-sm text-muted-foreground">{call.customer_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {call.duration > 0 ? formatDuration(call.duration) : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${statusColors[call.status]}`}>
                          {statusIcons[call.status]}
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {call.outcome || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(call.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {call.transcript && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewTranscript(call)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {call.recording_url && (
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Transcript Dialog */}
          <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Call Transcript</DialogTitle>
              </DialogHeader>
              {selectedCall && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedCall.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">{format(new Date(selectedCall.created_at), 'PPp')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outcome</p>
                      <p className="font-medium">{selectedCall.outcome || 'N/A'}</p>
                    </div>
                  </div>
                  <Separator />
                  <ScrollArea className="h-64">
                    <div className="space-y-3 text-sm">
                      <p className="whitespace-pre-wrap">{selectedCall.transcript}</p>
                    </div>
                  </ScrollArea>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setTranscriptDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Calls Today</p>
                  <p className="text-3xl font-bold">{mockAnalytics.callsToday}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-3xl font-bold">{mockAnalytics.callsThisWeek}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold">{mockAnalytics.callsThisMonth}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-bold">{formatDuration(mockAnalytics.avgDuration)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>Percentage of successful calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="relative h-40 w-40">
                    <svg className="h-full w-full -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-muted"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${mockAnalytics.successRate * 3.77} 377`}
                        className="text-green-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{mockAnalytics.successRate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Outcomes</CardTitle>
                <CardDescription>How calls typically end</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalytics.commonOutcomes.map((outcome, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{outcome.outcome}</span>
                        <span className="text-muted-foreground">{outcome.count} ({outcome.percentage}%)</span>
                      </div>
                      <Progress value={outcome.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
