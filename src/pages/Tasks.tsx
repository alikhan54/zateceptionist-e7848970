import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  CheckSquare,
  Plus,
  List,
  LayoutGrid,
  Clock,
  User,
  Bot,
  MoreHorizontal,
  Flag,
  AlertTriangle,
  Phone,
  Bell,
  MessageSquare,
  FileCheck,
  Mail,
  Settings,
  Zap,
  Trash2,
  RefreshCw,
  Filter,
  Users,
  Megaphone,
  Briefcase,
  Target,
  Calendar,
  Send,
  UserCircle,
  Building,
  ChevronRight,
} from "lucide-react";
import { format, isPast, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =====================================================
// TYPES
// =====================================================
interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  assigned_type: string;
  customer_id: string | null;
  auto_generated: boolean;
  source: string;
  trigger_type: string | null;
  execution_type: string | null;
  execution_status: string;
  created_at: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  task_type: string;
  priority: string;
  execution_type: string | null;
  is_active: boolean;
  due_hours: number;
}

interface Contact {
  id: string;
  name: string;
  type: "lead" | "prospect" | "customer" | "staff";
  phone: string | null;
  email: string | null;
}

interface Staff {
  id: string;
  name: string;
  email: string | null;
}

// =====================================================
// CONFIGURATIONS
// =====================================================
const priorityConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  low: { color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", label: "Low" },
  medium: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900", label: "Medium" },
  high: { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900", label: "High" },
  urgent: { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900", label: "Urgent" },
};

const taskTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  follow_up: { label: "Follow Up", icon: <MessageSquare className="h-4 w-4" />, color: "text-blue-500" },
  callback: { label: "Callback", icon: <Phone className="h-4 w-4" />, color: "text-green-500" },
  reminder: { label: "Reminder", icon: <Bell className="h-4 w-4" />, color: "text-yellow-500" },
  review: { label: "Review", icon: <FileCheck className="h-4 w-4" />, color: "text-purple-500" },
  email: { label: "Email", icon: <Mail className="h-4 w-4" />, color: "text-indigo-500" },
  custom: { label: "Custom", icon: <CheckSquare className="h-4 w-4" />, color: "text-gray-500" },
};

const automationCategories = [
  {
    id: "sales",
    label: "Sales & Leads",
    icon: <Target className="h-4 w-4" />,
    color: "text-green-500",
    triggers: ["new_lead", "hot_lead", "warm_lead", "cold_lead_7d", "quote_sent", "deal_won", "deal_lost"],
  },
  {
    id: "communication",
    label: "Communication",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-blue-500",
    triggers: [
      "missed_call",
      "no_response_24h",
      "no_response_48h",
      "whatsapp_unread",
      "email_unopened",
      "instagram_message",
      "facebook_message",
      "linkedin_message",
      "twitter_mention",
      "telegram_message",
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-purple-500",
    triggers: [
      "appointment_tomorrow",
      "appointment_today",
      "appointment_completed",
      "appointment_noshow",
      "appointment_cancelled",
    ],
  },
  {
    id: "hr",
    label: "HR & Recruitment",
    icon: <Users className="h-4 w-4" />,
    color: "text-orange-500",
    triggers: [
      "hr_new_application",
      "hr_interview_scheduled",
      "hr_interview_tomorrow",
      "hr_interview_completed",
      "hr_offer_sent",
      "hr_new_hire",
      "hr_probation_ending",
      "hr_annual_review",
      "hr_leave_request",
      "hr_birthday",
      "hr_anniversary",
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: <Megaphone className="h-4 w-4" />,
    color: "text-pink-500",
    triggers: [
      "marketing_campaign_launch",
      "marketing_campaign_ending",
      "marketing_low_engagement",
      "marketing_post_scheduled",
      "marketing_content_due",
      "marketing_newsletter_due",
      "marketing_competitor_update",
      "marketing_trending",
      "marketing_review_received",
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: <Briefcase className="h-4 w-4" />,
    color: "text-cyan-500",
    triggers: [
      "ops_ticket_created",
      "ops_ticket_escalated",
      "ops_customer_inactive",
      "ops_subscription_expiring",
      "ops_payment_failed",
      "ops_feedback_received",
      "ops_nps_due",
      "ops_contract_renewal",
    ],
  },
  {
    id: "sequences",
    label: "Sequences",
    icon: <Send className="h-4 w-4" />,
    color: "text-indigo-500",
    triggers: ["sequence_welcome", "sequence_value", "sequence_case_study", "sequence_offer", "sequence_final"],
  },
];

const contactTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  lead: { label: "Leads", icon: <Zap className="h-4 w-4" />, color: "text-orange-500" },
  prospect: { label: "Prospects", icon: <Target className="h-4 w-4" />, color: "text-blue-500" },
  customer: { label: "Customers", icon: <UserCircle className="h-4 w-4" />, color: "text-green-500" },
  staff: { label: "Staff", icon: <Building className="h-4 w-4" />, color: "text-purple-500" },
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function SmartTasksPage() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // =====================================================
  // STATE
  // =====================================================
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [automationTab, setAutomationTab] = useState("sales");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    priority: "medium",
    due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    assigned_type: "ai",
    assigned_to: "_none_",
    contact_id: "_none_",
  });

  // =====================================================
  // QUERIES
  // =====================================================

  // Fetch Tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["smart-tasks", tenantId, statusFilter, typeFilter, priorityFilter, assigneeFilter],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("tasks")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("task_type", typeFilter);
      }
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }
      if (assigneeFilter === "ai") {
        query = query.eq("assigned_type", "ai");
      } else if (assigneeFilter === "staff") {
        query = query.eq("assigned_type", "staff");
      } else if (assigneeFilter === "me" && authUser?.id) {
        query = query.eq("assigned_to", authUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Fetch Automation Rules
  const { data: automationRules = [] } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("task_automation_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("priority_order");
      if (error) {
        console.error("Error fetching automation rules:", error);
        return [];
      }
      return (data || []) as AutomationRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch ALL Contacts (Customers, Leads, Prospects from customers table + Staff from users table)
  const { data: allContacts = [] } = useQuery({
    queryKey: ["all-contacts-for-tasks", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const contacts: Contact[] = [];

      // Fetch from customers table
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, phone, email, lead_status, temperature")
        .eq("tenant_id", tenantId)
        .order("name")
        .limit(500);

      if (customersData) {
        customersData.forEach((c: any) => {
          let contactType: Contact["type"] = "customer";

          // Determine type based on lead_status
          if (c.lead_status === "new" || c.lead_status === "contacted" || c.lead_status === "lead") {
            contactType = "lead";
          } else if (c.lead_status === "qualified" || c.lead_status === "prospect") {
            contactType = "prospect";
          } else if (c.lead_status === "converted" || c.lead_status === "customer" || c.lead_status === "won") {
            contactType = "customer";
          }

          contacts.push({
            id: c.id,
            name: c.name || c.phone || c.email || "Unknown",
            type: contactType,
            phone: c.phone,
            email: c.email,
          });
        });
      }

      // Fetch staff from users table
      const { data: staffData } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantId);

      if (staffData) {
        staffData.forEach((s: any) => {
          contacts.push({
            id: s.id,
            name: s.full_name || s.email || "Staff Member",
            type: "staff",
            phone: null,
            email: s.email,
          });
        });
      }

      return contacts;
    },
    enabled: !!tenantId,
  });

  // Fetch Staff for assignment dropdown
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-for-assignment", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantId);
      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.full_name || s.email || "Staff",
        email: s.email,
      })) as Staff[];
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Create Task
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !newTask.title.trim()) {
        throw new Error("Title is required");
      }

      const taskData: Record<string, any> = {
        tenant_id: tenantId,
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        task_type: newTask.task_type,
        priority: newTask.priority,
        status: "pending",
        due_at: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
        assigned_type: newTask.assigned_type,
        assigned_to: newTask.assigned_to === "_none_" ? null : newTask.assigned_to,
        customer_id: newTask.contact_id === "_none_" ? null : newTask.contact_id,
        auto_generated: false,
        source: "manual",
        execution_status: "pending",
      };

      // Add created_by if user is authenticated
      if (authUser?.id) {
        taskData.created_by = authUser.id;
      }

      const { error } = await supabase.from("tasks").insert(taskData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Task created successfully", description: "Your task has been added to the list." });
      setShowCreateDialog(false);
      resetNewTaskForm();
      queryClient.invalidateQueries({ queryKey: ["smart-tasks"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    },
  });

  // Update Task Status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.execution_status = "executed";
      }

      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId).eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-tasks"] });
      toast({ title: "Task updated" });
    },
  });

  // Delete Task
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  // Toggle Automation Rule
  const toggleRule = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("task_automation_rules")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", ruleId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "Automation rule updated" });
    },
  });

  // =====================================================
  // HELPERS
  // =====================================================

  const resetNewTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      task_type: "follow_up",
      priority: "medium",
      due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      assigned_type: "ai",
      assigned_to: "_none_",
      contact_id: "_none_",
    });
  };

  const isOverdue = (task: Task) => {
    return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
  };

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter((t) => t.status === status);
  };

  const getRulesByCategory = (categoryId: string) => {
    const category = automationCategories.find((c) => c.id === categoryId);
    if (!category) return [];
    return automationRules.filter((r) => category.triggers.includes(r.trigger_type));
  };

  const getContactsByType = (type: Contact["type"]) => {
    return allContacts.filter((c) => c.type === type);
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "overdue") {
      return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
    }
    if (activeTab !== "all") {
      return task.status === activeTab;
    }
    return true;
  });

  // Calculate Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.due_at && isPast(new Date(t.due_at)) && t.status !== "completed").length,
    aiGenerated: tasks.filter((t) => t.auto_generated).length,
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Smart Tasks
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">AI-Powered</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered task management for your team</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAutomationDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Automation Settings
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* =====================================================
          STATS CARDS
          ===================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">All Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className={cn(stats.overdue > 0 && "border-red-300 bg-red-50 dark:bg-red-950")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Bot className="h-4 w-4 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{stats.aiGenerated}</p>
            </div>
            <p className="text-xs text-muted-foreground">AI Created</p>
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          FILTERS
          ===================================================== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="ai">AI Only</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
                <SelectItem value="me">My Tasks</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => refetchTasks()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "list")}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="h-7 px-3">
                  <List className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="kanban" className="h-7 px-3">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          STATUS TABS
          ===================================================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({stats.inProgress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
          <TabsTrigger value="overdue" className={cn(stats.overdue > 0 && "text-red-600")}>
            Overdue ({stats.overdue})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* =====================================================
          TASK LIST / KANBAN
          ===================================================== */}
      {tasksLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : viewMode === "list" ? (
        /* LIST VIEW */
        <Card>
          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No tasks found</p>
                <p className="text-sm mt-1">Create your first task to get started</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                      isOverdue(task) && "bg-red-50 dark:bg-red-950/20",
                    )}
                  >
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) => {
                        updateTaskStatus.mutate({
                          taskId: task.id,
                          status: checked ? "completed" : "pending",
                        });
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={taskTypeConfig[task.task_type]?.color}>
                          {taskTypeConfig[task.task_type]?.icon}
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            task.status === "completed" && "line-through text-muted-foreground",
                          )}
                        >
                          {task.title}
                        </span>
                        {task.auto_generated && (
                          <Badge variant="outline" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          "text-xs",
                          priorityConfig[task.priority]?.bgColor,
                          priorityConfig[task.priority]?.color,
                        )}
                      >
                        {priorityConfig[task.priority]?.label || task.priority}
                      </Badge>
                      {task.due_at && (
                        <span
                          className={cn(
                            "text-sm flex items-center gap-1",
                            isOverdue(task) ? "text-red-600 font-medium" : "text-muted-foreground",
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {isOverdue(task) ? "Overdue" : format(new Date(task.due_at), "MMM dd")}
                        </span>
                      )}
                      {task.assigned_type === "ai" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Bot className="h-3 w-3" />
                          AI
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          Staff
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status !== "pending" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "pending" })}
                            >
                              Set Pending
                            </DropdownMenuItem>
                          )}
                          {task.status !== "in_progress" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "in_progress" })}
                            >
                              Set In Progress
                            </DropdownMenuItem>
                          )}
                          {task.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: "completed" })}
                            >
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate(task.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["pending", "in_progress", "completed"].map((status) => (
            <Card key={status} className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between capitalize">
                  {status.replace("_", " ")}
                  <Badge variant="outline">{getTasksByStatus(status).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[400px]">
                {getTasksByStatus(status).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No tasks</p>
                  </div>
                ) : (
                  getTasksByStatus(status).map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-shadow",
                        isOverdue(task) && "border-red-300",
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={taskTypeConfig[task.task_type]?.color}>
                              {taskTypeConfig[task.task_type]?.icon}
                            </span>
                            <span className="font-medium text-sm">{task.title}</span>
                          </div>
                          {task.assigned_type === "ai" ? (
                            <Bot className="h-4 w-4 text-purple-500" />
                          ) : (
                            <User className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            className={cn(
                              "text-xs",
                              priorityConfig[task.priority]?.bgColor,
                              priorityConfig[task.priority]?.color,
                            )}
                          >
                            {priorityConfig[task.priority]?.label || task.priority}
                          </Badge>
                          {task.due_at && (
                            <span className={cn("text-xs", isOverdue(task) ? "text-red-600" : "text-muted-foreground")}>
                              {isOverdue(task) ? "Overdue" : format(new Date(task.due_at), "MMM dd")}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* =====================================================
          CREATE TASK DIALOG
          ===================================================== */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Task
            </DialogTitle>
            <DialogDescription>Add a manual task or let AI handle it automatically</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Link to Contact */}
            <div className="space-y-2">
              <Label>Link to Contact (Optional)</Label>
              <Select value={newTask.contact_id} onValueChange={(v) => setNewTask({ ...newTask, contact_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">
                    <span className="text-muted-foreground">No contact linked</span>
                  </SelectItem>

                  {/* Leads */}
                  {getContactsByType("lead").length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-orange-600">
                        <Zap className="h-3 w-3" />
                        Leads ({getContactsByType("lead").length})
                      </SelectLabel>
                      {getContactsByType("lead").map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <span>{contact.name}</span>
                            {contact.phone && <span className="text-xs text-muted-foreground">{contact.phone}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* Prospects */}
                  {getContactsByType("prospect").length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-blue-600">
                        <Target className="h-3 w-3" />
                        Prospects ({getContactsByType("prospect").length})
                      </SelectLabel>
                      {getContactsByType("prospect").map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <span>{contact.name}</span>
                            {contact.phone && <span className="text-xs text-muted-foreground">{contact.phone}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* Customers */}
                  {getContactsByType("customer").length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-green-600">
                        <UserCircle className="h-3 w-3" />
                        Customers ({getContactsByType("customer").length})
                      </SelectLabel>
                      {getContactsByType("customer").map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <span>{contact.name}</span>
                            {contact.phone && <span className="text-xs text-muted-foreground">{contact.phone}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* Staff */}
                  {getContactsByType("staff").length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-purple-600">
                        <Building className="h-3 w-3" />
                        Staff ({getContactsByType("staff").length})
                      </SelectLabel>
                      {getContactsByType("staff").map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div className="flex items-center gap-2">
                            <span>{contact.name}</span>
                            {contact.email && <span className="text-xs text-muted-foreground">{contact.email}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Task Type */}
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={config.color}>{config.icon}</span>
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Title */}
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>

            {/* Assign To */}
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newTask.assigned_type}
                onValueChange={(v) => setNewTask({ ...newTask, assigned_type: v, assigned_to: "_none_" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-500" />
                      AI (Auto)
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff Member
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {newTask.assigned_type === "staff" && (
                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select staff member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Unassigned</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={newTask.due_date === format(new Date(), "yyyy-MM-dd") ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, due_date: format(new Date(), "yyyy-MM-dd") })}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant={newTask.due_date === format(addDays(new Date(), 1), "yyyy-MM-dd") ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, due_date: format(addDays(new Date(), 1), "yyyy-MM-dd") })}
                >
                  Tomorrow
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, due_date: format(addDays(new Date(), 7), "yyyy-MM-dd") })}
                >
                  This Week
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, due_date: format(addDays(new Date(), 14), "yyyy-MM-dd") })}
                >
                  Next Week
                </Button>
              </div>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate()}
              disabled={!newTask.title.trim() || createTaskMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          AUTOMATION SETTINGS DIALOG
          ===================================================== */}
      <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automation Settings
            </DialogTitle>
            <DialogDescription>Configure AI task generation rules across all departments</DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-[60vh]">
            {/* Category Sidebar */}
            <div className="w-56 border-r pr-4 space-y-1">
              {automationCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={automationTab === cat.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setAutomationTab(cat.id)}
                >
                  <span className={cn("mr-2", cat.color)}>{cat.icon}</span>
                  <span className="flex-1 text-left">{cat.label}</span>
                  <Badge variant="outline" className="ml-auto">
                    {getRulesByCategory(cat.id).length}
                  </Badge>
                </Button>
              ))}
            </div>

            {/* Rules List */}
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {getRulesByCategory(automationTab).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No automation rules in this category</p>
                    <p className="text-sm mt-1">Rules will appear here once configured</p>
                  </div>
                ) : (
                  getRulesByCategory(automationTab).map((rule) => (
                    <Card key={rule.id} className={cn(!rule.is_active && "opacity-60")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => toggleRule.mutate({ ruleId: rule.id, isActive: checked })}
                            />
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {rule.trigger_type.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Due in {rule.due_hours}h</span>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    priorityConfig[rule.priority]?.bgColor,
                                    priorityConfig[rule.priority]?.color,
                                  )}
                                >
                                  {priorityConfig[rule.priority]?.label || rule.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {rule.execution_type && (
                            <Badge variant="secondary" className="capitalize">
                              {rule.execution_type === "call" && <Phone className="h-3 w-3 mr-1" />}
                              {rule.execution_type === "whatsapp" && <MessageSquare className="h-3 w-3 mr-1" />}
                              {rule.execution_type === "email" && <Mail className="h-3 w-3 mr-1" />}
                              {rule.execution_type === "sms" && <MessageSquare className="h-3 w-3 mr-1" />}
                              {rule.execution_type}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutomationDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
