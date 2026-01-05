import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Layout,
  Smartphone,
  Monitor,
  Settings,
  Code,
  Layers,
  Image as ImageIcon,
  Type,
  Square,
  MousePointer,
  BarChart3,
  TrendingUp,
  Users,
  ExternalLink,
  Check,
  X,
  Sparkles,
  FileText,
  FormInput,
  CheckSquare,
  Palette,
  Link
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

// Types
interface LandingPage {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  url?: string;
  views: number;
  conversions: number;
  conversionRate: number;
  createdAt: Date;
  updatedAt: Date;
  template?: string;
  abTestActive?: boolean;
}

interface PageTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: string;
}

// Mock data
const mockPages: LandingPage[] = [
  {
    id: '1',
    name: 'Summer Sale 2024',
    status: 'published',
    url: 'https://yourbusiness.com/summer-sale',
    views: 5420,
    conversions: 342,
    conversionRate: 6.3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    abTestActive: true,
  },
  {
    id: '2',
    name: 'Product Launch',
    status: 'draft',
    views: 0,
    conversions: 0,
    conversionRate: 0,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    name: 'Webinar Registration',
    status: 'published',
    url: 'https://yourbusiness.com/webinar',
    views: 2150,
    conversions: 189,
    conversionRate: 8.8,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '4',
    name: 'Free Trial Signup',
    status: 'published',
    url: 'https://yourbusiness.com/free-trial',
    views: 8900,
    conversions: 712,
    conversionRate: 8.0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-14'),
  },
];

const mockTemplates: PageTemplate[] = [
  {
    id: 't1',
    name: 'Lead Generation',
    category: 'Lead Gen',
    description: 'Capture leads with a clean, high-converting form',
    preview: '📋 Form-focused design with CTA',
  },
  {
    id: 't2',
    name: 'Product Launch',
    category: 'Product',
    description: 'Showcase your new product with impact',
    preview: '🚀 Hero section with features',
  },
  {
    id: 't3',
    name: 'Webinar Registration',
    category: 'Events',
    description: 'Drive registrations for your online events',
    preview: '🎥 Video embed with signup form',
  },
  {
    id: 't4',
    name: 'E-book Download',
    category: 'Lead Gen',
    description: 'Offer valuable content in exchange for contact info',
    preview: '📚 Content preview with download form',
  },
  {
    id: 't5',
    name: 'Coming Soon',
    category: 'Launch',
    description: 'Build anticipation for your upcoming launch',
    preview: '⏰ Countdown with email capture',
  },
  {
    id: 't6',
    name: 'Thank You Page',
    category: 'Post-Conversion',
    description: 'Engage customers after form submission',
    preview: '✅ Confirmation with next steps',
  },
];

const editorElements = [
  { type: 'heading', icon: Type, label: 'Heading' },
  { type: 'text', icon: FileText, label: 'Text Block' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'button', icon: Square, label: 'Button' },
  { type: 'form', icon: FormInput, label: 'Form' },
  { type: 'columns', icon: Layers, label: 'Columns' },
  { type: 'video', icon: Globe, label: 'Video Embed' },
  { type: 'countdown', icon: CheckSquare, label: 'Countdown' },
];

