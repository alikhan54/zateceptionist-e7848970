import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  Megaphone,
  UserCircle,
  Package,
  Phone,
  BarChart3,
  Settings,
  Shield,
  Search,
  Clock,
  Sparkles,
  FileText,
  Mail,
  DollarSign,
  Building2,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon: React.ReactNode;
  category: string;
}

const navigationItems: SearchResult[] = [
  // Core
  { id: 'dashboard', title: 'Dashboard', url: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, category: 'Core' },
  { id: 'customers', title: 'Customers', url: '/customers', icon: <Users className="h-4 w-4" />, category: 'Core' },
  { id: 'inbox', title: 'Inbox', url: '/inbox', icon: <MessageSquare className="h-4 w-4" />, category: 'Core' },
  { id: 'appointments', title: 'Appointments', url: '/appointments', icon: <Calendar className="h-4 w-4" />, category: 'Core' },
  { id: 'tasks', title: 'Tasks', url: '/tasks', icon: <FileText className="h-4 w-4" />, category: 'Core' },
  
  // Sales
  { id: 'sales-dashboard', title: 'Sales Dashboard', url: '/sales/dashboard', icon: <TrendingUp className="h-4 w-4" />, category: 'Sales' },
  { id: 'pipeline', title: 'Lead Pipeline', url: '/sales/pipeline', icon: <TrendingUp className="h-4 w-4" />, category: 'Sales' },
  { id: 'auto-leadgen', title: 'Auto Lead Generation', url: '/sales/auto-leadgen', icon: <Sparkles className="h-4 w-4" />, category: 'Sales' },
  { id: 'deals', title: 'Deals', url: '/sales/deals', icon: <DollarSign className="h-4 w-4" />, category: 'Sales' },
  { id: 'sequences', title: 'Sequences', url: '/sales/sequences', icon: <Mail className="h-4 w-4" />, category: 'Sales' },
  
  // Marketing
  { id: 'marketing', title: 'Marketing Hub', url: '/marketing', icon: <Megaphone className="h-4 w-4" />, category: 'Marketing' },
  { id: 'content-studio', title: 'Content Studio', url: '/marketing/content', icon: <FileText className="h-4 w-4" />, category: 'Marketing' },
  { id: 'campaigns', title: 'Campaigns', url: '/marketing/campaigns', icon: <Megaphone className="h-4 w-4" />, category: 'Marketing' },
  { id: 'social', title: 'Social Media', url: '/marketing/social', icon: <Users className="h-4 w-4" />, category: 'Marketing' },
  
  // HR
  { id: 'hr-dashboard', title: 'HR Dashboard', url: '/hr/dashboard', icon: <UserCircle className="h-4 w-4" />, category: 'HR' },
  { id: 'employees', title: 'Employees', url: '/hr/employees', icon: <Users className="h-4 w-4" />, category: 'HR' },
  { id: 'attendance', title: 'Attendance', url: '/hr/attendance', icon: <Clock className="h-4 w-4" />, category: 'HR' },
  { id: 'payroll', title: 'Payroll', url: '/hr/payroll', icon: <DollarSign className="h-4 w-4" />, category: 'HR' },
  
  // Operations
  { id: 'inventory', title: 'Inventory', url: '/operations/inventory', icon: <Package className="h-4 w-4" />, category: 'Operations' },
  { id: 'orders', title: 'Orders', url: '/operations/orders', icon: <Package className="h-4 w-4" />, category: 'Operations' },
  { id: 'vendors', title: 'Vendors', url: '/operations/vendors', icon: <Building2 className="h-4 w-4" />, category: 'Operations' },
  
  // Communications
  { id: 'voice-ai', title: 'Voice AI', url: '/communications/voice', icon: <Phone className="h-4 w-4" />, category: 'Communications' },
  { id: 'whatsapp', title: 'WhatsApp', url: '/communications/whatsapp', icon: <MessageSquare className="h-4 w-4" />, category: 'Communications' },
  { id: 'email', title: 'Email', url: '/communications/email', icon: <Mail className="h-4 w-4" />, category: 'Communications' },
  
  // Analytics
  { id: 'analytics', title: 'Analytics Hub', url: '/analytics', icon: <BarChart3 className="h-4 w-4" />, category: 'Analytics' },
  { id: 'realtime', title: 'Realtime Dashboard', url: '/analytics/realtime', icon: <BarChart3 className="h-4 w-4" />, category: 'Analytics' },
  { id: 'reports', title: 'Reports', url: '/analytics/reports', icon: <FileText className="h-4 w-4" />, category: 'Analytics' },
  
  // Settings
  { id: 'settings', title: 'Settings', url: '/settings', icon: <Settings className="h-4 w-4" />, category: 'Settings' },
  { id: 'integrations', title: 'Integrations', url: '/settings/integrations', icon: <Settings className="h-4 w-4" />, category: 'Settings' },
  { id: 'team', title: 'Team', url: '/settings/team', icon: <Users className="h-4 w-4" />, category: 'Settings' },
  
  // Admin
  { id: 'admin', title: 'Admin Panel', url: '/admin', icon: <Shield className="h-4 w-4" />, category: 'Admin' },
  { id: 'tenants', title: 'Tenants', url: '/admin/tenants', icon: <Building2 className="h-4 w-4" />, category: 'Admin' },
];

const quickActions = [
  { id: 'new-customer', title: 'Create New Customer', description: 'Add a new customer to CRM', icon: <Users className="h-4 w-4" /> },
  { id: 'new-campaign', title: 'Create Campaign', description: 'Start a new marketing campaign', icon: <Megaphone className="h-4 w-4" /> },
  { id: 'new-deal', title: 'Create Deal', description: 'Add a new sales deal', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'new-task', title: 'Create Task', description: 'Add a new task', icon: <FileText className="h-4 w-4" /> },
];

const RECENT_SEARCHES_KEY = 'command-palette-recent';
const MAX_RECENT = 5;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (url: string) => {
    saveRecentSearch(search);
    setOpen(false);
    setSearch('');
    navigate(url);
  };

  const handleAction = (actionId: string) => {
    setOpen(false);
    setSearch('');
    // Navigate to relevant page with action param
    switch (actionId) {
      case 'new-customer':
        navigate('/customers?action=new');
        break;
      case 'new-campaign':
        navigate('/marketing/campaigns?action=new');
        break;
      case 'new-deal':
        navigate('/sales/deals?action=new');
        break;
      case 'new-task':
        navigate('/tasks?action=new');
        break;
    }
  };

  // Group navigation items by category
  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Filter items based on search
  const filteredGroups = Object.entries(groupedItems).reduce((acc, [category, items]) => {
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Trigger button for header */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search pages, actions, or type a command..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No results found for "{search}"</p>
            </div>
          </CommandEmpty>

          {/* Recent Searches */}
          {!search && recentSearches.length > 0 && (
            <>
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((term, i) => (
                  <CommandItem key={i} onSelect={() => setSearch(term)}>
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {term}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quick Actions */}
          {!search && (
            <>
              <CommandGroup heading="Quick Actions">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleAction(action.id)}
                    className="flex items-center gap-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      {action.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{action.title}</span>
                      <span className="text-xs text-muted-foreground">{action.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation Groups */}
          {Object.entries(filteredGroups).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item.url)}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center text-muted-foreground">
                    {item.icon}
                  </div>
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
