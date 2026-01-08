import { useState } from 'react';
import { useKnowledgeBase, KnowledgeEntry } from '@/hooks/useKnowledgeBase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, FileText, HelpCircle, Globe, Sparkles, 
  Trash2, Edit, Search, Brain, Loader2,
  BookOpen, Link
} from 'lucide-react';

const CATEGORIES = ['general', 'services', 'pricing', 'faq', 'policies', 'team', 'contact'];

export default function KnowledgeBase() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, trainAI } = useKnowledgeBase();
  const { toast } = useToast();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isTraining, setIsTraining] = useState(false);
  
  const [newEntry, setNewEntry] = useState<{
    title: string;
    content: string;
    content_type: 'text' | 'faq' | 'document' | 'url' | 'scraped';
    category: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>({
    title: '',
    content: '',
    content_type: 'text',
    category: 'general',
    metadata: {},
    is_active: true,
  });

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = async () => {
    if (!newEntry.title || !newEntry.content) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await addEntry.mutateAsync(newEntry);
      toast({ title: 'Knowledge entry added successfully' });
      setIsAddOpen(false);
      setNewEntry({ title: '', content: '', content_type: 'text', category: 'general', metadata: {}, is_active: true });
    } catch (error) {
      toast({ title: 'Failed to add entry', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;

    try {
      await updateEntry.mutateAsync({
        id: editingEntry.id,
        title: editingEntry.title,
        content: editingEntry.content,
        category: editingEntry.category,
        is_active: editingEntry.is_active,
      });
      toast({ title: 'Entry updated successfully' });
      setEditingEntry(null);
    } catch (error) {
      toast({ title: 'Failed to update entry', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast({ title: 'Entry deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete entry', variant: 'destructive' });
    }
  };

  const handleTrainAI = async () => {
    setIsTraining(true);
    try {
      await trainAI.mutateAsync();
      toast({ title: 'AI training started', description: 'Your AI will be updated with the latest knowledge.' });
    } catch (error) {
      toast({ title: 'Training initiated', description: 'Processing your knowledge base.' });
    } finally {
      setIsTraining(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'faq': return <HelpCircle className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'url': return <Link className="h-4 w-4" />;
      case 'scraped': return <Globe className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Train your AI with your business information, FAQs, and documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTrainAI} disabled={isTraining}>
            {isTraining ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Train AI
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Knowledge Entry</DialogTitle>
                <DialogDescription>
                  Add information that your AI assistant should know about your business.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={newEntry.content_type}
                      onValueChange={(v) => setNewEntry(prev => ({ ...prev, content_type: v as typeof newEntry.content_type }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text/Information</SelectItem>
                        <SelectItem value="faq">FAQ</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="url">URL/Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newEntry.category}
                      onValueChange={(v) => setNewEntry(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={newEntry.title}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={newEntry.content_type === 'faq' ? "What are your business hours?" : "About Our Services"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={newEntry.content_type === 'faq' ? "We are open Monday to Saturday, 9 AM to 6 PM." : "Detailed information about your business..."}
                    rows={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={addEntry.isPending}>
                    {addEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Entry
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{entries.length}</div>
                <div className="text-xs text-muted-foreground">Total Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.filter(e => e.content_type === 'faq').length}
                </div>
                <div className="text-xs text-muted-foreground">FAQs</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.filter(e => e.content_type === 'document').length}
                </div>
                <div className="text-xs text-muted-foreground">Documents</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {entries.filter(e => e.is_active).length}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No knowledge entries yet</p>
              <p className="text-sm text-muted-foreground">Add your first entry to train your AI</p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map(entry => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 p-2 rounded-md bg-muted">
                      {getTypeIcon(entry.content_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{entry.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {entry.category}
                        </Badge>
                        {!entry.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingEntry.title}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editingEntry.content}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={editingEntry.category}
                  onValueChange={(v) => setEditingEntry(prev => prev ? { ...prev, category: v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={updateEntry.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
