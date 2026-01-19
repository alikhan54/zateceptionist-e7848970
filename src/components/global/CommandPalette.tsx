// ============================================================================
// SECURE COMMAND PALETTE - src/components/shared/CommandPalette.tsx
// This component filters search results based on user role/permissions
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Users,
  CheckSquare,
  TrendingUp,
  Target,
  Zap,
  FileText,
  Mail,
  BarChart3,
  Settings,
  Shield,
  Building2,
  UserCog,
  Activity,
  Flag,
  Phone,
  MessageSquare,
  Megaphone,
  Briefcase,
  DollarSign,
  Package,
  Truck,
  Receipt,
  Brain,
  Mic,
  Bell,
  Key,
  Database,
  CreditCard,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { usePermissions } from "@/hooks/useTeam";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

interface CommandItem {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  keywords?: string[];
  // Permission requirements
  minHierarchy?: number; // Minimum role hierarchy level required
  requiredPermission?: string; // Specific permission code required
  adminOnly?: boolean; // Only master_admin can see
  ownerOnly?: boolean; // Only org owner can see
}

interface CommandGroup {
  name: string;
  items: CommandItem[];
}

// ============================================================================
// COMMAND ITEMS CONFIGURATION
// ============================================================================

const ALL_COMMAND_GROUPS: CommandGroup[] = [
  {
    name: "Main",
    items: [
      {
        id: "dashboard",
        name: "Dashboard",
        description: "View your dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
        keywords: ["home", "overview", "main"],
      },
      {
        id: "inbox",
        name: "Inbox",
        description: "View messages and conversations",
        icon: Inbox,
        path: "/inbox",
        keywords: ["messages", "chat", "conversations"],
      },
      {
        id: "appointments",
        name: "Appointments",
        description: "Manage appointments",
        icon: Calendar,
        path: "/appointments",
        keywords: ["calendar", "schedule", "meetings"],
      },
      {
        id: "customers",
        name: "Customers",
        description: "View and manage customers",
        icon: Users,
        path: "/customers",
        keywords: ["contacts", "clients", "leads"],
      },
      {
        id: "tasks",
        name: "Tasks",
        description: "View and manage tasks",
        icon: CheckSquare,
        path: "/tasks",
        keywords: ["todo", "checklist", "work"],
      },
    ],
  },
  {
    name: "Sales",
    items: [
      {
        id: "sales-dashboard",
        name: "Sales Dashboard",
        description: "Sales overview and metrics",
        icon: TrendingUp,
        path: "/sales/dashboard",
        keywords: ["sales", "revenue", "metrics"],
      },
      {
        id: "pipeline",
        name: "Pipeline",
        description: "Manage sales pipeline",
        icon: Target,
        path: "/sales/pipeline",
        keywords: ["leads", "deals", "opportunities"],
      },
      {
        id: "auto-leadgen",
        name: "Auto Lead Generation",
        description: "Automated lead generation",
        icon: Zap,
        path: "/sales/auto-leadgen",
        keywords: ["automation", "leads", "prospecting"],
        minHierarchy: 60, // Manager and above
      },
      {
        id: "deals",
        name: "Deals",
        description: "Track deals and opportunities",
        icon: Briefcase,
        path: "/sales/deals",
        keywords: ["opportunities", "contracts"],
      },
      {
        id: "proposals",
        name: "Proposals",
        description: "Create and manage proposals",
        icon: FileText,
        path: "/sales/proposals",
        keywords: ["quotes", "estimates"],
      },
    ],
  },
  {
    name: "Marketing",
    items: [
      {
        id: "marketing-hub",
        name: "Marketing Hub",
        description: "Marketing overview",
        icon: Megaphone,
        path: "/marketing",
        keywords: ["campaigns", "advertising"],
      },
      {
        id: "campaigns",
        name: "Campaigns",
        description: "Manage marketing campaigns",
        icon: Mail,
        path: "/marketing/campaigns",
        keywords: ["email", "ads"],
      },
      {
        id: "content",
        name: "Content Studio",
        description: "Create marketing content",
        icon: FileText,
        path: "/marketing/content",
        keywords: ["blog", "posts", "articles"],
      },
    ],
  },
  {
    name: "Communications",
    items: [
      {
        id: "voice-ai",
        name: "Voice AI",
        description: "AI voice assistant",
        icon: Mic,
        path: "/communications/voice",
        keywords: ["phone", "calls", "assistant"],
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        description: "WhatsApp messaging",
        icon: MessageSquare,
        path: "/communications/whatsapp",
        keywords: ["chat", "messaging"],
      },
      {
        id: "email-hub",
        name: "Email Hub",
        description: "Email communications",
        icon: Mail,
        path: "/communications/email",
        keywords: ["mail", "inbox"],
      },
      {
        id: "call-center",
        name: "Call Center",
        description: "Manage calls",
        icon: Phone,
        path: "/communications/call-center",
        keywords: ["phone", "support"],
      },
    ],
  },
  {
    name: "HR",
    items: [
      {
        id: "hr-dashboard",
        name: "HR Dashboard",
        description: "HR overview",
        icon: Users,
        path: "/hr/dashboard",
        keywords: ["human resources", "employees"],
        minHierarchy: 60, // Manager and above
      },
      {
        id: "employees",
        name: "Employees",
        description: "Manage employees",
        icon: UserCog,
        path: "/hr/employees",
        keywords: ["staff", "team"],
        minHierarchy: 60,
      },
      {
        id: "recruitment",
        name: "Recruitment",
        description: "Hiring and recruitment",
        icon: Users,
        path: "/hr/recruitment",
        keywords: ["hiring", "jobs", "candidates"],
        minHierarchy: 60,
      },
    ],
  },
  {
    name: "Operations",
    items: [
      {
        id: "inventory",
        name: "Inventory",
        description: "Manage inventory",
        icon: Package,
        path: "/operations/inventory",
        keywords: ["stock", "products"],
      },
      {
        id: "orders",
        name: "Orders",
        description: "View and manage orders",
        icon: Truck,
        path: "/operations/orders",
        keywords: ["shipping", "fulfillment"],
      },
      {
        id: "expenses",
        name: "Expenses",
        description: "Track expenses",
        icon: DollarSign,
        path: "/operations/expenses",
        keywords: ["costs", "spending"],
        minHierarchy: 60,
      },
      {
        id: "invoices",
        name: "Invoices",
        description: "Manage invoices",
        icon: Receipt,
        path: "/operations/invoices",
        keywords: ["billing", "payments"],
      },
    ],
  },
  {
    name: "Analytics",
    items: [
      {
        id: "analytics-hub",
        name: "Analytics Hub",
        description: "View analytics",
        icon: BarChart3,
        path: "/analytics",
        keywords: ["reports", "data", "metrics"],
      },
      {
        id: "ai-insights",
        name: "AI Insights",
        description: "AI-powered insights",
        icon: Brain,
        path: "/analytics/ai-insights",
        keywords: ["predictions", "recommendations"],
        minHierarchy: 60,
      },
    ],
  },
  {
    name: "Settings",
    items: [
      {
        id: "general-settings",
        name: "General Settings",
        description: "Application settings",
        icon: Settings,
        path: "/settings",
        keywords: ["preferences", "configuration"],
      },
      {
        id: "voice-ai-settings",
        name: "Voice AI Config",
        description: "Configure voice AI",
        icon: Mic,
        path: "/settings/voice-ai",
        keywords: ["assistant", "phone"],
        minHierarchy: 80, // Admin and above
      },
      {
        id: "integrations",
        name: "Integrations",
        description: "Manage integrations",
        icon: Zap,
        path: "/settings/integrations",
        keywords: ["apps", "connections", "api"],
        minHierarchy: 80, // Admin and above
      },
      {
        id: "api-keys",
        name: "API Keys",
        description: "Manage API keys",
        icon: Key,
        path: "/settings/api-keys",
        keywords: ["tokens", "access"],
        minHierarchy: 80, // Admin and above
      },
      {
        id: "team",
        name: "Team",
        description: "Manage team members",
        icon: Users,
        path: "/settings/team",
        keywords: ["members", "roles", "permissions"],
        minHierarchy: 60, // Manager and above for viewing, but full access needs higher
      },
      {
        id: "billing",
        name: "Billing",
        description: "Manage billing and subscription",
        icon: CreditCard,
        path: "/settings/billing",
        keywords: ["payment", "subscription", "plan"],
        minHierarchy: 80, // Admin and above
      },
      {
        id: "notifications",
        name: "Notifications",
        description: "Notification settings",
        icon: Bell,
        path: "/settings/notifications",
        keywords: ["alerts", "email"],
      },
      {
        id: "knowledge-base",
        name: "Knowledge Base",
        description: "Manage knowledge base",
        icon: Database,
        path: "/settings/knowledge-base",
        keywords: ["docs", "help", "faq"],
        minHierarchy: 60,
      },
    ],
  },
  {
    name: "Admin",
    items: [
      {
        id: "admin-panel",
        name: "Admin Panel",
        description: "System administration",
        icon: Shield,
        path: "/admin",
        keywords: ["system", "administration"],
        adminOnly: true, // Only master_admin
      },
      {
        id: "tenants",
        name: "Tenants",
        description: "Manage all tenants",
        icon: Building2,
        path: "/admin/tenants",
        keywords: ["organizations", "companies"],
        adminOnly: true,
      },
      {
        id: "admin-users",
        name: "All Users",
        description: "Manage all users",
        icon: UserCog,
        path: "/admin/users",
        keywords: ["accounts", "members"],
        adminOnly: true,
      },
      {
        id: "system-health",
        name: "System Health",
        description: "Monitor system health",
        icon: Activity,
        path: "/admin/health",
        keywords: ["monitoring", "status"],
        adminOnly: true,
      },
      {
        id: "audit-logs",
        name: "Audit Logs",
        description: "View audit logs",
        icon: FileText,
        path: "/admin/logs",
        keywords: ["history", "activity"],
        adminOnly: true,
      },
      {
        id: "feature-flags",
        name: "Feature Flags",
        description: "Manage feature flags",
        icon: Flag,
        path: "/admin/features",
        keywords: ["toggles", "experiments"],
        adminOnly: true,
      },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentUserHierarchy } = usePermissions();
  const { tenantConfig } = useTenant();
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  // Check if user is master_admin
  useEffect(() => {
    const checkMasterAdmin = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session?.user) return;

        // Check user's role in the profiles or a master admin table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.session.user.id)
          .single();

        setIsMasterAdmin(profile?.role === "master_admin");
      } catch (error) {
        console.error("Error checking master admin status:", error);
      }
    };

    checkMasterAdmin();
  }, []);

  // Filter command groups based on user permissions
  const filteredGroups = useMemo(() => {
    return ALL_COMMAND_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Admin-only items
        if (item.adminOnly && !isMasterAdmin) {
          return false;
        }

        // Owner-only items (hierarchy 100)
        if (item.ownerOnly && currentUserHierarchy < 100) {
          return false;
        }

        // Minimum hierarchy requirement
        if (item.minHierarchy && currentUserHierarchy < item.minHierarchy) {
          return false;
        }

        return true;
      }),
    })).filter((group) => group.items.length > 0); // Remove empty groups
  }, [currentUserHierarchy, isMasterAdmin]);

  const handleSelect = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions, or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {filteredGroups.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            {groupIndex > 0 && <CommandSeparator />}
            <CommandGroup heading={group.name}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.keywords?.join(" ") || ""}`}
                  onSelect={() => handleSelect(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="help support" onSelect={() => handleSelect("/help")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </CommandItem>
          <CommandItem
            value="logout signout"
            onSelect={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
