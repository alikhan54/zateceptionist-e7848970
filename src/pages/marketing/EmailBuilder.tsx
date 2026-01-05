import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import {
  Mail,
  Plus,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Layout,
  Type,
  Image as ImageIcon,
  Square,
  Columns,
  List,
  Link,
  Code,
  Sparkles,
  Save,
  Undo,
  Redo,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Settings,
  Palette,
  FileText,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  ChevronRight,
  BarChart3
} from 'lucide-react';

// Types
interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'footer';
  content: Record<string, any>;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  blocks: EmailBlock[];
}

// Mock templates
const mockTemplates: EmailTemplate[] = [
  {
    id: 't1',
    name: 'Welcome Email',
    category: 'Onboarding',
    preview: '🎉 Welcome new subscribers with a warm introduction',
    blocks: [],
  },
  {
    id: 't2',
    name: 'Product Announcement',
    category: 'Marketing',
    preview: '🚀 Launch new products with style',
    blocks: [],
  },
  {
    id: 't3',
    name: 'Newsletter',
    category: 'Newsletter',
    preview: '📰 Keep subscribers updated with news',
    blocks: [],
  },
  {
    id: 't4',
    name: 'Promotional',
    category: 'Sales',
    preview: '🏷️ Drive sales with promotional offers',
    blocks: [],
  },
  {
    id: 't5',
    name: 'Abandoned Cart',
    category: 'E-commerce',
    preview: '🛒 Recover abandoned shopping carts',
    blocks: [],
  },
  {
    id: 't6',
    name: 'Event Invitation',
    category: 'Events',
    preview: '📅 Invite subscribers to your events',
    blocks: [],
  },
];

