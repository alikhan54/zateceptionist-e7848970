import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntegrationsV2, IntegrationWithStatus } from '@/hooks/useIntegrationsV2';
import { IntegrationCard, IntegrationDialog } from '@/components/integrations';
import { INTEGRATIONS, getIntegrationsGroupedByCategory } from '@/config/integrations';
import { 
  Integration, 
  IntegrationCategory, 
  INTEGRATION_CATEGORIES 
} from '@/types/integrations';
import { useTenant } from '@/contexts/TenantContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  Plug,
  Sparkles,
  Activity,
  CreditCard,
  MessageSquare,
  Calendar,
  Users,
  Headphones,
  ShoppingCart,
  Brain,
  Zap,
  BarChart3,
  FileText,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Map category icons
const CATEGORY_ICONS: Record<IntegrationCategory, React.ComponentType<{ className?: string }>> = {
  communication: MessageSquare,
  scheduling: Calendar,
  payments: CreditCard,
  crm: Users,
  support: Headphones,
  ecommerce: ShoppingCart,
  ai: Brain,
  productivity: Zap,
  analytics: BarChart3,
  forms: FileText,
};

export default function Integrations() {
  const { tenantConfig } = useTenant();
  const { tier } = useSubscription();
  const {
    integrations,
    isLoading,
    connectIntegration,
    disconnectIntegration,
    testConnection,
    getWebhookUrl,
    getStoredCredentials,
    getStoredSettings,
    connectedCount,
    totalCount,
  } = useIntegrationsV2();

  // UI State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  // Dialog state
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationWithStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter(integration => {
      // Search filter
      const matchesSearch = !search || 
        integration.name.toLowerCase().includes(search.toLowerCase()) ||
        integration.description.toLowerCase().includes(search.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'connected' && integration.status === 'connected') ||
        (statusFilter === 'disconnected' && integration.status !== 'connected');

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [integrations, search, categoryFilter, statusFilter]);

  // Group by category
  const groupedIntegrations = useMemo(() => {
    const groups: Record<IntegrationCategory, IntegrationWithStatus[]> = {
      communication: [],
      scheduling: [],
      payments: [],
      crm: [],
      support: [],
      ecommerce: [],
      ai: [],
      productivity: [],
      analytics: [],
      forms: [],
    };

    filteredIntegrations.forEach(integration => {
      groups[integration.category].push(integration);
    });

    return groups;
  }, [filteredIntegrations]);

  // Toggle category
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Handle connect/configure
  const handleOpenDialog = (integration: IntegrationWithStatus) => {
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedIntegration(null);
  };

  const handleSave = async (credentials: Record<string, string>, settings?: Record<string, any>) => {
    if (!selectedIntegration) return;
    
    await connectIntegration.mutateAsync({
      integrationId: selectedIntegration.id,
      credentials,
      settings,
    });
    
    handleCloseDialog();
  };

  const handleDisconnect = async (integration: IntegrationWithStatus) => {
    await disconnectIntegration.mutateAsync(integration.id);
  };

  const handleTest = async () => {
    if (!selectedIntegration) return;
    await testConnection.mutateAsync(selectedIntegration.id);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = search || categoryFilter !== 'all' || statusFilter !== 'all';

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-muted-foreground">
              Connect your favorite tools and services
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-3">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{connectedCount}</span>
                <span className="text-sm text-muted-foreground">/ {totalCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Connected</p>
            </Card>
            
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium capitalize">{tier}</span>
              </div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(INTEGRATION_CATEGORIES).map(([key, category]) => (
                <SelectItem key={key} value={key}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <Activity className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Not Connected</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredIntegrations.length} of {totalCount} integrations
            </span>
          </div>
        )}

        {/* Integration Categories */}
        <div className="space-y-4">
          {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => {
            if (categoryIntegrations.length === 0) return null;
            
            const categoryInfo = INTEGRATION_CATEGORIES[category as IntegrationCategory];
            const CategoryIcon = CATEGORY_ICONS[category as IntegrationCategory];
            const isOpen = openCategories[category] !== false; // Default open

            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${categoryInfo.color}20` }}
                      >
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold">{categoryInfo.label}</h2>
                        <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {categoryIntegrations.filter(i => i.status === 'connected').length} / {categoryIntegrations.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180'
                    )} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <AnimatePresence mode="wait">
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'pt-4',
                        viewMode === 'grid' 
                          ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                          : 'space-y-3'
                      )}
                    >
                      {categoryIntegrations.map((integration) => (
                        <IntegrationCard
                          key={integration.id}
                          integration={integration}
                          onConnect={() => handleOpenDialog(integration)}
                          onDisconnect={() => handleDisconnect(integration)}
                          onConfigure={() => handleOpenDialog(integration)}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No integrations found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Integration Dialog */}
        <IntegrationDialog
          integration={selectedIntegration}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          onTest={handleTest}
          storedCredentials={selectedIntegration ? getStoredCredentials(selectedIntegration) : {}}
          storedSettings={selectedIntegration ? getStoredSettings(selectedIntegration.id) : {}}
          webhookUrl={selectedIntegration ? getWebhookUrl(selectedIntegration.id) : undefined}
          isConnected={selectedIntegration?.status === 'connected'}
          isSaving={connectIntegration.isPending}
          isTesting={testConnection.isPending}
        />
      </div>
    </TooltipProvider>
  );
}
