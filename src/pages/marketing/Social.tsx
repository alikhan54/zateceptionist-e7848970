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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useSocialPosts, useSocialAccounts } from '@/hooks/useSocialPosts';
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
  Hash,
  Link2,
  Sparkles,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  Settings,
  Users,
  BarChart3,
  Inbox,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

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

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches || [];
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export default function SocialCommander() {
  const { tenantId } = useTenant();
  const { toast } = useToast();

  // Real data hooks
  const { posts, isLoading: postsLoading, createPost, deletePost, publishNow, stats: postStats } = useSocialPosts();
  const { accounts, connectedAccounts, totalFollowers, isLoading: accountsLoading } = useSocialAccounts();

  // Local UI state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [calendarWeekStart, setCalendarWeekStart] = useState(startOfWeek(new Date()));
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSchedulePost = async () => {
    if (!postContent.trim()) {
      toast({ title: 'Content Required', description: 'Please add content to your post.', variant: 'destructive' });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Select Platforms', description: 'Please select at least one platform.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const hashtags = extractHashtags(postContent);
      const scheduledAt = scheduleDate ? combineDateAndTime(scheduleDate, scheduleTime).toISOString() : undefined;

      // Create one post per platform
      for (const platform of selectedPlatforms) {
        await createPost.mutateAsync({
          platform: platform as any,
          post_text: postContent,
          hashtags,
          media_urls: postMedia ? [postMedia] : [],
          scheduled_at: scheduledAt,
          publish_now: !scheduleDate,
        });
      }

      setIsComposerOpen(false);
      resetComposer();

      toast({
        title: scheduleDate ? 'Post Scheduled' : 'Post Published',
        description: scheduleDate
          ? `Scheduled for ${format(scheduleDate, 'PPP')} at ${scheduleTime}`
          : 'Your post has been published to selected platforms.',
      });
    } catch (error) {
      toast({ title: 'Failed', description: 'Could not create post. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetComposer = () => {
    setPostContent('');
    setPostMedia(null);
    setSelectedPlatforms([]);
    setScheduleDate(undefined);
    setScheduleTime('09:00');
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
    } catch {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    }
  };

  const calendarDays = eachDayOfInterval({
    start: calendarWeekStart,
    end: addDays(calendarWeekStart, 6),
  });

  const getPostsForDay = (date: Date) => {
    return posts.filter(p => {
      const postDate = p.scheduled_at || p.published_at;
      if (!postDate) return false;
      return format(new Date(postDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  if (postsLoading && accountsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

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
                <p className="text-2xl font-bold">{totalFollowers > 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : totalFollowers}</p>
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
                <p className="text-2xl font-bold">{postStats.scheduled}</p>
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
                <p className="text-2xl font-bold">{postStats.published}</p>
                <p className="text-xs text-muted-foreground">Published Posts</p>
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Connected Accounts */}
          <div className="grid md:grid-cols-5 gap-4">
            {accounts.map((account: any) => {
              const config = platformConfig[account.platform] || platformConfig.instagram;
              const PlatformIcon = config.icon;
              return (
                <Card key={account.id} className={!account.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-2`}>
                      <PlatformIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <p className="font-medium text-sm">{account.account_name || account.platform}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.is_active ? `${((account.followers_count || 0) / 1000).toFixed(1)}K followers` : 'Not connected'}
                    </p>
                    {!account.is_active && (
                      <Button variant="outline" size="sm" className="mt-2">
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {accounts.length === 0 && (
              <div className="col-span-5 text-center py-8 text-muted-foreground">
                <p>No social accounts connected yet</p>
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent & Scheduled Posts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts yet</p>
                  <p className="text-sm">Create your first post to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.slice(0, 5).map((post) => {
                    const config = platformConfig[post.platform] || platformConfig.instagram;
                    const PlatformIcon = config.icon;
                    return (
                      <div key={post.id} className="flex gap-4 p-4 border rounded-lg">
                        {post.media_urls?.[0] && (
                          <img src={post.media_urls[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{post.post_text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                            <span className="text-xs text-muted-foreground ml-2">
                              {post.scheduled_at ? format(new Date(post.scheduled_at), 'MMM d, h:mm a') : 'No date'}
                            </span>
                          </div>
                          {post.status === 'published' && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {post.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> {post.comments_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <Share2 className="h-3 w-3" /> {post.shares_count}
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePost(post.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                        {dayPosts.slice(0, 3).map((post) => {
                          const config = platformConfig[post.platform] || platformConfig.instagram;
                          const PlatformIcon = config.icon;
                          return (
                            <div
                              key={post.id}
                              className="p-1 bg-muted rounded text-xs truncate cursor-pointer hover:bg-muted/80"
                              onClick={() => setSelectedPost(post)}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <PlatformIcon className={`h-3 w-3 ${config.color}`} />
                              </div>
                              {post.post_text.slice(0, 30)}...
                            </div>
                          );
                        })}
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

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Likes', value: postStats.totalLikes.toLocaleString(), icon: Heart },
              { label: 'Total Impressions', value: postStats.totalImpressions.toLocaleString(), icon: Eye },
              { label: 'Published', value: postStats.published.toString(), icon: CheckCircle2 },
              { label: 'Total Posts', value: postStats.total.toString(), icon: Users },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
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
                {accounts.map((account: any) => {
                  const config = platformConfig[account.platform] || platformConfig.instagram;
                  const PlatformIcon = config.icon;
                  return (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${config.bgColor}`}>
                          <PlatformIcon className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{account.account_name || account.platform}</p>
                          <p className="text-sm text-muted-foreground">{account.platform_username || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {account.is_active && (
                          <p className="text-sm text-muted-foreground">{(account.followers_count || 0).toLocaleString()} followers</p>
                        )}
                        <Switch checked={account.is_active} />
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {accounts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No accounts connected</p>
                  </div>
                )}
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
                {connectedAccounts.map((account: any) => {
                  const config = platformConfig[account.platform] || platformConfig.instagram;
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
                {connectedAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No connected accounts. Connect accounts first.</p>
                )}
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
            <Button onClick={handleSchedulePost} disabled={isSubmitting}>
              {scheduleDate ? (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Scheduling...' : 'Schedule'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Posting...' : 'Post Now'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
