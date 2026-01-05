import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
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
  UserCheck,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
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
  const { signOut, isAdmin, isMasterAdmin, user } = useAuth();
  const { tenantConfig, translate } = useTenant();

  // Collapsible section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sales: true,
    marketing: false,
    hr: false,
  });

  const isActive = (path: string) => location.pathname === path;
  const isInSection = (paths: string[]) => paths.some(p => location.pathname.startsWith(p));

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Navigation sections with dynamic translations
  const mainSection: NavSection = {
    label: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Inbox', url: '/inbox', icon: MessageSquare },
      { title: translate('appointments'), url: '/appointments', icon: Calendar, translationKey: 'appointments' },
      { title: translate('customers'), url: '/customers', icon: Users, translationKey: 'customers' },
      { title: 'Tasks', url: '/tasks', icon: CheckSquare },
    ],
  };

  const salesSection: NavSection = {
    label: 'Sales AI',
    collapsible: true,
    items: [
      { title: 'Sales Dashboard', url: '/sales/dashboard', icon: TrendingUp },
      { title: 'Lead Pipeline', url: '/sales/pipeline', icon: Target },
      { title: 'Auto Lead Gen', url: '/sales/auto-leadgen', icon: Sparkles },
      { title: 'Deal Tracker', url: '/sales/deals', icon: Briefcase },
      { title: 'Sales Analytics', url: '/sales/analytics', icon: BarChart3 },
    ],
  };

  const marketingSection: NavSection = {
    label: 'Marketing AI',
    collapsible: true,
    items: [
      { title: 'Marketing Dashboard', url: '/marketing', icon: Megaphone },
      { title: 'Content Studio', url: '/marketing/content', icon: PenTool },
      { title: 'Campaign Central', url: '/marketing/campaigns', icon: Send },
      { title: 'Social Commander', url: '/marketing/social', icon: Share2 },
      { title: 'Marketing Analytics', url: '/marketing/analytics', icon: PieChart },
    ],
  };

  const hrSection: NavSection = {
    label: 'HR AI',
    collapsible: true,
    featureKey: 'hr_module',
    items: [
      { title: 'HR Dashboard', url: '/hr/dashboard', icon: Building2 },
      { title: translate('staffs'), url: '/hr/employees', icon: Users, translationKey: 'staffs' },
      { title: 'Attendance', url: '/hr/attendance', icon: Clock },
      { title: 'Leave Management', url: '/hr/leave', icon: CalendarDays },
      { title: 'Payroll', url: '/hr/payroll', icon: DollarSign },
      { title: 'Departments', url: '/hr/departments', icon: Network },
      { title: 'Performance', url: '/hr/performance', icon: TrendingUp },
      { title: 'Training', url: '/hr/training', icon: GraduationCap },
      { title: 'Documents', url: '/hr/documents', icon: FileText },
      { title: 'Reports', url: '/hr/reports', icon: BarChart3 },
      { title: 'HR AI Assistant', url: '/hr/ai-assistant', icon: Bot },
    ],
  };

  const settingsSection: NavSection = {
    label: 'Settings',
    items: [
      { title: 'Settings', url: '/settings', icon: Settings },
      { title: 'Voice AI Settings', url: '/settings/voice-ai', icon: Mic },
    ],
  };

  const adminSection: NavSection = {
    label: 'Admin',
    adminOnly: true,
    items: [
      { title: 'Admin Panel', url: '/admin-panel', icon: Shield },
    ],
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Check if feature is enabled
  const isFeatureEnabled = (featureKey?: string) => {
    if (!featureKey) return true;
    return tenantConfig?.features?.[featureKey] === true;
  };

  // Apply primary color as CSS variable
  const accentStyle = tenantConfig?.primary_color
    ? { '--sidebar-accent': tenantConfig.primary_color } as React.CSSProperties
    : {};

  const NavItem = ({ item }: { item: NavItem }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => navigate(item.url)}
        className={cn(
          'w-full justify-start gap-3 transition-colors',
          isActive(item.url) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="truncate">{item.title}</span>
        )}
        {!collapsed && isActive(item.url) && (
          <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
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
      // In collapsed mode, just show icons without section headers
      return (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <NavItem key={item.url} item={item} />
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
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1 flex items-center justify-between">
              <span>{section.label}</span>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )} />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <NavItem key={item.url} item={item} />
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
      {!collapsed && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => (
            <NavItem key={item.url} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r" style={accentStyle}>
      {/* Header with tenant logo and company name */}
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

      <SidebarContent className="px-2 py-2">
        {/* Main Section - Always visible */}
        <StaticSection section={mainSection} />

        {/* Sales AI Section - Collapsible */}
        <CollapsibleSection section={salesSection} sectionKey="sales" />

        {/* Marketing AI Section - Collapsible */}
        <CollapsibleSection section={marketingSection} sectionKey="marketing" />

        {/* HR AI Section - Collapsible, feature-gated */}
        {isFeatureEnabled(hrSection.featureKey) && (
          <CollapsibleSection section={hrSection} sectionKey="hr" />
        )}

        {/* Settings Section */}
        <StaticSection section={settingsSection} />

        {/* Admin Section - Only for admin/master_admin */}
        {(isAdmin || isMasterAdmin) && (
          <StaticSection section={adminSection} />
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
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
