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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Play, Pause, Settings2, Building2, MapPin, Users, 
  Briefcase, Search, Plus, X, Check, AlertCircle, Globe,
  MessageCircle, Twitter, Radio, Zap, Target, TrendingUp,
  Clock, Loader2, RefreshCw
} from 'lucide-react';
import { GradeBadge } from '@/components/shared';

export default function AutoLeadGen() {
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

  // Mock generated leads
  const [generatedLeads, setGeneratedLeads] = useState([
    { id: '1', company: 'TechStartup Inc', contact: 'John Smith', email: 'john@techstartup.com', title: 'CTO', score: 85, grade: 'A', status: 'new', source: 'b2b' },
    { id: '2', company: 'GrowthCo', contact: 'Sarah Lee', email: 'sarah@growthco.com', title: 'VP Sales', score: 72, grade: 'B', status: 'new', source: 'b2b' },
    { id: '3', company: 'DataFlow', contact: 'Mike Johnson', email: 'mike@dataflow.io', title: 'CEO', score: 91, grade: 'A', status: 'enriching', source: 'b2b' },
    { id: '4', company: 'CloudNine', contact: 'Emily Chen', email: 'emily@cloudnine.com', title: 'Head of Growth', score: 68, grade: 'B', status: 'new', source: 'intent' },
    { id: '5', company: 'ScaleUp Ltd', contact: 'Alex Brown', email: 'alex@scaleup.io', title: 'Director', score: 55, grade: 'C', status: 'new', source: 'intent' },
  ]);

  // Usage/Credits
  const credits = {
    used: 347,
    total: 500,
    remaining: 153
  };

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Manufacturing',
    'Real Estate', 'Education', 'Marketing', 'Legal', 'Consulting'
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // Add mock leads
    }, 3000);
  };

  const handleAddToPipeline = (leadId: string) => {
    setGeneratedLeads(leads => 
      leads.map(l => l.id === leadId ? { ...l, status: 'added' } : l)
    );
  };

  const handleDiscard = (leadId: string) => {
    setGeneratedLeads(leads => leads.filter(l => l.id !== leadId));
  };

  return (
    <div className="space-y-6">
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
                          className="cursor-pointer"
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
                      min={10}
                      max={100}
                      step={5}
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

                  {/* Sentiment Filter */}
                  <div className="space-y-2">
                    <Label>Sentiment Filter</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">Positive Only</SelectItem>
                        <SelectItem value="neutral">Neutral & Positive</SelectItem>
                        <SelectItem value="frustrated">Frustrated (High Intent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full" 
                    variant={isMonitoring ? 'destructive' : 'default'}
                    onClick={() => setIsMonitoring(!isMonitoring)}
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
                  <CardDescription>{generatedLeads.length} leads ready for review</CardDescription>
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
                  {generatedLeads.map((lead) => (
                    <Card key={lead.id} className={lead.status === 'added' ? 'opacity-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{lead.company}</h4>
                              <GradeBadge grade={lead.grade as 'A' | 'B' | 'C' | 'D'} />
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
                            
                            {/* Enrichment Status */}
                            {lead.status === 'enriching' && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Enriching data...</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {/* Score */}
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-lg font-bold">{lead.score}</p>
                            </div>
                            
                            {/* Actions */}
                            {lead.status === 'added' ? (
                              <Badge variant="outline" className="text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Added
                              </Badge>
                            ) : (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAddToPipeline(lead.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDiscard(lead.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {generatedLeads.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No leads in queue</p>
                      <p className="text-sm">Configure your filters and generate leads</p>
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
