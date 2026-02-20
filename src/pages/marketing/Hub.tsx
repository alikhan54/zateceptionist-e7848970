import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Share2,
  Users,
  Eye,
  MousePointer,
  Calendar,
  Clock,
  Target,
  Megaphone,
  PenSquare,
  Send,
  BarChart3,
  PieChart,
  Zap,
  Plus,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Brain
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { format, addDays } from 'date-fns';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

// Mock data
const channelData = [
  { name: 'Email', value: 35, color: '#3b82f6' },
  { name: 'Social', value: 28, color: '#8b5cf6' },
  { name: 'WhatsApp', value: 22, color: '#10b981' },
  { name: 'SMS', value: 15, color: '#f59e0b' },
];

const performanceData = [
  { month: 'Jan', reach: 12500, engagement: 3200, conversions: 450 },
  { month: 'Feb', reach: 15800, engagement: 4100, conversions: 580 },
  { month: 'Mar', reach: 14200, engagement: 3800, conversions: 520 },
  { month: 'Apr', reach: 18500, engagement: 5200, conversions: 720 },
  { month: 'May', reach: 22000, engagement: 6100, conversions: 890 },
  { month: 'Jun', reach: 25500, engagement: 7400, conversions: 1050 },
];

const socialMetrics = [
  { platform: 'Instagram', icon: Instagram, followers: '12.5K', growth: '+5.2%', engagement: '4.8%', color: 'text-pink-500' },
  { platform: 'Facebook', icon: Facebook, followers: '8.2K', growth: '+2.1%', engagement: '3.2%', color: 'text-blue-600' },
  { platform: 'LinkedIn', icon: Linkedin, followers: '5.8K', growth: '+8.4%', engagement: '6.1%', color: 'text-blue-700' },
  { platform: 'Twitter', icon: Twitter, followers: '3.4K', growth: '+1.8%', engagement: '2.9%', color: 'text-sky-500' },
];

const emailMetrics = {
  sent: 15420,
  delivered: 14890,
  opened: 5420,
  clicked: 1250,
  openRate: '36.4%',
  clickRate: '8.4%',
  bounceRate: '3.4%',
  unsubscribeRate: '0.2%',
};

const topContent = [
  { id: '1', title: 'Summer Sale Announcement', type: 'Email', views: 5420, engagement: '12.5%', status: 'published' },
  { id: '2', title: 'Product Launch Teaser', type: 'Social', views: 8900, engagement: '18.2%', status: 'published' },
  { id: '3', title: 'Customer Success Story', type: 'Blog', views: 3200, engagement: '8.7%', status: 'published' },
  { id: '4', title: 'Weekly Newsletter #24', type: 'Email', views: 4100, engagement: '10.3%', status: 'published' },
  { id: '5', title: 'Behind the Scenes', type: 'Social', views: 6700, engagement: '15.8%', status: 'published' },
];

const scheduledPosts = [
  { id: '1', title: 'Product Feature Spotlight', platform: 'Instagram', date: addDays(new Date(), 1), time: '09:00 AM', status: 'scheduled' },
  { id: '2', title: 'Industry Tips Thread', platform: 'Twitter', date: addDays(new Date(), 1), time: '02:00 PM', status: 'scheduled' },
  { id: '3', title: 'Team Highlight', platform: 'LinkedIn', date: addDays(new Date(), 2), time: '10:00 AM', status: 'scheduled' },
  { id: '4', title: 'Weekend Promotion', platform: 'Facebook', date: addDays(new Date(), 3), time: '11:00 AM', status: 'draft' },
  { id: '5', title: 'Customer Testimonial', platform: 'Instagram', date: addDays(new Date(), 4), time: '03:00 PM', status: 'scheduled' },
];

const activeCampaigns = [
  { id: '1', name: 'Summer Sale 2024', type: 'Multi-channel', status: 'active', progress: 65, reach: 12500, conversions: 342 },
  { id: '2', name: 'Product Launch', type: 'Email', status: 'active', progress: 40, reach: 8200, conversions: 156 },
  { id: '3', name: 'Brand Awareness', type: 'Social', status: 'paused', progress: 80, reach: 25000, conversions: 89 },
];

const calendarEvents = [
  { date: new Date(), events: ['Email Campaign', 'Instagram Post'] },
  { date: addDays(new Date(), 1), events: ['Twitter Thread', 'Blog Post'] },
  { date: addDays(new Date(), 2), events: ['LinkedIn Article'] },
  { date: addDays(new Date(), 3), events: ['Facebook Ad Launch', 'Newsletter'] },
];