export default function LandingPages() {
  const { toast } = useToast();

  // State
  const [pages, setPages] = useState<LandingPage[]>(mockPages);
  const [activeTab, setActiveTab] = useState('pages');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const getStatusBadge = (status: LandingPage['status']) => {
    const config: Record<LandingPage['status'], { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      published: { variant: 'default', label: 'Published' },
      draft: { variant: 'secondary', label: 'Draft' },
      archived: { variant: 'destructive', label: 'Archived' },
    };
    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleCreatePage = () => {
    if (!newPageName.trim()) {
      toast({ title: 'Error', description: 'Please enter a page name', variant: 'destructive' });
      return;
    }

    const newPage: LandingPage = {
      id: Date.now().toString(),
      name: newPageName,
      status: 'draft',
      views: 0,
      conversions: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      template: selectedTemplate?.name,
    };

    setPages([newPage, ...pages]);
    setIsCreateOpen(false);
    setNewPageName('');
    setSelectedTemplate(null);
    toast({ title: 'Page Created', description: 'Your landing page has been created as a draft.' });
  };

  const handlePublish = (page: LandingPage) => {
    setPages(pages.map(p =>
      p.id === page.id
        ? { ...p, status: 'published' as const, url: `https://yourbusiness.com/${page.name.toLowerCase().replace(/\s+/g, '-')}` }
        : p
    ));
    toast({ title: 'Page Published', description: 'Your landing page is now live.' });
  };

  const handleUnpublish = (page: LandingPage) => {
    setPages(pages.map(p =>
      p.id === page.id ? { ...p, status: 'draft' as const, url: undefined } : p
    ));
    toast({ title: 'Page Unpublished' });
  };

  const handleDuplicate = (page: LandingPage) => {
    const duplicate: LandingPage = {
      ...page,
      id: Date.now().toString(),
      name: `${page.name} (Copy)`,
      status: 'draft',
      url: undefined,
      views: 0,
      conversions: 0,
      conversionRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPages([duplicate, ...pages]);
    toast({ title: 'Page Duplicated' });
  };

  const handleDelete = (pageId: string) => {
    setPages(pages.filter(p => p.id !== pageId));
    toast({ title: 'Page Deleted' });
  };

  const handleOpenEditor = (page: LandingPage) => {
    setEditingPage(page);
    setIsEditorOpen(true);
  };

  const stats = {
    total: pages.length,
    published: pages.filter(p => p.status === 'published').length,
    totalViews: pages.reduce((sum, p) => sum + p.views, 0),
    totalConversions: pages.reduce((sum, p) => sum + p.conversions, 0),
    avgConversionRate: pages.length > 0
      ? (pages.reduce((sum, p) => sum + p.conversionRate, 0) / pages.filter(p => p.status === 'published').length || 0).toFixed(1)
      : '0',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create high-converting landing pages
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Pages', value: stats.total, icon: Globe },
          { label: 'Published', value: stats.published, icon: Check },
          { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye },
          { label: 'Conversions', value: stats.totalConversions.toLocaleString(), icon: MousePointer },
          { label: 'Avg. CVR', value: `${stats.avgConversionRate}%`, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pages">My Pages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          {pages.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No landing pages yet</p>
              <p className="text-muted-foreground mb-4">Create your first landing page</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <Card key={page.id} className="overflow-hidden">
                  {/* Page Preview */}
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                    <Layout className="h-12 w-12 text-primary/40" />
                    {page.abTestActive && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        A/B Test Active
                      </Badge>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(page.status)}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{page.name}</h3>
                        {page.url && (
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {page.url.replace('https://', '')}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated {format(page.updatedAt, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditor(page)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {page.status === 'draft' ? (
                            <DropdownMenuItem onClick={() => handlePublish(page)}>
                              <Check className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          ) : page.status === 'published' && (
                            <DropdownMenuItem onClick={() => handleUnpublish(page)}>
                              <X className="h-4 w-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(page.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats */}
                    {page.status === 'published' && (
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-lg font-bold">{page.views.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{page.conversions.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-500">{page.conversionRate}%</p>
                          <p className="text-xs text-muted-foreground">CVR</p>
                        </div>
                      </div>
                    )}

                    {page.status === 'draft' && (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button variant="outline" className="flex-1" onClick={() => handleOpenEditor(page)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button className="flex-1" onClick={() => handlePublish(page)}>
                          Publish
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsCreateOpen(true);
                }}
              >
                <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Layout className="h-12 w-12 text-primary/40" />
                </div>
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2">{template.category}</Badge>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pages
                    .filter(p => p.status === 'published')
                    .sort((a, b) => b.conversionRate - a.conversionRate)
                    .slice(0, 5)
                    .map((page, index) => (
                      <div key={page.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{page.name}</p>
                            <p className="text-xs text-muted-foreground">{page.views.toLocaleString()} views</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-500">
                          {page.conversionRate}% CVR
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Trends</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Conversion chart placeholder</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>A/B Test Results</CardTitle>
              <CardDescription>Compare performance between page variants</CardDescription>
            </CardHeader>
            <CardContent>
              {pages.filter(p => p.abTestActive).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No A/B tests running</p>
                  <p className="text-sm">Start an A/B test to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pages.filter(p => p.abTestActive).map((page) => (
                    <div key={page.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">{page.name}</h4>
                        <Badge>Running</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Variant A (Control)</p>
                          <p className="text-2xl font-bold">{page.conversionRate}%</p>
                          <p className="text-xs text-muted-foreground">{Math.floor(page.views / 2)} views</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium">Variant B</p>
                          <p className="text-2xl font-bold text-green-500">{(page.conversionRate + 1.2).toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{Math.ceil(page.views / 2)} views</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Page Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? `Starting with ${selectedTemplate.name} template`
                : 'Start from scratch or choose a template'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Page Name</Label>
              <Input
                placeholder="My Landing Page"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
              />
            </div>

            {!selectedTemplate && (
              <div className="space-y-2">
                <Label>Choose Template (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {mockTemplates.slice(0, 4).map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setSelectedTemplate(null); setNewPageName(''); }}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage}>
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Edit: {editingPage?.name}</DialogTitle>
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
          </DialogHeader>

          <div className="grid lg:grid-cols-4 gap-4 h-[600px]">
            {/* Elements Panel */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Elements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {editorElements.map((element) => (
                    <Button
                      key={element.type}
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <element.icon className="h-4 w-4" />
                      {element.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="lg:col-span-2 overflow-hidden">
              <div className="h-full bg-muted/50 p-4">
                <div
                  className={`mx-auto bg-white rounded-lg shadow-lg h-full overflow-auto ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'
                  }`}
                >
                  <div className="p-8 text-center">
                    <h1 className="text-3xl font-bold mb-4">Your Landing Page</h1>
                    <p className="text-muted-foreground mb-6">
                      Drag and drop elements from the left panel to build your page
                    </p>
                    <Button>Get Started</Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Settings Panel */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Page Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input defaultValue={editingPage?.name} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Input placeholder="SEO description..." />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable A/B Testing</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show in Search</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={() => {
              toast({ title: 'Changes Saved' });
              setIsEditorOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
