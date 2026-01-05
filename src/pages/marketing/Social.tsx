import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { format, addDays, startOfWeek, addWeeks, eachDayOfInterval } from 'date-fns';
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Plus,
  Send,
  Calendar as CalendarIcon,
  Clock,
  Image as ImageIcon,
  Smile,
  Hash,
  AtSign,
  Link2,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  Users,
  BarChart3,
  Globe,
  Inbox,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

// Types
interface SocialAccount {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube';
  name: string;
  username: string;
  avatar: string;
  followers: number;
  connected: boolean;
}

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledDate: Date;
  status: 'scheduled' | 'published' | 'failed' | 'draft';
  mediaUrl?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface SocialMessage {
  id: string;
  platform: string;
  from: string;
  avatar: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

// Mock data
const mockAccounts: SocialAccount[] = [
  { id: '1', platform: 'instagram', name: 'Business Account', username: '@yourbusiness', avatar: '', followers: 12500, connected: true },
  { id: '2', platform: 'facebook', name: 'Business Page', username: 'Your Business', avatar: '', followers: 8200, connected: true },
  { id: '3', platform: 'twitter', name: 'Twitter Account', username: '@yourbiz', avatar: '', followers: 3400, connected: true },
  { id: '4', platform: 'linkedin', name: 'Company Page', username: 'Your Business Inc', avatar: '', followers: 5800, connected: true },
  { id: '5', platform: 'youtube', name: 'YouTube Channel', username: 'Your Business', avatar: '', followers: 2100, connected: false },
];

const mockPosts: ScheduledPost[] = [
  {
    id: '1',
    content: '🚀 Exciting news! We are launching our new product next week. Stay tuned for exclusive offers! #NewProduct #Launch',
    platforms: ['instagram', 'facebook', 'twitter'],
    scheduledDate: addDays(new Date(), 1),
    status: 'scheduled',
  },
  {
    id: '2',
    content: 'Behind the scenes look at our team working on something special ✨ #TeamWork #BTS',
    platforms: ['instagram', 'linkedin'],
    scheduledDate: addDays(new Date(), 2),
    status: 'scheduled',
    mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
  },
  {
    id: '3',
    content: 'Thank you for 10K followers! Your support means everything to us 🎉 #Milestone #ThankYou',
    platforms: ['instagram', 'facebook'],
    scheduledDate: new Date(),
    status: 'published',
    engagement: { likes: 342, comments: 56, shares: 23 },
  },
  {
    id: '4',
    content: 'Check out our latest blog post on industry trends 📊 Link in bio!',
    platforms: ['linkedin', 'twitter'],
    scheduledDate: addDays(new Date(), -1),
    status: 'published',
    engagement: { likes: 128, comments: 18, shares: 45 },
  },
];

const mockMessages: SocialMessage[] = [
  { id: '1', platform: 'instagram', from: 'John Doe', avatar: '', content: 'Hi! I love your products. Can you tell me more about the new collection?', timestamp: new Date(), read: false },
  { id: '2', platform: 'facebook', from: 'Jane Smith', avatar: '', content: 'When will the sale start?', timestamp: addDays(new Date(), -1), read: false },
  { id: '3', platform: 'twitter', from: 'Mike Johnson', avatar: '', content: 'Great post! Looking forward to the launch.', timestamp: addDays(new Date(), -1), read: true },
  { id: '4', platform: 'linkedin', from: 'Sarah Williams', avatar: '', content: 'Would love to connect and discuss a potential partnership.', timestamp: addDays(new Date(), -2), read: true },
];

const bestPostingTimes = [
  { platform: 'instagram', times: ['9:00 AM', '12:00 PM', '7:00 PM'], bestDay: 'Wednesday' },
  { platform: 'facebook', times: ['1:00 PM', '4:00 PM', '8:00 PM'], bestDay: 'Thursday' },
  { platform: 'twitter', times: ['8:00 AM', '12:00 PM', '5:00 PM'], bestDay: 'Tuesday' },
  { platform: 'linkedin', times: ['7:00 AM', '12:00 PM', '5:00 PM'], bestDay: 'Wednesday' },
];

const suggestedHashtags = [
  '#marketing', '#business', '#entrepreneurship', '#success', '#motivation',
  '#digitalmarketing', '#socialmedia', '#branding', '#startup', '#growth'
];

export default function SocialCommander() {
  const { tenantId } = useTenant();
  const { toast } = useToast();

  // State
  const [accounts, setAccounts] = useState<SocialAccount[]>(mockAccounts);
  const [posts, setPosts] = useState<ScheduledPost[]>(mockPosts);
  const [messages, setMessages] = useState<SocialMessage[]>(mockMessages);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [calendarWeekStart, setCalendarWeekStart] = useState(startOfWeek(new Date()));
  const [activeTab, setActiveTab] = useState('overview');

  const platformConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
    instagram: { icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    facebook: { icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-600/10' },
    twitter: { icon: Twitter, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    linkedin: { icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-blue-700/10' },
    youtube: { icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerateCaption = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPostContent(
      "🌟 Exciting news coming your way! We've been working on something special and can't wait to share it with you.\n\nStay tuned for updates! 👀\n\n#Innovation #ComingSoon #StayTuned"
    );
    setIsGenerating(false);
    toast({ title: 'Caption Generated', description: 'AI has created a caption for you.' });
  };

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPostMedia('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400');
    setIsGenerating(false);
    toast({ title: 'Image Generated', description: 'AI has created an image for your post.' });
  };

  const handleSchedulePost = () => {
    if (!postContent.trim()) {
      toast({ title: 'Content Required', description: 'Please add content to your post.', variant: 'destructive' });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Select Platforms', description: 'Please select at least one platform.', variant: 'destructive' });
      return;
    }

    const newPost: ScheduledPost = {
      id: Date.now().toString(),
      content: postContent,
      platforms: selectedPlatforms,
      scheduledDate: scheduleDate || new Date(),
      status: scheduleDate ? 'scheduled' : 'published',
      mediaUrl: postMedia || undefined,
    };

    setPosts(prev => [newPost, ...prev]);
    setIsComposerOpen(false);
    resetComposer();

    toast({
      title: scheduleDate ? 'Post Scheduled' : 'Post Published',
      description: scheduleDate
        ? `Scheduled for ${format(scheduleDate, 'PPP')} at ${scheduleTime}`
        : 'Your post has been published to selected platforms.',
    });
  };

  const resetComposer = () => {
    setPostContent('');
    setPostMedia(null);
    setSelectedPlatforms([]);
    setScheduleDate(undefined);
    setScheduleTime('09:00');
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast({ title: 'Post Deleted' });
  };

  const handleDuplicatePost = (post: ScheduledPost) => {
    const duplicate: ScheduledPost = {
      ...post,
      id: Date.now().toString(),
      status: 'draft',
      scheduledDate: addDays(new Date(), 1),
    };
    setPosts(prev => [duplicate, ...prev]);
    toast({ title: 'Post Duplicated' });
  };

  const calendarDays = eachDayOfInterval({
    start: calendarWeekStart,
    end: addDays(calendarWeekStart, 6),
  });

  const getPostsForDay = (date: Date) => {
    return posts.filter(p => 
      format(p.scheduledDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const connectedAccounts = accounts.filter(a => a.connected);
  const totalFollowers = connectedAccounts.reduce((sum, a) => sum + a.followers, 0);
  const unreadMessages = messages.filter(m => !m.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Social Commander</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your social media in one place
          </p>
        </div>
        <Button onClick={() => setIsComposerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(totalFollowers / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">Total Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Connected Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{posts.filter(p => p.status === 'scheduled').length}</p>
                <p className="text-xs text-muted-foreground">Scheduled Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Inbox className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadMessages}</p>
                <p className="text-xs text-muted-foreground">Unread Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Connected Accounts */}
          <div className="grid md:grid-cols-5 gap-4">
            {accounts.map((account) => {
              const config = platformConfig[account.platform];
              const PlatformIcon = config.icon;
              return (
                <Card key={account.id} className={!account.connected ? 'opacity-60' : ''}>
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-2`}>
                      <PlatformIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <p className="font-medium text-sm">{account.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.connected ? `${(account.followers / 1000).toFixed(1)}K followers` : 'Not connected'}
                    </p>
                    {!account.connected && (
                      <Button variant="outline" size="sm" className="mt-2">
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent & Scheduled Posts</CardTitle>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex gap-4 p-4 border rounded-lg">
                    {post.mediaUrl && (
                      <img src={post.mediaUrl} alt="" className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {post.platforms.map((platform) => {
                          const config = platformConfig[platform];
                          const PlatformIcon = config.icon;
                          return (
                            <PlatformIcon key={platform} className={`h-4 w-4 ${config.color}`} />
                          );
                        })}
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(post.scheduledDate, 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {post.engagement && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {post.engagement.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {post.engagement.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" /> {post.engagement.shares}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={post.status === 'published' ? 'default' : post.status === 'scheduled' ? 'outline' : 'secondary'}>
                        {post.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedPost(post)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicatePost(post)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Times & Hashtags */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Best Times to Post
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bestPostingTimes.map((timing) => {
                    const config = platformConfig[timing.platform];
                    const PlatformIcon = config.icon;
                    return (
                      <div key={timing.platform} className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">{timing.platform}</p>
                          <p className="text-xs text-muted-foreground">
                            {timing.times.join(', ')} • Best: {timing.bestDay}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Suggested Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setPostContent(prev => `${prev} ${tag}`)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, -1))}>
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    {format(calendarWeekStart, 'MMM d')} - {format(addDays(calendarWeekStart, 6), 'MMM d, yyyy')}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, 1))}>
                    →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dayPosts = getPostsForDay(day);
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[150px] p-2 border rounded-lg ${isToday ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <p className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'EEE d')}
                      </p>
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map((post) => (
                          <div
                            key={post.id}
                            className="p-1 bg-muted rounded text-xs truncate cursor-pointer hover:bg-muted/80"
                            onClick={() => setSelectedPost(post)}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              {post.platforms.slice(0, 2).map((platform) => {
                                const config = platformConfig[platform];
                                const PlatformIcon = config.icon;
                                return <PlatformIcon key={platform} className={`h-3 w-3 ${config.color}`} />;
                              })}
                            </div>
                            {post.content.slice(0, 30)}...
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{dayPosts.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Inbox</CardTitle>
              <CardDescription>Unified messages from all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.map((message) => {
                  const config = platformConfig[message.platform];
                  const PlatformIcon = config.icon;
                  return (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${!message.read ? 'bg-primary/5 border-primary/20' : ''}`}
                      onClick={() => setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m))}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>{message.from[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{message.from}</p>
                            <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                            {!message.read && <Badge className="h-2 w-2 p-0 rounded-full" />}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(message.timestamp, 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Reply</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Engagement', value: '12.5K', change: '+18%', icon: Heart },
              { label: 'Profile Views', value: '8.2K', change: '+12%', icon: Eye },
              { label: 'Link Clicks', value: '1.8K', change: '+24%', icon: Link2 },
              { label: 'New Followers', value: '+542', change: '+8%', icon: Users },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-green-500">{stat.change}</Badge>
                  </div>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement by Platform</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Analytics visualization placeholder</p>
                <p className="text-sm">Connect analytics API for real data</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your social media connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((account) => {
                  const config = platformConfig[account.platform];
                  const PlatformIcon = config.icon;
                  return (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${config.bgColor}`}>
                          <PlatformIcon className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {account.connected && (
                          <p className="text-sm text-muted-foreground">{account.followers.toLocaleString()} followers</p>
                        )}
                        <Switch checked={account.connected} />
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Connect New Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Post Composer Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Select Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {connectedAccounts.map((account) => {
                  const config = platformConfig[account.platform];
                  const PlatformIcon = config.icon;
                  const isSelected = selectedPlatforms.includes(account.platform);
                  return (
                    <Button
                      key={account.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePlatform(account.platform)}
                      className="gap-2"
                    >
                      <PlatformIcon className={isSelected ? '' : config.color} />
                      <span className="capitalize">{account.platform}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Button variant="outline" size="sm" onClick={handleGenerateCaption} disabled={isGenerating}>
                  {isGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  AI Caption
                </Button>
              </div>
              <Textarea
                placeholder="What would you like to share?"
                rows={5}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{postContent.length}/2200 characters</span>
              </div>
            </div>

            {/* Media */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Media</Label>
                <Button variant="outline" size="sm" onClick={handleGenerateImage} disabled={isGenerating}>
                  {isGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  AI Image
                </Button>
              </div>
              {postMedia ? (
                <div className="relative">
                  <img src={postMedia} alt="Post media" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setPostMedia(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop image here or click to upload</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Schedule</Label>
              <div className="grid grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {scheduleDate ? format(scheduleDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
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

            {/* Hashtag Suggestions */}
            <div className="space-y-2">
              <Label>Suggested Hashtags</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedHashtags.slice(0, 6).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setPostContent(prev => `${prev} ${tag}`)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsComposerOpen(false); resetComposer(); }}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSchedulePost()}>
              Save Draft
            </Button>
            <Button onClick={handleSchedulePost}>
              {scheduleDate ? (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
