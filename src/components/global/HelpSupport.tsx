import { useState } from 'react';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Send,
  Keyboard,
  ExternalLink,
  Search,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: KeyboardShortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['⌘', '/'], description: 'Open keyboard shortcuts', category: 'Navigation' },
  { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'Navigation' },
  { keys: ['⌘', 'N'], description: 'Create new item', category: 'Actions' },
  { keys: ['⌘', 'S'], description: 'Save changes', category: 'Actions' },
  { keys: ['⌘', 'F'], description: 'Search in page', category: 'Search' },
  { keys: ['⌘', 'Shift', 'F'], description: 'Global search', category: 'Search' },
  { keys: ['Esc'], description: 'Close dialog/modal', category: 'General' },
  { keys: ['Tab'], description: 'Navigate to next element', category: 'General' },
  { keys: ['Shift', 'Tab'], description: 'Navigate to previous element', category: 'General' },
];

const helpArticles = [
  { title: 'Getting Started', description: 'Learn the basics of the platform', url: '#' },
  { title: 'Managing Customers', description: 'How to add and manage your customers', url: '#' },
  { title: 'Creating Campaigns', description: 'Set up marketing campaigns', url: '#' },
  { title: 'Voice AI Setup', description: 'Configure AI voice agents', url: '#' },
  { title: 'Billing & Plans', description: 'Manage your subscription', url: '#' },
];

export function HelpSupport() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('feature');

  // Listen for keyboard shortcut to open shortcuts modal
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return;
    // In production, send to backend
    toast.success('Feedback submitted!', {
      description: 'Thank you for helping us improve.',
    });
    setFeedback('');
    setFeedbackOpen(false);
  };

  const filteredArticles = helpArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Help and support">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Help & Support</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Quick Links */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Quick Links</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={() => window.open('https://docs.lovable.dev', '_blank')}>
            <Book className="mr-2 h-4 w-4" />
            <span className="flex-1">Documentation</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span className="flex-1">Keyboard Shortcuts</span>
            <Badge variant="outline" className="text-[10px] h-5">⌘/</Badge>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            <span>Submit Feedback</span>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>Live Chat</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">Coming Soon</Badge>
          </DropdownMenuItem>

          {/* Help Articles */}
          {filteredArticles.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Popular Articles</DropdownMenuLabel>
              {filteredArticles.slice(0, 3).map((article, i) => (
                <DropdownMenuItem key={i} className="flex items-start gap-2 py-2">
                  <Book className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{article.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h4>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd
                            key={j}
                            className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-background px-1.5 font-mono text-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Feedback
            </DialogTitle>
            <DialogDescription>
              We'd love to hear your thoughts and suggestions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              {(['feature', 'bug', 'other'] as const).map((type) => (
                <Button
                  key={type}
                  variant={feedbackType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeedbackType(type)}
                  className="capitalize"
                >
                  {type === 'feature' ? '💡 Feature' : type === 'bug' ? '🐛 Bug' : '💬 Other'}
                </Button>
              ))}
            </div>

            <Textarea
              placeholder="Tell us what's on your mind..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitFeedback} disabled={!feedback.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