const blockTypes = [
  { type: 'header', icon: Type, label: 'Header', description: 'Add a heading' },
  { type: 'text', icon: FileText, label: 'Text Block', description: 'Rich text content' },
  { type: 'image', icon: ImageIcon, label: 'Image', description: 'Add an image' },
  { type: 'button', icon: Square, label: 'Button', description: 'Call-to-action button' },
  { type: 'divider', icon: Separator, label: 'Divider', description: 'Visual separator' },
  { type: 'columns', icon: Columns, label: 'Columns', description: '2-column layout' },
  { type: 'social', icon: Link, label: 'Social Links', description: 'Social media icons' },
  { type: 'footer', icon: Layout, label: 'Footer', description: 'Email footer' },
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

  // State
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [emailSubject, setEmailSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isABTestOpen, setIsABTestOpen] = useState(false);
  const [spamScore, setSpamScore] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const defaultBlocks: EmailBlock[] = [
    {
      id: '1',
      type: 'header',
      content: { text: 'Your Email Header', size: 'h1', align: 'center' },
    },
    {
      id: '2',
      type: 'image',
      content: { src: 'https://via.placeholder.com/600x200', alt: 'Header image', width: '100%' },
    },
    {
      id: '3',
      type: 'text',
      content: { html: '<p>Hello {{first_name}},</p><p>This is your email content. You can edit this text and add your message here.</p>' },
    },
    {
      id: '4',
      type: 'button',
      content: { text: 'Call to Action', url: '#', color: '#3b82f6', textColor: '#ffffff', align: 'center' },
    },
    {
      id: '5',
      type: 'divider',
      content: { style: 'solid', color: '#e5e7eb' },
    },
    {
      id: '6',
      type: 'footer',
      content: { text: '© 2024 Your Company. All rights reserved.', unsubscribe: true },
    },
  ];

  const handleStartFromTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEmailBlocks(defaultBlocks);
    setEmailSubject(`${template.name} - ${new Date().toLocaleDateString()}`);
    setActiveTab('builder');
    toast({ title: 'Template Loaded', description: `Started with ${template.name} template` });
  };

  const handleStartBlank = () => {
    setSelectedTemplate(null);
    setEmailBlocks([
      {
        id: '1',
        type: 'header',
        content: { text: 'Your Email Header', size: 'h1', align: 'center' },
      },
      {
        id: '2',
        type: 'text',
        content: { html: '<p>Start typing your email content here...</p>' },
      },
    ]);
    setActiveTab('builder');
  };

  const addBlock = (type: string) => {
    const newBlock: EmailBlock = {
      id: Date.now().toString(),
      type: type as EmailBlock['type'],
      content: getDefaultContent(type),
    };
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

  const handleCheckSpamScore = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const score = Math.floor(Math.random() * 4) + 1; // 1-4 score (lower is better)
    setSpamScore(score);
    toast({
      title: 'Spam Score Calculated',
      description: score <= 2 ? 'Great! Your email has a low spam score.' : 'Consider improving your subject line or content.',
      variant: score <= 2 ? 'default' : 'destructive',
    });
  };

  const handleGenerateWithAI = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEmailSubject('🎉 Exclusive Offer Just for You!');
    setPreviewText('Don\'t miss out on our limited time offer...');
    setIsSaving(false);
    toast({ title: 'AI Generated', description: 'Subject line and preview text generated.' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast({ title: 'Email Saved', description: 'Your email has been saved as a draft.' });
  };

  const renderBlock = (block: EmailBlock) => {
    const isSelected = selectedBlock?.id === block.id;

    switch (block.type) {
      case 'header':
        const HeaderTag = block.content.size === 'h1' ? 'h1' : block.content.size === 'h2' ? 'h2' : 'h3';
        return (
          <HeaderTag className={`font-bold text-${block.content.align}`} style={{ textAlign: block.content.align }}>
            {block.content.text}
          </HeaderTag>
        );
      case 'text':
        return <div dangerouslySetInnerHTML={{ __html: block.content.html }} />;
      case 'image':
        return <img src={block.content.src} alt={block.content.alt} className="max-w-full rounded" style={{ width: block.content.width }} />;
      case 'button':
        return (
          <div style={{ textAlign: block.content.align }}>
            <a
              href={block.content.url}
              className="inline-block px-6 py-3 rounded-lg font-medium"
              style={{ backgroundColor: block.content.color, color: block.content.textColor }}
            >
              {block.content.text}
            </a>
          </div>
        );
      case 'divider':
        return <hr className="my-4" style={{ borderStyle: block.content.style, borderColor: block.content.color }} />;
      case 'columns':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div dangerouslySetInnerHTML={{ __html: block.content.left }} />
            <div dangerouslySetInnerHTML={{ __html: block.content.right }} />
          </div>
        );
      case 'social':
        return (
          <div className="flex justify-center gap-4">
            {block.content.facebook && <div className="w-8 h-8 bg-blue-600 rounded-full" />}
            {block.content.twitter && <div className="w-8 h-8 bg-sky-500 rounded-full" />}
            {block.content.linkedin && <div className="w-8 h-8 bg-blue-700 rounded-full" />}
            {block.content.instagram && <div className="w-8 h-8 bg-pink-500 rounded-full" />}
          </div>
        );
      case 'footer':
        return (
          <div className="text-center text-sm text-muted-foreground">
            <p>{block.content.text}</p>
            {block.content.unsubscribe && <p className="mt-2 underline">Unsubscribe</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create beautiful email campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'builder' && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send / Schedule
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Blank Template */}
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={handleStartBlank}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">Blank Template</p>
                <p className="text-sm text-muted-foreground">Start from scratch</p>
              </CardContent>
            </Card>

            {/* Pre-built Templates */}
            {mockTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleStartFromTemplate(template)}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.preview}</p>
                  <Badge variant="secondary" className="mt-2">{template.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          {emailBlocks.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No email content yet</p>
              <p className="text-muted-foreground mb-4">Choose a template or start from scratch</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setActiveTab('templates')}>
                  Browse Templates
                </Button>
                <Button onClick={handleStartBlank}>
                  Start Blank
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Blocks Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Add Blocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blockTypes.map((block) => (
                      <Button
                        key={block.type}
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => addBlock(block.type)}
                      >
                        <block.icon className="h-4 w-4" />
                        {block.label}
                      </Button>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Personalization</p>
                    <div className="flex flex-wrap gap-1">
                      {personalizationTokens.map((token) => (
                        <Badge
                          key={token.token}
                          variant="secondary"
                          className="cursor-pointer text-xs"
                        >
                          {token.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Panel */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Preview</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={previewMode === 'desktop' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewMode('desktop')}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={previewMode === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewMode('mobile')}
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Subject Line */}
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Subject:</p>
                    <p className="font-medium">{emailSubject || 'No subject'}</p>
                    {previewText && (
                      <p className="text-sm text-muted-foreground">{previewText}</p>
                    )}
                  </div>

                  {/* Email Preview */}
                  <div
                    className={`mx-auto border rounded-lg bg-white p-4 ${
                      previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
                    }`}
                  >
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {emailBlocks.map((block, index) => (
                          <div
                            key={block.id}
                            className={`group relative p-2 rounded border ${
                              selectedBlock?.id === block.id ? 'border-primary' : 'border-transparent hover:border-muted'
                            }`}
                            onClick={() => setSelectedBlock(block)}
                          >
                            {renderBlock(block)}
                            <div className="absolute -right-2 top-0 hidden group-hover:flex flex-col gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}>
                                <MoveUp className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}>
                                <MoveDown className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicateBlock(block); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="destructive" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {/* Properties Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subject & Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subject Line</Label>
                      <Button variant="ghost" size="sm" onClick={handleGenerateWithAI}>
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI
                      </Button>
                    </div>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preview Text</Label>
                    <Input
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      placeholder="Preview text..."
                    />
                  </div>

                  <Separator />

                  {/* Spam Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Spam Score</Label>
                      <Button variant="outline" size="sm" onClick={handleCheckSpamScore}>
                        Check
                      </Button>
                    </div>
                    {spamScore !== null && (
                      <div className={`flex items-center gap-2 p-2 rounded ${spamScore <= 2 ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                        {spamScore <= 2 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="text-sm">{spamScore}/10 - {spamScore <= 2 ? 'Low risk' : 'Moderate risk'}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* A/B Testing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>A/B Testing</Label>
                      <Switch />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Test different subject lines to optimize open rates
                    </p>
                  </div>

                  {/* Selected Block Properties */}
                  {selectedBlock && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Block Settings</Label>
                        <p className="text-xs text-muted-foreground capitalize">
                          Editing: {selectedBlock.type} block
                        </p>
                        {/* Add block-specific property editors here */}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sender Settings</CardTitle>
                <CardDescription>Configure email sender information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input placeholder="Your Company Name" />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input placeholder="hello@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>Reply-To Email</Label>
                  <Input placeholder="support@company.com" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tracking & Analytics</CardTitle>
                <CardDescription>Configure email tracking options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Track Opens</p>
                    <p className="text-sm text-muted-foreground">Track when emails are opened</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Track Clicks</p>
                    <p className="text-sm text-muted-foreground">Track link clicks</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Google Analytics</p>
                    <p className="text-sm text-muted-foreground">Add UTM parameters</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
                <CardDescription>Legal and compliance settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Include Unsubscribe Link</p>
                    <p className="text-sm text-muted-foreground">Required by law</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Include Physical Address</p>
                    <p className="text-sm text-muted-foreground">CAN-SPAM compliance</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Settings</CardTitle>
                <CardDescription>Customize your email branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" defaultValue="#3b82f6" className="w-16 h-10" />
                    <Input defaultValue="#3b82f6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input placeholder="https://..." />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
