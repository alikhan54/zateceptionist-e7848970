import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  assigned_to: string | null;
  related_to_type: 'customer' | 'deal' | 'lead' | 'appointment' | null;
  related_to_id: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Omit<Task, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'completed_at'>;

export function useTasks(options?: { status?: string; priority?: string; assignedTo?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: tasks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', tenantId, options?.status, options?.priority, options?.assignedTo],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.priority) {
        query = query.eq('priority', options.priority);
      }
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!tenantId,
  });

  const addTask = useMutation({
    mutationFn: async (task: TaskInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
  });

  const reopenTask = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'todo',
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', tenantId] });
    },
  });

  return {
    tasks: tasks ?? [],
    isLoading,
    error,
    refetch,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
  };
}

export function useTasksByRelation(relationType: string, relationId: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['tasks', 'relation', tenantId, relationType, relationId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('related_to_type', relationType)
        .eq('related_to_id', relationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!tenantId && !!relationType && !!relationId,
  });
}

export function useOverdueTasks() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['tasks', 'overdue', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .lt('due_date', new Date().toISOString())
        .in('status', ['todo', 'in_progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!tenantId,
  });
}
