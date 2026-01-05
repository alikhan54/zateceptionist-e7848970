import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layers, Sparkles, Phone, MessageSquare, Mail, BarChart3, Plus, Search,
  FlaskConical, Target, Users, Building2, Percent, Settings, Trash2,
  Eye, History, AlertTriangle, CheckCircle, Clock, Zap, Globe, 
  Palette, Bot, FileText, CreditCard
} from 'lucide-react';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetTenants: string[];
  createdAt: string;
  updatedAt: string;
  category: string;
  abTest?: {
    variant: string;
    control: number;
    treatment: number;
  };
}

const mockFeatures: FeatureFlag[] = [
  { 
    id: 'sales_module', 
    name: 'Sales Module', 
    description: 'Enable sales pipeline, leads, and deal management', 
    enabled: true, 
    rolloutPercentage: 100, 
    targetTenants: [],
    createdAt: '2024-01-15',
    updatedAt: '2024-03-10',
    category: 'modules'
  },
  { 
    id: 'marketing_module', 
    name: 'Marketing Module', 
    description: 'Enable campaigns, content studio, and automation', 
    enabled: true, 
    rolloutPercentage: 100, 
    targetTenants: [],
    createdAt: '2024-01-15',
    updatedAt: '2024-03-10',
    category: 'modules'
  },
  { 
    id: 'hr_module', 
    name: 'HR Module', 
    description: 'Enable employee management, payroll, and recruitment', 
    enabled: true, 
    rolloutPercentage: 100, 
    targetTenants: [],
    createdAt: '2024-01-15',
    updatedAt: '2024-03-10',
    category: 'modules'
  },
  { 
    id: 'voice_ai', 
    name: 'Voice AI', 
    description: 'AI-powered voice calling and transcription', 
    enabled: true, 
    rolloutPercentage: 85, 
    targetTenants: [],
    createdAt: '2024-02-01',
    updatedAt: '2024-03-12',
    category: 'communications'
  },
  { 
    id: 'whatsapp_integration', 
    name: 'WhatsApp Integration', 
    description: 'Enable WhatsApp Business API messaging', 
    enabled: false, 
    rolloutPercentage: 0, 
    targetTenants: ['TechCorp', 'HealthFirst'],
    createdAt: '2024-02-15',
    updatedAt: '2024-03-01',
    category: 'communications'
  },
  { 
    id: 'ai_lead_scoring', 
    name: 'AI Lead Scoring', 
    description: 'Machine learning-based lead scoring', 
    enabled: true, 
    rolloutPercentage: 50, 
    targetTenants: [],
    createdAt: '2024-03-01',
    updatedAt: '2024-03-14',
    category: 'ai',
    abTest: { variant: 'v2', control: 48, treatment: 52 }
  },
  { 
    id: 'new_dashboard', 
    name: 'New Dashboard Design', 
    description: 'Redesigned analytics dashboard with improved UX', 
    enabled: true, 
    rolloutPercentage: 25, 
    targetTenants: [],
    createdAt: '2024-03-10',
    updatedAt: '2024-03-14',
    category: 'ui',
    abTest: { variant: 'redesign', control: 72, treatment: 28 }
  },
  { 
    id: 'stripe_billing', 
    name: 'Stripe Billing', 
    description: 'Enable Stripe for payment processing', 
    enabled: true, 
    rolloutPercentage: 100, 
    targetTenants: [],
    createdAt: '2024-01-20',
    updatedAt: '2024-02-15',
    category: 'billing'
  },
];

const categories = [
  { id: 'all', label: 'All Features', icon: Layers },
  { id: 'modules', label: 'Modules', icon: BarChart3 },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'ai', label: 'AI Features', icon: Bot },
  { id: 'ui', label: 'UI/UX', icon: Palette },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const tenantOptions = ['TechCorp', 'RetailPlus', 'HealthFirst', 'LegalEase', 'StartupXYZ', 'EduLearn'];

