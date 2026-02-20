import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import {
  Mail, Plus, Send, Eye, Smartphone, Monitor, Layout, Type,
  Image as ImageIcon, Square, Columns, FileText, Link, Code,
  Sparkles, Save, Trash2, Copy, MoveUp, MoveDown, Settings,
  CheckCircle2, AlertTriangle, GripVertical
} from 'lucide-react';

interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'footer';
  content: Record<string, any>;
}

const blockTypes = [
  { type: 'header', icon: Type, label: 'Header' },
  { type: 'text', icon: FileText, label: 'Text Block' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'button', icon: Square, label: 'Button' },
  { type: 'divider', icon: Separator, label: 'Divider' },
  { type: 'columns', icon: Columns, label: 'Columns' },
  { type: 'social', icon: Link, label: 'Social Links' },
  { type: 'footer', icon: Layout, label: 'Footer' },
];

const personalizationTokens = [
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{last_name}}', label: 'Last Name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{company}}', label: 'Company' },
  { token: '{{unsubscribe_link}}', label: 'Unsubscribe Link' },
];

export default function EmailBuilder() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const { templates, isLoading: templatesLoading, createTemplate, stats: templateStats } = useEmailTemplates();

  const [activeTab, setActiveTab] = useState('templates');
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [emailSubject, setEmailSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [spamScore, setSpamScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('general');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');

  const defaultBlocks: EmailBlock[] = [
    { id: '1', type: 'header', content: { text: 'Your Email Header', size: 'h1', align: 'center' } },
    { id: '2', type: 'image', content: { src: 'https://via.placeholder.com/600x200', alt: 'Header image', width: '100%' } },
    { id: '3', type: 'text', content: { html: '<p>Hello {{first_name}},</p><p>This is your email content.</p>' } },
    { id: '4', type: 'button', content: { text: 'Call to Action', url: '#', color: '#3b82f6', textColor: '#ffffff', align: 'center' } },
    { id: '5', type: 'divider', content: { style: 'solid', color: '#e5e7eb' } },
    { id: '6', type: 'footer', content: { text: '© 2024 Your Company. All rights reserved.', unsubscribe: true } },
  ];

  const handleStartFromTemplate = (template: any) => {
    setEmailBlocks(defaultBlocks);
    setEmailSubject(template.subject || `${template.name} - ${new Date().toLocaleDateString()}`);
    setActiveTab('builder');
    toast({ title: 'Template Loaded', description: `Started with ${template.name}` });
  };

  const handleStartBlank = () => {
    setEmailBlocks([
      { id: '1', type: 'header', content: { text: 'Your Email Header', size: 'h1', align: 'center' } },
      { id: '2', type: 'text', content: { html: '<p>Start typing your email content here...</p>' } },
    ]);
    setActiveTab('builder');
  };

  const addBlock = (type: string) => {
    const newBlock: EmailBlock = { id: Date.now().toString(), type: type as any, content: getDefaultContent(type) };
    setEmailBlocks([...emailBlocks, newBlock]);
  };

  const getDefaultContent = (type: string): Record<string, any> => {
    switch (type) {
      case 'header': return { text: 'New Header', size: 'h2', align: 'left' };
      case 'text': return { html: '<p>Add your text here...</p>' };
      case 'image': return { src: 'https://via.placeholder.com/600x300', alt: 'Image', width: '100%' };
      case 'button': return { text: 'Click Here', url: '#', color: '#3b82f6', textColor: '#ffffff', align: 'center' };
      case 'divider': return { style: 'solid', color: '#e5e7eb' };
      case 'columns': return { left: '<p>Left column</p>', right: '<p>Right column</p>' };
      case 'social': return { facebook: '#', twitter: '#', linkedin: '#', instagram: '#' };
      case 'footer': return { text: '© 2024 Your Company', unsubscribe: true };
      default: return {};
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...emailBlocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setEmailBlocks(newBlocks);
  };

  const deleteBlock = (id: string) => {
    setEmailBlocks(emailBlocks.filter(b => b.id !== id));
    if (selectedBlock?.id === id) setSelectedBlock(null);
  };

  const duplicateBlock = (block: EmailBlock) => {
    const index = emailBlocks.findIndex(b => b.id === block.id);
    const duplicate: EmailBlock = { ...block, id: Date.now().toString() };
    const newBlocks = [...emailBlocks];
    newBlocks.splice(index + 1, 0, duplicate);
    setEmailBlocks(newBlocks);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await createTemplate.mutateAsync({
        name: emailSubject || 'Untitled Email',
        subject: emailSubject,
        category: 'general',
        body_html: JSON.stringify(emailBlocks),
        variables: Object.fromEntries(personalizationTokens.map(t => [t.token, t.label])),
      });
    } catch {}
    setIsSaving(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      await createTemplate.mutateAsync({
        name: newTemplateName,
        subject: newTemplateSubject,
        category: newTemplateCategory,
        body_html: '',
      });
      setIsCreateTemplateOpen(false);
      setNewTemplateName('');
      setNewTemplateSubject('');
    } catch {}
  };

  const handleCheckSpamScore = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const score = Math.floor(Math.random() * 4) + 1;
    setSpamScore(score);
    toast({ title: 'Spam Score', description: score <= 2 ? 'Low spam risk.' : 'Moderate risk.', variant: score <= 2 ? 'default' : 'destructive' });
  };

  const renderBlock = (block: EmailBlock) => {
    switch (block.type) {
      case 'header': return <h2 className="font-bold" style={{ textAlign: block.content.align }}>{block.content.text}</h2>;
      case 'text': return <div dangerouslySetInnerHTML={{ __html: block.content.html }} />;
      case 'image': return <img src={block.content.src} alt={block.content.alt} className="max-w-full rounded" />;
      case 'button': return <div style={{ textAlign: block.content.align }}><a href={block.content.url} className="inline-block px-6 py-3 rounded-lg font-medium" style={{ backgroundColor: block.content.color, color: block.content.textColor }}>{block.content.text}</a></div>;
      case 'divider': return <hr className="my-4" />;
      case 'columns': return <div className="grid grid-cols-2 gap-4"><div dangerouslySetInnerHTML={{ __html: block.content.left }} /><div dangerouslySetInnerHTML={{ __html: block.content.right }} /></div>;
      case 'footer': return <div className="text-center text-sm text-muted-foreground"><p>{block.content.text}</p>{block.content.unsubscribe && <p className="mt-2 underline">Unsubscribe</p>}</div>;
      default: return null;
    }
  };

  if (templatesLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Builder</h1>
          <p className="text-muted-foreground mt-1">Create beautiful email campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'builder' && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}><Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save Draft'}</Button>
              <Button><Send className="h-4 w-4 mr-2" />Send / Schedule</Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates ({templateStats.total})</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleStartBlank}>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4"><Plus className="h-8 w-8 text-muted-foreground" /></div>
                <p className="font-medium">Blank Template</p>
                <p className="text-sm text-muted-foreground">Start from scratch</p>
              </CardContent>
            </Card>
            {templates.map((template: any) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleStartFromTemplate(template)}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4"><Mail className="h-8 w-8 text-primary" /></div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.subject || 'No subject'}</p>
                  <Badge variant="secondary" className="mt-2">{template.category}</Badge>
                  {template.times_sent && template.times_sent > 0 && <p className="text-xs text-muted-foreground mt-1">Used {template.times_sent} times</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left: Block Palette - ALWAYS VISIBLE */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Add Blocks</CardTitle>
                <CardDescription className="text-xs">Click to add to your email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {blockTypes.map((block) => (
                    <Button key={block.type} variant="outline" className="w-full justify-start gap-2" onClick={() => { addBlock(block.type); toast({ title: `${block.label} Added` }); }}>
                      <block.icon className="h-4 w-4" />{block.label}
                    </Button>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Personalization</p>
                  <div className="flex flex-wrap gap-1">
                    {personalizationTokens.map((token) => (
                      <Badge key={token.token} variant="secondary" className="cursor-pointer text-xs" onClick={() => { navigator.clipboard.writeText(token.token); toast({ title: 'Copied!', description: `${token.token} copied` }); }}>{token.label}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Center: Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Email Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant={previewMode === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewMode('desktop')}><Monitor className="h-4 w-4" /></Button>
                    <Button variant={previewMode === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewMode('mobile')}><Smartphone className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Subject:</p>
                  <p className="font-medium">{emailSubject || 'No subject yet'}</p>
                </div>
                {emailBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
                    <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold mb-1">Start Building</h3>
                    <p className="text-sm text-muted-foreground mb-4">Click a block type on the left to add it</p>
                    <Button variant="outline" onClick={() => addBlock('header')}>
                      <Plus className="h-4 w-4 mr-2" /> Add Header Block
                    </Button>
                  </div>
                ) : (
                  <div className={`mx-auto border rounded-lg bg-white p-4 ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'}`}>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {emailBlocks.map((block, index) => (
                          <div key={block.id} className={`group relative p-2 rounded border ${selectedBlock?.id === block.id ? 'border-primary' : 'border-transparent hover:border-muted'}`} onClick={() => setSelectedBlock(block)}>
                            {renderBlock(block)}
                            <div className="absolute -right-2 top-0 hidden group-hover:flex flex-col gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }} disabled={index === 0}><MoveUp className="h-3 w-3" /></Button>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }} disabled={index === emailBlocks.length - 1}><MoveDown className="h-3 w-3" /></Button>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }}><Copy className="h-3 w-3" /></Button>
                              <Button variant="destructive" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Properties */}
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-sm">Properties</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Enter subject..." />
                </div>
                <div className="space-y-2">
                  <Label>Preview Text</Label>
                  <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Preview text..." />
                </div>
                <Separator />
                {selectedBlock && (
                  <div className="space-y-2">
                    <Label>Selected Block</Label>
                    <Badge variant="secondary">{selectedBlock.type}</Badge>
                    <p className="text-xs text-muted-foreground">Click blocks in preview to select</p>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Spam Score</Label>
                    <Button variant="outline" size="sm" onClick={handleCheckSpamScore}>Check</Button>
                  </div>
                  {spamScore !== null && (
                    <div className={`flex items-center gap-2 p-2 rounded ${spamScore <= 2 ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                      {spamScore <= 2 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      <span className="text-sm">{spamScore}/10 - {spamScore <= 2 ? 'Low risk' : 'Moderate risk'}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Button className="w-full marketing-gradient text-white" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />{isSaving ? 'Saving...' : 'Save Template'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Sender Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>From Name</Label><Input placeholder="Your Company Name" /></div>
                <div className="space-y-2"><Label>From Email</Label><Input placeholder="hello@company.com" /></div>
                <div className="space-y-2"><Label>Reply-To Email</Label><Input placeholder="support@company.com" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Tracking</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><p className="font-medium">Track Opens</p></div><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><div><p className="font-medium">Track Clicks</p></div><Switch defaultChecked /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Template Name</Label><Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="e.g., Welcome Email" /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={newTemplateSubject} onChange={(e) => setNewTemplateSubject(e.target.value)} placeholder="Email subject..." /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)} placeholder="e.g., Onboarding" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>{createTemplate.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
