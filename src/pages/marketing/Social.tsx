import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { useSocialPosts, useSocialAccounts } from "@/hooks/useSocialPosts";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { logSystemEvent } from "@/lib/api/systemEvents";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, addDays, startOfWeek, addWeeks, eachDayOfInterval, startOfMonth } from "date-fns";
import {
  Instagram, Facebook, Twitter, Linkedin, Youtube, Plus, Send, Calendar as CalendarIcon,
  Clock, Image as ImageIcon, Hash, Link2, Sparkles, MessageSquare, Heart, Share2,
  Eye, MoreVertical, Edit, Trash2, Copy, RefreshCw, CheckCircle2, Settings, Users,
  BarChart3, Inbox, Loader2, ExternalLink, AlertTriangle, Activity, Info,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const bestPostingTimes = [
  { platform: "instagram", times: ["9:00 AM", "12:00 PM", "7:00 PM"], bestDay: "Wednesday" },
  { platform: "facebook", times: ["1:00 PM", "4:00 PM", "8:00 PM"], bestDay: "Thursday" },
  { platform: "twitter", times: ["8:00 AM", "12:00 PM", "5:00 PM"], bestDay: "Tuesday" },
  { platform: "linkedin", times: ["7:00 AM", "12:00 PM", "5:00 PM"], bestDay: "Wednesday" },
];

const suggestedHashtags = [
  "#marketing", "#business", "#entrepreneurship", "#success", "#motivation",
  "#digitalmarketing", "#socialmedia", "#branding", "#startup", "#growth",
];

function extractHashtags(text: string): string[] {
  return text.match(/#\w+/g) || [];
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

// M1: Post status badge with lifecycle tracking + delay detection
function PostStatusBadge({ post }: { post: any }) {
  const now = Date.now();
  const scheduledTime = post.scheduled_at ? new Date(post.scheduled_at).getTime() : 0;
  const isPastScheduled = post.status === "scheduled" && scheduledTime < now;
  const minutesPast = isPastScheduled ? (now - scheduledTime) / 60000 : 0;

  if (post.status === "published") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Published
      </Badge>
    );
  }
  if (post.status === "failed") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="gap-1">❌ Failed</Badge>
          </TooltipTrigger>
          <TooltipContent><p>{post.error_message || "Publishing failed"}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (isPastScheduled && minutesPast > 10) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 gap-1">
              <AlertTriangle className="h-3 w-3" /> Delayed
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Post is queued. If Meta tokens are configured correctly in Settings &gt; Integrations, it will post on the next cron cycle (every 5 min).</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (isPastScheduled) {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" /> ⏳ Posting...
      </Badge>
    );
  }
  if (post.status === "scheduled") {
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 gap-1">
        📤 Queued
      </Badge>
    );
  }
  return <Badge variant="secondary">{post.status}</Badge>;
}

// M1: Platform link for published posts
function PlatformLink({ post }: { post: any }) {
  if (post.status !== "published" || !post.platform_post_id) return null;
  const urls: Record<string, string> = {
    instagram: `https://www.instagram.com/p/${post.platform_post_id}`,
    facebook: `https://facebook.com/${post.platform_post_id}`,
  };
  const url = urls[post.platform];
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
      <ExternalLink className="h-3 w-3" /> View on {post.platform}
    </a>
  );
}

