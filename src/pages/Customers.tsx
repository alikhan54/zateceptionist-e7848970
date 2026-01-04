import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lead_score: number;
  temperature: 'hot' | 'warm' | 'cold' | null;
  lifecycle_stage: string | null;
  handler_type: 'ai' | 'human';
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 50;

const temperatureColors = {
  hot: 'bg-destructive text-destructive-foreground',
  warm: 'bg-warning text-warning-foreground',
  cold: 'bg-info text-info-foreground',
};

const lifecycleStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Customer', 'Churned'];
const sources = ['Website', 'Referral', 'Social Media', 'Advertisement', 'Cold Outreach', 'Walk-in', 'Other'];

export default function CustomersPage() {
  const { tenantId, translate, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [handlerFilter, setHandlerFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form state for new customer
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    notes: '',
    tags: [] as string[],
  });

  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      if (temperatureFilter !== 'all') {
        query = query.eq('temperature', temperatureFilter);
      }
      if (stageFilter !== 'all') {
        query = query.eq('lifecycle_stage', stageFilter);
      }
      if (handlerFilter !== 'all') {
        query = query.eq('handler_type', handlerFilter);
      }
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch ${translate('customers').toLowerCase()}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchQuery, temperatureFilter, stageFilter, handlerFilter, sourceFilter, currentPage, translate, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomer = async () => {
    if (!tenantId || !newCustomer.name) return;

    try {
      const { error } = await supabase.from('customers').insert({
        tenant_id: tenantId,
        name: newCustomer.name,
        phone: newCustomer.phone || null,
        email: newCustomer.email || null,
        source: newCustomer.source || null,
        notes: newCustomer.notes || null,
        tags: newCustomer.tags.length > 0 ? newCustomer.tags : null,
        handler_type: 'ai',
        lead_score: 0,
        lifecycle_stage: 'New',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${translate('customer')} added successfully`,
      });

      setIsAddDialogOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', source: '', notes: '', tags: [] });
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: 'Error',
        description: `Failed to add ${translate('customer').toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${translate('customer')} deleted successfully`,
      });

      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Error',
        description: `Failed to delete ${translate('customer').toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleToggleHandler = async (customer: Customer) => {
    if (!tenantId) return;

    try {
      const newHandler = customer.handler_type === 'ai' ? 'human' : 'ai';
      const { error } = await supabase
        .from('customers')
        .update({ handler_type: newHandler })
        .eq('id', customer.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, handler_type: newHandler } : c))
      );

      toast({
        title: 'Handler Updated',
        description: `Now handled by ${newHandler === 'ai' ? 'AI' : 'Human'}`,
      });
    } catch (error) {
      console.error('Error updating handler:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map((c) => c.id));
    }
  };

  const handleExportSelected = () => {
    const selectedData = customers.filter((c) => selectedCustomers.includes(c.id));
    const csv = [
      ['Name', 'Phone', 'Email', 'Score', 'Temperature', 'Stage', 'Handler', 'Source'].join(','),
      ...selectedData.map((c) =>
        [c.name, c.phone, c.email, c.lead_score, c.temperature, c.lifecycle_stage, c.handler_type, c.source].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${translate('customers').toLowerCase()}_export.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
          <h1 className="text-3xl font-bold">{translate('customers')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {translate('customers').toLowerCase()}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add {translate('customer')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New {translate('customer')}</DialogTitle>
              <DialogDescription>
                Enter the {translate('customer').toLowerCase()} details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={newCustomer.source}
                  onValueChange={(value) => setNewCustomer({ ...newCustomer, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomer} disabled={!newCustomer.name}>
                Add {translate('customer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${translate('customers').toLowerCase()}...`}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Temperature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Temps</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {lifecycleStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={handlerFilter} onValueChange={setHandlerFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Handler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Handlers</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="human">Human</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <div className="px-6 pb-3">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedCustomers.length} selected</span>
              <Button variant="outline" size="sm" onClick={handleExportSelected}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                Assign Handler
              </Button>
              <Button variant="outline" size="sm">
                Add to Campaign
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {translate('customers').toLowerCase()} yet</p>
              <p className="text-sm">Add your first {translate('customer').toLowerCase()} to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCustomers.length === customers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{translate('lead')} Score</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Handler</TableHead>
                    <TableHead>Last Interaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id]);
                            } else {
                              setSelectedCustomers(selectedCustomers.filter((id) => id !== customer.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={customer.lead_score} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">{customer.lead_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.temperature ? (
                          <Badge className={temperatureColors[customer.temperature]}>
                            {customer.temperature.toUpperCase()}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.lifecycle_stage || 'New'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={customer.handler_type === 'ai'}
                            onCheckedChange={() => handleToggleHandler(customer)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {customer.handler_type === 'ai' ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(customer.updated_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}{' '}
                {translate('customers').toLowerCase()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedCustomer?.name}</SheetTitle>
            <SheetDescription>
              {translate('customer')} details and history
            </SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="mt-6 space-y-6">
              {/* Profile Summary */}
              <div className="space-y-4">
                <h3 className="font-semibold">Contact Information</h3>
                <div className="grid gap-3">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <h3 className="font-semibold">Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">{translate('lead')} Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={selectedCustomer.lead_score} className="flex-1 h-2" />
                      <span className="font-semibold">{selectedCustomer.lead_score}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    {selectedCustomer.temperature && (
                      <Badge className={`mt-1 ${temperatureColors[selectedCustomer.temperature]}`}>
                        {selectedCustomer.temperature.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Handler Toggle */}
              <div className="space-y-4">
                <h3 className="font-semibold">Handler Assignment</h3>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedCustomer.handler_type === 'ai' ? (
                      <Bot className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                    <span>{selectedCustomer.handler_type === 'ai' ? 'AI Handler' : 'Human Handler'}</span>
                  </div>
                  <Switch
                    checked={selectedCustomer.handler_type === 'ai'}
                    onCheckedChange={() => handleToggleHandler(selectedCustomer)}
                  />
                </div>
              </div>

              {/* Recent Activity Placeholder */}
              <div className="space-y-4">
                <h3 className="font-semibold">Recent Activity</h3>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
