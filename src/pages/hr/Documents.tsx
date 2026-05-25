import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { callWebhookOrThrow, WEBHOOKS } from '@/lib/api/webhooks';
import { toast } from 'sonner';

// document_types that auto-sync to AI agents (via 420 HR Policy Sync v1.0)
const SYNCABLE_TYPES = ['policy', 'contract', 'handbook', 'code_of_conduct', 'sop', 'guidelines'];

// Browser-side text extraction from PDF / DOCX / TXT.
// Dynamic imports so the lazy chunk for /hr/documents only pays for the parser
// when the user actually uploads a file.
async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
    return await file.text();
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const pdfjsLib: any = await import('pdfjs-dist');
      // Workerless mode — avoids needing a Vite-bundled worker file path
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab, useWorker: false, disableWorker: true }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += (content.items as any[]).map((it) => it.str).join(' ') + '\n';
      }
      return text.trim();
    } catch (e) {
      console.error('PDF parse failed:', e);
      return '';
    }
  }
  if (
    file.type.includes('wordprocessingml') ||
    file.name.toLowerCase().endsWith('.docx')
  ) {
    try {
      const mammoth: any = await import('mammoth');
      const ab = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: ab });
      return (result.value || '').trim();
    } catch (e) {
      console.error('DOCX parse failed:', e);
      return '';
    }
  }
  return `[Binary document: ${file.name}]`;
}