export default function FeatureFlags() {
  const [features, setFeatures] = useState(mockFeatures);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureFlag | null>(null);

  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || feature.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const updateRollout = (id: string, percentage: number) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, rolloutPercentage: percentage } : f
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'modules': return <BarChart3 className="h-4 w-4" />;
      case 'communications': return <MessageSquare className="h-4 w-4" />;
      case 'ai': return <Bot className="h-4 w-4" />;
      case 'ui': return <Palette className="h-4 w-4" />;
      case 'billing': return <CreditCard className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground mt-1">Control feature rollouts and experiments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Feature Flag</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription>Add a new feature flag to control rollouts</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Feature ID *</Label>
                <Input placeholder="e.g., new_checkout_flow" />
                <p className="text-xs text-muted-foreground">Unique identifier (snake_case)</p>
              </div>
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input placeholder="e.g., New Checkout Flow" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe what this feature does..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Enable immediately</Label>
                <Switch />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => setShowAddDialog(false)}>Create Flag</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flags</p>
                <p className="text-2xl font-bold">{features.length}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enabled</p>
                <p className="text-2xl font-bold text-chart-2">{features.filter(f => f.enabled).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A/B Tests</p>
                <p className="text-2xl font-bold text-primary">{features.filter(f => f.abTest).length}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gradual Rollouts</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {features.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length}
                </p>
              </div>
              <Percent className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search features..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.id)}
                  className="whitespace-nowrap"
                >
                  <cat.icon className="h-4 w-4 mr-2" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature List */}
      <div className="space-y-4">
        {filteredFeatures.map((feature) => (
          <Card key={feature.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    feature.enabled ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {getCategoryIcon(feature.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{feature.name}</h3>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{feature.id}</code>
                      {feature.abTest && (
                        <Badge variant="secondary" className="gap-1">
                          <FlaskConical className="h-3 w-3" />
                          A/B Test
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm">
                      {/* Rollout Percentage */}
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Rollout:</span>
                        <div className="w-32">
                          <Slider
                            value={[feature.rolloutPercentage]}
                            max={100}
                            step={5}
                            onValueChange={([value]) => updateRollout(feature.id, value)}
                            disabled={!feature.enabled}
                          />
                        </div>
                        <span className="font-medium w-12">{feature.rolloutPercentage}%</span>
                      </div>

                      {/* Target Tenants */}
                      {feature.targetTenants.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Targeted:</span>
                          {feature.targetTenants.map(tenant => (
                            <Badge key={tenant} variant="outline">{tenant}</Badge>
                          ))}
                        </div>
                      )}

                      {/* A/B Test Results */}
                      {feature.abTest && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Results:</span>
                          <span className="text-chart-2">Control: {feature.abTest.control}%</span>
                          <span className="text-primary">Treatment: {feature.abTest.treatment}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Updated {feature.updatedAt}</p>
                  </div>
                  <Switch 
                    checked={feature.enabled} 
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedFeature(feature)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Detail Dialog */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedFeature?.name}</DialogTitle>
            <DialogDescription>Configure feature settings and targeting</DialogDescription>
          </DialogHeader>

          {selectedFeature && (
            <Tabs defaultValue="settings">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
                <TabsTrigger value="abtest">A/B Test</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Feature Enabled</Label>
                    <p className="text-sm text-muted-foreground">Toggle this feature on or off</p>
                  </div>
                  <Switch checked={selectedFeature.enabled} />
                </div>
                <div className="space-y-2">
                  <Label>Rollout Percentage</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[selectedFeature.rolloutPercentage]}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="font-medium w-12">{selectedFeature.rolloutPercentage}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea defaultValue={selectedFeature.description} />
                </div>
              </TabsContent>

              <TabsContent value="targeting" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Target Specific Tenants</Label>
                  <p className="text-sm text-muted-foreground">
                    Override the rollout percentage for specific tenants
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {tenantOptions.map(tenant => (
                      <div key={tenant} className="flex items-center gap-2 p-2 border rounded-lg">
                        <Switch checked={selectedFeature.targetTenants.includes(tenant)} />
                        <span>{tenant}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="abtest" className="space-y-4 mt-4">
                {selectedFeature.abTest ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Current Experiment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Control Group</p>
                          <p className="text-2xl font-bold">{selectedFeature.abTest.control}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Treatment Group</p>
                          <p className="text-2xl font-bold text-primary">{selectedFeature.abTest.treatment}%</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      View Full Results
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No A/B test configured</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create A/B Test
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {[
                    { action: 'Rollout increased to 50%', user: 'admin@system.com', time: '2 days ago' },
                    { action: 'Feature enabled', user: 'admin@system.com', time: '1 week ago' },
                    { action: 'Feature created', user: 'admin@system.com', time: '2 weeks ago' },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.action}</p>
                        <p className="text-xs text-muted-foreground">by {event.user}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Flag
            </Button>
            <Button onClick={() => setSelectedFeature(null)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
