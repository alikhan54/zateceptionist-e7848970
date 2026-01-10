import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, Play, Pause, Building2, MapPin, Users, 
  Briefcase, Plus, X, Globe,
  MessageCircle, Twitter, Radio, Zap,
  Loader2, RefreshCw, Check, ArrowRight, Mail, Phone
} from 'lucide-react';
import { GradeBadge } from '@/components/shared';
import { cn } from '@/lib/utils';

interface GeneratedLead {
  id: string;
  company: string;
  contact: string;
  email: string;
  title: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  status: 'new' | 'enriching' | 'added' | 'dismissed';
  source: 'b2b' | 'intent';
  phone?: string;
  linkedin?: string;
  website?: string;
}

export default function AutoLeadGen() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('b2b');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState([25]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('all');
  const [jobTitles, setJobTitles] = useState('');
  
  // Intent signals config
  const [platforms, setPlatforms] = useState({
    reddit: true,
    twitter: true,
    forums: false,
    linkedin: false
  });
  const [intentKeywords, setIntentKeywords] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Generated leads state
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([
    { id: '1', company: 'TechStartup Inc', contact: 'John Smith', email: 'john@techstartup.com', title: 'CTO', score: 85, grade: 'A', status: 'new', source: 'b2b', phone: '+1-555-0123' },
    { id: '2', company: 'GrowthCo', contact: 'Sarah Lee', email: 'sarah@growthco.com', title: 'VP Sales', score: 72, grade: 'B', status: 'new', source: 'b2b' },
    { id: '3', company: 'DataFlow', contact: 'Mike Johnson', email: 'mike@dataflow.io', title: 'CEO', score: 91, grade: 'A', status: 'enriching', source: 'b2b' },
    { id: '4', company: 'CloudNine', contact: 'Emily Chen', email: 'emily@cloudnine.com', title: 'Head of Growth', score: 68, grade: 'B', status: 'new', source: 'intent' },
    { id: '5', company: 'ScaleUp Ltd', contact: 'Alex Brown', email: 'alex@scaleup.io', title: 'Director', score: 55, grade: 'C', status: 'new', source: 'intent' },
  ]);

  // Credits
  const credits = { used: 347, total: 500, remaining: 153 };

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Manufacturing',
    'Real Estate', 'Education', 'Marketing', 'Legal', 'Consulting'
  ];

  // Add lead to pipeline mutation
  const addToPipelineMutation = useMutation({
    mutationFn: async (lead: GeneratedLead) => {
      const { data, error } = await supabase
        .from('sales_leads')
        .insert({
          tenant_id: tenantId,
          name: lead.contact,
          company: lead.company,
          email: lead.email,
          phone: lead.phone || null,
          title: lead.title,
          source: lead.source === 'b2b' ? 'lead_gen' : 'intent_signal',
          score: lead.score,
          temperature: lead.grade === 'A' ? 'hot' : lead.grade === 'B' ? 'warm' : 'cold',
          status: 'new',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, lead) => {
      setGeneratedLeads(leads => 
        leads.map(l => l.id === lead.id ? { ...l, status: 'added' as const } : l)
      );
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      toast({ title: 'Lead added to pipeline' });
    },
    onError: (error) => {
      toast({ title: 'Failed to add lead', description: error.message, variant: 'destructive' });
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate API call for lead generation
    // In production, this would call an n8n webhook or edge function
    setTimeout(() => {
      const newLeads: GeneratedLead[] = [
        { 
          id: `new-${Date.now()}`, 
          company: 'NewTech Solutions', 
          contact: 'Jane Doe', 
          email: 'jane@newtech.com', 
          title: 'Marketing Director', 
          score: 78, 
          grade: 'B', 
          status: 'new', 
          source: 'b2b' 
        },
      ];
      setGeneratedLeads(prev => [...newLeads, ...prev]);
      setIsGenerating(false);
      toast({ title: 'Leads generated successfully', description: `${newLeads.length} new leads found` });
    }, 3000);
  };

  const handleDiscard = (leadId: string) => {
    setGeneratedLeads(leads => leads.filter(l => l.id !== leadId));
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    toast({ 
      title: isMonitoring ? 'Monitoring stopped' : 'Monitoring started',
      description: isMonitoring ? 'Intent signal detection paused' : 'Checking for buying signals every 5 minutes'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Auto Lead Gen
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered lead generation and intent detection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Credits Meter */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="font-bold">{credits.remaining} / {credits.total}</p>
              </div>
              <div className="w-24">
                <Progress value={(credits.remaining / credits.total) * 100} className="h-2" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="b2b" className="flex-1">B2B Leads</TabsTrigger>
              <TabsTrigger value="intent" className="flex-1">Intent Signals</TabsTrigger>
            </TabsList>

            {/* B2B Lead Generation */}
            <TabsContent value="b2b" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    B2B Lead Generation
                  </CardTitle>
                  <CardDescription>Find and enrich business leads automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Industry Selection */}
                  <div className="space-y-2">
                    <Label>Industries</Label>
                    <div className="flex flex-wrap gap-2">
                      {industries.slice(0, 6).map(industry => (
                        <Badge
                          key={industry}
                          variant={selectedIndustries.includes(industry) ? 'default' : 'outline'}
                          className="cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedIndustries(prev =>
                              prev.includes(industry)
                                ? prev.filter(i => i !== industry)
                                : [...prev, industry]
                            );
                          }}
                        >
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                    <Label>Keywords</Label>
                    <Input 
                      placeholder="e.g., SaaS, AI, automation"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-9"
                        placeholder="e.g., United States, California"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Company Size */}
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Titles */}
                  <div className="space-y-2">
                    <Label>Target Job Titles</Label>
                    <Input 
                      placeholder="e.g., CEO, CTO, VP Sales"
                      value={jobTitles}
                      onChange={(e) => setJobTitles(e.target.value)}
                    />
                  </div>

                  {/* Generate Count */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Number of Leads</Label>
                      <span className="text-sm font-medium">{generateCount[0]}</span>
                    </div>
                    <Slider
                      value={generateCount}
                      onValueChange={setGenerateCount}
                      min={1}
                      max={25}
                      step={1}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate {generateCount[0]} Leads
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Intent Signal Detection */}
            <TabsContent value="intent" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Intent-Based Leads
                  </CardTitle>
                  <CardDescription>Capture leads showing buying intent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform Selection */}
                  <div className="space-y-3">
                    <Label>Monitor Platforms</Label>
                    <div className="space-y-2">
                      {[
                        { key: 'reddit', label: 'Reddit', icon: MessageCircle },
                        { key: 'twitter', label: 'Twitter/X', icon: Twitter },
                        { key: 'forums', label: 'Industry Forums', icon: Globe },
                        { key: 'linkedin', label: 'LinkedIn', icon: Users },
                      ].map(platform => (
                        <div key={platform.key} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <platform.icon className="h-4 w-4" />
                            <span className="text-sm">{platform.label}</span>
                          </div>
                          <Switch
                            checked={platforms[platform.key as keyof typeof platforms]}
                            onCheckedChange={(checked) => 
                              setPlatforms(prev => ({ ...prev, [platform.key]: checked }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intent Keywords */}
                  <div className="space-y-2">
                    <Label>Intent Keywords</Label>
                    <Input 
                      placeholder="e.g., looking for, need help with, recommend"
                      value={intentKeywords}
                      onChange={(e) => setIntentKeywords(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter keywords that indicate buying intent
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    variant={isMonitoring ? 'destructive' : 'default'}
                    onClick={toggleMonitoring}
                  >
                    {isMonitoring ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <Radio className="h-4 w-4 mr-2" />
                        Start Monitoring
                      </>
                    )}
                  </Button>

                  {isMonitoring && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      </div>
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Monitoring active - checking every 5 minutes
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Generated Leads Queue */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Leads Queue</CardTitle>
                  <CardDescription>{generatedLeads.filter(l => l.status !== 'added' && l.status !== 'dismissed').length} leads ready for review</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-3">
                  {generatedLeads.filter(l => l.status !== 'dismissed').map((lead) => (
                    <Card 
                      key={lead.id} 
                      className={cn(
                        'transition-opacity',
                        lead.status === 'added' && 'opacity-50'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{lead.company}</h4>
                              <GradeBadge grade={lead.grade} />
                              <Badge variant={lead.source === 'b2b' ? 'default' : 'secondary'} className="text-xs">
                                {lead.source === 'b2b' ? 'B2B' : 'Intent'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span className="truncate">{lead.contact}</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Briefcase className="h-3 w-3" />
                                <span className="truncate">{lead.title}</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{lead.email}</p>
                            
                            {lead.status === 'enriching' && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Enriching data...</span>
                              </div>
                            )}

                            {lead.status === 'added' && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                                <Check className="h-3 w-3" />
                                <span>Added to pipeline</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-lg font-bold">{lead.score}</p>
                            </div>
                            
                            {lead.status !== 'added' && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleDiscard(lead.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => addToPipelineMutation.mutate(lead)}
                                  disabled={addToPipelineMutation.isPending || lead.status === 'enriching'}
                                >
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Add to Pipeline
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {generatedLeads.filter(l => l.status !== 'dismissed').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No leads in queue</p>
                      <p className="text-sm mt-1">Generate leads to get started</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
