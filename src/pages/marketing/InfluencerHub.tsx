import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  useInfluencers,
  type Influencer,
  type InfluencerCampaign,
  type InfluencerCampaignCreateInput,
} from '@/hooks/useInfluencers';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Users,
  Plus,
  Sparkles,
  Send,
  BarChart3,
  ExternalLink,
  Megaphone,
  TrendingUp,
  DollarSign,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================
// Helpers
// ============================================================

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n || 0);
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'completed':
    case 'accepted':
    case 'content_approved':
      return 'default';
    case 'rejected':
    case 'blacklisted':
    case 'declined':
    case 'cancelled':
      return 'destructive';
    case 'paused':
    case 'draft':
    case 'invited':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ============================================================
// Main Component
// ============================================================

export default function InfluencerHub() {
  const { tenantConfig } = useTenant();
  const [activeTab, setActiveTab] = useState('discovery');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachInfluencer, setOutreachInfluencer] = useState<Influencer | null>(null);

  // Form state
  const [newCampaign, setNewCampaign] = useState<InfluencerCampaignCreateInput>({
    name: '',
    product_service: '',
    campaign_type: 'awareness',
    budget: 0,
    currency: 'USD',
    commission_type: 'flat',
    commission_value: 0,
    brief: '',
  });
  const [outreachChannel, setOutreachChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [outreachMessage, setOutreachMessage] = useState('');

  const {
    influencers,
    campaigns,
    outreachLog,
    stats,
    campaignStats,
    influencersLoading,
    campaignsLoading,
    outreachLoading,
    createCampaign,
    sendOutreach,
    scoreInfluencerFit,
    generateCampaignBrief,
  } = useInfluencers({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    minScore: minScoreFilter || undefined,
  });

  const topInfluencers = useMemo(
    () => [...influencers].sort((a, b) => b.fit_score - a.fit_score).slice(0, 5),
    [influencers],
  );

  const topCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => Number(b.roi_percentage || 0) - Number(a.roi_percentage || 0))
        .slice(0, 10),
    [campaigns],
  );

  // ----- Handlers -----
  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.product_service) return;
    await createCampaign.mutateAsync(newCampaign);
    setCreateCampaignOpen(false);
    setNewCampaign({
      name: '',
      product_service: '',
      campaign_type: 'awareness',
      budget: 0,
      currency: 'USD',
      commission_type: 'flat',
      commission_value: 0,
      brief: '',
    });
  };

  const handleGenerateBrief = async () => {
    if (!newCampaign.product_service) return;
    const result = await generateCampaignBrief.mutateAsync({
      productService: newCampaign.product_service,
      campaignType: newCampaign.campaign_type,
    });
    if (result) {
      setNewCampaign((prev) => ({ ...prev, brief: result.replace(/^\*\*\[.*?\]\*\*\n*/, '').trim() }));
    }
  };

  const handleScore = (influencerId: string) => {
    scoreInfluencerFit.mutate(influencerId);
  };

  const handleOpenOutreach = (inf: Influencer) => {
    setOutreachInfluencer(inf);
    setOutreachMessage('');
    setOutreachChannel(inf.contact_whatsapp ? 'whatsapp' : 'email');
    setOutreachDialogOpen(true);
  };

  const handleSendOutreach = async () => {
    if (!outreachInfluencer) return;
    await sendOutreach.mutateAsync({
      influencerId: outreachInfluencer.id,
      channel: outreachChannel,
      message: outreachMessage || undefined,
    });
    setOutreachDialogOpen(false);
    setOutreachInfluencer(null);
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7" /> Influencer Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover, evaluate, and manage influencer partnerships powered by COLLAB AI
          </p>
        </div>
        <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Influencer Campaign</DialogTitle>
              <DialogDescription>
                COLLAB will auto-generate a brief if you leave it empty.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. Summer 2026 Launch"
                />
              </div>
              <div>
                <Label htmlFor="product-service">Product / Service</Label>
                <Input
                  id="product-service"
                  value={newCampaign.product_service}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, product_service: e.target.value })
                  }
                  placeholder="e.g. New skincare line"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-type">Type</Label>
                  <Select
                    value={newCampaign.campaign_type}
                    onValueChange={(v) =>
                      setNewCampaign({
                        ...newCampaign,
                        campaign_type: v as InfluencerCampaign['campaign_type'],
                      })
                    }
                  >
                    <SelectTrigger id="campaign-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Awareness</SelectItem>
                      <SelectItem value="conversion">Conversion</SelectItem>
                      <SelectItem value="launch">Launch</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="commission-type">Commission Type</Label>
                  <Select
                    value={newCampaign.commission_type}
                    onValueChange={(v) =>
                      setNewCampaign({
                        ...newCampaign,
                        commission_type: v as InfluencerCampaign['commission_type'],
                      })
                    }
                  >
                    <SelectTrigger id="commission-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat fee</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={newCampaign.budget || 0}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="commission-value">Commission Value</Label>
                  <Input
                    id="commission-value"
                    type="number"
                    value={newCampaign.commission_value || 0}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, commission_value: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="brief">Brief</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateBrief}
                    disabled={!newCampaign.product_service || generateCampaignBrief.isPending}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {generateCampaignBrief.isPending ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
                <Textarea
                  id="brief"
                  value={newCampaign.brief || ''}
                  onChange={(e) => setNewCampaign({ ...newCampaign, brief: e.target.value })}
                  placeholder="Describe campaign goals, message, deliverables..."
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCampaignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Total Influencers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Avg fit score: {stats.avgFitScore}/100
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats.active}</div>
            <p className="text-xs text-muted-foreground">{campaignStats.draft} draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Total Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFollowers(campaignStats.totalReach)}</div>
            <p className="text-xs text-muted-foreground">
              {formatFollowers(stats.totalFollowers)} potential
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${campaignStats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Avg ROI: {campaignStats.avgRoi}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="outreach">Outreach ({outreachLog.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ===== DISCOVERY TAB ===== */}
        <TabsContent value="discovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={platformFilter || 'all'} onValueChange={(v) => setPlatformFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="discovered">Discovered</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Input
                    type="number"
                    placeholder="Min fit score"
                    value={minScoreFilter || ''}
                    onChange={(e) => setMinScoreFilter(Number(e.target.value) || 0)}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {influencersLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : influencers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No influencers in your roster yet.</p>
                  <p className="text-sm mt-1">
                    COLLAB can discover influencers from social listening and Apify scraping.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Fit Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {influencers.map((inf) => (
                      <TableRow key={inf.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{inf.name}</div>
                            {inf.handle && (
                              <div className="text-xs text-muted-foreground">{inf.handle}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{inf.platform}</TableCell>
                        <TableCell>{formatFollowers(inf.followers_count)}</TableCell>
                        <TableCell>{inf.engagement_rate}%</TableCell>
                        <TableCell>
                          <Badge variant={inf.fit_score >= 70 ? 'default' : 'outline'}>
                            {inf.fit_score}/100
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(inf.status)}>{inf.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleScore(inf.id)}
                              disabled={scoreInfluencerFit.isPending}
                              title="AI Fit Score"
                            >
                              <Sparkles className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenOutreach(inf)}
                              title="Send Outreach"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                            {inf.profile_url && (
                              <Button size="sm" variant="ghost" asChild title="Open profile">
                                <a href={inf.profile_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
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

        {/* ===== CAMPAIGNS TAB ===== */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No campaigns yet. Click "New Campaign" to create one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription className="mt-1">{c.product_service}</CardDescription>
                      </div>
                      <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Type</div>
                        <div className="font-medium capitalize">{c.campaign_type}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Budget</div>
                        <div className="font-medium">
                          {c.currency} {Number(c.budget || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Influencers</div>
                        <div className="font-medium">{c.influencer_count}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">ROI</div>
                        <div className="font-medium">{Number(c.roi_percentage || 0).toFixed(1)}%</div>
                      </div>
                    </div>
                    {c.brief && (
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{c.brief}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== OUTREACH TAB ===== */}
        <TabsContent value="outreach" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {outreachLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : outreachLog.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No outreach activity yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direction</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outreachLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.channel}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.message_text || '—'}
                        </TableCell>
                        <TableCell>
                          {log.status === 'delivered' || log.status === 'replied' ? (
                            <Badge>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {log.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{log.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Top Influencers by Fit
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topInfluencers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {topInfluencers.map((inf) => (
                      <div key={inf.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{inf.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {inf.platform} · {formatFollowers(inf.followers_count)}
                          </div>
                        </div>
                        <Badge variant="default">{inf.fit_score}/100</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Campaigns by ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCampaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {topCampaigns.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <div className="truncate">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {c.status} · {c.influencer_count} influencers
                          </div>
                        </div>
                        <Badge variant="default">{Number(c.roi_percentage || 0).toFixed(1)}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Outreach dialog */}
      <Dialog open={outreachDialogOpen} onOpenChange={setOutreachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Send outreach to {outreachInfluencer?.name || 'influencer'}
            </DialogTitle>
            <DialogDescription>
              COLLAB will generate a personalized message if you leave the field empty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Channel</Label>
              <Select
                value={outreachChannel}
                onValueChange={(v) => setOutreachChannel(v as 'whatsapp' | 'email')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp" disabled={!outreachInfluencer?.contact_whatsapp}>
                    WhatsApp
                  </SelectItem>
                  <SelectItem value="email" disabled={!outreachInfluencer?.contact_email}>
                    Email
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Contact:{' '}
                {outreachChannel === 'whatsapp'
                  ? outreachInfluencer?.contact_whatsapp || 'none on file'
                  : outreachInfluencer?.contact_email || 'none on file'}
              </p>
            </div>
            <div>
              <Label htmlFor="outreach-msg">Message (optional)</Label>
              <Textarea
                id="outreach-msg"
                value={outreachMessage}
                onChange={(e) => setOutreachMessage(e.target.value)}
                placeholder="Leave empty to let COLLAB generate one..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutreachDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendOutreach} disabled={sendOutreach.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendOutreach.isPending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
