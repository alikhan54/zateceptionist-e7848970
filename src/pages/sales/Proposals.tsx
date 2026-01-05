import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, Plus, Search, MoreHorizontal, Download, Eye, Send,
  Copy, Trash2, Clock, CheckCircle2, XCircle, DollarSign,
  Building2, User, Calendar, Link2, BarChart3, Edit,
  FileSignature, Layers
} from 'lucide-react';

interface Proposal {
  id: string;
  name: string;
  company: string;
  contact: string;
  value: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  viewTime?: number;
  expiresAt?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  sections: string[];
  useCount: number;
}

export default function Proposals() {
  const [activeTab, setActiveTab] = useState('proposals');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Mock proposals
  const proposals: Proposal[] = [
    { 
      id: '1', 
      name: 'Enterprise Package Proposal', 
      company: 'TechCorp Inc', 
      contact: 'John Smith',
      value: 45000, 
      status: 'viewed', 
      createdAt: '2024-01-15',
      sentAt: '2024-01-16',
      viewedAt: '2024-01-17',
      viewTime: 12,
      expiresAt: '2024-02-15'
    },
    { 
      id: '2', 
      name: 'Annual Subscription', 
      company: 'GlobalTech', 
      contact: 'Sarah Lee',
      value: 28000, 
      status: 'sent', 
      createdAt: '2024-01-18',
      sentAt: '2024-01-18',
      expiresAt: '2024-02-18'
    },
    { 
      id: '3', 
      name: 'Custom Integration', 
      company: 'Acme Corp', 
      contact: 'Mike Johnson',
      value: 65000, 
      status: 'accepted', 
      createdAt: '2024-01-10',
      sentAt: '2024-01-11',
      viewedAt: '2024-01-12'
    },
    { 
      id: '4', 
      name: 'Starter Plan', 
      company: 'NewCo Ltd', 
      contact: 'Emily Chen',
      value: 8500, 
      status: 'draft', 
      createdAt: '2024-01-20'
    },
    { 
      id: '5', 
      name: 'Team License', 
      company: 'MegaCorp', 
      contact: 'Alex Brown',
      value: 32000, 
      status: 'declined', 
      createdAt: '2024-01-05',
      sentAt: '2024-01-06',
      viewedAt: '2024-01-08'
    },
  ];

  // Mock templates
  const templates: Template[] = [
    { 
      id: '1', 
      name: 'Standard Proposal', 
      description: 'Basic proposal for standard offerings',
      sections: ['Executive Summary', 'Solution Overview', 'Pricing', 'Terms'],
      useCount: 45
    },
    { 
      id: '2', 
      name: 'Enterprise Proposal', 
      description: 'Comprehensive proposal for enterprise deals',
      sections: ['Executive Summary', 'Business Case', 'Solution Architecture', 'Implementation', 'Pricing', 'SLA', 'Terms'],
      useCount: 23
    },
    { 
      id: '3', 
      name: 'Quick Quote', 
      description: 'Simple quote for straightforward deals',
      sections: ['Introduction', 'Pricing', 'Terms'],
      useCount: 78
    },
  ];

  const getStatusBadge = (status: Proposal['status']) => {
    const config: Record<Proposal['status'], { variant: 'outline' | 'secondary' | 'default' | 'destructive'; icon: typeof FileText; className?: string }> = {
      draft: { variant: 'outline', icon: FileText },
      sent: { variant: 'secondary', icon: Send },
      viewed: { variant: 'default', icon: Eye },
      accepted: { variant: 'default', icon: CheckCircle2, className: 'bg-green-500' },
      declined: { variant: 'destructive', icon: XCircle },
    };
    const { variant, icon: Icon, className } = config[status];
    return (
      <Badge variant={variant} className={className || ''}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const stats = {
    total: proposals.length,
    sent: proposals.filter(p => ['sent', 'viewed', 'accepted', 'declined'].includes(p.status)).length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    totalValue: proposals.reduce((sum, p) => sum + p.value, 0),
    acceptedValue: proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + p.value, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-1">Create, track, and manage sales proposals</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Proposals</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Won Value</p>
            <p className="text-2xl font-bold text-green-600">${stats.acceptedValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="proposals">All Proposals</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proposals</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search proposals..." 
                      className="pl-9 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map(proposal => (
                    <TableRow key={proposal.id} className="cursor-pointer" onClick={() => setSelectedProposal(proposal)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-muted">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{proposal.name}</p>
                            <p className="text-sm text-muted-foreground">{proposal.contact}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {proposal.company}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          ${proposal.value.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                      <TableCell>{proposal.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary">{template.useCount} uses</Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.sections.slice(0, 4).map(section => (
                      <Badge key={section} variant="outline" className="text-xs">{section}</Badge>
                    ))}
                    {template.sections.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{template.sections.length - 4}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <Plus className="h-4 w-4 mr-1" />
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add Template Card */}
            <Card className="border-dashed hover:border-primary cursor-pointer">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center">
                <div className="p-3 rounded-full bg-muted mb-3">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Create Template</h3>
                <p className="text-sm text-muted-foreground">Build a new proposal template</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tracking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Tracking</CardTitle>
              <CardDescription>Monitor how recipients interact with your proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposals.filter(p => p.status !== 'draft').map(proposal => (
                  <div key={proposal.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{proposal.name}</h4>
                        <p className="text-sm text-muted-foreground">{proposal.company}</p>
                      </div>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Sent</p>
                        <p className="font-medium">{proposal.sentAt || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">First Viewed</p>
                        <p className="font-medium">{proposal.viewedAt || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time Spent</p>
                        <p className="font-medium">{proposal.viewTime ? `${proposal.viewTime} min` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium">{proposal.expiresAt || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proposal Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proposal Name</Label>
                <Input placeholder="e.g., Enterprise Package Proposal" />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input placeholder="Company name" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input placeholder="Contact name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sections</Label>
              <div className="border rounded-lg p-4 space-y-3">
                {['Executive Summary', 'Solution Overview', 'Pricing', 'Terms & Conditions'].map((section, i) => (
                  <div key={section} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="cursor-grab text-muted-foreground">⋮⋮</div>
                    <span className="flex-1">{section}</span>
                    <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pricing Table</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Input placeholder="Item name" /></TableCell>
                    <TableCell><Input placeholder="Description" /></TableCell>
                    <TableCell><Input type="number" placeholder="1" className="w-16" /></TableCell>
                    <TableCell><Input type="number" placeholder="0" className="w-24" /></TableCell>
                    <TableCell>$0</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
              <Button variant="outline">Save as Draft</Button>
              <Button>Create & Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
