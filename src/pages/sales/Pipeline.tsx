import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Filter, Search, MoreHorizontal, Phone, Mail, Calendar,
  DollarSign, Clock, Building2, User, AlertTriangle, GripVertical,
  ArrowRight, MessageSquare, FileText, Check, X, TrendingUp, RefreshCw
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface Deal {
  id: string;
  name: string;
  customer_name?: string;
  customer_id?: string;
  value: number;
  probability: number;
  stage: string;
  owner_id?: string;
  owner_name?: string;
  next_action?: string;
  notes?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  expected_close_date?: string;
}

interface DealCardProps {
  deal: Deal & { daysInStage: number; isStale: boolean };
  onClick: () => void;
  onQuickAction: (action: string) => void;
}

function DealCard({ deal, onClick, onQuickAction }: DealCardProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer hover:shadow-md transition-all group',
        deal.isStale && 'border-orange-300 dark:border-orange-700'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{deal.name}</h4>
            {deal.customer_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{deal.customer_name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-green-600">${(deal.value || 0).toLocaleString()}</span>
          <Badge variant="secondary" className="text-xs">{deal.probability || 0}%</Badge>
        </div>

        {deal.isStale && (
          <div className="flex items-center gap-1 text-xs text-orange-600 mb-2">
            <AlertTriangle className="h-3 w-3" />
            <span>Stale for {deal.daysInStage} days</span>
          </div>
        )}

        {deal.next_action && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{deal.next_action}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{deal.daysInStage}d</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onQuickAction('call'); }}>
              <Phone className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onQuickAction('email'); }}>
              <Mail className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onQuickAction('schedule'); }}>
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadPipeline() {
  const { tenantId, getDealStages } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const stages = getDealStages();
  
  const [selectedDeal, setSelectedDeal] = useState<(Deal & { daysInStage: number; isStale: boolean }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addToStage, setAddToStage] = useState<string | null>(null);
  const [newDeal, setNewDeal] = useState({
    name: '',
    customer_name: '',
    value: '',
    probability: '50',
    stage: '',
    next_action: '',
    notes: '',
  });

  // Fetch deals from database
  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['pipeline-deals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((deal: any) => {
        const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at || deal.created_at));
        return {
          ...deal,
          daysInStage,
          isStale: daysInStage > 14,
        };
      });
    },
    enabled: !!tenantId,
  });

  // Add deal mutation
  const addDealMutation = useMutation({
    mutationFn: async (dealData: typeof newDeal) => {
      const { data, error } = await supabase
        .from('deals')
        .insert({
          tenant_id: tenantId,
          name: dealData.name,
          customer_name: dealData.customer_name || null,
          value: parseFloat(dealData.value) || 0,
          probability: parseInt(dealData.probability) || 50,
          stage: dealData.stage || addToStage || stages[0],
          next_action: dealData.next_action || null,
          notes: dealData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals', tenantId] });
      toast({ title: 'Deal created successfully' });
      setIsAddDialogOpen(false);
      setAddToStage(null);
      setNewDeal({ name: '', customer_name: '', value: '', probability: '50', stage: '', next_action: '', notes: '' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create deal', description: error.message, variant: 'destructive' });
    },
  });

  // Update deal stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', dealId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals', tenantId] });
      toast({ title: 'Deal updated' });
    },
  });

  // Mark as won/lost mutation
  const markDealMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: 'Won' | 'Lost' }) => {
      const { error } = await supabase
        .from('deals')
        .update({ 
          stage, 
          updated_at: new Date().toISOString(),
          actual_close_date: new Date().toISOString(),
        })
        .eq('id', dealId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: (_, { stage }) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals', tenantId] });
      toast({ title: `Deal marked as ${stage}` });
      setSelectedDeal(null);
    },
  });

  const getDealsForStage = useCallback((stageId: string) => {
    return deals.filter((deal: Deal) => deal.stage === stageId);
  }, [deals]);

  const getStageTotal = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum: number, deal: Deal) => sum + (deal.value || 0), 0);
  };

  const getWeightedValue = (stageId: string) => {
    return getDealsForStage(stageId).reduce((sum: number, deal: Deal) => sum + ((deal.value || 0) * (deal.probability || 0) / 100), 0);
  };

  const handleAddDeal = (stage?: string) => {
    if (stage) {
      setAddToStage(stage);
      setNewDeal(prev => ({ ...prev, stage }));
    }
    setIsAddDialogOpen(true);
  };

  const totalValue = deals.reduce((sum: number, d: Deal) => sum + (d.value || 0), 0);
  const weightedValue = deals.reduce((sum: number, d: Deal) => sum + ((d.value || 0) * (d.probability || 0) / 100), 0);
  const staleDeals = deals.filter((d: any) => d.isStale).length;

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
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button onClick={() => handleAddDeal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pipeline</p>
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Weighted Value</p>
            <p className="text-2xl font-bold text-green-600">${Math.round(weightedValue).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Deals</p>
            <p className="text-2xl font-bold">{deals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Stale Deals</p>
            <p className="text-2xl font-bold text-orange-500">{staleDeals}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {stages.map((stage, index) => {
            const stageColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#10b981', '#ef4444'];
            const stageColor = stageColors[index % stageColors.length];
            const stageDeals = getDealsForStage(stage);
            const stageTotal = getStageTotal(stage);
            const weighted = getWeightedValue(stage);
            
            return (
              <div key={stage} className="w-72 flex-shrink-0">
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${stageColor}15` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stageColor }} />
                      <h3 className="font-semibold text-sm">{stage}</h3>
                      <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddDeal(stage)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>${stageTotal.toLocaleString()}</span>
                    <span className="text-green-600">${Math.round(weighted).toLocaleString()} weighted</span>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-3 pr-2">
                    {isLoading ? (
                      [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                    ) : stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <p>No deals in this stage</p>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleAddDeal(stage)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Deal
                        </Button>
                      </div>
                    ) : (
                      stageDeals.map((deal: any) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onClick={() => setSelectedDeal(deal)}
                          onQuickAction={(action) => toast({ title: `${action} action clicked` })}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Deal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Deal</DialogTitle>
            <DialogDescription>Create a new deal in your pipeline</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Deal Name *</Label>
              <Input
                value={newDeal.name}
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                placeholder="Enterprise Package"
              />
            </div>
            <div className="grid gap-2">
              <Label>Customer/Company</Label>
              <Input
                value={newDeal.customer_name}
                onChange={(e) => setNewDeal({ ...newDeal, customer_name: e.target.value })}
                placeholder="Acme Inc"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Value ($)</Label>
                <Input
                  type="number"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  placeholder="10000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  value={newDeal.probability}
                  onChange={(e) => setNewDeal({ ...newDeal, probability: e.target.value })}
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select value={newDeal.stage || addToStage || ''} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Next Action</Label>
              <Input
                value={newDeal.next_action}
                onChange={(e) => setNewDeal({ ...newDeal, next_action: e.target.value })}
                placeholder="Schedule discovery call"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addDealMutation.mutate(newDeal)} disabled={!newDeal.name || addDealMutation.isPending}>
              {addDealMutation.isPending ? 'Creating...' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Sheet */}
      <Sheet open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedDeal?.name}</SheetTitle>
            <SheetDescription>{selectedDeal?.customer_name}</SheetDescription>
          </SheetHeader>
          
          {selectedDeal && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Value</p>
                    <p className="text-xl font-bold text-green-600">${(selectedDeal.value || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Probability</p>
                    <p className="text-xl font-bold">{selectedDeal.probability || 0}%</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Deal Progress</h4>
                <Progress value={selectedDeal.probability || 0} className="h-2" />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Move to Stage</h4>
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => (
                    <Button
                      key={stage}
                      variant={selectedDeal.stage === stage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStageMutation.mutate({ dealId: selectedDeal.id, stage })}
                      disabled={updateStageMutation.isPending}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
              </div>

              <Tabs defaultValue="activity">
                <TabsList className="w-full">
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="activity" className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Deal created</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedDeal.created_at ? format(new Date(selectedDeal.created_at), 'MMM d, yyyy') : '-'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4 space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Stage</span>
                    <span className="text-sm font-medium">{selectedDeal.stage}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Days in Stage</span>
                    <span className="text-sm font-medium">{selectedDeal.daysInStage}</span>
                  </div>
                  {selectedDeal.next_action && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Next Action</span>
                      <span className="text-sm font-medium">{selectedDeal.next_action}</span>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  {selectedDeal.notes ? (
                    <p className="text-sm">{selectedDeal.notes}</p>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notes yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => markDealMutation.mutate({ dealId: selectedDeal.id, stage: 'Won' })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Won
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => markDealMutation.mutate({ dealId: selectedDeal.id, stage: 'Lost' })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Lost
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