export default function SocialCommander() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();

  // M1: Auto-refresh every 30 seconds
  const { posts, isLoading: postsLoading, createPost, deletePost, publishNow, stats: postStats } = useSocialPosts();
  const { accounts, connectedAccounts, totalFollowers, isLoading: accountsLoading } = useSocialAccounts();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [calendarWeekStart, setCalendarWeekStart] = useState(startOfWeek(new Date()));
  const [activeTab, setActiveTab] = useState("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishCooldown, setPublishCooldown] = useState(false);

  // Activity log query
  const tenantUuid = tenantConfig?.id || null;
  const { data: activityLog = [] } = useQuery({
    queryKey: ['social_activity_log', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('event_source', 'marketing')
        .ilike('event_type', '%social%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) { console.warn('Activity log query failed:', error); return []; }
      return data || [];
    },
    enabled: !!tenantUuid,
    refetchInterval: 15000,
  });

  // M1: Platform connection status
  const platformAvailability: Record<string, { connected: boolean; reason?: string }> = {
    instagram: {
      connected: !!((tenantConfig as any)?.meta_page_token && (tenantConfig as any)?.instagram_page_id),
      reason: !((tenantConfig as any)?.meta_page_token) ? "Connect in Settings > Integrations" : undefined,
    },
    facebook: {
      connected: !!(tenantConfig as any)?.meta_page_token,
      reason: !(tenantConfig as any)?.meta_page_token ? "Connect in Settings > Integrations" : undefined,
    },
    linkedin: {
      connected: !!(tenantConfig as any)?.linkedin_access_token,
      reason: !(tenantConfig as any)?.linkedin_access_token ? "Connect in Settings > Integrations" : undefined,
    },
    twitter: { connected: false, reason: "Connect in Settings > Integrations" },
    youtube: { connected: false, reason: "Connect in Settings > Integrations" },
  };

  // M1: Stats from real data
  const now = new Date();
  const monthStart = startOfMonth(now);
  const publishedThisMonth = posts.filter(p => p.status === "published" && p.platform_post_id && p.published_at && new Date(p.published_at) >= monthStart).length;
  const scheduledCount = posts.filter(p => p.status === "scheduled").length;
  const avgEngagement = (() => {
    const withEngagement = posts.filter(p => p.engagement_rate && p.engagement_rate > 0);
    if (withEngagement.length === 0) return 0;
    return Math.round(withEngagement.reduce((s, p) => s + p.engagement_rate, 0) / withEngagement.length * 10) / 10;
  })();

  // M1: Instagram requires image check
  const instagramSelected = selectedPlatforms.includes("instagram");
  const instagramNeedsImage = instagramSelected && !postMedia;

  const handleConnectAccount = (platform: string) => {
    toast({
      title: `Connect ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
      description: "Configure API keys in Settings → Integrations.",
    });
    setIsConnectOpen(false);
  };

  const platformConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
    instagram: { icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    facebook: { icon: Facebook, color: "text-blue-600", bgColor: "bg-blue-600/10" },
    twitter: { icon: Twitter, color: "text-sky-500", bgColor: "bg-sky-500/10" },
    linkedin: { icon: Linkedin, color: "text-blue-700", bgColor: "bg-blue-700/10" },
    youtube: { icon: Youtube, color: "text-red-500", bgColor: "bg-red-500/10" },
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleGenerateCaption = async () => {
    if (!tenantConfig?.id) { toast({ title: "No tenant configured", variant: "destructive" }); return; }
    setIsGenerating(true);
    try {
      const result = await callWebhook(WEBHOOKS.GENERATE_CONTENT, {
        content_type: "social_media", topic: postContent || "business update",
        tone: "engaging", platform: selectedPlatforms[0] || "instagram",
        industry: tenantConfig.industry || "technology",
      }, tenantConfig.id);
      if (result.success && result.data) {
        const d = result.data as any;
        const content = d.content || d.text || d.caption || "";
        if (content) { setPostContent(stripHtmlTags(content)); toast({ title: "✨ AI Caption Generated!" }); }
        else toast({ title: "No content returned", variant: "destructive" });
      } else toast({ title: "AI Unavailable", variant: "destructive" });
    } catch (err: any) { toast({ title: "Generation Failed", description: err.message, variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const handleGenerateImage = async () => {
    if (!tenantConfig?.id) { toast({ title: "No tenant configured", variant: "destructive" }); return; }
    setIsGenerating(true);
    try {
      const result = await callWebhook(WEBHOOKS.GENERATE_IMAGE, {
        prompt: postContent || "professional business promotion banner", style: "social_media", aspect_ratio: "1:1",
      }, tenantConfig.id);
      if (result.success && result.data) {
        const imageUrl = (result.data as any).image_url || (result.data as any).url;
        if (imageUrl) { setPostMedia(imageUrl); toast({ title: "🖼️ AI Image Generated!" }); }
        else toast({ title: "No image returned", variant: "destructive" });
      } else toast({ title: "Image Generation Failed", variant: "destructive" });
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const handleSchedulePost = async () => {
    if (!postContent.trim()) { toast({ title: "Content Required", variant: "destructive" }); return; }
    if (selectedPlatforms.length === 0) { toast({ title: "Select Platforms", variant: "destructive" }); return; }
    if (instagramNeedsImage) { toast({ title: "Instagram requires an image", description: "Add a media URL or remove Instagram", variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const hashtags = extractHashtags(postContent);
      const scheduledAt = scheduleDate ? combineDateAndTime(scheduleDate, scheduleTime).toISOString() : undefined;
      for (const platform of selectedPlatforms) {
        await createPost.mutateAsync({ platform: platform as any, post_text: postContent, hashtags, media_urls: postMedia ? [postMedia] : [], scheduled_at: scheduledAt, publish_now: !scheduleDate });
      }
      setIsComposerOpen(false);
      resetComposer();
      if (!scheduleDate) {
        setPublishCooldown(true);
        setTimeout(() => setPublishCooldown(false), 5000);
        toast({ title: "📤 Post Queued!", description: `Posting to ${selectedPlatforms.join(", ")} now. Status will update to "Published" with a direct link within 1-2 minutes.` });
        logSystemEvent({ tenantId: tenantConfig?.id || '', eventType: 'social_post_published', sourceModule: 'marketing', eventData: { platforms: selectedPlatforms, scheduled: false } });
      } else {
        toast({ title: "Post Scheduled", description: `Scheduled for ${format(scheduleDate, "PPP")} at ${scheduleTime}` });
      }
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const resetComposer = () => { setPostContent(""); setPostMedia(null); setSelectedPlatforms([]); setScheduleDate(undefined); setScheduleTime("09:00"); };

  const handleDeletePost = async (postId: string) => { try { await deletePost.mutateAsync(postId); } catch { toast({ title: "Failed to delete post", variant: "destructive" }); } };

  const calendarDays = eachDayOfInterval({ start: calendarWeekStart, end: addDays(calendarWeekStart, 6) });
  const getPostsForDay = (date: Date) => posts.filter(p => { const pd = p.scheduled_at || p.published_at; if (!pd) return false; return format(new Date(pd), "yyyy-MM-dd") === format(date, "yyyy-MM-dd"); });

  if (postsLoading && accountsLoading) {
    return (<div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-96" /></div>);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Social Commander</h1>
          <p className="text-muted-foreground mt-1">Manage all your social media in one place</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsConnectOpen(true)}><Plus className="h-4 w-4 mr-2" />Connect Account</Button>
          <Button onClick={() => setIsComposerOpen(true)} disabled={publishCooldown}>
            <Plus className="h-4 w-4 mr-2" />{publishCooldown ? "Cooldown..." : "Create Post"}
          </Button>
        </div>
      </div>

      {/* M1: Stats from REAL data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><Send className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{publishedThisMonth}</p><p className="text-xs text-muted-foreground">Published This Month</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{scheduledCount}</p><p className="text-xs text-muted-foreground">Scheduled</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><BarChart3 className="h-5 w-5 text-purple-500" /></div><div><p className="text-2xl font-bold">{avgEngagement}%</p><p className="text-xs text-muted-foreground">Avg Engagement</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Users className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{totalFollowers > 0 ? totalFollowers.toLocaleString() : connectedAccounts.length > 0 ? connectedAccounts.length : '—'}</p><p className="text-xs text-muted-foreground flex items-center gap-1">{totalFollowers > 0 ? 'Total Followers' : connectedAccounts.length > 0 ? 'Connected Accounts' : <span>Connect in <a href="/settings/integrations" className="underline text-primary">Settings</a></span>}<TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Follower counts sync from connected platforms</p></TooltipContent></Tooltip></TooltipProvider></p></div></div></CardContent></Card>
      </div>

      {/* Platform Connection Status Banner */}
      {(() => {
        const disconnected = Object.entries(platformAvailability).filter(([, v]) => !v.connected);
        if (disconnected.length === 0) return null;
        const noneConnected = disconnected.length === Object.keys(platformAvailability).length;
        return (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-3 flex items-center gap-3 flex-wrap">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {noneConnected ? 'No platforms connected' : `${disconnected.length} platform${disconnected.length > 1 ? 's' : ''} not connected:`}
              </span>
              {disconnected.map(([id]) => {
                const config = platformConfig[id];
                if (!config) return null;
                const PlatformIcon = config.icon;
                return (
                  <Badge key={id} variant="outline" className="gap-1 text-muted-foreground">
                    <PlatformIcon className={`h-3 w-3 ${config.color}`} />
                    <span className="capitalize">{id}</span>
                  </Badge>
                );
              })}
              <Button variant="link" size="sm" className="ml-auto p-0 h-auto text-amber-700 dark:text-amber-400"
                onClick={() => (window.location.href = '/settings/integrations')}>
                Connect in Settings
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Connected Accounts</CardTitle></CardHeader>
              <CardContent>
                {connectedAccounts.length === 0 ? (
                  <div className="text-center py-8"><p className="text-muted-foreground mb-4">No accounts connected yet</p><Button variant="outline" onClick={() => setIsConnectOpen(true)}><Plus className="h-4 w-4 mr-2" /> Connect Account</Button></div>
                ) : (
                  <div className="space-y-3">
                    {connectedAccounts.map((account: any) => {
                      const config = platformConfig[account.platform] || platformConfig.instagram;
                      const PlatformIcon = config.icon;
                      return (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.bgColor}`}><PlatformIcon className={`h-4 w-4 ${config.color}`} /></div>
                            <div><p className="font-medium capitalize">{account.platform}</p><p className="text-xs text-muted-foreground">{account.username || account.page_name || "Connected"}</p></div>
                          </div>
                          <Badge variant="outline" className="text-green-600">Active</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Best Posting Times</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bestPostingTimes.map(item => {
                    const config = platformConfig[item.platform];
                    if (!config) return null;
                    const PlatformIcon = config.icon;
                    return (<div key={item.platform} className="flex items-center justify-between"><div className="flex items-center gap-2"><PlatformIcon className={`h-4 w-4 ${config.color}`} /><span className="text-sm capitalize">{item.platform}</span></div><div className="text-xs text-muted-foreground">{item.times.join(", ")}</div></div>);
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts with status timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Posts</CardTitle></CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8"><MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground mb-4">No posts yet</p><Button onClick={() => setIsComposerOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Your First Post</Button></div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post: any) => {
                    const config = platformConfig[post.platform] || platformConfig.instagram;
                    const PlatformIcon = config.icon;
                    return (
                      <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{post.post_text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                            <span className="text-xs text-muted-foreground ml-2">{post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, h:mm a") : "No date"}</span>
                          </div>
                          {post.status === "published" && (
                            <div className="space-y-1 mt-2">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>❤️ {post.likes_count || 0}</span><span>💬 {post.comments_count || 0}</span><span>🔄 {post.shares_count || 0}</span>
                                {post.impressions > 0 && <span>👁 {(post.impressions || 0).toLocaleString()}</span>}
                              </div>
                              <PlatformLink post={post} />
                            </div>
                          )}
                          {post.status === "failed" && post.error_message && (
                            <p className="text-xs text-red-600 mt-1 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">{post.error_message}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <PostStatusBadge post={post} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(post.post_text); toast({ title: "Copied!" }); }}><Copy className="h-4 w-4 mr-2" /> Copy Text</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePost(post.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
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
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card className="p-12 text-center"><MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground mb-4">No posts yet</p><Button onClick={() => setIsComposerOpen(true)}>Create Post</Button></Card>
          ) : (
            posts.map((post: any) => {
              const config = platformConfig[post.platform] || platformConfig.instagram;
              const PlatformIcon = config.icon;
              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-start gap-4">
                    {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-24 h-24 rounded-lg object-cover" />}
                    <div className="flex-1">
                      <p className="text-sm">{post.post_text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                        <PostStatusBadge post={post} />
                        <span className="text-xs text-muted-foreground">{post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, h:mm a") : ""}</span>
                      </div>
                      {post.status === "published" && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>❤️ {post.likes_count || 0}</span><span>💬 {post.comments_count || 0}</span><span>🔄 {post.shares_count || 0}</span>
                          {post.impressions > 0 && <span>👁 {post.impressions.toLocaleString()}</span>}
                          <span className={post.engagement_rate > 5 ? 'text-green-500' : post.engagement_rate >= 2 ? 'text-amber-500' : 'text-red-500'}>
                            {post.engagement_rate || 0}%
                          </span>
                          <PlatformLink post={post} />
                        </div>
                      )}
                      {post.status === "failed" && post.error_message && (
                        <p className="text-xs text-red-600 mt-2 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">{post.error_message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, -1))}>← Previous</Button>
            <span className="font-medium">{format(calendarWeekStart, "MMM d")} – {format(addDays(calendarWeekStart, 6), "MMM d, yyyy")}</span>
            <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, 1))}>Next →</Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(day => {
              const dayPosts = getPostsForDay(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <Card key={day.toISOString()} className={isToday ? "border-primary" : ""}>
                  <CardContent className="p-3 min-h-[120px]">
                    <p className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{format(day, "EEE d")}</p>
                    {dayPosts.map((post: any) => {
                      const config = platformConfig[post.platform] || platformConfig.instagram;
                      const PlatformIcon = config.icon;
                      return (<div key={post.id} className="mt-2 p-1 rounded bg-muted text-xs flex items-center gap-1"><PlatformIcon className={`h-3 w-3 ${config.color}`} /><span className="truncate">{post.post_text?.slice(0, 30)}</span></div>);
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {(() => {
            const published = posts.filter(p => p.status === 'published');
            const failed = posts.filter(p => p.status === 'failed');
            const realPublished = published.filter(p => p.platform_post_id);
            const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
            const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
            const totalShares = posts.reduce((s, p) => s + (p.shares_count || 0), 0);
            const platformBreakdown = posts.reduce((acc: Record<string, number>, p) => {
              (p.platforms || []).forEach((pl: string) => { acc[pl] = (acc[pl] || 0) + 1; });
              return acc;
            }, {} as Record<string, number>);

            if (posts.length === 0) {
              return <Card><CardContent className="p-8 text-center"><BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="font-semibold">No Social Data Yet</h3><p className="text-sm text-muted-foreground mt-1">Create and publish posts to see insights here</p></CardContent></Card>;
            }

            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{posts.length}</p><p className="text-xs text-muted-foreground">Total Posts</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{realPublished.length}</p><p className="text-xs text-muted-foreground">Successfully Published</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{failed.length}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
                  <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{avgEngagement}%</p><p className="text-xs text-muted-foreground">Avg Engagement</p></CardContent></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Engagement Summary</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-pink-500/10"><Heart className="h-4 w-4 mx-auto text-pink-500 mb-1" /><p className="text-lg font-bold">{totalLikes}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                        <div className="p-3 rounded-lg bg-blue-500/10"><MessageSquare className="h-4 w-4 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold">{totalComments}</p><p className="text-[10px] text-muted-foreground">Comments</p></div>
                        <div className="p-3 rounded-lg bg-green-500/10"><Share2 className="h-4 w-4 mx-auto text-green-500 mb-1" /><p className="text-lg font-bold">{totalShares}</p><p className="text-[10px] text-muted-foreground">Shares</p></div>
                      </div>
                      {totalLikes === 0 && totalComments === 0 && totalShares === 0 && (
                        <p className="text-xs text-muted-foreground text-center mt-3">Engagement data will appear once posts are live and interactions are tracked</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Platform Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      {Object.keys(platformBreakdown).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(platformBreakdown).sort(([, a], [, b]) => (b as number) - (a as number)).map(([platform, count]) => (
                            <div key={platform} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <span className="text-sm capitalize">{platform}</span>
                              <Badge variant="outline">{count as number} post{(count as number) !== 1 ? 's' : ''}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No platform data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {failed.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Failed Posts</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {failed.slice(0, 5).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded bg-red-500/5">
                            <span className="truncate flex-1">{p.content?.slice(0, 60) || 'No content'}...</span>
                            <span className="text-xs text-red-600 ml-2">{p.error_message || 'Unknown error'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Social Activity Log</CardTitle>
              <CardDescription>Real-time feed of social media actions by the AI Brain and system</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No activity yet. Post to social media to see events here.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {activityLog.map((event: any) => {
                      const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data || '{}') : (event.event_data || {});
                      const isSuccess = event.event_type?.includes('published') || event.event_type?.includes('success');
                      const isFail = event.event_type?.includes('failed') || event.event_type?.includes('error');
                      const icon = isSuccess ? '🟢' : isFail ? '🔴' : '🔵';
                      const platform = eventData.platform || '';
                      const detail = eventData.message || eventData.description || event.event_type?.replace(/_/g, ' ') || 'Event';
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <span className="text-lg">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{detail}</p>
                            {platform && <p className="text-xs text-muted-foreground capitalize">{platform}</p>}
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
        </TabsContent>
      </Tabs>

      {/* Connect Account Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Connect Social Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[
              { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10" },
              { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-600/10" },
              { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10" },
              { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-700", bg: "bg-blue-700/10" },
            ].map(platform => {
              const avail = platformAvailability[platform.id];
              return (
                <Button key={platform.id} variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => handleConnectAccount(platform.id)}>
                  <div className={`p-3 rounded-full ${platform.bg}`}><platform.icon className={`h-6 w-6 ${platform.color}`} /></div>
                  <span className="text-sm font-medium">{platform.name}</span>
                  {avail?.connected ? (
                    <Badge variant="outline" className="text-green-600 text-xs">● Connected</Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{avail?.reason}</span>
                  )}
                </Button>
              );
            })}
          </div>
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <Button variant="link" className="p-0 h-auto" onClick={() => (window.location.href = "/settings/integrations")}>Settings → Integrations</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Composer Dialog */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* M1: Platform Selection with availability */}
            <div className="space-y-2">
              <Label>Select Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformConfig).map(([id, config]) => {
                  const PlatformIcon = config.icon;
                  const isSelected = selectedPlatforms.includes(id);
                  const avail = platformAvailability[id];
                  const isAvailable = avail?.connected || connectedAccounts.some((a: any) => a.platform === id);
                  return (
                    <TooltipProvider key={id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => isAvailable && togglePlatform(id)}
                            className={`gap-2 ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={!isAvailable}
                          >
                            <PlatformIcon className={isSelected ? "" : config.color} />
                            <span className="capitalize">{id}</span>
                          </Button>
                        </TooltipTrigger>
                        {!isAvailable && <TooltipContent><p>{avail?.reason || "Not connected"}</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>

            {/* M1: Instagram image warning */}
            {instagramNeedsImage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>⚠️ Instagram requires an image. Please attach a media URL or switch to Facebook for text-only posts.</p>
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <Button variant="outline" size="sm" onClick={handleGenerateCaption} disabled={isGenerating}>
                  {isGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Caption
                </Button>
              </div>
              <Textarea placeholder="What would you like to share?" rows={5} value={postContent} onChange={e => setPostContent(e.target.value)} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{postContent.length}/2200 characters</span></div>
            </div>

            {/* Media */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Media {instagramSelected && <span className="text-destructive">*</span>}</Label>
                <Button variant="outline" size="sm" onClick={handleGenerateImage} disabled={isGenerating}>
                  {isGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Image
                </Button>
              </div>
              {/* Image URL input */}
              <Input placeholder={instagramSelected ? "https://... (required for Instagram)" : "https://... (optional image URL)"} value={postMedia || ""} onChange={e => setPostMedia(e.target.value || null)} />
              {postMedia && (
                <div className="relative">
                  <img src={postMedia} alt="Post media" className="w-full rounded-lg max-h-64 object-cover border" crossOrigin="anonymous"
                    onError={e => { const t = e.target as HTMLImageElement; if (!t.dataset.retried) { t.dataset.retried = 'true'; setTimeout(() => { t.src = postMedia + (postMedia.includes('?') ? '&' : '?') + 't=' + Date.now(); }, 2000); } }} />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setPostMedia(null)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Suggested Hashtags</Label>
              <div className="flex flex-wrap gap-1">
                {suggestedHashtags.map(tag => (
                  <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" onClick={() => setPostContent(prev => prev + " " + tag)}>{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Schedule</Label><Switch checked={!!scheduleDate} onCheckedChange={checked => setScheduleDate(checked ? new Date() : undefined)} /></div>
              {scheduleDate && (
                <div className="grid grid-cols-2 gap-4">
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{format(scheduleDate, "PPP")}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} /></PopoverContent></Popover>
                  <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsComposerOpen(false); resetComposer(); }}>Cancel</Button>
            <Button onClick={handleSchedulePost} disabled={isSubmitting || !postContent.trim() || selectedPlatforms.length === 0 || instagramNeedsImage || publishCooldown}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</> : scheduleDate ? <><CalendarIcon className="h-4 w-4 mr-2" /> Schedule</> : <><Send className="h-4 w-4 mr-2" /> Publish Now</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
