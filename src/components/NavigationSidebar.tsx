import { Video, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
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
} from "@/components/ui/sidebar";
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
  Layers,
  GitBranch,
  ClipboardList,
  BookOpen,
  UserPlus,
  Truck,
  Mail,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

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
  managerOnly?: boolean;
  staffOnly?: boolean;
}

// Sections that staff cannot see
const STAFF_RESTRICTED_SECTIONS = ["Sales AI", "Marketing AI", "HR AI", "Operations", "Analytics & AI"];

export function NavigationSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin, isMasterAdmin, authUser, hasPermission } = useAuth();
  const { tenantConfig, translate, tenantId, setTenantId } = useTenant();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();

  // Collapsible section states - auto-expand based on current route
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => location.pathname === path;
  const isInSection = (paths: string[]) => paths.some((p) => location.pathname.startsWith(p));

  // Close sections when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector("[data-sidebar]");
      if (sidebar && !sidebar.contains(event.target as Node)) {
        setOpenSections({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if user is impersonating (master admin viewing a different tenant)
  const isImpersonating = isMasterAdmin && authUser?.tenant_id && authUser.tenant_id !== tenantId;

  // Auto-expand section when route matches
  useEffect(() => {
    const currentPath = location.pathname;
    const sectionMappings: Record<string, string[]> = {
      sales: ["/sales"],
      marketing: ["/marketing"],
      hr: ["/hr"],
      operations: ["/operations"],
      communications: ["/communications"],
      analytics: ["/analytics"],
      settings: ["/settings"],
      admin: ["/admin"],
    };

    const newOpenSections: Record<string, boolean> = { ...openSections };
    Object.entries(sectionMappings).forEach(([key, paths]) => {
      if (paths.some((p) => currentPath.startsWith(p))) {
        newOpenSections[key] = true;
      }
    });
    setOpenSections(newOpenSections);
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Keyboard navigation
  useEffect(() => {
    let keyBuffer = "";
    let keyTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      clearTimeout(keyTimeout);
      keyBuffer += e.key.toLowerCase();

      keyTimeout = setTimeout(() => {
        keyBuffer = "";
      }, 500);

      const shortcuts: Record<string, string> = {
        gd: "/dashboard",
        gi: "/inbox",
        ga: "/appointments",
        gc: "/customers",
        gt: "/tasks",
        gs: "/sales/dashboard",
        gm: "/marketing",
        gh: "/hr/dashboard",
        go: "/operations/inventory",
        gv: "/communications/voice",
        gr: "/analytics",
        "g,": "/settings",
      };

      Object.entries(shortcuts).forEach(([shortcut, path]) => {
        if (keyBuffer.endsWith(shortcut)) {
          navigate(path);
          keyBuffer = "";
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Helper function to check if user can see section
  const canAccessSection = (section: NavSection): boolean => {
    // Master admin sees EVERYTHING
    if (isMasterAdmin) return true;

    // CRITICAL FIX: adminOnly sections (like Master Admin) are ONLY for master_admin
    // Regular admins should NOT see these sections
    if (section.adminOnly) return false;

    // Admin can see all non-adminOnly sections
    if (isAdmin) return true;

    // Check managerOnly flag
    if (section.managerOnly && authUser?.role === "staff") return false;

    // Check staffOnly flag - this section should ONLY show for staff
    if (section.staffOnly && authUser?.role !== "staff") return false;

    // For staff, check if they have specific permissions
    if (authUser?.role === "staff") {
      // Check staff permissions if available
      if (authUser.staffPermissions) {
        const perms = authUser.staffPermissions;
        if (section.label === "Sales AI" && !perms.can_access_sales) return false;
        if (section.label === "Marketing AI" && !perms.can_access_marketing) return false;
        if (section.label === "HR AI" && !perms.can_access_hr) return false;
        if (section.label === "Operations" && !perms.can_access_operations) return false;
        if (section.label === "Analytics & AI" && !perms.can_access_analytics) return false;
      } else {
        // Default: staff without explicit permissions cannot see restricted sections
        if (STAFF_RESTRICTED_SECTIONS.includes(section.label)) return false;
      }
    }

    // Check feature flag
    if (section.featureKey && !isFeatureEnabled(section.featureKey)) return false;

    return true;
  };

  // Get role badge color
  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "master_admin":
        return "border-purple-500 text-purple-500 bg-purple-500/10";
      case "admin":
        return "border-blue-500 text-blue-500 bg-blue-500/10";
      case "manager":
        return "border-green-500 text-green-500 bg-green-500/10";
      case "staff":
      default:
        return "border-muted-foreground text-muted-foreground bg-muted/50";
    }
  };

  // Format role for display
  const formatRole = (role?: string) => {
    if (!role) return "User";
    return role
      .replace("_", " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Handle exit impersonation
  const handleExitImpersonation = () => {
    if (authUser?.tenant_id) {
      setTenantId(authUser.tenant_id);
      toast({ title: "Returned to Admin View" });
    }
  };

  // Navigation sections
  const mainSection: NavSection = {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Inbox", url: "/inbox", icon: MessageSquare },
      { title: translate("appointments"), url: "/appointments", icon: Calendar },
      { title: translate("customers"), url: "/customers", icon: Users },
      { title: "Tasks", url: "/tasks", icon: CheckSquare },
    ],
  };

  // Staff-specific section
  const staffSection: NavSection = {
    label: "My Work",
    staffOnly: true,
    items: [
      { title: "My Tasks", url: "/tasks", icon: CheckSquare },
      { title: "My Inbox", url: "/inbox", icon: MessageSquare },
      { title: "My Calendar", url: "/appointments", icon: Calendar },
      { title: "My Customers", url: "/customers", icon: Users },
    ],
  };

  const salesSection: NavSection = {
    label: "Sales AI",
    collapsible: true,
    featureKey: "sales_module",
    items: [
      { title: "Sales Dashboard", url: "/sales/dashboard", icon: TrendingUp },
      { title: "Lead Pipeline", url: "/sales/pipeline", icon: Target },
      { title: "Auto Lead Gen", url: "/sales/auto-leadgen", icon: Sparkles },
      { title: "Deal Tracker", url: "/sales/deals", icon: Briefcase },
      { title: "Sequences", url: "/sales/sequences", icon: Workflow },
      { title: "Proposals", url: "/sales/proposals", icon: FileText },
      { title: "Sales Analytics", url: "/sales/analytics", icon: BarChart3 },
      { title: "Forecasting", url: "/sales/forecast", icon: LineChart },
    ],
  };

  const marketingSection: NavSection = {
    label: "Marketing AI",
    collapsible: true,
    featureKey: "marketing_module",
    items: [
      { title: "Marketing Hub", url: "/marketing", icon: Megaphone },
      { title: "Content Studio", url: "/marketing/content", icon: PenTool },
      { title: "Campaign Central", url: "/marketing/campaigns", icon: Send },
      { title: "Social Commander", url: "/marketing/social", icon: Share2 },
      { title: "Email Builder", url: "/marketing/email", icon: Mail },
      { title: "Landing Pages", url: "/marketing/landing", icon: Globe },
      { title: "Marketing Analytics", url: "/marketing/analytics", icon: PieChart },
      { title: "A/B Testing", url: "/marketing/ab-testing", icon: GitBranch },
    ],
  };

  const hrSection: NavSection = {
    label: "HR AI",
    collapsible: true,
    featureKey: "hr_module",
    items: [
      { title: "HR Dashboard", url: "/hr/dashboard", icon: Building2 },
      { title: translate("staffs"), url: "/hr/employees", icon: Users },
      { title: "Attendance", url: "/hr/attendance", icon: Clock },
      { title: "Leave Management", url: "/hr/leave", icon: CalendarDays },
      { title: "Payroll", url: "/hr/payroll", icon: DollarSign },
      { title: "Departments", url: "/hr/departments", icon: Network },
      { title: "Performance", url: "/hr/performance", icon: Award },
      { title: "Training", url: "/hr/training", icon: GraduationCap },
      { title: "Recruitment", url: "/hr/recruitment", icon: UserPlus },
      { title: "Documents", url: "/hr/documents", icon: FileText },
      { title: "Reports", url: "/hr/reports", icon: BarChart3 },
      { title: "HR AI Assistant", url: "/hr/ai-assistant", icon: Bot },
    ],
  };

  const operationsSection: NavSection = {
    label: "Operations",
    collapsible: true,
    featureKey: "operations_module",
    items: [
      { title: "Inventory", url: "/operations/inventory", icon: Package },
      { title: "Orders", url: "/operations/orders", icon: ShoppingCart },
      { title: "Vendors", url: "/operations/vendors", icon: Truck },
      { title: "Expenses", url: "/operations/expenses", icon: Receipt },
      { title: "Invoices", url: "/operations/invoices", icon: FileCheck },
    ],
  };

  const communicationsSection: NavSection = {
    label: "Communications",
    collapsible: true,
    featureKey: "communications_module",
    items: [
      { title: "Voice AI", url: "/communications/voice", icon: Phone },
      { title: "WhatsApp", url: "/communications/whatsapp", icon: MessageCircle },
      { title: "Email", url: "/communications/email", icon: Mail },
      { title: "SMS", url: "/communications/sms", icon: MessageSquare },
      { title: "Call Center", url: "/communications/call-center", icon: Headphones },
      { title: "IVR Builder", url: "/communications/ivr", icon: Voicemail },
    ],
  };

  const analyticsSection: NavSection = {
    label: "Analytics & AI",
    collapsible: true,
    featureKey: "analytics_module",
    items: [
      { title: "Analytics Hub", url: "/analytics", icon: Activity },
      { title: "Real-time Dashboard", url: "/analytics/realtime", icon: BarChart2 },
      { title: "Custom Reports", url: "/analytics/reports", icon: BarChart3 },
      { title: "AI Insights", url: "/analytics/ai-insights", icon: Sparkles },
      { title: "Predictions", url: "/analytics/predictions", icon: TrendingUp },
    ],
  };

  const settingsSection: NavSection = {
    label: "Settings",
    collapsible: true,
    items: [
      { title: "General Settings", url: "/settings", icon: Settings },
      { title: "Voice AI Config", url: "/settings/voice-ai", icon: Mic },
      { title: "Integrations", url: "/settings/integrations", icon: Webhook },
      { title: "API Keys", url: "/settings/api-keys", icon: Key },
      { title: "Team", url: "/settings/team", icon: UserCog },
      { title: "Billing", url: "/settings/billing", icon: CreditCard },
      { title: "Notifications", url: "/settings/notifications", icon: Bell },
      { title: "Knowledge Base", url: "/settings/knowledge-base", icon: BookOpen },
    ],
  };

  const adminSection: NavSection = {
    label: "Master Admin",
    adminOnly: true,
    collapsible: true,
    items: [
      { title: "Admin Dashboard", url: "/admin", icon: Shield },
      { title: "All Tenants", url: "/admin/tenants", icon: Building2 },
      { title: "All Users", url: "/admin/users", icon: Users },
      { title: "System Health", url: "/admin/health", icon: Activity },
      { title: "Audit Logs", url: "/admin/logs", icon: ClipboardList },
      { title: "Feature Flags", url: "/admin/features", icon: Layers },
    ],
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Check if feature is enabled
  const isFeatureEnabled = (featureKey?: string) => {
    if (!featureKey) return true;
    return isEnabled(featureKey);
  };

  // Apply primary color as CSS variable
  const accentStyle = tenantConfig?.primary_color
    ? ({ "--sidebar-accent": tenantConfig.primary_color } as React.CSSProperties)
    : {};

  const NavItemComponent = ({ item }: { item: NavItem }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => navigate(item.url)}
        className={cn(
          "w-full justify-start gap-3 transition-all duration-200",
          isActive(item.url) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
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
            {isActive(item.url) && <ChevronRight className="h-4 w-4 ml-auto shrink-0" />}
          </>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const CollapsibleSection = ({ section, sectionKey }: { section: NavSection; sectionKey: string }) => {
    const isOpen = openSections[sectionKey] || isInSection(section.items.map((i) => i.url));

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
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
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
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          {tenantConfig?.logo_url ? (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={tenantConfig.logo_url} alt={tenantConfig.company_name || "Company"} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {tenantConfig.company_name?.charAt(0) || "Z"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">{tenantConfig?.company_name || "Zateceptionist"}</span>
              <span className="text-xs text-muted-foreground truncate">
                {tenantConfig?.industry ? tenantConfig.industry.replace("_", " ") : "Business Hub"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* User Context Banner */}
      {!collapsed && authUser && (
        <div className="mx-2 mt-2 p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {authUser.avatar_url ? (
                <AvatarImage src={authUser.avatar_url} alt={authUser.full_name || "User"} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary">
                {authUser.full_name?.charAt(0) || authUser.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{authUser.full_name || authUser.email || "User"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getRoleBadgeClass(authUser.role))}>
                  {formatRole(authUser.role)}
                </Badge>
              </div>
            </div>
          </div>
          {tenantConfig && (
            <p className="text-xs text-muted-foreground mt-2 truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {tenantConfig.company_name || "My Business"}
            </p>
          )}
        </div>
      )}

      {/* Impersonation Banner */}
      {!collapsed && isImpersonating && (
        <div className="mx-2 mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">IMPERSONATING</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 px-2"
              onClick={handleExitImpersonation}
            >
              Exit
            </Button>
          </div>
          <p className="text-[10px] text-amber-600/80 mt-1 truncate">Viewing: {tenantConfig?.company_name}</p>
        </div>
      )}

      <SidebarContent className="px-2 py-2 space-y-1">
        {/* Staff Section - Only for staff */}
        {authUser?.role === "staff" && <StaticSection section={staffSection} />}

        {/* Main Section - For non-staff or if not showing staff section */}
        {authUser?.role !== "staff" && <StaticSection section={mainSection} />}

        {/* Sales AI Section */}
        {canAccessSection(salesSection) && <CollapsibleSection section={salesSection} sectionKey="sales" />}

        {/* Marketing AI Section */}
        {canAccessSection(marketingSection) && <CollapsibleSection section={marketingSection} sectionKey="marketing" />}

        {/* HR AI Section */}
        {canAccessSection(hrSection) && <CollapsibleSection section={hrSection} sectionKey="hr" />}

        {/* Operations Section */}
        {canAccessSection(operationsSection) && (
          <CollapsibleSection section={operationsSection} sectionKey="operations" />
        )}

        {/* Communications Section */}
        {canAccessSection(communicationsSection) && (
          <CollapsibleSection section={communicationsSection} sectionKey="communications" />
        )}

        {/* Analytics Section */}
        {canAccessSection(analyticsSection) && <CollapsibleSection section={analyticsSection} sectionKey="analytics" />}

        {/* Settings Section */}
        <CollapsibleSection section={settingsSection} sectionKey="settings" />

        {/* Admin Section - Only for admin and master_admin */}
        {canAccessSection(adminSection) && <CollapsibleSection section={adminSection} sectionKey="admin" />}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        {!collapsed && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p>
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">g</kbd> + key for shortcuts
            </p>
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
