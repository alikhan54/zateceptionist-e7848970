import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Filter, Search, MoreHorizontal, Phone, Mail, Calendar,
  DollarSign, Clock, Building2, User, AlertTriangle, GripVertical,
  ArrowRight, MessageSquare, FileText
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useDeals, Deal } from '@/hooks/useDeals';

interface DealCardProps {
  deal: {
    id: string;
    name: string;
    company: string;
    value: number;
    probability: number;
    daysInStage: number;
    owner: { name: string; avatar?: string };
    nextAction?: string;
    isStale?: boolean;
  };
  onClick: () => void;
}

function DealCard({ deal, onClick }: DealCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all ${deal.isStale ? 'border-orange-300 dark:border-orange-700' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{deal.name}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{deal.company}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-green-600">${deal.value.toLocaleString()}</span>
          <Badge variant="secondary" className="text-xs">{deal.probability}%</Badge>
        </div>

        {deal.isStale && (
          <div className="flex items-center gap-1 text-xs text-orange-600 mb-2">
            <AlertTriangle className="h-3 w-3" />
            <span>Stale for {deal.daysInStage} days</span>
          </div>
        )}

        {deal.nextAction && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{deal.nextAction}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={deal.owner.avatar} />
              <AvatarFallback className="text-[10px]">
                {deal.owner.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{deal.owner.name.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
              <Phone className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
              <Mail className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadPipeline() {
  const { getDealStages } = useTenant();
  const stages = getDealStages();
  const [selectedDeal, setSelectedDeal] = useState<typeof mockDeals[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Mock deals data
  const mockDeals = [
    { id: '1', name: 'Enterprise Package', company: 'TechCorp Inc', value: 45000, probability: 75, daysInStage: 5, owner: { name: 'Sarah Johnson' }, nextAction: 'Send final proposal', stage: 'proposal', isStale: false },
    { id: '2', name: 'Annual Subscription', company: 'GlobalTech', value: 28000, probability: 60, daysInStage: 12, owner: { name: 'Mike Chen' }, nextAction: 'Schedule demo', stage: 'qualified', isStale: false },
    { id: '3', name: 'Premium Support', company: 'StartupXYZ', value: 15000, probability: 40, daysInStage: 18, owner: { name: 'Emily Davis' }, nextAction: 'Follow up call', stage: 'lead', isStale: true },
    { id: '4', name: 'Custom Integration', company: 'Acme Corp', value: 65000, probability: 85, daysInStage: 3, owner: { name: 'Sarah Johnson' }, nextAction: 'Contract review', stage: 'negotiation', isStale: false },
    { id: '5', name: 'Starter Plan', company: 'NewCo Ltd', value: 8500, probability: 30, daysInStage: 2, owner: { name: 'Alex Thompson' }, nextAction: 'Qualify lead', stage: 'lead', isStale: false },
    { id: '6', name: 'Team License', company: 'MegaCorp', value: 32000, probability: 55, daysInStage: 8, owner: { name: 'Mike Chen' }, nextAction: 'Send quote', stage: 'qualified', isStale: false },
    { id: '7', name: 'API Access', company: 'DevShop', value: 12000, probability: 70, daysInStage: 4, owner: { name: 'Emily Davis' }, nextAction: 'Technical call', stage: 'proposal', isStale: false },
    { id: '8', name: 'Enterprise Deal', company: 'BigCompany', value: 95000, probability: 90, daysInStage: 2, owner: { name: 'Sarah Johnson' }, nextAction: 'Final negotiation', stage: 'negotiation', isStale: false },
  ];

  const getDealsForStage = (stageId: string) => {
    return mockDeals.filter(deal => deal.stage === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum, deal) => sum + deal.value, 0);
  };

  const getWeightedValue = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage and track your deals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search deals..." 
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button><Plus className="h-4 w-4 mr-2" />Add Deal</Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                  <SelectItem value="mike">Mike Chen</SelectItem>
                  <SelectItem value="emily">Emily Davis</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Value Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Values</SelectItem>
                  <SelectItem value="small">$0 - $10K</SelectItem>
                  <SelectItem value="medium">$10K - $50K</SelectItem>
                  <SelectItem value="large">$50K+</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Days in Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="fresh">0-7 days</SelectItem>
                  <SelectItem value="stale">7-14 days</SelectItem>
                  <SelectItem value="old">14+ days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pipeline</p>
            <p className="text-2xl font-bold">${mockDeals.reduce((s, d) => s + d.value, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Weighted Value</p>
            <p className="text-2xl font-bold">${Math.round(mockDeals.reduce((s, d) => s + (d.value * d.probability / 100), 0)).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Deals</p>
            <p className="text-2xl font-bold">{mockDeals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Stale Deals</p>
            <p className="text-2xl font-bold text-orange-500">{mockDeals.filter(d => d.isStale).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {stages.map((stage) => {
            const stageId = typeof stage === 'string' ? stage : stage.id;
            const stageName = typeof stage === 'string' ? stage : stage.name;
            const stageColor = typeof stage === 'string' ? '#3b82f6' : stage.color;
            const stageDeals = getDealsForStage(stageId);
            const stageTotal = getStageTotal(stageId);
            const weightedValue = getWeightedValue(stageId);
            
            return (
              <div key={stageId} className="w-72 flex-shrink-0">
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${stageColor}15` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stageColor }} />
                      <h3 className="font-semibold text-sm">{stageName}</h3>
                      <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>${stageTotal.toLocaleString()}</span>
                    <span className="text-green-600">${Math.round(weightedValue).toLocaleString()} weighted</span>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-3 pr-2">
                    {stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onClick={() => setSelectedDeal(deal)}
                      />
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No deals in this stage
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal Detail Sheet */}
      <Sheet open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedDeal?.name}</SheetTitle>
            <SheetDescription>{selectedDeal?.company}</SheetDescription>
          </SheetHeader>
          
          {selectedDeal && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="text-xl font-bold text-green-600">${selectedDeal.value.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Probability</p>
                    <p className="text-xl font-bold">{selectedDeal.probability}%</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Deal Progress</h4>
                <Progress value={selectedDeal.probability} className="h-2" />
              </div>

              <Tabs defaultValue="activity">
                <TabsList className="w-full">
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="activity" className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Email sent to contact</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Discovery call completed</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    <span className="text-sm font-medium">{selectedDeal.owner.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Days in Stage</span>
                    <span className="text-sm font-medium">{selectedDeal.daysInStage}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Next Action</span>
                    <span className="text-sm font-medium">{selectedDeal.nextAction}</span>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1"><Phone className="h-4 w-4 mr-2" />Call</Button>
                <Button variant="outline" className="flex-1"><Mail className="h-4 w-4 mr-2" />Email</Button>
                <Button variant="outline" className="flex-1"><Calendar className="h-4 w-4 mr-2" />Meet</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