export default function DocumentsPage() {
  const { t, tenantConfig } = useTenant();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', category: '', content: '' });
  const [reviewDoc, setReviewDoc] = useState<any | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const { data: documents, isLoading, uploadDocument } = useHRDocuments(selectedCategory !== 'all' ? selectedCategory : undefined);

  // Load this user's acknowledgments for the current tenant so we can mark docs as ack'd.
  const { data: acks } = useQuery({
    queryKey: ['hr-document-acks', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [] as Array<{ document_id: string }>;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('hr_document_acknowledgments')
        .select('document_id')
        .eq('tenant_id', tenantConfig.id)
        .eq('user_id', user.id);
      if (error) return [];
      return (data || []) as Array<{ document_id: string }>;
    },
    enabled: !!tenantConfig?.id,
  });
  const ackSet = new Set((acks || []).map((a) => a.document_id));

  const handleAcknowledge = async (docId: string) => {
    if (!tenantConfig?.id) return;
    setAckingId(docId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('hr_document_acknowledgments')
        .insert({
          document_id: docId,
          tenant_id: tenantConfig.id,
          user_id: user?.id || null,
          signature: user?.email || 'unknown',
        });
      if (error) throw error;
      toast.success('Document acknowledged');
      queryClient.invalidateQueries({ queryKey: ['hr-document-acks', tenantConfig.id] });
    } catch (e: any) {
      const msg = e?.message || 'unknown';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.info('You already acknowledged this document');
        queryClient.invalidateQueries({ queryKey: ['hr-document-acks', tenantConfig.id] });
      } else {
        toast.error(`Acknowledge failed: ${msg}`);
      }
    } finally {
      setAckingId(null);
    }
  };

  const displayDocuments = (documents || []).map((doc: any) => ({
    ...doc,
    name: doc.name ?? doc.title ?? doc.document_name ?? 'Untitled',
    file_type: doc.file_type ?? doc.document_type ?? doc.mime_type ?? '',
    uploaded_by: doc.uploaded_by ?? doc.verified_by ?? '—',
    uploaded_at: doc.uploaded_at ?? doc.created_at ?? '',
    acknowledged: doc.acknowledged ?? ackSet.has(doc.id) ?? !!doc.is_verified,
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
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'text')} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" data-testid="upload-tab-file">Upload File</TabsTrigger>
                <TabsTrigger value="text" data-testid="upload-tab-text">Paste Text</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Document Name</Label>
                  <Input placeholder="e.g. Employee Handbook 2026" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={newDoc.category} onValueChange={(v) => setNewDoc({ ...newDoc, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="handbook">Handbook</SelectItem>
                      <SelectItem value="code_of_conduct">Code of Conduct</SelectItem>
                      <SelectItem value="sop">SOP / Process</SelectItem>
                      <SelectItem value="guidelines">Guidelines</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File (PDF, DOCX, or TXT — max 10MB)</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent/40 cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="file-drop-zone"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.doc"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
                        setSelectedFile(f);
                        if (!newDoc.name) setNewDoc({ ...newDoc, name: f.name.replace(/\.[^/.]+$/, '') });
                      }}
                      className="hidden"
                      data-testid="file-input"
                    />
                    {selectedFile ? (
                      <div>
                        <FileText className="h-10 w-10 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        <Button variant="ghost" size="sm" className="mt-2"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>Remove</Button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">Click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 10MB</p>
                      </div>
                    )}
                  </div>
                  {SYNCABLE_TYPES.includes(newDoc.category) && (
                    <p className="text-xs text-muted-foreground">
                      Once uploaded, we'll extract the text and train every AI agent for your tenant on these rules.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Document Name</Label>
                  <Input placeholder="Enter document name" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={newDoc.category} onValueChange={(v) => setNewDoc({ ...newDoc, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="handbook">Handbook</SelectItem>
                      <SelectItem value="code_of_conduct">Code of Conduct</SelectItem>
                      <SelectItem value="sop">SOP / Process</SelectItem>
                      <SelectItem value="guidelines">Guidelines</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {SYNCABLE_TYPES.includes(newDoc.category) && (
                  <div className="space-y-2">
                    <Label>Document Content</Label>
                    <Textarea
                      placeholder="Paste the full policy/handbook/contract text here..."
                      value={newDoc.content}
                      onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">≥ 20 characters required for AI sync.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                disabled={isUploading || !newDoc.name || !newDoc.category || (uploadMode === 'file' && !selectedFile)}
                onClick={async () => {
                const isSyncable = SYNCABLE_TYPES.includes(newDoc.category);
                setIsUploading(true);
                let fileUrl: string | null = null;
                let fileSize: number | null = null;
                let fileType: string | null = null;
                let extractedContent = uploadMode === 'text' ? (newDoc.content || '') : '';
                try {
                  if (uploadMode === 'file' && selectedFile) {
                    const tenantId = tenantConfig?.id;
                    const path = `${tenantId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const { error: uploadErr } = await supabase.storage
                      .from('hr-documents')
                      .upload(path, selectedFile, { cacheControl: '3600', upsert: false });
                    if (uploadErr) throw uploadErr;
                    const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(path);
                    fileUrl = urlData?.publicUrl || null;
                    fileSize = selectedFile.size;
                    fileType = selectedFile.type || null;
                    if (isSyncable) {
                      toast.info('Extracting text from file…');
                      extractedContent = await extractTextFromFile(selectedFile);
                      if (!extractedContent || extractedContent.length < 20) {
                        extractedContent = `[File uploaded: ${selectedFile.name}]`;
                      }
                    }
                  }
                  const created: any = await (uploadDocument as any).mutateAsync({
                    document_name: newDoc.name,
                    title: newDoc.name,
                    category: newDoc.category,
                    document_type: newDoc.category,
                    document_content: extractedContent || undefined,
                    file_url: fileUrl,
                    file_size: fileSize,
                    file_type: fileType,
                    status: 'active',
                  } as any);
                  // Trigger AI agent sync — use EXTRACTED content length (not the
                  // text-tab field, which is empty when uploading a file).
                  if (isSyncable && created?.id && tenantConfig?.id && (extractedContent || '').length >= 20) {
                    toast.info('AI agents are being trained on this document…');
                    try {
                      const r: any = await callWebhookOrThrow(WEBHOOKS.HR_DOCUMENT_SYNC, {
                        document_id: created.id,
                        tenant_id: tenantConfig.id,
                      }, tenantConfig.id);
                      const body: any = r?.data || r;
                      const rules = body?.rules_extracted ?? 0;
                      const agents = body?.agents_updated ?? 0;
                      if (body?.success) {
                        toast.success(`Policy synced — ${rules} rules trained ${agents} agent${agents === 1 ? '' : 's'}`);
                      } else {
                        toast.warning(`Document saved, but sync said: ${body?.error || 'unknown'}`);
                      }
                    } catch (e: any) {
                      console.error('[hr-doc] policy sync failed:', e);
                      toast.warning(`Document saved, but AI agents not updated yet (${e?.message || 'sync failed'}). You can retry from the row menu.`);
                    }
                  }
                } catch (e: any) {
                  toast.error(`Upload failed: ${e?.message || 'unknown error'}`);
                } finally {
                  setIsUploading(false);
                }
                setIsUploadOpen(false);
                setNewDoc({ name: '', category: '', content: '' });
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}>{isUploading ? 'Uploading…' : 'Upload Document'}</Button>
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
                      <Button variant="outline" size="sm" onClick={() => setReviewDoc(doc)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledge(doc.id)}
                        disabled={ackingId === doc.id}
                        data-testid={`ack-btn-${doc.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {ackingId === doc.id ? 'Acknowledging…' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review modal */}
      <Dialog open={!!reviewDoc} onOpenChange={(open) => { if (!open) setReviewDoc(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{reviewDoc?.name || reviewDoc?.document_name || 'Document'}</DialogTitle>
            <DialogDescription>
              {(reviewDoc?.document_type || reviewDoc?.category || '').toString().replace(/_/g, ' ')}
              {reviewDoc?.file_url && (
                <> · <a className="underline text-primary" href={reviewDoc.file_url} target="_blank" rel="noreferrer">Open original file</a></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 border rounded p-4 bg-muted/30 text-sm whitespace-pre-wrap font-mono">
            {reviewDoc?.document_content || '(No extracted text content stored. Open the original file link above.)'}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDoc(null)}>Close</Button>
            {reviewDoc && !ackSet.has(reviewDoc.id) && (
              <Button onClick={async () => {
                await handleAcknowledge(reviewDoc.id);
                setReviewDoc(null);
              }} disabled={ackingId === reviewDoc.id}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {ackingId === reviewDoc.id ? 'Acknowledging…' : 'Acknowledge'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
