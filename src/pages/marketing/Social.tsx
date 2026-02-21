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
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { useSocialPosts, useSocialAccounts } from "@/hooks/useSocialPosts";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { format, addDays, startOfWeek, addWeeks, eachDayOfInterval } from "date-fns";
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
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const bestPostingTimes = [
  { platform: "instagram", times: ["9:00 AM", "12:00 PM", "7:00 PM"], bestDay: "Wednesday" },
  { platform: "facebook", times: ["1:00 PM", "4:00 PM", "8:00 PM"], bestDay: "Thursday" },
  { platform: "twitter", times: ["8:00 AM", "12:00 PM", "5:00 PM"], bestDay: "Tuesday" },
  { platform: "linkedin", times: ["7:00 AM", "12:00 PM", "5:00 PM"], bestDay: "Wednesday" },
];

const suggestedHashtags = [
  "#marketing",
  "#business",
  "#entrepreneurship",
  "#success",
  "#motivation",
  "#digitalmarketing",
  "#socialmedia",
  "#branding",
  "#startup",
  "#growth",
];

function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches || [];
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export default function SocialCommander() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();

  // Real data hooks
  const { posts, isLoading: postsLoading, createPost, deletePost, publishNow, stats: postStats } = useSocialPosts();
  const { accounts, connectedAccounts, totalFollowers, isLoading: accountsLoading } = useSocialAccounts();

  // Local UI state
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

  // FIX: Platform connection status from tenant config
  const connectedPlatformStatus = {
    facebook: !!(tenantConfig as any)?.meta_page_token,
    instagram: !!(tenantConfig as any)?.meta_page_token && !!(tenantConfig as any)?.instagram_page_id,
    whatsapp: !!(tenantConfig as any)?.whatsapp_phone_id,
    linkedin: false,
    twitter: false,
  };

  const handleConnectAccount = (platform: string) => {
    toast({
      title: `Connect ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
      description: "Social account connection requires OAuth setup. Configure in Settings → Integrations.",
    });
    setIsConnectOpen(false);
  };

  const platformConfig: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
  > = {
    instagram: { icon: Instagram, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    facebook: { icon: Facebook, color: "text-blue-600", bgColor: "bg-blue-600/10" },
    twitter: { icon: Twitter, color: "text-sky-500", bgColor: "bg-sky-500/10" },
    linkedin: { icon: Linkedin, color: "text-blue-700", bgColor: "bg-blue-700/10" },
    youtube: { icon: Youtube, color: "text-red-500", bgColor: "bg-red-500/10" },
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  // FIX: Real AI Caption via webhook instead of mock
  const handleGenerateCaption = async () => {
    if (!tenantConfig?.id) {
      toast({ title: "No tenant configured", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.GENERATE_CONTENT,
        {
          content_type: "social_media",
          topic: postContent || "business update",
          tone: "engaging",
          platform: selectedPlatforms[0] || "instagram",
          industry: tenantConfig.industry || "technology",
        },
        tenantConfig.id,
      );
      if (result.success && result.data) {
        const d = result.data as any;
        const content = d.content || d.text || d.caption || "";
        if (content) {
          setPostContent(content);
          toast({ title: "✨ AI Caption Generated!" });
        } else {
          toast({ title: "No content returned", description: "Try a different topic", variant: "destructive" });
        }
      } else {
        toast({
          title: "AI Unavailable",
          description: "Check n8n marketing workflow is active",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // FIX: Real AI Image via webhook instead of mock
  const handleGenerateImage = async () => {
    if (!tenantConfig?.id) {
      toast({ title: "No tenant configured", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.GENERATE_IMAGE,
        {
          prompt: postContent || "professional business promotion banner",
          style: "social_media",
          aspect_ratio: "1:1",
        },
        tenantConfig.id,
      );
      if (result.success && result.data) {
        const imageUrl = (result.data as any).image_url || (result.data as any).url;
        if (imageUrl) {
          setPostMedia(imageUrl);
          toast({ title: "🖼️ AI Image Generated!" });
        } else {
          toast({ title: "No image returned", variant: "destructive" });
        }
      } else {
        toast({ title: "Image Generation Failed", description: "Check n8n workflow", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!postContent.trim()) {
      toast({ title: "Content Required", description: "Please add content to your post.", variant: "destructive" });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: "Select Platforms", description: "Please select at least one platform.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const hashtags = extractHashtags(postContent);
      const scheduledAt = scheduleDate ? combineDateAndTime(scheduleDate, scheduleTime).toISOString() : undefined;

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
        title: scheduleDate ? "Post Scheduled" : "📤 Post Queued",
        description: scheduleDate
          ? `Scheduled for ${format(scheduleDate, "PPP")} at ${scheduleTime}`
          : "Post queued for publishing! It will be posted within 5 minutes.",
      });
    } catch (error) {
      toast({ title: "Failed", description: "Could not create post. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetComposer = () => {
    setPostContent("");
    setPostMedia(null);
    setSelectedPlatforms([]);
    setScheduleDate(undefined);
    setScheduleTime("09:00");
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const calendarDays = eachDayOfInterval({
    start: calendarWeekStart,
    end: addDays(calendarWeekStart, 6),
  });

  const getPostsForDay = (date: Date) => {
    return posts.filter((p) => {
      const postDate = p.scheduled_at || p.published_at;
      if (!postDate) return false;
      return format(new Date(postDate), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  if (postsLoading && accountsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Social Commander</h1>
          <p className="text-muted-foreground mt-1">Manage all your social media in one place</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsConnectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Connect Account
          </Button>
          <Button onClick={() => setIsComposerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
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
                <p className="text-2xl font-bold">
                  {totalFollowers > 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : totalFollowers}
                </p>
                <p className="text-xs text-muted-foreground">Total Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Send className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{postStats?.published || 0}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{postStats?.scheduled || 0}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedAccounts.length}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Connected Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Connected Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                {connectedAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No accounts connected yet</p>
                    <Button variant="outline" onClick={() => setIsConnectOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Connect Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectedAccounts.map((account: any) => {
                      const config = platformConfig[account.platform] || platformConfig.instagram;
                      const PlatformIcon = config.icon;
                      return (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.bgColor}`}>
                              <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div>
                              <p className="font-medium capitalize">{account.platform}</p>
                              <p className="text-xs text-muted-foreground">
                                {account.username || account.page_name || "Connected"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Best Posting Times */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Best Posting Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bestPostingTimes.map((item) => {
                    const config = platformConfig[item.platform];
                    if (!config) return null;
                    const PlatformIcon = config.icon;
                    return (
                      <div key={item.platform} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-sm capitalize">{item.platform}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{item.times.join(", ")}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No posts yet</p>
                  <Button onClick={() => setIsComposerOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Your First Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post: any) => {
                    const config = platformConfig[post.platform] || platformConfig.instagram;
                    const PlatformIcon = config.icon;
                    return (
                      <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        {post.media_urls?.[0] && (
                          <img src={post.media_urls[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{post.post_text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                            <span className="text-xs text-muted-foreground ml-2">
                              {post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, h:mm a") : "No date"}
                            </span>
                          </div>
                    {post.status === "published" && (
                            <div className="space-y-1 mt-2">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">❤️ {post.likes_count || 0}</span>
                                <span className="flex items-center gap-1">💬 {post.comments_count || 0}</span>
                                <span className="flex items-center gap-1">🔄 {post.shares_count || 0}</span>
                                {post.impressions > 0 && <span className="flex items-center gap-1">👁 {(post.impressions || 0).toLocaleString()}</span>}
                              </div>
                              {(post.likes_count || post.comments_count || post.shares_count || post.impressions) ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <span>{post.engagement_rate > 5 ? '🟢' : post.engagement_rate >= 2 ? '🟡' : '🔴'}</span>
                                  <span className={post.engagement_rate > 5 ? 'text-green-500' : post.engagement_rate >= 2 ? 'text-amber-500' : 'text-red-500'}>
                                    {post.engagement_rate || 0}% engagement
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground">📊 Engagement tracking active — metrics update every 4 hours</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              post.status === "published"
                                ? "default"
                                : post.status === "scheduled"
                                  ? "outline"
                                  : "secondary"
                            }
                            className={post.status === "scheduled" && post.scheduled_at && (Date.now() - new Date(post.scheduled_at).getTime() < 10 * 60 * 1000) ? "animate-pulse" : ""}
                          >
                            {post.status === "scheduled" && post.scheduled_at && (Date.now() - new Date(post.scheduled_at).getTime() < 10 * 60 * 1000) ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Publishing...
                              </span>
                            ) : (
                              post.status
                            )}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(post.post_text);
                                  toast({ title: "Copied!" });
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" /> Copy Text
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
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No posts yet</p>
              <Button onClick={() => setIsComposerOpen(true)}>Create Post</Button>
            </Card>
          ) : (
            posts.map((post: any) => {
              const config = platformConfig[post.platform] || platformConfig.instagram;
              const PlatformIcon = config.icon;
              return (
                <Card key={post.id}>
                  <CardContent className="p-4 flex items-start gap-4">
                    {post.media_urls?.[0] && (
                      <img src={post.media_urls[0]} alt="" className="w-24 h-24 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{post.post_text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <PlatformIcon className={`h-4 w-4 ${config.color}`} />
                        <Badge variant={post.status === "published" ? "default" : "secondary"} className={post.status === "scheduled" && post.scheduled_at && (Date.now() - new Date(post.scheduled_at).getTime() < 10 * 60 * 1000) ? "animate-pulse" : ""}>
                          {post.status === "scheduled" && post.scheduled_at && (Date.now() - new Date(post.scheduled_at).getTime() < 10 * 60 * 1000) ? (
                            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Publishing...</span>
                          ) : post.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, h:mm a") : ""}
                        </span>
                      </div>
                      {post.status === "published" && (
                        <div className="mt-2">
                          {(post.likes_count || post.comments_count || post.shares_count || post.impressions) ? (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>❤️ {post.likes_count || 0}</span>
                              <span>💬 {post.comments_count || 0}</span>
                              <span>🔄 {post.shares_count || 0}</span>
                              {post.impressions > 0 && <span>👁 {(post.impressions || 0).toLocaleString()}</span>}
                              <span className={post.engagement_rate > 5 ? 'text-green-500' : post.engagement_rate >= 2 ? 'text-amber-500' : 'text-red-500'}>
                                {post.engagement_rate > 5 ? '🟢' : post.engagement_rate >= 2 ? '🟡' : '🔴'} {post.engagement_rate || 0}%
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">📊 Metrics update every 4 hours</p>
                          )}
                        </div>
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
            <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, -1))}>
              ← Previous
            </Button>
            <span className="font-medium">
              {format(calendarWeekStart, "MMM d")} – {format(addDays(calendarWeekStart, 6), "MMM d, yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCalendarWeekStart(addWeeks(calendarWeekStart, 1))}>
              Next →
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <Card key={day.toISOString()} className={isToday ? "border-primary" : ""}>
                  <CardContent className="p-3 min-h-[120px]">
                    <p className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>{format(day, "EEE d")}</p>
                    {dayPosts.map((post: any) => {
                      const config = platformConfig[post.platform] || platformConfig.instagram;
                      const PlatformIcon = config.icon;
                      return (
                        <div key={post.id} className="mt-2 p-1 rounded bg-muted text-xs flex items-center gap-1">
                          <PlatformIcon className={`h-3 w-3 ${config.color}`} />
                          <span className="truncate">{post.post_text?.slice(0, 30)}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold">Insights Coming Soon</h3>
              <p className="text-sm text-muted-foreground mt-1">Analytics will appear as you publish more posts</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Account Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Social Account</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[
              { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10" },
              { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-600/10" },
              { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10" },
              { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-700", bg: "bg-blue-700/10" },
            ].map((platform) => (
              <Button
                key={platform.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => handleConnectAccount(platform.id)}
              >
                <div className={`p-3 rounded-full ${platform.bg}`}>
                  <platform.icon className={`h-6 w-6 ${platform.color}`} />
                </div>
                <span className="text-sm font-medium">{platform.name}</span>
                {/* FIX: Show connection status */}
                {connectedPlatformStatus[platform.id as keyof typeof connectedPlatformStatus] && (
                  <Badge variant="outline" className="text-green-600 text-xs">
                    ● Connected
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>To connect social accounts, configure your API keys in:</p>
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => (window.location.href = "/settings/integrations")}
            >
              Settings → Integrations
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform(account.platform)}
                      className="gap-2"
                    >
                      <PlatformIcon className={isSelected ? "" : config.color} />
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
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
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
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  AI Image
                </Button>
              </div>
              {isGenerating && !postMedia && (
                <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Generating AI image...</span>
                </div>
              )}
              {postMedia ? (
                <div className="relative">
                  <img
                    src={postMedia}
                    alt="Post media"
                    className="w-full rounded-lg max-h-64 object-cover border"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.retried) {
                        target.dataset.retried = 'true';
                        setTimeout(() => {
                          target.src = postMedia + (postMedia.includes('?') ? '&' : '?') + 't=' + Date.now();
                        }, 2000);
                      }
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setPostMedia(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : !isGenerating && (
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
                      {scheduleDate ? format(scheduleDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to publish immediately</p>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Suggested Hashtags</Label>
              <div className="flex flex-wrap gap-1">
                {suggestedHashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => setPostContent((prev) => prev + " " + tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsComposerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedulePost} disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : scheduleDate ? "Schedule Post" : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
