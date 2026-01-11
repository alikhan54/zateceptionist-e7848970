import { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  TrendingUp,
  Calendar,
  Eye,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  conversation_id: string | null;
  auto_generated: boolean;
  source: string;
  trigger_type: string | null;
  execution_type: string | null;
  execution_status: string;
  created_at: string;
  customer_name?: string;
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

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Staff {
  id: string;
  name: string;
}

const priorityConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  low: { color: "text-slate-600", bgColor: "bg-slate-100", icon: <Flag className="h-3 w-3" /> },
  medium: { color: "text-blue-600", bgColor: "bg-blue-100", icon: <Flag className="h-3 w-3" /> },
  high: { color: "text-orange-600", bgColor: "bg-orange-100", icon: <Flag className="h-3 w-3" /> },
  urgent: { color: "text-red-600", bgColor: "bg-red-100", icon: <AlertTriangle className="h-3 w-3" /> },
};

const taskTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  follow_up: { label: "Follow Up", icon: <MessageSquare className="h-4 w-4" />, color: "text-blue-500" },
  callback: { label: "Callback", icon: <Phone className="h-4 w-4" />, color: "text-green-500" },
  reminder: { label: "Reminder", icon: <Bell className="h-4 w-4" />, color: "text-yellow-500" },
  review: { label: "Review", icon: <FileCheck className="h-4 w-4" />, color: "text-purple-500" },
  email: { label: "Email", icon: <Mail className="h-4 w-4" />, color: "text-indigo-500" },
  custom: { label: "Custom", icon: <CheckSquare className="h-4 w-4" />, color: "text-gray-500" },
};

const executionTypeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  call: { label: "Phone Call", icon: <Phone className="h-4 w-4" /> },
  sms: { label: "SMS", icon: <MessageSquare className="h-4 w-4" /> },
  whatsapp: { label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" /> },
  email: { label: "Email", icon: <Mail className="h-4 w-4" /> },
  internal: { label: "Internal", icon: <FileCheck className="h-4 w-4" /> },
};

const statusTabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
];

export default function SmartTasksPage() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View & Filter State
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Create Task Form
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    priority: "medium",
    due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    assigned_type: "ai",
    assigned_to: "",
    customer_id: "",
    execution_type: "",
  });

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
      } else if (assigneeFilter === "me") {
        query = query.eq("assigned_to", authUser?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Fetch Automation Rules
  const { data: automationRules = [], refetch: refetchRules } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("task_automation_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("priority_order");
      if (error) throw error;
      return (data || []) as AutomationRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch Customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-dropdown", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("customers").select("id, name, phone").eq("tenant_id", tenantId).limit(100);
      return (data || []) as Customer[];
    },
    enabled: !!tenantId,
  });

  // Fetch Staff for dropdown
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-dropdown", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantId);
      return (data || []).map((s: any) => ({ id: s.id, name: s.full_name || s.email })) as Staff[];
    },
    enabled: !!tenantId,
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !newTask.title) throw new Error("Title required");

      const { error } = await supabase.from("tasks").insert({
        tenant_id: tenantId,
        title: newTask.title,
        description: newTask.description || null,
        task_type: newTask.task_type,
        priority: newTask.priority,
        status: "pending",
        due_at: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
        assigned_type: newTask.assigned_type,
        assigned_to: newTask.assigned_to || null,
        customer_id: newTask.customer_id || null,
        execution_type: newTask.execution_type || null,
        auto_generated: false,
        source: "manual",
        created_by: authUser?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Task created successfully" });
      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        task_type: "follow_up",
        priority: "medium",
        due_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        assigned_type: "ai",
        assigned_to: "",
        customer_id: "",
        execution_type: "",
      });
      queryClient.invalidateQueries({ queryKey: ["smart-tasks"] });
    },
    onError: (err) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    },
  });

  // Update Task Status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
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
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
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
      const { error } = await supabase.from("task_automation_rules").update({ is_active: isActive }).eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "Automation rule updated" });
    },
  });

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "overdue") {
      return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
    }
    if (activeTab !== "all") {
      return task.status === activeTab;
    }
    if (searchQuery) {
      return task.title.toLowerCase().includes(searchQuery.toLowerCase());
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
    aiExecuted: tasks.filter((t) => t.execution_status === "executed").length,
  };

  const isOverdue = (task: Task) => {
    return task.due_at && isPast(new Date(task.due_at)) && task.status !== "completed";
  };

  const getTasksByStatus = (status: string) => filteredTasks.filter((t) => t.status === status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Smart Tasks
              <Badge variant="secondary" className="ml-2">
                AI-Powered
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered task management for your team</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAutomationDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Automation Settings
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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
        <Card className={cn(stats.overdue > 0 && "border-red-200 bg-red-50 dark:bg-red-950")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Bot className="h-4 w-4 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{stats.aiGenerated}</p>
            </div>
            <p className="text-xs text-muted-foreground">AI Created</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.aiExecuted}</p>
            </div>
            <p className="text-xs text-muted-foreground">Auto-Execute</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
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
            <div className="flex items-center gap-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="relative">
              {tab.label}
              {tab.id !== "all" && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {tab.id === "overdue"
                    ? stats.overdue
                    : tab.id === "pending"
                      ? stats.pending
                      : tab.id === "in_progress"
                        ? stats.inProgress
                        : stats.completed}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tasks List/Kanban */}
      {tasksLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <Card>
          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first task
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {/* Select All Header */}
                <div className="flex items-center gap-4 p-4 bg-muted/30">
                  <Checkbox />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
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
                        <span className={cn("", taskTypeConfig[task.task_type]?.color)}>
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
                      {task.customer_name && <p className="text-sm text-muted-foreground mt-1">{task.customer_name}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          "text-xs",
                          priorityConfig[task.priority]?.bgColor,
                          priorityConfig[task.priority]?.color,
                        )}
                      >
                        {task.priority}
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
                      <div className="flex items-center gap-1">
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
                      </div>
                      {task.status === "completed" && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Completed {task.completed_at && format(new Date(task.completed_at), "MMM dd")}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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
        /* Kanban View */
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
                            {task.priority}
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

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a manual task or let AI handle it</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer (Optional)</Label>
              <Select value={newTask.customer_id} onValueChange={(v) => setNewTask({ ...newTask, customer_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search by name or phone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone && `(${c.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newTask.assigned_type}
                onValueChange={(v) => setNewTask({ ...newTask, assigned_type: v, assigned_to: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      AI (Auto)
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff
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
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <div className="flex gap-2">
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
              disabled={!newTask.title || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Settings Dialog */}
      <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automation Settings
            </DialogTitle>
            <DialogDescription>Configure AI task generation rules</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4">
              {automationRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleRule.mutate({ ruleId: rule.id, isActive: checked })}
                        />
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger_type.replace(/_/g, " ")} • Due in {rule.due_hours}h • Priority:{" "}
                            {rule.priority}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.execution_type && (
                          <Badge variant="outline">
                            {executionTypeConfig[rule.execution_type]?.icon}
                            <span className="ml-1">{executionTypeConfig[rule.execution_type]?.label}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {automationRules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No automation rules configured</p>
                </div>
              )}
            </div>
          </ScrollArea>
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