export default function MarketingHub() {
  const { tenantConfig } = useTenant();
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  const kpiCards = [
    {
      title: 'Total Reach',
      value: '128.5K',
      change: '+12.5%',
      trend: 'up',
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Engagement Rate',
      value: '4.8%',
      change: '+0.8%',
      trend: 'up',
      icon: MousePointer,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Conversions',
      value: '2,458',
      change: '+18.2%',
      trend: 'up',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Active Campaigns',
      value: '8',
      change: '+2',
      trend: 'up',
      icon: Megaphone,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Content Published',
      value: '156',
      change: '+24',
      trend: 'up',
      icon: PenSquare,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Email Subscribers',
      value: '24.8K',
      change: '+1.2K',
      trend: 'up',
      icon: Mail,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  const quickActions = [
    { label: 'Create Campaign', icon: Plus, href: '/marketing/campaigns', color: 'bg-primary text-primary-foreground' },
    { label: 'Generate Content', icon: Sparkles, href: '/marketing/content-studio', color: 'bg-purple-500 text-white' },
    { label: 'Schedule Post', icon: Calendar, href: '/marketing/social', color: 'bg-blue-500 text-white' },
    { label: 'Send Email', icon: Send, href: '/marketing/email-builder', color: 'bg-green-500 text-white' },
  ];

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      Instagram,
      Facebook,
      LinkedIn: Linkedin,
      Twitter,
    };
    return icons[platform] || Share2;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Marketing Hub</h1>
          <p className="text-muted-foreground mt-1">
            Your marketing command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <TabsList>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div className={`flex items-center text-xs ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {kpi.change}
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card 
            key={action.label} 
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className="font-medium">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Recommended Campaign</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your {tenantConfig?.industry || 'business'} industry, a
                    <span className="text-primary font-medium"> welcome sequence </span>
                    could increase conversions by 40%.
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">Create Now</Button>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-accent/50 border-accent">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Trending in Your Industry</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    "AI automation" and "customer experience" are trending. Create content now!
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">Generate Content</Button>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-secondary/50 border-secondary">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Audience Insight</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your audience is most active <span className="text-primary font-medium">Tuesday-Thursday, 10AM-2PM</span>.
                    Schedule posts accordingly.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              AI Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { text: 'AI generated 3 social posts', time: '2 min ago', icon: Sparkles },
                { text: 'AI scheduled email for optimal time', time: '15 min ago', icon: Clock },
                { text: 'AI detected trending topic in your industry', time: '1 hour ago', icon: TrendingUp },
                { text: 'AI optimized campaign targeting', time: '3 hours ago', icon: Target },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <item.icon className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Performance</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Reach</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Conversions</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="reach" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="engagement" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="conversions" stackId="3" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Content reach by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {channelData.map((channel) => (
                <div key={channel.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channel.color }} />
                  <span className="text-sm text-muted-foreground">{channel.name}</span>
                  <span className="text-sm font-medium ml-auto">{channel.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Media & Email Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Social Media Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Social Media Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {socialMetrics.map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <platform.icon className={`h-5 w-5 ${platform.color}`} />
                    <div>
                      <p className="font-medium">{platform.platform}</p>
                      <p className="text-sm text-muted-foreground">{platform.followers} followers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-500">{platform.growth}</p>
                    <p className="text-xs text-muted-foreground">{platform.engagement} engagement</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{emailMetrics.openRate}</p>
                <p className="text-sm text-muted-foreground">Open Rate</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{emailMetrics.clickRate}</p>
                <p className="text-sm text-muted-foreground">Click Rate</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sent</span>
                <span className="font-medium">{emailMetrics.sent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Delivered</span>
                <span className="font-medium">{emailMetrics.delivered.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Opened</span>
                <span className="font-medium">{emailMetrics.opened.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Clicked</span>
                <span className="font-medium">{emailMetrics.clicked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bounce Rate</span>
                <span className="font-medium text-orange-500">{emailMetrics.bounceRate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns, Top Content, Schedule */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Campaigns</CardTitle>
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.type}</p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status === 'active' ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                      {campaign.status}
                    </Badge>
                  </div>
                  <Progress value={campaign.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{campaign.reach.toLocaleString()} reach</span>
                    <span>{campaign.conversions} conversions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Content</CardTitle>
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContent.map((content, index) => (
                <div key={content.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{content.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{content.type}</Badge>
                      <span>{content.views.toLocaleString()} views</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-500">{content.engagement}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Posts</CardTitle>
              <Button variant="ghost" size="sm">
                View Calendar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {scheduledPosts.map((post) => {
                  const PlatformIcon = getPlatformIcon(post.platform);
                  return (
                    <div key={post.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="p-2 rounded-lg bg-muted">
                        <PlatformIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(post.date, 'MMM d')}</span>
                          <Clock className="h-3 w-3" />
                          <span>{post.time}</span>
                        </div>
                      </div>
                      <Badge variant={post.status === 'scheduled' ? 'default' : 'secondary'} className="text-xs">
                        {post.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Content Calendar Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Content Calendar
            </CardTitle>
            <Button variant="outline">
              Open Full Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 7 }).map((_, index) => {
              const date = addDays(new Date(), index - new Date().getDay());
              const isToday = date.toDateString() === new Date().toDateString();
              const event = calendarEvents.find(e => e.date.toDateString() === date.toDateString());
              
              return (
                <div
                  key={index}
                  className={`p-2 rounded-lg border min-h-[80px] ${isToday ? 'border-primary bg-primary/5' : ''}`}
                >
                  <p className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {format(date, 'd')}
                  </p>
                  {event && (
                    <div className="mt-1 space-y-1">
                      {event.events.slice(0, 2).map((e, i) => (
                        <div key={i} className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                          {e}
                        </div>
                      ))}
                      {event.events.length > 2 && (
                        <p className="text-xs text-muted-foreground">+{event.events.length - 2} more</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
