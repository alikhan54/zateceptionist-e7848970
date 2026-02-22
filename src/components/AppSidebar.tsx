import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
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
  Brain,
  // Sales icons
  TrendingUp,
  Workflow,
  FileText,
  BarChart3,
  LineChart,
  Sparkles,
  // Marketing icons
  PenTool,
  Send,
  Share2,
  Layers,
  Mail,
  Globe,
  PieChart,
  GitBranch,
  // HR icons
  Clock,
  CalendarDays,
  DollarSign,
  Network,
  Award,
  GraduationCap,
  UserPlus,
  Bot,
  ShieldCheck,
  // Operations icons
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  FileCheck,
  // Communications icons
  Phone,
  MessageCircle,
  Headphones,
  Voicemail,
  // Analytics icons
  Activity,
  Eye,
  Lightbulb,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ========================================
// MAIN NAVIGATION ITEMS
// ========================================
const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Appointments", url: "/appointments", icon: Calendar },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Tasks", url: "/tasks", icon: FileText },
];

// ========================================
// SALES AI NAVIGATION
// ========================================
const salesNavItems = [
  { title: "Sales Dashboard", url: "/sales/dashboard", icon: TrendingUp },
  { title: "Lead Pipeline", url: "/sales/pipeline", icon: Target },
  { title: "Auto Lead Gen", url: "/sales/auto-leadgen", icon: Sparkles },
  { title: "Deals", url: "/sales/deals", icon: Briefcase },
  { title: "Sequences", url: "/sales/sequences", icon: Workflow },
  { title: "Proposals", url: "/sales/proposals", icon: FileText },
  { title: "Analytics", url: "/sales/analytics", icon: BarChart3 },
  { title: "Forecasting", url: "/sales/forecast", icon: LineChart },
];

// ========================================
// MARKETING AI NAVIGATION - COMPLETE!
// ========================================
const marketingNavItems = [
  { title: "Marketing Hub", url: "/marketing", icon: Megaphone },
  { title: "Content Studio", url: "/marketing/content", icon: PenTool },
  { title: "Campaign Central", url: "/marketing/campaigns", icon: Send },
  { title: "Social Commander", url: "/marketing/social", icon: Share2 },
  { title: "Email Builder", url: "/marketing/email", icon: Mail },
  { title: "Landing Pages", url: "/marketing/landing", icon: Globe },
  { title: "Marketing Analytics", url: "/marketing/analytics", icon: PieChart },
  { title: "A/B Testing", url: "/marketing/ab-testing", icon: GitBranch },
  { title: "Marketing Sequences", url: "/marketing/sequences", icon: Layers },
  { title: "Blog Manager", url: "/marketing/blogs", icon: FileText },
  { title: "Video Projects", url: "/marketing/videos", icon: Zap },
  { title: "Competitor Intel", url: "/marketing/competitors", icon: Eye },
];

// ========================================
// HR AI NAVIGATION
// ========================================
const hrNavItems = [
  { title: "HR Dashboard", url: "/hr/dashboard", icon: Building2 },
  { title: "Employees", url: "/hr/employees", icon: Users },
  { title: "Attendance", url: "/hr/attendance", icon: Clock },
  { title: "Leave", url: "/hr/leave", icon: CalendarDays },
  { title: "Payroll", url: "/hr/payroll", icon: DollarSign },
  { title: "Departments", url: "/hr/departments", icon: Network },
  { title: "Performance", url: "/hr/performance", icon: Award },
  { title: "Training", url: "/hr/training", icon: GraduationCap },
  { title: "Recruitment", url: "/hr/recruitment", icon: UserPlus },
  { title: "Compliance", url: "/hr/compliance", icon: ShieldCheck },
  { title: "Documents", url: "/hr/documents", icon: FileText },
  { title: "Reports", url: "/hr/reports", icon: BarChart3 },
  { title: "AI Assistant", url: "/hr/ai-assistant", icon: Bot },
];

// ========================================
// OPERATIONS NAVIGATION
// ========================================
const operationsNavItems = [
  { title: "Inventory", url: "/operations/inventory", icon: Package },
  { title: "Orders", url: "/operations/orders", icon: ShoppingCart },
  { title: "Vendors", url: "/operations/vendors", icon: Truck },
  { title: "Expenses", url: "/operations/expenses", icon: Receipt },
  { title: "Invoices", url: "/operations/invoices", icon: FileCheck },
];

// ========================================
// COMMUNICATIONS NAVIGATION
// ========================================
const communicationsNavItems = [
  { title: "Voice AI", url: "/communications/voice", icon: Phone },
  { title: "WhatsApp", url: "/communications/whatsapp", icon: MessageCircle },
  { title: "Email", url: "/communications/email", icon: Mail },
  { title: "SMS", url: "/communications/sms", icon: MessageSquare },
  { title: "Call Center", url: "/communications/call-center", icon: Headphones },
  { title: "IVR Builder", url: "/communications/ivr", icon: Voicemail },
];

// ========================================
// ANALYTICS & AI NAVIGATION
// ========================================
const analyticsNavItems = [
  { title: "Analytics Hub", url: "/analytics", icon: Activity },
  { title: "Real-time", url: "/analytics/realtime", icon: Eye },
  { title: "Reports", url: "/analytics/reports", icon: BarChart3 },
  { title: "AI Insights", url: "/analytics/ai-insights", icon: Lightbulb },
  { title: "Predictions", url: "/analytics/predictions", icon: TrendingDown },
];

// ========================================
// INTELLIGENCE NAVIGATION
// ========================================
const intelligenceNavItems = [{ title: "Intelligence Hub", url: "/intelligence", icon: Brain }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { tenantConfig, t } = useTenant();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Get translated nav items
  const getNavLabel = (title: string) => {
    const translations: Record<string, string> = {
      Customers: t("customers"),
      Appointments: t("appointments"),
      Leads: t("leads"),
      Deals: t("deals"),
      Employees: t("staffs"),
    };
    return translations[title] || title;
  };

  const NavItem = ({
    item,
  }: {
    item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
  }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => navigate(item.url)}
        className={cn(
          "w-full justify-start gap-3 transition-colors",
          isActive(item.url) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{getNavLabel(item.title)}</span>}
        {!collapsed && isActive(item.url) && <ChevronRight className="h-4 w-4 ml-auto shrink-0" />}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  // Collapsible section component
  const NavSection = ({
    label,
    items,
    defaultOpen = false,
  }: {
    label: string;
    items: typeof mainNavItems;
    defaultOpen?: boolean;
  }) => {
    const hasActiveItem = items.some((item) => isActive(item.url));

    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <NavItem key={item.url} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm">Zate Systems</span>
              <span className="text-xs text-muted-foreground truncate">
                {tenantConfig?.company_name || "Business Hub"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto">
        {/* Main */}
        <NavSection label="MAIN" items={mainNavItems} defaultOpen />

        {/* Sales AI */}
        <NavSection label="SALES AI" items={salesNavItems} />

        {/* Marketing AI */}
        <NavSection label="MARKETING AI" items={marketingNavItems} />

        {/* HR AI */}
        <NavSection label="HR AI" items={hrNavItems} />

        {/* Operations */}
        <NavSection label="OPERATIONS" items={operationsNavItems} />

        {/* Communications */}
        <NavSection label="COMMUNICATIONS" items={communicationsNavItems} />

        {/* Analytics & AI */}
        <NavSection label="ANALYTICS & AI" items={analyticsNavItems} />

        {/* Settings Group */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>SETTINGS</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/settings")}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
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
