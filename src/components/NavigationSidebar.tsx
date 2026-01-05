import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  CheckSquare,
  TrendingUp,
  Target,
  Sparkles,
  Briefcase,
  BarChart3,
  Megaphone,
  PenTool,
  Send,
  Share2,
  PieChart,
  Building2,
  FileText,
  Settings,
  Mic,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
  Zap,
  Clock,
  CalendarDays,
  DollarSign,
  Network,
  GraduationCap,
  Bot,
  UserCog,
  Phone,
  Globe,
  Receipt,
  FileCheck,
  Award,
  Bell,
  Activity,
  Workflow,
  Key,
  Webhook,
  BarChart2,
  LineChart,
  Package,
  ShoppingCart,
  CreditCard,
  Headphones,
  MessageCircle,
  Voicemail,
  Radio,
  Layers,
  GitBranch,
  ClipboardList,
  UserPlus,
  Truck,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  translationKey?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  featureKey?: string;
  adminOnly?: boolean;
}

export function NavigationSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isMasterAdmin } = useAuth();
  const { tenantConfig, translate } = useTenant();
  const { isEnabled } = useFeatureFlags();

  // Collapsible section states - auto-expand based on current route
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => location.pathname === path;
  const isInSection = (paths: string[]) => paths.some(p => location.pathname.startsWith(p));

  // Auto-expand section when route matches
  useEffect(() => {
    const currentPath = location.pathname;
    const sectionMappings: Record<string, string[]> = {
      sales: ['/sales'],
      marketing: ['/marketing'],
      hr: ['/hr'],
      operations: ['/operations'],
      communications: ['/communications'],
      analytics: ['/analytics'],
      settings: ['/settings'],
      admin: ['/admin'],
    };

    const newOpenSections: Record<string, boolean> = { ...openSections };
    Object.entries(sectionMappings).forEach(([key, paths]) => {
      if (paths.some(p => currentPath.startsWith(p))) {
        newOpenSections[key] = true;
      }
    });
    setOpenSections(newOpenSections);
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Keyboard navigation
  useEffect(() => {
    let keyBuffer = '';
    let keyTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      clearTimeout(keyTimeout);
      keyBuffer += e.key.toLowerCase();
      
      keyTimeout = setTimeout(() => {
        keyBuffer = '';
      }, 500);

      const shortcuts: Record<string, string> = {
        'gd': '/dashboard',
        'gi': '/inbox',
        'ga': '/appointments',
        'gc': '/customers',
        'gt': '/tasks',
        'gs': '/sales/dashboard',
        'gm': '/marketing',
        'gh': '/hr/dashboard',
        'go': '/operations/inventory',
        'gv': '/communications/voice',
        'gr': '/analytics',
        'g,': '/settings',
      };

      Object.entries(shortcuts).forEach(([shortcut, path]) => {
        if (keyBuffer.endsWith(shortcut)) {
          navigate(path);
          keyBuffer = '';
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Navigation sections
  const mainSection: NavSection = {
    label: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Inbox', url: '/inbox', icon: MessageSquare },
      { title: translate('appointments'), url: '/appointments', icon: Calendar },
      { title: translate('customers'), url: '/customers', icon: Users },
      { title: 'Tasks', url: '/tasks', icon: CheckSquare },
    ],
  };

  const salesSection: NavSection = {
    label: 'Sales AI',
    collapsible: true,
    featureKey: 'sales_module',
    items: [
      { title: 'Sales Dashboard', url: '/sales/dashboard', icon: TrendingUp },
      { title: 'Lead Pipeline', url: '/sales/pipeline', icon: Target },
      { title: 'Auto Lead Gen', url: '/sales/auto-leadgen', icon: Sparkles },
      { title: 'Deal Tracker', url: '/sales/deals', icon: Briefcase },
      { title: 'Sequences', url: '/sales/sequences', icon: Workflow },
      { title: 'Proposals', url: '/sales/proposals', icon: FileText },
      { title: 'Sales Analytics', url: '/sales/analytics', icon: BarChart3 },
      { title: 'Forecasting', url: '/sales/forecast', icon: LineChart },
    ],
  };

  const marketingSection: NavSection = {
    label: 'Marketing AI',
    collapsible: true,
    featureKey: 'marketing_module',
    items: [
      { title: 'Marketing Hub', url: '/marketing', icon: Megaphone },
      { title: 'Content Studio', url: '/marketing/content', icon: PenTool },
      { title: 'Campaign Central', url: '/marketing/campaigns', icon: Send },
      { title: 'Social Commander', url: '/marketing/social', icon: Share2 },
      { title: 'Email Builder', url: '/marketing/email', icon: Mail },
      { title: 'Landing Pages', url: '/marketing/landing', icon: Globe },
      { title: 'Marketing Analytics', url: '/marketing/analytics', icon: PieChart },
      { title: 'A/B Testing', url: '/marketing/ab-testing', icon: GitBranch },
    ],
  };

  const hrSection: NavSection = {
    label: 'HR AI',
    collapsible: true,
    featureKey: 'hr_module',
    items: [
      { title: 'HR Dashboard', url: '/hr/dashboard', icon: Building2 },
      { title: translate('staffs'), url: '/hr/employees', icon: Users },
      { title: 'Attendance', url: '/hr/attendance', icon: Clock },
      { title: 'Leave Management', url: '/hr/leave', icon: CalendarDays },
      { title: 'Payroll', url: '/hr/payroll', icon: DollarSign },
      { title: 'Departments', url: '/hr/departments', icon: Network },
      { title: 'Performance', url: '/hr/performance', icon: Award },
      { title: 'Training', url: '/hr/training', icon: GraduationCap },
      { title: 'Recruitment', url: '/hr/recruitment', icon: UserPlus },
      { title: 'Documents', url: '/hr/documents', icon: FileText },
      { title: 'Reports', url: '/hr/reports', icon: BarChart3 },
      { title: 'HR AI Assistant', url: '/hr/ai-assistant', icon: Bot },
    ],
  };

  const operationsSection: NavSection = {
    label: 'Operations',
    collapsible: true,
    featureKey: 'operations_module',
    items: [
      { title: 'Inventory', url: '/operations/inventory', icon: Package },
      { title: 'Orders', url: '/operations/orders', icon: ShoppingCart },
      { title: 'Vendors', url: '/operations/vendors', icon: Truck },
      { title: 'Expenses', url: '/operations/expenses', icon: Receipt },
      { title: 'Invoices', url: '/operations/invoices', icon: FileCheck },
    ],
  };

  const communicationsSection: NavSection = {
    label: 'Communications',
    collapsible: true,
    featureKey: 'communications_module',
    items: [
      { title: 'Voice AI', url: '/communications/voice', icon: Phone },
      { title: 'WhatsApp', url: '/communications/whatsapp', icon: MessageCircle },
      { title: 'Email', url: '/communications/email', icon: Mail },
      { title: 'SMS', url: '/communications/sms', icon: MessageSquare },
      { title: 'Call Center', url: '/communications/call-center', icon: Headphones },
      { title: 'IVR Builder', url: '/communications/ivr', icon: Voicemail },
    ],
  };

  const analyticsSection: NavSection = {
    label: 'Analytics & AI',
    collapsible: true,
    featureKey: 'analytics_module',
    items: [
      { title: 'Analytics Hub', url: '/analytics', icon: Activity },
      { title: 'Real-time Dashboard', url: '/analytics/realtime', icon: Radio },
      { title: 'Custom Reports', url: '/analytics/reports', icon: BarChart2 },
      { title: 'AI Insights', url: '/analytics/ai-insights', icon: Sparkles },
      { title: 'Predictions', url: '/analytics/predictions', icon: TrendingUp },
    ],
  };

  const settingsSection: NavSection = {
    label: 'Settings',
    collapsible: true,
    items: [
      { title: 'General Settings', url: '/settings', icon: Settings },
      { title: 'Voice AI Config', url: '/settings/voice-ai', icon: Mic },
      { title: 'Integrations', url: '/settings/integrations', icon: Webhook },
      { title: 'API Keys', url: '/settings/api-keys', icon: Key },
      { title: 'Team', url: '/settings/team', icon: UserCog },
      { title: 'Billing', url: '/settings/billing', icon: CreditCard },
      { title: 'Notifications', url: '/settings/notifications', icon: Bell },
    ],
  };

  const adminSection: NavSection = {
    label: 'Master Admin',
    adminOnly: true,
    collapsible: true,
    items: [
      { title: 'Admin Panel', url: '/admin', icon: Shield },
      { title: 'All Tenants', url: '/admin/tenants', icon: Building2 },
      { title: 'System Health', url: '/admin/health', icon: Activity },
      { title: 'Audit Logs', url: '/admin/logs', icon: ClipboardList },
      { title: 'Feature Flags', url: '/admin/features', icon: Layers },
    ],
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Check if feature is enabled
  const isFeatureEnabled = (featureKey?: string) => {
    if (!featureKey) return true;
    return isEnabled(featureKey);
  };

  // Apply primary color as CSS variable
  const accentStyle = tenantConfig?.primary_color
    ? { '--sidebar-accent': tenantConfig.primary_color } as React.CSSProperties
    : {};

  const NavItemComponent = ({ item }: { item: NavItem }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => navigate(item.url)}
        className={cn(
          'w-full justify-start gap-3 transition-all duration-200',
          isActive(item.url) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.title}</span>
            {item.badge !== undefined && (
              <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
            {isActive(item.url) && (
              <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
            )}
          </>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const CollapsibleSection = ({ 
    section, 
    sectionKey 
  }: { 
    section: NavSection; 
    sectionKey: string;
  }) => {
    const isOpen = openSections[sectionKey] || isInSection(section.items.map(i => i.url));
    
    if (collapsed) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.slice(0, 3).map((item) => (
                <NavItemComponent key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 flex items-center justify-between transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider">{section.label}</span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down">
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <NavItemComponent key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  const StaticSection = ({ section }: { section: NavSection }) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2">
          {section.label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => (
            <NavItemComponent key={item.url} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r" style={accentStyle}>
      {/* Header */}
      <SidebarHeader className="p-4 border-b">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          {tenantConfig?.logo_url ? (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={tenantConfig.logo_url} alt={tenantConfig.company_name || 'Company'} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tenantConfig.company_name?.charAt(0) || 'Z'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">
                {tenantConfig?.company_name || 'Zateceptionist'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {tenantConfig?.industry ? tenantConfig.industry.replace('_', ' ') : 'Business Hub'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 space-y-1">
        {/* Main Section */}
        <StaticSection section={mainSection} />

        {/* Sales AI Section */}
        {isFeatureEnabled(salesSection.featureKey) && (
          <CollapsibleSection section={salesSection} sectionKey="sales" />
        )}

        {/* Marketing AI Section */}
        {isFeatureEnabled(marketingSection.featureKey) && (
          <CollapsibleSection section={marketingSection} sectionKey="marketing" />
        )}

        {/* HR AI Section */}
        {isFeatureEnabled(hrSection.featureKey) && (
          <CollapsibleSection section={hrSection} sectionKey="hr" />
        )}

        {/* Operations Section */}
        {isFeatureEnabled(operationsSection.featureKey) && (
          <CollapsibleSection section={operationsSection} sectionKey="operations" />
        )}

        {/* Communications Section */}
        {isFeatureEnabled(communicationsSection.featureKey) && (
          <CollapsibleSection section={communicationsSection} sectionKey="communications" />
        )}

        {/* Analytics Section */}
        {isFeatureEnabled(analyticsSection.featureKey) && (
          <CollapsibleSection section={analyticsSection} sectionKey="analytics" />
        )}

        {/* Settings Section */}
        <CollapsibleSection section={settingsSection} sectionKey="settings" />

        {/* Admin Section */}
        {(isAdmin || isMasterAdmin) && (
          <CollapsibleSection section={adminSection} sectionKey="admin" />
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        {!collapsed && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p>Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">g</kbd> + key for shortcuts</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
