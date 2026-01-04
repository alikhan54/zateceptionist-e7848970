import { useState } from 'react';
import { useTenant, IndustryType } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Bot, 
  MessageSquare, 
  Users, 
  Puzzle, 
  CreditCard,
  Upload,
  Palette,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Link,
  Calendar,
  Mic,
  Instagram,
  Facebook,
  Linkedin,
  Send,
  AlertCircle,
  Crown,
  Shield,
  UserCog,
  User
} from 'lucide-react';

const industries: { value: IndustryType; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'general', label: 'General Business' },
];

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
];

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive';
  joined_at: string;
}

interface Channel {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  configFields: { key: string; label: string; type: 'text' | 'password' }[];
}

// Mock data
const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'John Admin', email: 'john@company.com', role: 'admin', status: 'active', joined_at: '2024-01-01' },
  { id: '2', name: 'Sarah Manager', email: 'sarah@company.com', role: 'manager', status: 'active', joined_at: '2024-01-15' },
  { id: '3', name: 'Mike Staff', email: 'mike@company.com', role: 'staff', status: 'active', joined_at: '2024-02-01' },
];

const mockBillingHistory = [
  { id: '1', date: '2024-01-01', description: 'Pro Plan - Monthly', amount: 99, status: 'paid' },
  { id: '2', date: '2024-02-01', description: 'Pro Plan - Monthly', amount: 99, status: 'paid' },
  { id: '3', date: '2024-03-01', description: 'Pro Plan - Monthly', amount: 99, status: 'pending' },
];

