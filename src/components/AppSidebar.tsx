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
  Users,
  MessageSquare,
  Calendar,
  Target,
  Briefcase,
  Megaphone,
  Settings,
  LogOut,
  Building2,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Inbox', url: '/inbox', icon: MessageSquare },
  { title: 'Appointments', url: '/appointments', icon: Calendar },
];

const salesNavItems = [
  { title: 'Leads', url: '/leads', icon: Target },
  { title: 'Deals', url: '/deals', icon: Briefcase },
];

const marketingNavItems = [
  { title: 'Campaigns', url: '/campaigns', icon: Megaphone },
];

const hrNavItems = [
  { title: 'HR Dashboard', url: '/hr/dashboard', icon: Building2 },
  { title: 'Employees', url: '/hr/employees', icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { tenantConfig, t } = useTenant();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Get translated nav items
  const getNavLabel = (title: string) => {
    const translations: Record<string, string> = {
      'Customers': t('customers'),
      'Appointments': t('appointments'),
      'Leads': t('leads'),
      'Deals': t('deals'),
    };
    return translations[title] || title;
  };

  const NavItem = ({ item }: { item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> } }) => (
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
          <span>{getNavLabel(item.title)}</span>
        )}
        {!collapsed && isActive(item.url) && (
          <ChevronRight className="h-4 w-4 ml-auto" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Zateceptionist</span>
              <span className="text-xs text-muted-foreground truncate max-w-32">
                {tenantConfig?.business_name || 'Business Hub'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Sales</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {salesNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Marketing</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>HR</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {hrNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/settings')}
              className={cn(
                'w-full justify-start gap-3',
                isActive('/settings') && 'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
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
