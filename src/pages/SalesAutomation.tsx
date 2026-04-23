import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase, callWebhook, WEBHOOKS } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Target,
  Plus,
  Search,
  MoreHorizontal,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Bot,
  User,
  Play,
  Pause,
  Briefcase,
  BarChart3,
  Sparkles,
  GripVertical,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts';

interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string | null;
  phone: string | null;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  status: string;
  source: string | null;
  sequence_status: 'pending' | 'active' | 'paused' | 'completed' | null;
  handler_type: 'ai' | 'human';
  enrichment_data: Record<string, unknown> | null;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  lead_id: string | null;
  lead_name: string | null;
  created_at: string;
}

interface Sequence {
  id: string;
  name: string;
  steps_count: number;
  leads_count: number;
  is_active: boolean;
}

const gradeColors: Record<string, string> = {
  A: 'bg-success text-success-foreground',
  B: 'bg-info text-info-foreground',
  C: 'bg-warning text-warning-foreground',
  D: 'bg-destructive text-destructive-foreground',
};

const sequenceStatusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-success text-success-foreground',
  paused: 'bg-warning text-warning-foreground',
  completed: 'bg-info text-info-foreground',
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function SalesAutomationPage() {
  const { tenantId, tenantConfig, translate, getDealStages, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const dealStages = getDealStages();

  const [activeTab, setActiveTab] = useState('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);

  // Lead Gen form
  const [b2bForm, setB2bForm] = useState({
    industry: '',
    keywords: '',
    location: '',
    count: '25',
  });
  const [b2cForm, setB2cForm] = useState({
    intent_keywords: '',
    platforms: ['reddit', 'twitter'] as string[],
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    leadsBySource: [] as { name: string; value: number }[],
    conversionFunnel: [] as { name: string; value: number }[],
    pipelineValue: [] as { stage: string; value: number }[],
  });

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const [leadsRes, dealsRes, sequencesRes] = await Promise.all([
        supabase
          .from('sales_leads')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('deals')
          .select(`
            id,
            title,
            value,
            stage,
            probability,
            lead_id,
            created_at,
            sales_leads(contact_name)
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('sequences')
          .select('id, name, steps_count, leads_count, is_active')
          .eq('tenant_id', tenantId),
      ]);

      setLeads(leadsRes.data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeals((dealsRes.data || []).map((d: any) => ({
        ...d,
        lead_name: d.sales_leads?.contact_name,
      })));
      setSequences(sequencesRes.data || []);

      // Calculate analytics
      const sourceCount: Record<string, number> = {};
      (leadsRes.data || []).forEach((l) => {
        const source = l.source || 'Unknown';
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

      const stageValues: Record<string, number> = {};
      (dealsRes.data || []).forEach((d) => {
        stageValues[d.stage] = (stageValues[d.stage] || 0) + (d.value || 0);
      });

      setAnalyticsData({
        leadsBySource: Object.entries(sourceCount).map(([name, value]) => ({ name, value })),
        conversionFunnel: [
          { name: translate('leads'), value: leadsRes.data?.length || 0 },
          { name: 'Qualified', value: (leadsRes.data || []).filter((l) => l.status === 'qualified').length },
          { name: 'Proposals', value: (dealsRes.data || []).filter((d) => d.stage === 'Proposal').length },
          { name: 'Won', value: (dealsRes.data || []).filter((d) => d.stage === 'Won' || d.stage === 'Closed Won').length },
        ],
        pipelineValue: dealStages.map((stage) => ({
          stage,
          value: stageValues[stage] || 0,
        })),
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, translate, dealStages]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDealStageChange = async (dealId: string, newStage: string) => {
    if (!tenantId) return;

    try {
      // Call webhook
      await callWebhook(
        WEBHOOKS.DEAL_UPDATE,
        {
          deal_id: dealId,
          stage: newStage,
        },
        tenantId
      );

      // Update local state
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
      );

      toast({
        title: 'Deal Updated',
        description: `Deal moved to ${newStage}`,
      });
    } catch (error) {
      console.error('Error updating deal:', error);
    }
  };

  const handleStartSequence = async (leadId: string) => {
    if (!tenantId) return;

    try {
      await callWebhook(
        WEBHOOKS.LEAD_CONTROL,
        {
          lead_id: leadId,
          action: 'start_sequence',
        },
        tenantId
      );

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, sequence_status: 'active' } : l))
      );

      toast({
        title: 'Sequence Started',
        description: 'Lead has been added to the sequence',
      });
    } catch (error) {
      console.error('Error starting sequence:', error);
    }
  };

  const handlePauseSequence = async (leadId: string) => {
    if (!tenantId) return;

    try {
      await callWebhook(
        WEBHOOKS.LEAD_CONTROL,
        {
          lead_id: leadId,
          action: 'pause_sequence',
        },
        tenantId
      );

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, sequence_status: 'paused' } : l))
      );

      toast({
        title: 'Sequence Paused',
        description: 'Lead sequence has been paused',
      });
    } catch (error) {
      console.error('Error pausing sequence:', error);
    }
  };

  const handleGenerateB2BLeads = async () => {
    if (!tenantId || !b2bForm.industry) return;

    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.LEAD_GEN_B2B,
        {
          industry: b2bForm.industry,
          keywords: b2bForm.keywords,
          location: b2bForm.location,
          count: parseInt(b2bForm.count),
        },
        tenantId
      );

      if (result.success) {
        toast({
          title: 'Lead Generation Started',
          description: `Generating ${b2bForm.count} ${translate('leads').toLowerCase()}...`,
        });
        // Refresh data after a delay
        setTimeout(fetchData, 5000);
      }
    } catch (error) {
      console.error('Error generating leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to start lead generation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateB2CLeads = async () => {
    if (!tenantId || !b2cForm.intent_keywords) return;

    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.LEAD_GEN_B2C,
        {
          intent_keywords: b2cForm.intent_keywords,
          platforms: b2cForm.platforms,
        },
        tenantId
      );

      if (result.success) {
        toast({
          title: 'Intent Signal Search Started',
          description: 'Searching for intent signals...',
        });
        setTimeout(fetchData, 5000);
      }
    } catch (error) {
      console.error('Error searching intent signals:', error);
      toast({
        title: 'Error',
        description: 'Failed to search intent signals',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter((d) => d.stage === stage);
  };

  const formatCurrency = (value: number) => {
    const currency = tenantConfig?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Automation</h1>
          <p className="text-muted-foreground mt-1">
            Manage your sales pipeline and {translate('leads').toLowerCase()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pipeline">
            <Briefcase className="h-4 w-4 mr-2" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Target className="h-4 w-4 mr-2" />
            {translate('leads')}
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <Zap className="h-4 w-4 mr-2" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate {translate('leads')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="mt-6">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {dealStages.map((stage) => {
              const stageDeals = getDealsByStage(stage);
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

              return (
                <Card key={stage} className="min-w-[280px] bg-muted/30 flex-shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>{stage}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{stageDeals.length}</Badge>
                        <span className="text-xs text-muted-foreground">{formatCurrency(stageValue)}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[300px] space-y-3">
                    {isLoading ? (
                      [...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))
                    ) : stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No deals</p>
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium text-sm truncate">{deal.title}</span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {dealStages.filter((s) => s !== stage).map((s) => (
                                        <DropdownMenuItem
                                          key={s}
                                          onClick={() => handleDealStageChange(deal.id, s)}
                                        >
                                          <ArrowRight className="h-4 w-4 mr-2" />
                                          Move to {s}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <p className="text-lg font-bold text-primary">{formatCurrency(deal.value)}</p>
                                {deal.lead_name && (
                                  <p className="text-xs text-muted-foreground truncate">{deal.lead_name}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Progress value={deal.probability} className="flex-1 h-1" />
                                  <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={`Search ${translate('leads').toLowerCase()}...`} className="pl-10" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {translate('leads').toLowerCase()} yet</p>
                  <p className="text-sm">Generate your first {translate('leads').toLowerCase()}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sequence</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsLeadDetailOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{lead.company_name || '-'}</TableCell>
                        <TableCell>{lead.contact_name}</TableCell>
                        <TableCell>{lead.email || '-'}</TableCell>
                        <TableCell>{lead.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={lead.score} className="w-16 h-2" />
                            <span className="text-xs">{lead.score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={gradeColors[lead.grade]}>{lead.grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {lead.sequence_status ? (
                            <Badge className={sequenceStatusColors[lead.sequence_status]}>
                              {lead.sequence_status}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLead(lead);
                                  setIsLeadDetailOpen(true);
                                }}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSequence(lead.id);
                                }}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start Sequence
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseSequence(lead.id);
                                }}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Create Deal</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sequences.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sequences created yet</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sequence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sequences.map((sequence) => (
                <Card key={sequence.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{sequence.name}</CardTitle>
                      <Switch checked={sequence.is_active} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{sequence.steps_count}</p>
                        <p className="text-xs text-muted-foreground">Steps</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{sequence.leads_count}</p>
                        <p className="text-xs text-muted-foreground">{translate('leads')}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View Sequence
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Generate Leads Tab */}
        <TabsContent value="generate" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* B2B Lead Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  B2B {translate('lead')} Generation
                </CardTitle>
                <CardDescription>
                  Generate business {translate('leads').toLowerCase()} based on industry and criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Industry *</Label>
                  <Input
                    placeholder="e.g., Software, Healthcare, Finance"
                    value={b2bForm.industry}
                    onChange={(e) => setB2bForm({ ...b2bForm, industry: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Keywords</Label>
                  <Input
                    placeholder="e.g., AI, SaaS, Enterprise"
                    value={b2bForm.keywords}
                    onChange={(e) => setB2bForm({ ...b2bForm, keywords: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., United States, New York"
                    value={b2bForm.location}
                    onChange={(e) => setB2bForm({ ...b2bForm, location: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Number of {translate('leads')}</Label>
                  <Select value={b2bForm.count} onValueChange={(v) => setB2bForm({ ...b2bForm, count: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerateB2BLeads}
                  disabled={!b2bForm.industry || isGenerating}
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {translate('leads')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* B2C Intent Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  B2C Intent Signals
                </CardTitle>
                <CardDescription>
                  Find potential {translate('customers').toLowerCase()} showing buying intent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Intent Keywords *</Label>
                  <Textarea
                    placeholder="e.g., looking for dentist, need a plumber, best salon near me"
                    value={b2cForm.intent_keywords}
                    onChange={(e) => setB2cForm({ ...b2cForm, intent_keywords: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-4">
                    {['reddit', 'twitter', 'forums'].map((platform) => (
                      <div key={platform} className="flex items-center gap-2">
                        <Checkbox
                          id={platform}
                          checked={b2cForm.platforms.includes(platform)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setB2cForm({ ...b2cForm, platforms: [...b2cForm.platforms, platform] });
                            } else {
                              setB2cForm({
                                ...b2cForm,
                                platforms: b2cForm.platforms.filter((p) => p !== platform),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={platform} className="capitalize cursor-pointer">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerateB2CLeads}
                  disabled={!b2cForm.intent_keywords || isGenerating}
                >
                  {isGenerating ? (
                    <>Searching...</>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Find Intent Signals
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Leads by Source */}
            <Card>
              <CardHeader>
                <CardTitle>{translate('leads')} by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData.leadsBySource.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.leadsBySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.leadsBySource.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.conversionFunnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pipeline Value */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Pipeline Value by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.pipelineValue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="stage" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lead Detail Sheet */}
      <Sheet open={isLeadDetailOpen} onOpenChange={setIsLeadDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedLead?.contact_name}</SheetTitle>
            <SheetDescription>
              {selectedLead?.company_name || translate('lead') + ' details'}
            </SheetDescription>
          </SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-6">
              {/* Score & Grade */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{translate('lead')} Score</p>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedLead.score} className="flex-1" />
                    <span className="font-semibold">{selectedLead.score}</span>
                  </div>
                </div>
                <Badge className={cn('text-lg px-3 py-1', gradeColors[selectedLead.grade])}>
                  {selectedLead.grade}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-semibold">Contact Information</h4>
                {selectedLead.email && (
                  <p className="text-sm">Email: {selectedLead.email}</p>
                )}
                {selectedLead.phone && (
                  <p className="text-sm">Phone: {selectedLead.phone}</p>
                )}
                {selectedLead.source && (
                  <p className="text-sm">Source: {selectedLead.source}</p>
                )}
              </div>

              {/* Sequence Status */}
              <div className="space-y-3">
                <h4 className="font-semibold">Sequence Status</h4>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>
                    {selectedLead.sequence_status ? (
                      <Badge className={sequenceStatusColors[selectedLead.sequence_status]}>
                        {selectedLead.sequence_status}
                      </Badge>
                    ) : (
                      'Not in sequence'
                    )}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleStartSequence(selectedLead.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePauseSequence(selectedLead.id)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Handler */}
              <div className="space-y-3">
                <h4 className="font-semibold">Handler</h4>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedLead.handler_type === 'ai' ? (
                      <Bot className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                    <span>{selectedLead.handler_type === 'ai' ? 'AI Handler' : 'Human Handler'}</span>
                  </div>
                  <Switch checked={selectedLead.handler_type === 'ai'} />
                </div>
              </div>

              {/* Enrichment Data */}
              {selectedLead.enrichment_data && Object.keys(selectedLead.enrichment_data).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Enrichment Data</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedLead.enrichment_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1">Create Deal</Button>
                <Button variant="outline" className="flex-1">
                  Start Sequence
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