export default function SettingsPage() {
  const { tenantConfig, tenantId } = useTenant();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Business Profile state
  const [businessProfile, setBusinessProfile] = useState({
    company_name: tenantConfig?.company_name || '',
    industry: tenantConfig?.industry || 'general' as IndustryType,
    logo_url: tenantConfig?.logo_url || '',
    primary_color: tenantConfig?.primary_color || '#3b82f6',
    email: '',
    phone: '',
    website: '',
    address: '',
    timezone: 'UTC',
    currency: 'USD',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    open_time: '09:00',
    close_time: '17:00',
  });

  // AI Configuration state
  const [aiConfig, setAiConfig] = useState({
    ai_name: tenantConfig?.ai_name || 'AI Assistant',
    ai_role: tenantConfig?.ai_role || 'Customer Support Representative',
    ai_tone: 'professional',
    greeting_message: 'Hello! How can I assist you today?',
    enabled_languages: ['en'],
    response_style: 'balanced',
  });

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <MessageSquare className="h-5 w-5 text-green-500" />,
      connected: true,
      configFields: [
        { key: 'phone_id', label: 'Phone Number ID', type: 'text' },
        { key: 'access_token', label: 'Access Token', type: 'password' },
      ],
    },
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="h-5 w-5 text-blue-500" />,
      connected: true,
      configFields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'text' },
        { key: 'smtp_user', label: 'SMTP Username', type: 'text' },
        { key: 'smtp_pass', label: 'SMTP Password', type: 'password' },
      ],
    },
    {
      id: 'voice',
      name: 'Voice AI',
      icon: <Mic className="h-5 w-5 text-purple-500" />,
      connected: false,
      configFields: [
        { key: 'vapi_key', label: 'VAPI API Key', type: 'password' },
        { key: 'assistant_id', label: 'Assistant ID', type: 'text' },
        { key: 'phone_number', label: 'Phone Number', type: 'text' },
      ],
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="h-5 w-5 text-pink-500" />,
      connected: false,
      configFields: [
        { key: 'page_id', label: 'Page ID', type: 'text' },
        { key: 'access_token', label: 'Access Token', type: 'password' },
      ],
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5 text-blue-600" />,
      connected: false,
      configFields: [
        { key: 'page_id', label: 'Page ID', type: 'text' },
        { key: 'access_token', label: 'Access Token', type: 'password' },
      ],
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5 text-blue-700" />,
      connected: false,
      configFields: [
        { key: 'org_id', label: 'Organization ID', type: 'text' },
        { key: 'access_token', label: 'Access Token', type: 'password' },
      ],
    },
  ]);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  // Channel config dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>({});

  const handleSaveBusinessProfile = () => {
    toast({
      title: 'Business Profile Updated',
      description: 'Your business settings have been saved successfully.',
    });
  };

  const handleSaveAIConfig = () => {
    toast({
      title: 'AI Configuration Updated',
      description: 'Your AI settings have been saved successfully.',
    });
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, connected: !ch.connected } : ch
    ));
    toast({
      title: 'Channel Updated',
      description: 'Channel connection status has been changed.',
    });
  };

  const handleConfigureChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setChannelConfig({});
    setConfigDialogOpen(true);
  };

  const handleSaveChannelConfig = () => {
    toast({
      title: 'Channel Configured',
      description: `${selectedChannel?.name} has been configured successfully.`,
    });
    setConfigDialogOpen(false);
  };

  const handleTestConnection = () => {
    toast({
      title: 'Testing Connection...',
      description: 'Please wait while we verify your credentials.',
    });
    setTimeout(() => {
      toast({
        title: 'Connection Successful',
        description: 'Your channel is properly configured.',
      });
    }, 2000);
  };

  const handleInviteTeamMember = () => {
    if (!inviteEmail) return;
    
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'active',
      joined_at: new Date().toISOString(),
    };
    setTeamMembers(prev => [...prev, newMember]);
    setInviteDialogOpen(false);
    setInviteEmail('');
    toast({
      title: 'Invitation Sent',
      description: `Invitation has been sent to ${inviteEmail}.`,
    });
  };

  const handleRemoveTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    toast({
      title: 'Team Member Removed',
      description: 'The team member has been removed.',
    });
  };

  const handleToggleMemberStatus = (id: string) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
    ));
  };

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Crown className="h-4 w-4 text-yellow-500" />,
    manager: <Shield className="h-4 w-4 text-blue-500" />,
    staff: <User className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business and application settings
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Puzzle className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input id="tenantId" value={tenantId || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={businessProfile.company_name}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select 
                    value={businessProfile.industry} 
                    onValueChange={(v) => setBusinessProfile(prev => ({ ...prev, industry: v as IndustryType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Affects vocabulary (e.g., "Patient" vs "Client")
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                      {businessProfile.logo_url ? (
                        <img src={businessProfile.logo_url} alt="Logo" className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={businessProfile.primary_color}
                      onChange={(e) => setBusinessProfile(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <Input 
                      value={businessProfile.primary_color}
                      onChange={(e) => setBusinessProfile(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-28"
                    />
                  </div>
                  <div 
                    className="h-10 flex-1 rounded-md flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: businessProfile.primary_color }}
                  >
                    Preview
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={businessProfile.email}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input
                    value={businessProfile.phone}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    value={businessProfile.website}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    value={businessProfile.address}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Business St, City"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Timezone, currency, and business hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </Label>
                  <Select 
                    value={businessProfile.timezone}
                    onValueChange={(v) => setBusinessProfile(prev => ({ ...prev, timezone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Currency
                  </Label>
                  <Select 
                    value={businessProfile.currency}
                    onValueChange={(v) => setBusinessProfile(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr.value} value={curr.value}>
                          {curr.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Business Hours</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {weekdays.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={businessProfile.working_days.includes(day)}
                          onCheckedChange={(checked) => {
                            setBusinessProfile(prev => ({
                              ...prev,
                              working_days: checked 
                                ? [...prev.working_days, day]
                                : prev.working_days.filter(d => d !== day)
                            }));
                          }}
                        />
                        <Label htmlFor={day} className="text-sm">{day.slice(0, 3)}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Open</Label>
                      <Input
                        type="time"
                        value={businessProfile.open_time}
                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, open_time: e.target.value }))}
                        className="w-32"
                      />
                    </div>
                    <span className="mt-5">to</span>
                    <div className="space-y-1">
                      <Label className="text-xs">Close</Label>
                      <Input
                        type="time"
                        value={businessProfile.close_time}
                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, close_time: e.target.value }))}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveBusinessProfile}>Save Business Profile</Button>
          </div>
        </TabsContent>

        {/* AI Configuration Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant Settings</CardTitle>
              <CardDescription>Configure how your AI assistant behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="aiName">AI Name</Label>
                  <Input
                    id="aiName"
                    value={aiConfig.ai_name}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, ai_name: e.target.value }))}
                    placeholder="e.g., Alex, Sarah, Helper"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aiRole">AI Role</Label>
                  <Input
                    id="aiRole"
                    value={aiConfig.ai_role}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, ai_role: e.target.value }))}
                    placeholder="e.g., Customer Support Representative"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>AI Tone</Label>
                <Select 
                  value={aiConfig.ai_tone}
                  onValueChange={(v) => setAiConfig(prev => ({ ...prev, ai_tone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Textarea
                  id="greeting"
                  value={aiConfig.greeting_message}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
                  placeholder="The first message your AI sends to customers"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Response Style</Label>
                <Select 
                  value={aiConfig.response_style}
                  onValueChange={(v) => setAiConfig(prev => ({ ...prev, response_style: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise - Short and to the point</SelectItem>
                    <SelectItem value="balanced">Balanced - Clear with helpful details</SelectItem>
                    <SelectItem value="detailed">Detailed - Thorough explanations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <CardDescription>Select languages your AI can communicate in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {languages.map(lang => (
                  <div key={lang.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang.value}`}
                      checked={aiConfig.enabled_languages.includes(lang.value)}
                      onCheckedChange={(checked) => {
                        setAiConfig(prev => ({
                          ...prev,
                          enabled_languages: checked
                            ? [...prev.enabled_languages, lang.value]
                            : prev.enabled_languages.filter(l => l !== lang.value)
                        }));
                      }}
                    />
                    <Label htmlFor={`lang-${lang.value}`}>{lang.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAIConfig}>Save AI Configuration</Button>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map(channel => (
              <Card key={channel.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {channel.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        <div className="flex items-center gap-1 mt-1">
                          {channel.connected ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-500">Connected</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Disconnected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={channel.connected}
                      onCheckedChange={() => handleToggleChannel(channel.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleConfigureChannel(channel)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Channel Config Dialog */}
          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedChannel?.icon}
                  Configure {selectedChannel?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedChannel?.configFields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={channelConfig[field.key] || ''}
                      onChange={(e) => setChannelConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleTestConnection}>
                  <Send className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button onClick={handleSaveChannelConfig}>Save Configuration</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team and their permissions</CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                Admin - Full access
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-500" />
                                Manager - Manage team & content
                              </div>
                            </SelectItem>
                            <SelectItem value="staff">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Staff - Basic access
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteTeamMember}>Send Invitation</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {roleIcons[member.role]}
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={member.status === 'active'}
                            onCheckedChange={() => handleToggleMemberStatus(member.id)}
                          />
                          <span className={member.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}>
                            {member.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Google Calendar</CardTitle>
                    <CardDescription>Sync appointments with Google Calendar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Apify</CardTitle>
                    <CardDescription>Web scraping and automation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Connect Apify
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Puzzle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Zapier</CardTitle>
                    <CardDescription>Connect with 5000+ apps</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Connect Zapier
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Webhooks</CardTitle>
                    <CardDescription>Custom webhook integrations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Available Endpoints:</p>
                  <ScrollArea className="h-24">
                    <code className="block">/webhook/send-message</code>
                    <code className="block">/webhook/book-appointment</code>
                    <code className="block">/webhook/deal-create</code>
                    <code className="block">/webhook/lead-gen-request</code>
                    <code className="block">/webhook/marketing/send-campaign</code>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {!isAdmin && (
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Billing information is read-only for non-admin users.</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your subscription details</CardDescription>
                </div>
                {isAdmin && (
                  <Button>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Pro Plan</h3>
                  <p className="text-muted-foreground">$99/month • Renews on Feb 1, 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Your current usage statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Messages</span>
                  <span>8,500 / 10,000</span>
                </div>
                <Progress value={85} className="h-2" />
                <p className="text-xs text-muted-foreground">1,500 messages remaining</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Voice Calls</span>
                  <span>120 / 500</span>
                </div>
                <Progress value={24} className="h-2" />
                <p className="text-xs text-muted-foreground">380 calls remaining</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Generations</span>
                  <span>450 / 1,000</span>
                </div>
                <Progress value={45} className="h-2" />
                <p className="text-xs text-muted-foreground">550 generations remaining</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage</span>
                  <span>2.5 GB / 10 GB</span>
                </div>
                <Progress value={25} className="h-2" />
                <p className="text-xs text-muted-foreground">7.5 GB remaining</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBillingHistory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>${item.amount}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
