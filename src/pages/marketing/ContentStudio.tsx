import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { callWebhook, WEBHOOKS } from '@/integrations/supabase';
import {
  Sparkles,
  FileText,
  Mail,
  MessageSquare,
  Share2,
  Megaphone,
  Copy,
  Edit,
  Trash2,
  Save,
  Search,
  RefreshCw,
  FolderOpen,
  ImageIcon,
  Plus,
  ExternalLink,
  Wand2
} from 'lucide-react';

interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  tone: string;
  created_at: string;
  updated_at: string;
}

type ContentType = 'social_media' | 'email' | 'blog' | 'whatsapp' | 'ad_copy';

interface Template {
  id: string;
  type: ContentType;
  name: string;
  description: string;
  content: string;
  industry?: string;
}

const contentTypeConfig: Record<ContentType, { label: string; icon: React.ReactNode; color: string }> = {
  social_media: { label: 'Social Media Post', icon: <Share2 className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-500' },
  email: { label: 'Email Newsletter', icon: <Mail className="h-4 w-4" />, color: 'bg-green-500/10 text-green-500' },
  blog: { label: 'Blog Article', icon: <FileText className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-500' },
  whatsapp: { label: 'WhatsApp Template', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-500' },
  ad_copy: { label: 'Ad Copy', icon: <Megaphone className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-500' },
};

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'informative', label: 'Informative' },
  { value: 'urgent', label: 'Urgent' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
];

// Mock data for demo
const mockContentLibrary: ContentItem[] = [
  {
    id: '1',
    type: 'social_media',
    title: 'Product Launch Announcement',
    content: '🚀 Exciting news! We are thrilled to announce the launch of our latest product...',
    tone: 'professional',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    type: 'email',
    title: 'Monthly Newsletter - January',
    content: 'Dear valued customer, we hope this email finds you well...',
    tone: 'friendly',
    created_at: '2024-01-10T09:00:00Z',
    updated_at: '2024-01-12T14:30:00Z',
  },
  {
    id: '3',
    type: 'whatsapp',
    title: 'Appointment Reminder',
    content: 'Hi {name}! This is a friendly reminder about your upcoming appointment...',
    tone: 'friendly',
    created_at: '2024-01-08T11:00:00Z',
    updated_at: '2024-01-08T11:00:00Z',
  },
];

const mockTemplates: Template[] = [
  {
    id: 't1',
    type: 'email',
    name: 'Welcome Email',
    description: 'A warm welcome email for new customers',
    content: 'Dear {name},\n\nWelcome to {company}! We are thrilled to have you on board...',
  },
  {
    id: 't2',
    type: 'whatsapp',
    name: 'Appointment Confirmation',
    description: 'Confirm scheduled appointments',
    content: 'Hi {name}! Your {service} appointment is confirmed for {date} at {time}.',
  },
  {
    id: 't3',
    type: 'social_media',
    name: 'Product Feature Highlight',
    description: 'Showcase a specific product feature',
    content: '✨ Did you know? Our {product} can help you {benefit}! Learn more: {link}',
  },
  {
    id: 't4',
    type: 'ad_copy',
    name: 'Limited Time Offer',
    description: 'Create urgency for promotions',
    content: '⏰ LIMITED TIME OFFER! Get {discount}% off on all {category}. Hurry, offer ends {date}!',
  },
  {
    id: 't5',
    type: 'blog',
    name: 'How-To Guide',
    description: 'Educational blog post template',
    content: '# How to {topic}\n\nIn this guide, we will walk you through the steps to...',
  },
];

export default function ContentStudio() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  
  // Generator state
  const [contentType, setContentType] = useState<ContentType>('social_media');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('en');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Library state
  const [contentLibrary, setContentLibrary] = useState<ContentItem[]>(mockContentLibrary);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<ContentType | 'all'>('all');
  
  // Edit dialog state
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [editContent, setEditContent] = useState('');
  
  // Template dialog state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleGenerate = async () => {
    if (!tenantId || !topic.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a topic or brief for content generation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.GENERATE_CONTENT,
        {
          content_type: contentType,
          topic: topic,
          tone: tone,
          language: language,
          industry: tenantConfig?.industry,
        },
        tenantId
      );

      if (result.success && result.data) {
        const generated = (result.data as { content?: string })?.content || 
          `Generated ${contentTypeConfig[contentType].label} content about "${topic}" in a ${tone} tone.\n\nThis is placeholder content for demonstration. In production, this would be AI-generated content tailored to your specifications.`;
        setGeneratedContent(generated);
        toast({
          title: 'Content Generated!',
          description: 'Your AI-generated content is ready.',
        });
      } else {
        // Demo fallback content
        setGeneratedContent(
          `🎯 ${topic}\n\nThis is a sample ${contentTypeConfig[contentType].label.toLowerCase()} created with a ${tone} tone.\n\nConnect your AI content generation webhook to produce real content!`
        );
      }
    } catch (error) {
      // Demo fallback
      setGeneratedContent(
        `📝 Sample ${contentTypeConfig[contentType].label}\n\nTopic: ${topic}\nTone: ${tone}\n\nConnect the content generation webhook to enable AI-powered content creation.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!generatedContent.trim()) return;

    const newItem: ContentItem = {
      id: Date.now().toString(),
      type: contentType,
      title: topic || 'Untitled Content',
      content: generatedContent,
      tone: tone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setContentLibrary(prev => [newItem, ...prev]);
    toast({
      title: 'Saved to Library',
      description: 'Your content has been saved to the library.',
    });
    setGeneratedContent('');
    setTopic('');
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard.',
    });
  };

  const handleDeleteContent = (id: string) => {
    setContentLibrary(prev => prev.filter(item => item.id !== id));
    toast({
      title: 'Deleted',
      description: 'Content removed from library.',
    });
  };

  const handleUpdateContent = () => {
    if (!editItem) return;
    
    setContentLibrary(prev => prev.map(item => 
      item.id === editItem.id 
        ? { ...item, content: editContent, updated_at: new Date().toISOString() }
        : item
    ));
    setEditItem(null);
    toast({
      title: 'Updated',
      description: 'Content has been updated.',
    });
  };

  const handleUseTemplate = (template: Template) => {
    setContentType(template.type);
    setGeneratedContent(template.content);
    setSelectedTemplate(null);
    toast({
      title: 'Template Applied',
      description: 'You can now customize this template.',
    });
  };

  const handleRefineContent = async () => {
    if (!generatedContent.trim() || !tenantId) return;
    
    setIsGenerating(true);
    try {
      const result = await callWebhook(
        WEBHOOKS.GENERATE_CONTENT,
        {
          content_type: contentType,
          existing_content: generatedContent,
          action: 'refine',
          tone: tone,
          language: language,
        },
        tenantId
      );

      if (result.success && result.data) {
        setGeneratedContent((result.data as { content?: string })?.content || generatedContent);
      }
      toast({
        title: 'Content Refined',
        description: 'Your content has been improved.',
      });
    } catch {
      toast({
        title: 'Refinement unavailable',
        description: 'Connect the webhook for AI refinement.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredLibrary = contentLibrary.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      item.content.toLowerCase().includes(librarySearch.toLowerCase());
    const matchesFilter = libraryFilter === 'all' || item.type === libraryFilter;
    return matchesSearch && matchesFilter;
  });

  const industryTemplates = mockTemplates.filter(t => 
    !t.industry || t.industry === tenantConfig?.industry
  );

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Studio</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered content creation and management
          </p>
        </div>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generator" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Content Library
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Media Library
          </TabsTrigger>
        </TabsList>

        {/* AI Generator Tab */}
        <TabsContent value="generator" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Generate Content
                </CardTitle>
                <CardDescription>
                  Create AI-powered content for your marketing needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content Type Selection */}
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.entries(contentTypeConfig) as [ContentType, typeof contentTypeConfig[ContentType]][]).map(([type, config]) => (
                      <Button
                        key={type}
                        variant={contentType === type ? 'default' : 'outline'}
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => setContentType(type)}
                      >
                        {config.icon}
                        <span className="hidden sm:inline">{config.label.split(' ')[0]}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Topic/Brief */}
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic or Brief</Label>
                  <Textarea
                    id="topic"
                    placeholder="Describe what you want to create..."
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Tone and Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tones.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(l => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  className="w-full"
                  disabled={isGenerating || !topic.trim()}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {generatedContent && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRefineContent}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refine
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyContent(generatedContent)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <div className="space-y-4">
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={10}
                      className="resize-none"
                    />
                    <Button onClick={handleSaveToLibrary} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save to Library
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your generated content will appear here</p>
                    <p className="text-sm">Enter a topic and click Generate</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Library Tab */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={libraryFilter} 
              onValueChange={(v) => setLibraryFilter(v as ContentType | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(contentTypeConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredLibrary.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No content found</p>
                <p className="text-sm text-muted-foreground">
                  Generate some content to see it here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLibrary.map((item) => (
                <Card key={item.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge className={contentTypeConfig[item.type].color}>
                        {contentTypeConfig[item.type].icon}
                        <span className="ml-1">{contentTypeConfig[item.type].label}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-2 line-clamp-1">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.content}
                    </p>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setEditItem(item);
                        setEditContent(item.content);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyContent(item.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteContent(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Content</DialogTitle>
              </DialogHeader>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="resize-none"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateContent}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Pre-built templates to jumpstart your content creation
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {industryTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <Badge className={contentTypeConfig[template.type].color}>
                    {contentTypeConfig[template.type].icon}
                    <span className="ml-1">{contentTypeConfig[template.type].label}</span>
                  </Badge>
                  <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-muted p-2 rounded">
                    {template.content}
                  </p>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Template Preview Dialog */}
          <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge className={selectedTemplate ? contentTypeConfig[selectedTemplate.type].color : ''}>
                    {selectedTemplate && contentTypeConfig[selectedTemplate.type].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedTemplate?.description}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Template Content</Label>
                  <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap font-mono">
                    {selectedTemplate?.content}
                  </pre>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Close
                </Button>
                <Button onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Media Library Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Media Library
              </CardTitle>
              <CardDescription>
                Upload and manage images and videos for your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Media
                </Button>
              </div>
              
              <div className="mt-6 text-center text-muted-foreground">
                <p>No media files uploaded yet</p>
                <p className="text-sm">
                  Upload images and videos to use in your content
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
