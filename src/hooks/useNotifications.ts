import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'message' | 'appointment' | 'task' | 'deal' | 'lead' | 'campaign';
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type NotificationInput = Omit<Notification, 'id' | 'tenant_id' | 'created_at' | 'is_read'>;

export function useNotifications(options?: { unreadOnly?: boolean; category?: string; limit?: number }) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', tenantId, authUser?.id, options?.unreadOnly, options?.category, options?.limit],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Filter by user or global notifications (null user_id)
      if (authUser?.id) {
        query = query.or(`user_id.eq.${authUser.id},user_id.is.null`);
      }

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!tenantId,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Check if notification is for current user or global
          const notification = payload.new as Notification;
          if (notification.user_id === null || notification.user_id === authUser?.id) {
            queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, authUser?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false);

      if (authUser?.id) {
        query = query.or(`user_id.eq.${authUser.id},user_id.is.null`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });

  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      
      let query = supabase
        .from('notifications')
        .delete()
        .eq('tenant_id', tenantId);

      if (authUser?.id) {
        query = query.or(`user_id.eq.${authUser.id},user_id.is.null`);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });

  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length;

  return {
    notifications: notifications ?? [],
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
}

export function useCreateNotification() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: NotificationInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          tenant_id: tenantId,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });
}

export function useBroadcastNotification() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<NotificationInput, 'user_id'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Create a notification with null user_id (broadcasts to all users)
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          tenant_id: tenantId,
          user_id: null,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
    },
  });
}

export function useUnreadNotificationCount() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', tenantId, authUser?.id],
    queryFn: async () => {
      if (!tenantId) return 0;
      
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false);

      if (authUser?.id) {
        query = query.or(`user_id.eq.${authUser.id},user_id.is.null`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
