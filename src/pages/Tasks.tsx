import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  GripVertical,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: 'follow_up' | 'callback' | 'reminder' | 'review' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  due_at: string | null;
  assigned_to: string | null;
  assigned_type: 'ai' | 'human';
  customer_id: string | null;
  customer_name: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  name: string;
}

const priorityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  low: { color: 'bg-muted text-muted-foreground', icon: <Flag className="h-3 w-3" /> },
  medium: { color: 'bg-info text-info-foreground', icon: <Flag className="h-3 w-3" /> },
  high: { color: 'bg-warning text-warning-foreground', icon: <Flag className="h-3 w-3" /> },
  urgent: { color: 'bg-destructive text-destructive-foreground', icon: <AlertTriangle className="h-3 w-3" /> },
};

const taskTypeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  follow_up: { label: 'Follow Up', icon: <MessageSquare className="h-4 w-4" /> },
  callback: { label: 'Callback', icon: <Phone className="h-4 w-4" /> },
  reminder: { label: 'Reminder', icon: <Bell className="h-4 w-4" /> },
  review: { label: 'Review', icon: <FileCheck className="h-4 w-4" /> },
  custom: { label: 'Custom', icon: <CheckSquare className="h-4 w-4" /> },
};

const statusColumns = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const { tenantId, translate, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // For add dialog
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'follow_up' as Task['task_type'],
    priority: 'medium' as Task['priority'],
    due_date: '',
    due_time: '',
    assigned_to: '',
    assigned_type: 'ai' as 'ai' | 'human',
    customer_id: '',
  });

  const fetchTasks = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          task_type,
          priority,
          status,
          due_at,
          assigned_to,
          assigned_type,
          customer_id,
          created_at,
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('due_at', { ascending: true, nullsFirst: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('task_type', typeFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let formattedTasks: Task[] = (data || []).map((t: any) => ({
        ...t,
        customer_name: t.customers?.name,
      }));

      // Client-side filters
      if (overdueOnly) {
        formattedTasks = formattedTasks.filter(
          (t) => t.due_at && isPast(new Date(t.due_at)) && t.status !== 'completed'
        );
      }

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, statusFilter, typeFilter, priorityFilter, overdueOnly]);

  const fetchDropdownData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [customersRes, staffRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('tenant_id', tenantId).limit(100),
        supabase.from('users').select('id, full_name').eq('tenant_id', tenantId),
      ]);

      setCustomers(customersRes.data || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStaff((staffRes.data || []).map((s: any) => ({ id: s.id, name: s.full_name })));
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleAddTask = async () => {
    if (!tenantId || !newTask.title) return;

    try {
      let dueAt = null;
      if (newTask.due_date) {
        const dueDate = new Date(newTask.due_date);
        if (newTask.due_time) {
          const [hours, minutes] = newTask.due_time.split(':');
          dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        dueAt = dueDate.toISOString();
      }

      const { error } = await supabase.from('tasks').insert({
        tenant_id: tenantId,
        title: newTask.title,
        description: newTask.description || null,
        task_type: newTask.task_type,
        priority: newTask.priority,
        status: 'pending',
        due_at: dueAt,
        assigned_to: newTask.assigned_to || null,
        assigned_type: newTask.assigned_type,
        customer_id: newTask.customer_id || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });

      setIsAddDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'follow_up',
        priority: 'medium',
        due_date: '',
        due_time: '',
        assigned_to: '',
        assigned_type: 'ai',
        customer_id: '',
      });
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (taskId: string, status: Task['status']) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      toast({
        title: 'Status Updated',
        description: `Task marked as ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      toast({
        title: 'Deleted',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((t) => t.status === status);
  };

  const isOverdue = (task: Task) => {
    return task.due_at && isPast(new Date(task.due_at)) && task.status !== 'completed';
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'kanban' | 'list')}>
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>Add a new task to track</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select
                      value={newTask.task_type}
                      onValueChange={(value) => setNewTask({ ...newTask, task_type: value as Task['task_type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="callback">Callback</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task['priority'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Time</Label>
                    <Input
                      type="time"
                      value={newTask.due_time}
                      onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Assign To</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newTask.assigned_type === 'ai'}
                        onCheckedChange={(checked) =>
                          setNewTask({ ...newTask, assigned_type: checked ? 'ai' : 'human', assigned_to: '' })
                        }
                      />
                      <span className="text-sm">{newTask.assigned_type === 'ai' ? 'AI' : 'Human'}</span>
                    </div>
                    {newTask.assigned_type === 'human' && (
                      <Select
                        value={newTask.assigned_to}
                        onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select staff" />
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
                </div>
                <div className="grid gap-2">
                  <Label>Link to {translate('customer')}</Label>
                  <Select
                    value={newTask.customer_id}
                    onValueChange={(value) => setNewTask({ ...newTask, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${translate('customer').toLowerCase()} (optional)`} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask} disabled={!newTask.title}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="overdue"
                checked={overdueOnly}
                onCheckedChange={(checked) => setOverdueOnly(checked as boolean)}
              />
              <Label htmlFor="overdue" className="text-sm cursor-pointer">
                Overdue only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mytasks"
                checked={myTasksOnly}
                onCheckedChange={(checked) => setMyTasksOnly(checked as boolean)}
              />
              <Label htmlFor="mytasks" className="text-sm cursor-pointer">
                My tasks only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid gap-4 md:grid-cols-3">
          {statusColumns.map((column) => (
            <Card key={column.id} className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {column.label}
                  <Badge variant="outline">{getTasksByStatus(column.id).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[400px] space-y-3">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))
                ) : getTasksByStatus(column.id).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No tasks</p>
                  </div>
                ) : (
                  getTasksByStatus(column.id).map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        'cursor-pointer hover:shadow-md transition-shadow',
                        isOverdue(task) && 'border-destructive'
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {taskTypeConfig[task.task_type]?.icon}
                                <span className="font-medium text-sm truncate">{task.title}</span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {column.id !== 'pending' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'pending')}>
                                      Move to Pending
                                    </DropdownMenuItem>
                                  )}
                                  {column.id !== 'in_progress' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                                      Move to In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {column.id !== 'completed' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                      Mark Complete
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteTask(task.id)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={cn('text-xs', priorityConfig[task.priority]?.color)}>
                                {priorityConfig[task.priority]?.icon}
                                <span className="ml-1 capitalize">{task.priority}</span>
                              </Badge>
                              {task.due_at && (
                                <span
                                  className={cn(
                                    'text-xs',
                                    isOverdue(task) ? 'text-destructive font-medium' : 'text-muted-foreground'
                                  )}
                                >
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {format(new Date(task.due_at), 'MMM dd')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              {task.customer_name && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {task.customer_name}
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                {task.assigned_type === 'ai' ? (
                                  <Bot className="h-4 w-4 text-primary" />
                                ) : (
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[10px]">
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>{translate('customer')}</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className={cn(isOverdue(task) && 'bg-destructive/5')}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {taskTypeConfig[task.task_type]?.icon}
                          {task.title}
                        </div>
                      </TableCell>
                      <TableCell>{taskTypeConfig[task.task_type]?.label}</TableCell>
                      <TableCell>{task.customer_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {task.assigned_type === 'ai' ? (
                            <>
                              <Bot className="h-4 w-4" />
                              <span>AI</span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4" />
                              <span>Staff</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig[task.priority]?.color}>
                          {priorityConfig[task.priority]?.icon}
                          <span className="ml-1 capitalize">{task.priority}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.due_at ? (
                          <span className={cn(isOverdue(task) && 'text-destructive font-medium')}>
                            {format(new Date(task.due_at), 'MMM dd, h:mm a')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'pending')}>
                              Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                              Set In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
