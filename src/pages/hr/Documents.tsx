import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { useHRDocuments } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  FileText, 
  Upload,
  Download,
  Search,
  Eye,
  Share2,
  FolderOpen,
  File,
  FileCheck,
  Clock,
  MoreHorizontal,
  Plus,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { toast } from 'sonner';

// document_types that auto-sync to AI agents (via 420 HR Policy Sync v1.0)
const SYNCABLE_TYPES = ['policy', 'contract', 'handbook', 'code_of_conduct', 'sop', 'guidelines'];

export default function DocumentsPage() {
  const { t, tenantConfig } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', category: '', content: '' });
  const { data: documents, isLoading, uploadDocument } = useHRDocuments(selectedCategory !== 'all' ? selectedCategory : undefined);

  const displayDocuments = (documents || []).map((doc: any) => ({
    ...doc,
    name: doc.name ?? doc.title ?? doc.document_name ?? 'Untitled',
    file_type: doc.file_type ?? doc.document_type ?? doc.mime_type ?? '',
    uploaded_by: doc.uploaded_by ?? doc.verified_by ?? '—',
    uploaded_at: doc.uploaded_at ?? doc.created_at ?? '',
    acknowledged: doc.acknowledged ?? !!doc.is_verified,
  }));
  const filteredDocuments = displayDocuments.filter(doc =>
    (selectedCategory === 'all' || doc.category === selectedCategory) &&
    (doc.name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { value: 'all', label: 'All Documents', icon: FolderOpen },
    { value: 'policy', label: 'Policies', icon: FileText },
    { value: 'template', label: 'Templates', icon: File },
    { value: 'personal', label: 'Personal', icon: FileCheck },
    { value: 'contract', label: 'Contracts', icon: FileText },
  ];

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      policy: 'bg-primary/10 text-primary border-primary/20',
      template: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
      personal: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
      contract: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    };
    return (
      <Badge variant="outline" className={styles[category] || styles.policy}>
        {category}
      </Badge>
    );
  };

  const getFileIcon = (fileType: string) => {
    const colors: Record<string, string> = {
      pdf: 'text-destructive',
      docx: 'text-chart-3',
      xlsx: 'text-chart-2',
      default: 'text-muted-foreground',
    };
    return <FileText className={`h-5 w-5 ${colors[fileType] || colors.default}`} />;
  };

  const stats = [
    { label: 'Total Documents', value: displayDocuments.length, icon: FolderOpen, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Policies', value: displayDocuments.filter(d => d.category === 'policy').length, icon: FileText, color: 'text-chart-3', bgColor: 'bg-chart-3/10' },
    { label: 'Pending Acknowledgment', value: displayDocuments.filter(d => !d.acknowledged).length, icon: Clock, color: 'text-chart-4', bgColor: 'bg-chart-4/10' },
    { label: 'Acknowledged', value: displayDocuments.filter(d => d.acknowledged).length, icon: CheckCircle2, color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage HR policies, templates, and personal documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AskAIButton message="Check document expiry status and list overdue renewals" label="AI Document Check" />
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Add a new document to the HR document library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="Enter document name" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newDoc.category} onValueChange={(v) => setNewDoc({ ...newDoc, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="handbook">Handbook</SelectItem>
                    <SelectItem value="code_of_conduct">Code of Conduct</SelectItem>
                    <SelectItem value="sop">SOP</SelectItem>
                    <SelectItem value="guidelines">Guidelines</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {SYNCABLE_TYPES.includes(newDoc.category) && (
                <div className="space-y-2">
                  <Label>Document Content</Label>
                  <Textarea
                    placeholder="Paste the full policy/handbook/contract text here. Our AI will extract rules and train every agent for this tenant."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: ≥ 20 characters required for AI sync. After upload, all active AI agents for your tenant will be updated to reference these rules.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>File (optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    File upload coming soon — for now paste content above (syncable types only).
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!newDoc.name || !newDoc.category} onClick={async () => {
                // hr_documents column is document_name; document_type mirrors category.
                // For syncable types, document_content drives the n8n policy-sync workflow.
                const isSyncable = SYNCABLE_TYPES.includes(newDoc.category);
                try {
                  const created: any = await (uploadDocument as any).mutateAsync({
                    document_name: newDoc.name,
                    title: newDoc.name,
                    category: newDoc.category,
                    document_type: newDoc.category,
                    document_content: isSyncable ? newDoc.content : undefined,
                    status: 'active',
                  } as any);
                  // Fire-and-forget sync for syncable types
                  if (isSyncable && created?.id && tenantConfig?.id && (newDoc.content || '').length >= 20) {
                    callWebhook(WEBHOOKS.HR_DOCUMENT_SYNC, {
                      document_id: created.id,
                      tenant_id: tenantConfig.id,
                    }, tenantConfig.id).catch(() => { /* non-blocking */ });
                    toast.info('AI agents are being trained on this document…');
                  }
                } catch (e) { /* upload mutation already toasts on error */ }
                setIsUploadOpen(false);
                setNewDoc({ name: '', category: '', content: '' });
              }}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search documents..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                  className="gap-1"
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>All HR documents and files</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.file_type)}
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{doc.file_type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(doc.category)}</TableCell>
                    <TableCell>{doc.uploaded_by}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.uploaded_at}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{doc.version || '1.0'}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.acknowledged ? (
                        <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-chart-4/10 text-chart-4">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Upload your first document to get started'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setIsUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Acknowledgments */}
      {displayDocuments.filter(d => !d.acknowledged && d.category === 'policy').length > 0 && (
        <Card className="border-chart-4/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-4" />
              Pending Acknowledgments
            </CardTitle>
            <CardDescription>Review and acknowledge these policy documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayDocuments
                .filter(d => !d.acknowledged && d.category === 'policy')
                .map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-chart-4/5 rounded-lg border border-chart-4/10">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.file_type)}
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">Updated: {doc.uploaded_at}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button size="sm">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
